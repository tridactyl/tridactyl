import * as config from "@src/lib/config"
import xss from "xss"
import { isuuidv4 } from "@src/lib/math"
import { staticThemes } from "@src/.metadata.generated"

const readerCsp =
    "default-src 'none'; script-src 'none'; object-src 'none'; frame-src 'none'; " +
    "form-action 'none'; connect-src 'none'; style-src 'self' 'unsafe-inline'; " +
    "img-src http: https: data:; media-src http: https:"
const readerContent = document.getElementById("reader-content") as HTMLIFrameElement
const allowedProtocols = new Set(["http:", "https:", "ftp:", "mailto:", "tel:"])

async function updatePage() {
    const hash = window.location.hash.substr(1)
    const isuuid = isuuidv4(hash)
    let encoded = hash
    if (isuuid) {
        encoded = await config.getAsync("reader_articles", hash)
        if (encoded != undefined) {
            config.unset("reader_articles", hash)
            sessionStorage.setItem(hash, encoded)
        } else {
            encoded = sessionStorage.getItem(hash)
        }
    }
    const article =
        encoded == undefined
            ? {
                  title: "Reader page expired",
                  content:
                      "<p>Return to the original page with <code>:back</code> or by closing this tab, then run <code>:reader</code> again.</p>",
              }
            : JSON.parse(decodeURIComponent(atob(encoded)))
    article.content = xss(article.content, { stripIgnoreTag: true })
    const content = document.createElement("template")
    content.innerHTML = article.content
    content.content
        .querySelectorAll<HTMLAnchorElement | HTMLAreaElement>("a, area")
        .forEach(link => {
            const href = link.getAttribute("href")
            if (href?.startsWith("#")) link.target = "_self"
            else if (!allowedProtocols.has(link.protocol)) link.removeAttribute("href")
            else if (link.target.toLowerCase() === "_blank") link.relList.add("noopener")
            else link.target = "_top"
        })
    article.content = content.innerHTML
    let headerHtml = ""
    if (article.title !== undefined) {
        const header = document.createElement("header")
        const title = document.createElement("h1")
        if (
            article.link !== undefined &&
            (await config.getAsync("readerurlintitle")) == "true" &&
            !(article.title ?? "").includes(article.link)
        ) {
            document.title =
                [article.siteName, article.title].filter(Boolean).join(": ") +
                " :: " +
                article.link
        } else {
            document.title = [article.siteName, article.title]
                .filter(Boolean)
                .join(": ")
        }
        title.textContent = article.title
        header.appendChild(title)
        if (article.byline !== undefined) {
            const author = document.createElement("p")
            author.textContent = article.byline
            header.appendChild(author)
        }
        headerHtml = header.outerHTML
    }
    const theme = await config.getAsync("theme")
    const themeCss =
        theme === "default"
            ? ""
            : staticThemes.includes(theme)
              ? `@import url("${browser.runtime.getURL("static/themes/" + theme + "/" + theme + ".css")}");`
              : (await config.getAsync("customthemes", theme)) || ""
    readerContent.srcdoc = `<!doctype html><html lang="en" class="TridactylOwnNamespace"><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="${readerCsp}"><link rel="stylesheet" href="${browser.runtime.getURL("static/css/" + (article.source ? "viewsource.css" : "reader.css"))}"><link rel="stylesheet" href="${browser.runtime.getURL("static/css/content.css")}"><style>${themeCss}</style></head><body id="tridactyl-reader" dir="auto">${headerHtml}<main>${article.content}</main></body></html>`
    if (article.link !== undefined) {
        const link =
            (document.getElementById("tricanonlink") as HTMLLinkElement) ??
            document.createElement("link")
        link.rel = "canonical"
        link.id = "tricanonlink"
        link.href = article.link
        document.head.appendChild(link)
    } else {
        document.getElementById("tricanonlink")?.remove()
    }
    if (article.favicon !== undefined) {
        const icon = document.createElement("link")
        icon.rel = "icon"
        icon.href = article.favicon
        document.head.appendChild(icon)
    }
}

window.addEventListener("load", updatePage)
window.addEventListener("hashchange", updatePage)
config.addChangeListener("theme", updatePage)
