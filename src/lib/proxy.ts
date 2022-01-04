import * as config from "@src/lib/config"
import * as Logging from "@src/lib/logging"
import { AutoContain } from "@src/lib/autocontainers"

const logger = new Logging.Logger("proxy")

const proxyTypes = ["http", "https", "socks", "socks4"] as const

type ProxyType = typeof proxyTypes[number]

interface ProxyInfo {
    type: ProxyType
    host: string
    port: number
    username: string
    password: string
    proxyDNS: boolean
    failoverTimeout: number
}

function isProxyType(proxyType: string): proxyType is ProxyType {
    return proxyTypes.includes(proxyType as ProxyType)
}

const authListener = (url: string, proxy: ProxyInfo): void => {
    const listener: (
        details: browser.webRequest._OnAuthRequiredDetails,
    ) => browser.webRequest.BlockingResponse = details => {
        const info = details.challenger

        if (
            !details.isProxy ||
            details.url !== url ||
            info.host !== proxy.host ||
            info.port !== proxy.port
        )
            return {}

        const result = {
            authCredentials: {
                username: proxy.username,
                password: proxy.password,
            },
        }
        browser.webRequest.onAuthRequired.removeListener(listener)

        return result
    }

    browser.webRequest.onAuthRequired.addListener(
        listener,
        { urls: ["<all_urls>"] },
        ["blocking"],
    )
}

export const proxyFromUrl = (proxyUrl: string): ProxyInfo => {
    const regex = new RegExp(/.+:\/\//)
    const match = regex.exec(proxyUrl)
    if (!match) {
        throw new Error(`Not a valid URL`)
    }

    let protocol: string
    let url: URL

    if (match[0] !== "http://" && match[0] !== "https://") {
        proxyUrl = "http://" + proxyUrl.substring(match[0].length)
        url = new URL(proxyUrl)
        protocol = match[0].substring(0, match[0].length - 2)
    } else {
        url = new URL(proxyUrl)
        protocol = url.protocol
    }

    protocol = protocol.replace(":", "")
    protocol =
        protocol === "socks5"
            ? "socks"
            : protocol === "ssl"
            ? "https"
            : protocol

    if (!isProxyType(protocol)) {
        throw new Error(`Invalid proxy type: ${protocol}`)
    }

    return {
        type: protocol,
        host: url.hostname,
        port: parseInt(url.port, 10),
        username: url.username,
        password: url.password,
        proxyDNS: url.searchParams.get("proxyDNS") === "true",
        failoverTimeout: 5,
    }
}

export function exists(names: string[]) {
    const currProxies = Object.keys(config.get("proxies"))
    const missingProxies = names.filter(name => !currProxies.includes(name))
    if (missingProxies.length) {
        throw new Error(
            `${
                missingProxies.length === 1 ? "Proxy" : "Proxies"
            } ${missingProxies.join(
                ", ",
            )} does not exist. See :help proxyadd for more info.`,
        )
    }
}

const getProxies = (): { [key: string]: ProxyInfo } => {
    const userProxies = config.get("proxies")
    return Object.entries(userProxies).reduce((acc, [name, url]) => {
        acc[name] = proxyFromUrl(url as string)
        return acc
    }, {})
}

const getProxiesForUrl = async (url: string): Promise<ProxyInfo[]> => {
    const aucon = new AutoContain()
    const [, containerProxies] = await aucon.getAuconAndProxiesForUrl(url)
    const proxies = getProxies()
    const filteredProxies = Object.entries(proxies)
        .filter(([name, ]) => containerProxies.includes(name))
        .map(([, proxy]) => proxy)
    const defaultProxy = config.get("proxy")
    if (
        defaultProxy in proxies &&
        !containerProxies.includes(defaultProxy)
    ) {
        filteredProxies.push(proxies[defaultProxy])
    }
    return filteredProxies
}

export const onRequestListener = async (
    details: Pick<browser.proxy._OnRequestDetails, "url">,
): Promise<ProxyInfo[] | never[]> => {
    const noProxy = []

    try {
        const proxies = await getProxiesForUrl(details.url)

        if (!proxies.length) return noProxy

        proxies.forEach(proxy => {
            if (proxy.type === "http" || proxy.type === "https") {
                authListener(details.url, proxy)
            }
        })

        return proxies
    } catch (e) {
        logger.error(`Error in onRequest listener: ${e}`)
        return noProxy
    }
}
