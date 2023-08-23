import * as config from "@src/lib/config"
import xss from "xss"

async function updatePage() {
    const article = JSON.parse(
        decodeURIComponent(atob(window.location.hash.substr(1))),
    )
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
}

window.addEventListener("load", updatePage)
window.addEventListener("hashchange", updatePage)
