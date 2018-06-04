import { List, Map } from "immutable"
import { BrowserTab, MayList, toList, HistItem, RArray } from "./util"
import minimist from "./minimist"
import { get as levenshtein } from "fast-levenshtein"
import * as I from "immutable"
import * as Util from "./util"
import * as Alias from "./aliases"
import * as Config from "./config"
import { IP_BOOLEAN } from "./command_inputs"

let commandRegistry: CommandSpec[] = []
type CmdAction = (ctx: CmdContext, ...args: any[]) => any
type Completer = (exstr: string) => Promise<List<CompletionGroup>>

interface CmdContext {
    readonly count: number
    readonly options: Map<string, any>
    readonly state: Map<string, any>
}

export interface CmdOption {
    readonly short?: string
    readonly long: string
    readonly type: InputType
    readonly default?: any
    readonly description?: string
    readonly argname?: string
}

export interface CommandSpec {
    readonly names: List<string>
    readonly description: string
    readonly documentation: string
    readonly argumentTypes: List<InputType>
    readonly optionTypes: List<CmdOption>
    readonly action: CmdAction
    readonly completer: (exstr: string) => Promise<List<CompletionGroup>>
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
    readonly selectable: boolean
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
        completer?: Completer
    },
): CommandSpec {
    const optionTypes = toList(opts.optionTypes)
    const argumentTypes = toList(opts.argumentTypes)

    const cmd: CommandSpec = {
        names: parseNameSpecs(opts.nameSpecs),
        description: opts.description,
        documentation: opts.documentation || "No documentation provided",
        optionTypes,
        argumentTypes,
        action: opts.action,
        completer:
            opts.completer ||
            getDefaultCommandCompleter(optionTypes, argumentTypes),
    }
    commandRegistry.push(cmd)
    return cmd
}

export async function getCompletionsForExstr(
    exstr: string,
): Promise<RArray<CompletionGroup>> {
    const cmd = Util.extractCommandFromExstr(exstr)
    const expanded = Alias.expandCommand(cmd)
    const cmdSpec = commandRegistry.find(x => x.names.includes(expanded))

    // Command not found
    if (!cmdSpec) return []

    // Use the command's own completer
    return (await cmdSpec.completer(exstr)).toArray()
}

const optionToCompletion = (opt: CmdOption): Completion => ({
    // Title: '-f, --foo' or '--foo'
    title: opt.short ? `-${opt.short}, --${opt.long}` : `--${opt.long}`,
    description: opt.description,
    // Completes into the long '--foo' upon hitting tab
    completed: `--${opt.long}`,
})

const completeOptionName = (options: List<CmdOption>) => (partial: string) =>
    toList({
        name: "Options",
        selectable: true,
        completions: options
            .sortBy(x => levenshtein(partial, x.long))
            .map(optionToCompletion),
    })

const completeArgument = (args: List<InputType>) => async (
    tokens: List<string>,
) => {
    const joined = Util.joinAfter(args.size - 1, tokens)
    const input = args.get(joined.size)!
    const last = tokens.slice(-1).get(0)!
    const comps = await input.getCompletions(last)
    return toList(comps)
}

const completeOptionValue = async (option: CmdOption, partial: string) =>
    toList(await option.type.getCompletions(partial))

const isOpt = (t: string) => t.indexOf("-") === 0
const isLongOpt = (t: string) => t.indexOf("--") === 0
const isShortOpt = (t: string) => t.indexOf("-") === 0 && !isLongOpt(t)
const isSingleShortOpt = (t: string) => isShortOpt(t) && t.length === 2
const isMultipleShortOpt = (t: string) => isShortOpt(t) && t.length > 2
const extractLongName = (t: string) =>
    isLongOpt(t) ? t.match(/--(\w+)/)![1] : null
const extractSingleShortName = (t: string) =>
    isShortOpt(t) ? t.match(/-(\w+)/)![1] : null
const extractLastShortName = (t: string) =>
    isShortOpt(t) ? t.match(/-\w*(\w)/)![1] : null

const getOptionFromToken = (opts: List<CmdOption>, tk: string) => {
    if (isLongOpt(tk)) return opts.find(x => x.long === extractLongName(tk))
    if (isOpt(tk)) return opts.find(x => x.short === extractLastShortName(tk))
    // If it passes neither test, it's not an option
    return undefined
}

const optionNotFound = (tk: string): CompletionGroup => ({
    name: "ERROR: Option Not Found",
    selectable: false,
    completions: List.of({
        title: `An option for the token '${tk}' could not be found.`,
    }),
})

function getDefaultCommandCompleter(
    optionTypes: List<CmdOption>,
    argumentTypes: List<InputType>,
): Completer {
    const bools = optionTypes
        .filter(x => x.type === IP_BOOLEAN)
        .map(x => x.long)
        .toArray()

    const aliases = Util.listToObjMap<string>(optionTypes, "long", "short")
    const defaults = Util.listToObjMap<string>(optionTypes, "long", "default")
    const parseOpts = { boolean: bools, alias: aliases, default: defaults }

    const completeArgs = completeArgument(argumentTypes)
    const completeOpts = completeOptionName(optionTypes)

    return async (exstr: string) => {
        // TODO: show documentation as part of completions

        // The slice is to remove the first element, which should be the name
        // of the command
        const tokenArr = Util.tokeniseOnWhitespace(exstr).slice(1)
        const parsed = minimist(tokenArr, parseOpts)
        const tokens = toList(tokenArr)
        const lastToken = tokens.get(-1)!
        const tokenL2 = tokens.get(-2)
        const argTokens = toList(parsed._)

        // This is if the previous token was an option. We check if it's a
        // valid option, where if it's not a boolean, we accept an argument,
        // and if it is, we get the normal arguments completer
        if (tokenL2 && isOpt(tokenL2)) {
            const option = getOptionFromToken(optionTypes, tokenL2)
            if (option) {
                if (option.type === IP_BOOLEAN) return completeArgs(argTokens)
                else return completeOptionValue(option, lastToken)
            }
            return toList(optionNotFound(tokenL2))
        }

        // If the previous token is not an option, and this is, then use the
        // name completer
        if (isOpt(lastToken)) return completeOpts(lastToken)

        // If nobody is an option, use the normal arguments completer
        return completeArgs(argTokens)
    }
}
