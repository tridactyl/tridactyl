import * as Completions from "@src/completions"
import { ABOUT_PAGES } from "@src/lib/about_pages"
import "@src/lib/DANGEROUS-html-tagged-template"

class DialogCompletionOption
    extends Completions.CompletionOptionHTML
    implements Completions.CompletionOptionFuse {
    public fuseKeys: string[]

    constructor(public value: string, description: string) {
        super()
        this.fuseKeys = [value, description]
        this.html = html`<tr class="DialogCompletionOption option">
            <td class="title">${value}</td>
            <td class="description"></td>
        </tr>`
        this.html.querySelector(".description").textContent = description
    }
}

export class DialogCompletionSource extends Completions.CompletionSourceFuse {
    public options = Object.entries(ABOUT_PAGES).map(
        ([page, description]) => new DialogCompletionOption(page, description),
    )

    constructor(parent: HTMLElement) {
        super(["dialog"], "DialogCompletionSource", "Firefox about pages")
        parent.appendChild(this.node)
    }
}
