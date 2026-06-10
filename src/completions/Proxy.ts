import * as Completions from "@src/completions"
import * as config from "@src/lib/config"

class ProxyCompletionOption extends Completions.CompletionOptionHTML
    implements Completions.CompletionOptionFuse {
    public fuseKeys = []

    constructor(
        public value: string,
        proxy: { name: string; value: string; },
    ) {
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
        super(
            ["proxyadd", "proxyremove"],
            "ProxyCompletionSource",
            "Proxy",
        )

        this._parent.appendChild(this.node)
    }

    public async filter(exstr: string) {
        this.lastExstr = exstr
        let [prefix, query] = this.splitOnPrefix(exstr)
        const args = query ? query.split(/\s+/) : []

        // Hide self and stop if prefixes don't match
        if (prefix) {
            // Show self if prefix and currently hidden
            if (this.state === "hidden") {
                this.state = "normal"
            }
        } else {
            this.state = "hidden"
            return
        }

        const proxies = config.get("proxies")

        if (!proxies) {
            this.options = []
            return this.updateChain()
        }

        query = args.join(" ").toLowerCase()
        this.options = Object.keys(proxies)
            .filter(x => x.toLowerCase().startsWith(query))
            .sort()
            .map(
                key =>
                    new ProxyCompletionOption(key, {
                        name: key,
                        value: JSON.stringify(proxies[key]),
                    }
                ),
            )

        return this.updateChain()
    }

    updateChain() {
        // Options are pre-trimmed to the right length.
        this.options.forEach(option => (option.state = "normal"))

        // Call concrete class
        return this.updateDisplay()
    }
}
