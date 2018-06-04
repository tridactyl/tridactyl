import { List, Map } from "immutable"
import { BrowserTab, MayList, toList, HistItem, RArray } from "./util"
import { get as levenshtein } from "fast-levenshtein"
import {
    getCompletionsForExstr,
    CmdOption,
    Completion,
    InputType,
} from "./command_background"
import * as Util from "./util"
import * as Config from "./config"

/**
 * Make an input with the provided list of completions
 *
 * @param name Name of the list
 * @param comprehensive If true, the parser will reject strings not in the
 * provided list
 * @param l The list of completions
 */
export function makeListInput(
    name: string,
    comprehensive: boolean,
    l: List<Completion>,
): InputType {
    const completed = l.map(x => x.completed)
    return {
        getCompletions: async i => {
            const c = l
                .filter(
                    x =>
                        x.title.includes(i) ||
                        (x.description && x.description.includes(i)),
                )
                .sortBy(x => levenshtein(i, x.title))
            return {
                name: name,
                selectable: true,
                completions: c,
            }
        },
        parseInput: async i => {
            if (!comprehensive) return i
            if (completed.includes(i)) return i
            throw Error(`Argument '${i}' is not valid`)
        },
    }
}

export function stringListToComp(...l: string[]): List<Completion> {
    return List(l.map(x => ({ title: x })))
}

export const IP_SEARCH_ENGINE: InputType = {
    getCompletions: async i => {
        const cfg = Config.get("searchurls") as object
        // 'searchurls' is a map of engine -> searchurl
        const comps = stringListToComp(...Object.keys(cfg))
        return {
            name: "Search Engines",
            selectable: true,
            completions: comps,
        }
    },
    parseInput: async i => i,
}

export const IP_STRING: InputType = {
    getCompletions: async i => ({
        name: "String",
        selectable: true,
        completions: List(),
    }),
    parseInput: async i => i,
}

export const IP_AUCMD_EVENTS: InputType = makeListInput(
    "AutoCommand Events",
    true,
    stringListToComp("DocStart"),
)

export const IP_BOOLEAN: InputType = {
    ...makeListInput("True/False", false, stringListToComp("true", "false")),
    parseInput: async i => Util.parseBool(i),
}

export const IP_HISTORY: InputType = {
    getCompletions: async i => {
        const h = await browser.history.search({ text: i, maxResults: 20 })
        const transformed = toList(h)
            // One day the TS compiler will be smart enough to see the filter
            // below as a null check
            .filter(x => x.title && x.visitCount && x.url)
            .sortBy(x => x.visitCount!)
            .map(x => ({
                title: x.title!,
                description: x.url!,
                completed: x.url!,
            }))
        return {
            name: "History",
            selectable: true,
            completions: transformed,
        }
    },
    parseInput: async i => new URL(i),
}

export const IP_BOOKMARK: InputType = {
    getCompletions: async i => {
        const query = await browser.bookmarks.search(i)
        const mapped = toList(query)
            .filter(x => x.url)
            .map(x => ({
                title: x.title,
                description: x.url,
                completed: x.url,
            }))
        return {
            name: "Bookmarks",
            selectable: true,
            completions: mapped,
        }
    },
    parseInput: async i => new URL(i),
}

export const IP_CONTEXT_ID: InputType = {
    getCompletions: async i => {
        const query = await browser.contextualIdentities.query({ name: i })
        const comps = toList(query).map(x => ({
            title: x.name,
            // TODO: add icon to the completions
            completed: x.cookieStoreId,
        }))
        return {
            name: "Contextual Identities",
            selectable: true,
            completions: comps,
        }
    },
    parseInput: async i => {
        const c = browser.contextualIdentities.get(i)
        if (!i) throw Error(`Contextual Identity ${i} not found`)
        return c
    },
}

function tabToComp(t: BrowserTab): Completion | null {
    if (!t.url || !t.title) return null

    let flags = ""
    if (t.active) flags += "%"
    if (t.pinned) flags += "@"
    // if (t.isInReaderMode) flags += "R"

    const icon = t.favIconUrl ? new URL(t.favIconUrl) : undefined

    return {
        title: `${t.index}: ${t.title}`,
        description: t.url,
        icon: icon,
        completed: t.index.toString(),
    }
}

export const IP_TAB: InputType = {
    getCompletions: async i => {
        const q = await browser.tabs.query({ title: i })
        const comps = toList(q)
            .map(tabToComp)
            // TS doesn't recognise the null filter
            .filter(Boolean) as List<Completion>
        return {
            name: "Tabs",
            selectable: true,
            completions: comps,
        }
    },
    parseInput: async i => {
        const idx = parseInt(i)
        return browser.tabs.query({ currentWindow: true, index: idx })[0]
    },
}

export const EXSTR_INPUT: InputType = {
    getCompletions: async i => List(await getCompletionsForExstr(i)),
    parseInput: async i => i,
}

const optionToComp = (opt: CmdOption): Completion => ({
    /** Example: '-f, --foobar' */
    title: `-${opt.short}, --${opt.long}`,
    description: opt.description,
    completed: "--" + opt.long,
})
