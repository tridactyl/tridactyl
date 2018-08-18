import { render, Component } from "inferno"
import * as Messaging from "./messaging"
import { browserBg } from "./lib/webext"

/* import * as Fuse from 'fuse.js' */

const app = document.getElementById("commandline")

class HistoryCompletionSource extends Component<any, any> {
    public state = {
        visibleOptions: [],
    }

    private options: HistoryCompletionOption[]

    render() {
        return (
            <div className="HistoryCompletionSource">
                <table className="optionContainer">
                    {this.state.visibleOptions}
                </table>
            </div>
        )
    }

    /** Rank this.options and set visibleOptions to the 20 most relevant */
    public async filter(exstr: string) {
        const bestOptions = (await this.scoreOptions(exstr, 20)).map(page => (
            <HistoryCompletionOption page={page} />
        ))

        // Schedule an update.
        this.setState({
            visibleOptions: bestOptions,
        })
    }

    private frecency(item: browser.history.HistoryItem) {
        // Doesn't actually care about recency yet.
        return item.visitCount * -1
    }

    private async scoreOptions(query: string, n: number) {
        if (!query) {
            return (await browserBg.topSites.get()).slice(0, n)
        } else {
            // Search history, dedupe and sort by frecency
            let history = await browserBg.history.search({
                text: query,
                maxResults: 500,
                startTime: 0,
            })

            // Remove entries with duplicate URLs
            const dedupe = new Map()
            for (const page of history) {
                if (dedupe.has(page.url)) {
                    if (dedupe.get(page.url).title.length < page.title.length) {
                        dedupe.set(page.url, page)
                    }
                } else {
                    dedupe.set(page.url, page)
                }
            }
            history = [...dedupe.values()]

            history.sort((a, b) => this.frecency(a) - this.frecency(b))

            return history.slice(0, n)
        }

        /* const results = [] */
        /* for (const option of this.options) { */
        /*     if (option.searchOn.find(key => key.includes(query))) { */
        /* 	results.push(option) */
        /* 	if (results.length >= 20) return results */
        /*     } */
        /* } */
        /* return results */

        /* if (! this.fuse) { */
        /*     console.log("Do this once") */
        /*     const searchThis = this.options.map( */
        /* 	(elem, index) => { */
        /* 	    return {index, fuseKeys: elem.searchOn} */
        /* 	} */
        /*     ) */

        /*     const fuseOptions = { */
        /* 	keys: ["fuseKeys"], */
        /* 	shouldSort: true, */
        /* 	id: "index", */
        /* 	includeScore: true, */
        /*     } */
        /*     this.fuse = new Fuse(searchThis, fuseOptions) */
        /* } */

        /* return this.fuse.search(query).map( */
        /*     res => { */
        /* 	let result = res as any */
        /* 	// console.log(result, result.item, query) */
        /* 	let index = Number(result.item) */
        /* 	return this.options[index] */
        /* 	/1* return { *1/ */
        /* 	/1*     index, *1/ */
        /* 	/1*     option: this.options[index], *1/ */
        /* 	/1*     score: result.score as number *1/ */
        /* 	/1* } *1/ */
        /*     } */
        /* ) */
    }
}

class HistoryCompletionOption extends Component<any, any> {
    public value: string
    public searchOn: string[]

    constructor(props: { page: browser.history.HistoryItem }) {
        super(props)
        this.value = props.page.url
        this.searchOn = [props.page.title, props.page.url]
    }

    render() {
        return (
            <tr className="HistoryCompletionOption option">
                <td className="prefix">{"".padEnd(2)}</td>
                <td />
                <td>{this.props.page.title}</td>
                <td>
                    <a
                        className="url"
                        target="_blank"
                        href={this.props.page.url}
                    >
                        {this.props.page.url}
                    </a>
                </td>
            </tr>
        )
    }
}

/* const HCS = new HistoryCompletionSource({}) */
const HCS = <HistoryCompletionSource />

// function Commandline() {
//     return <input onInput />
// }

const input = document.getElementById("cmdline") as HTMLInputElement
input.addEventListener("input", event =>
    setTimeout(console.log(HCS.children) /*.filter(input.value)*/, 0),
)

render(HCS, app)
;(window as any).HCS = HCS
