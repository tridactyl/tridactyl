import * as config from "@src/lib/config"
import xss from "xss"
import { isuuidv4 } from "@src/lib/math"

async function updatePage() {
    const hash = window.location.hash.substr(1)
    const isuuid = isuuidv4(hash)
    let encoded: string
    if (isuuid) {
        encoded = await config.getAsync("reader_articles", hash)
        if (encoded != undefined) {
            config.unset("reader_articles", hash)
            sessionStorage.setItem(hash, encoded)
        } else {
            encoded = sessionStorage.getItem(hash)
        }
    }
    const article = JSON.parse(decodeURIComponent(atob(encoded)))
    article.content = xss(article.content, { stripIgnoreTag: true })
    const content = document.createElement("main")
    content.innerHTML = article.content
    document.body.appendChild(content)
    if (article.title !== undefined) {
        const header = document.createElement("header")
        const title = document.createElement("h1")
        if (
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
        document.body.insertBefore(header, document.body.firstChild)
    }
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
