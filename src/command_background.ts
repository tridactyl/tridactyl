import { List, Map } from "immutable"
import { MayList, toList, HistItem, RArray } from "./util"
import minimist from "./minimist"
import { get as levenshtein } from "fast-levenshtein"
import * as I from "immutable"
import * as Util from "./util"
import * as Alias from "./aliases"
import * as Config from "./config"

let commandRegistry: CommandSpec[] = []
type CmdAction = (ctx: CmdContext, ...args: any[]) => any
type Completer = (exstr: string) => List<CompletionGroup>

interface CmdContext {
    readonly count: number
    readonly options: Map<string, any>
    readonly state: Map<string, any>
}

interface CmdOption {
    readonly short?: string
    readonly long: string
    readonly type: InputType
    readonly default?: any
    readonly description?: string
    readonly argname?: string
}

interface CommandSpec {
    readonly names: List<string>
    readonly description: string
    readonly documentation: string
    readonly argumentTypes: List<InputType>
    readonly optionTypes: List<CmdOption>
    readonly action: CmdAction
    readonly completer: (exstr: string) => List<CompletionGroup>
}

export interface Completion {
    readonly title: string
    readonly description?: string
    readonly icon?: URL
    readonly flags?: string
    readonly completed?: string
}

export interface CompletionGroup {
    readonly name: string
    readonly completions: List<Completion>
}

export interface InputType {
    readonly getCompletions: (q: string) => Promise<MayList<CompletionGroup>>
    readonly parseInput: (input: string) => Promise<any>
}

interface ParsedCommand {
    readonly commandName: string
    readonly options: Map<string, any>
    readonly arguments: List<any>
}

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
                .sortBy(x => x.title)
            return {
                name: name,
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

export const SEARCH_ENGINE_INPUT: InputType = {
    getCompletions: async i => {
        const cfg = Config.get("searchurls") as object
        // 'searchurls' is a map of engine -> searchurl
        const comps = stringListToComp(...Object.keys(cfg))
        return {
            name: "Search Engines",
            completions: comps,
        }
    },
    parseInput: async i => i,
}

export const STRING_INPUT: InputType = {
    getCompletions: async i => ({ name: "String", completions: List() }),
    parseInput: async i => i,
}

export const AUCMD_EVENTS_INPUT: InputType = makeListInput(
    "AutoCommand Events",
    true,
    stringListToComp("DocStart"),
)

export const BOOLEAN_INPUT: InputType = {
    ...makeListInput("True/False", false, stringListToComp("true", "false")),
    parseInput: async i => Util.parseBool(i),
}

export const HISTORY_INPUT: InputType = {
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
            completions: transformed,
        }
    },
    parseInput: async i => new URL(i),
}

export const BMARK_INPUT: InputType = {
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
            completions: mapped,
        }
    },
    parseInput: async i => new URL(i),
}

export const CONTXID_INPUT: InputType = {
    getCompletions: async i => {
        const query = await browser.contextualIdentities.query({ name: i })
        const comps = toList(query).map(x => ({
            title: x.name,
            // TODO: add icon to the completions
            completed: x.cookieStoreId,
        }))
        return {
            name: "Contextual Identities",
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

export const TAB_INPUT: InputType = {
    getCompletions: async i => {
        const q = await browser.tabs.query({ title: i })
        const comps = toList(q)
            .map(tabToComp)
            // TS doesn't recognise the null filter
            .filter(Boolean) as List<Completion>
        return {
            name: "Tabs",
            completions: comps,
        }
    },
    parseInput: async i => {
        const idx = parseInt(i)
        return browser.tabs.query({ currentWindow: true, index: idx })[0]
    },
}

export const EXSTR_INPUT: InputType = {
    getCompletions: async i => List(getCompletionsForExstr(i)),
    parseInput: async i => i,
}

const optionToComp = (opt: CmdOption): Completion => ({
    /** Example: '-f, --foobar' */
    title: `-${opt.short}, --${opt.long}`,
    description: opt.description,
    completed: "--" + opt.long,
})

/**
 * Parse a list of specs for the name of a command. Adapted from vimperator.
 *
 * @param specs A list of specs
 */
function parseNameSpecs(specs: string | string[]): List<string> {
    const l = toList(specs).map(spec => {
        const m = spec.match(/([^[]+)(?:\[(.*)])?/)
        if (!m) throw Error("Specs cannot be empty")
        const [_, head, tail] = m
        return List.of(head + tail, tail)
    })
    return Util.flattenList(l).filter(Boolean)
}

export function registerNewCommand(
    name: string,
    opts: {
        nameSpecs: string | string[]
        description: string
        documentation?: string
        argumentTypes?: InputType | InputType[]
        optionTypes?: CmdOption | CmdOption[]
        action: CmdAction
        completer?: (exstr: string) => List<CompletionGroup>
    },
): CommandSpec {
    const cmd: CommandSpec = {
        names: parseNameSpecs(opts.nameSpecs),
        description: opts.description,
        documentation: opts.documentation || "No documentation provided",
        argumentTypes: toList(opts.argumentTypes),
        optionTypes: toList(opts.optionTypes),
        action: opts.action,
        completer: opts.completer || (x => List()),
    }
    commandRegistry.push(cmd)
    return cmd
}

export function getCompletionsForExstr(exstr: string): RArray<CompletionGroup> {
    const cmd = Util.extractCommandFromExstr(exstr)
    const expanded = Alias.expandCommand(cmd)
    const cmdSpec = commandRegistry.find(x => x.names.includes(expanded))

    // Command not found
    if (!cmdSpec) return []

    // Use the command's own completer
    return cmdSpec.completer(exstr).toArray()
}

type CompletionContext = "option-name" | "option-value" | "argument"

function getDefaultCompleter(
    optionTypes: List<CmdOption>,
    argumentTypes: List<InputType>,
): Completer {
    return exstr => {
        // Step 1: tokenise
        const tokens = Util.tokeniseOnWhitespace(exstr).splice(1)

        // This shouldn't happen, since in means we're getting called when
        // no command has been typed which means that we should be showing the
        // command completer
        if (Util.isEmpty(tokens)) throw Error("No command")

        // Step 2: determine which context we're using completions

        return List()
    }
}

function getOptionsCompleter(optionTypes: List<CmdOption>): Completer {
    return currentToken => {
        // Sort by levenshtein distance between input and command's long name
        const comps = optionTypes
            .sortBy(x => levenshtein(currentToken, x.long))
            .map(optionToComp)
        return toList({
            name: "Command Options",
            completions: comps,
        })
    }
}
