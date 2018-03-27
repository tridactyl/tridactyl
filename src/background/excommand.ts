import * as C from './completion'
import * as I from 'immutable'
import * as G from './globalState'

export type CommandAction = (
    count: number,
    opts: Option,
    state: G.GlobalState,
    ...args: any[]
) => any | [any, G.GlobalState]

export type SingleAction = (
    opts: Option,
    state: G.GlobalState,
    ...args: any[]
) => [any, G.GlobalState]

export type Tokeniser = (argstring: string) => I.List<string>

export abstract class Command {
    readonly name: string
    readonly allNames: I.Set<string>
    readonly description: string
    readonly docstring: string
    readonly multAction: CommandAction
    readonly options: I.List<OptionSpec>

    constructor(
        name: string,
        allNames: I.Set<string>,
        description: string,
        docstring: string,
        options: I.List<OptionSpec>,
        multAction: CommandAction,
    ) {
        this.name = name
        this.allNames = allNames
        this.description = description
        this.docstring = docstring
        this.multAction = multAction
        this.options = options
    }

    abstract tokenise(argstring: string): I.List<string>
    abstract getCompletions(state: G.GlobalState, query: string): C.Completed
    abstract excecute(state: G.GlobalState, query: string): [any, G.GlobalState]

    completionForm(): C.Completion {
        return {
            name: this.name,
            description: this.description,
        }
    }
}

export class SimpleCommand extends Command {
    constructor(
        specs: string[],
        description: string,
        docstring: string,
        options: OptionSpec[],
        action: SingleAction
    ) {
        const all = parseSpecs(specs)

        super(
            all[0],
            all.toSet(),
            description,
            docstring,
            I.List(options),
            (count, opts, state, ...args) => {
                for(let i=0; i<count; i++)
                    action(opts, state, ...args)
            }
        )
    }

    tokenise(argstring: string): I.List<string> {
        throw new Error("Method not implemented.");
    }
    getCompletions(state: G.GlobalState, query: string): C.Completed {
        throw new Error("Method not implemented.");
    }
    excecute(state: G.GlobalState, query: string): [any, G.GlobalState] {
        throw new Error("Method not implemented.");
    }
}

export interface InputSpec {
    /** Name of this input type. Used in completions. */
    readonly name: string
    /** The completion provider. Used to, well, provide completions. */
    readonly completer: C.Completer
    /** Parses the argument the user entered into one that will be passed into
     * the excommand action. For example, a tabid can be mapped into a
     * browser.tab instance. */
    readonly parser?: ((expansion: string) => Promise<any>) | undefined
}

export interface Option {
    [name: string]: any
}

export interface OptionSpec {
    readonly name: string
    readonly short: string
    readonly type: InputSpec
    readonly description: string
}

export function commandToCompletion(c: Command): C.Completion {
    return {
        name: c.name,
        description: c.description,
    }
}

function parseSpecs(specs: string[]): I.List<string> {
    const mapped = specs.map(parseNameSpec)
    const flat = Array.prototype.concat(...mapped)
    return I.List(flat)
}

function parseNameSpec(spec: string): [string, string] | [string] {
    const match = spec.match(/([^[]+)(?:\[(.*)])?/)
    if (!match) throw `Spec ${spec} invalid`
    const [, head, tail] = match
    return tail ? [head + tail] : [head]
}

function whitespaceTokeniser(exstr: string): I.List<string> {
    return I.List(exstr.split(' '))
}