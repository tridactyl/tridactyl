import * as Completions from "@src/completions"
import * as config from "@src/lib/config"

class ProxyCompletionOption
    extends Completions.CompletionOptionHTML
    implements Completions.CompletionOptionFuse {
    public fuseKeys = []

    constructor(public value: string, proxy: { name: string; value: string }) {
        super()
        this.html = html`<tr class="ProxyCompletionOption option">
            <td class="name">${proxy.name}</td>
            <td class="content">${proxy.value}</td>
        </tr>`
    }
}

export class ProxyCompletionSource extends Completions.CompletionSourceFuse {
    public options: ProxyCompletionOption[]

    constructor(private _parent) {
        super(["proxyadd", "proxyremove"], "ProxyCompletionSource", "Proxy")

        this._parent.appendChild(this.node)
    }

    /* override*/ async updateOptions(command, rest) {
        const args = rest ? rest.split(/\s+/) : []

        const proxies = config.get("proxies")

        if (!proxies) {
            this.options = []
            return
        }

        rest = args.join(" ").toLowerCase()
        this.options = Object.keys(proxies)
            .filter(x => x.toLowerCase().startsWith(rest))
            .sort()
            .map(
                key =>
                    new ProxyCompletionOption(key, {
                        name: key,
                        value: JSON.stringify(proxies[key]),
                    }),
            )
    }
}
