import { List, Map } from 'immutable'
import * as C from '../common'
import * as U from '../util'

let commandRegistry = Map<string, Command>()

export function registerCommand(name: string, arg: CommandSpec) {
    const command = specifyCommand(name, arg)
    const nr = commandRegistry.set(command.name, command)
    commandRegistry = nr

    function specifyCommand(name: string, arg: CommandSpec): Command {
        const specs = List(U.toArray(arg.specs))
        return {
            name: name,
            specs,
            allNames: U.flattenList(specs.map(parseCommandSpec)),
            description: arg.description,
            documentation: arg.documentation || 'No documentation provided',
            options: arg.options ? List(arg.options.map(toOptionSpec)) : List(),
            argumentsSpec: List(arg.argumentsSpec || []),
            action: arg.action,
        }
    }

    function toOptionSpec(x: ShortOptSpec): OptionSpec {
        return { short: x[0], long: x[1], input: x[2] }
    }
}

export type ParsedOpts = Map<string, any>
export type CommandResult = U.MayPromise<Result | void>
export type CommandAction = (cofx: Coeffects, ...args: any[]) => CommandResult

interface _Coeffects {
    count: number
    state: C.GlobalState
    options: ParsedOpts
}
export type Coeffects = Readonly<_Coeffects>

interface _Result {
    showResult?: any
    newState?: C.GlobalState
}
export type Result = Readonly<_Result>

export type InputCompleter = (token: string) => U.MayPromise<C.AllComps>
export type InputParser = (token: string) => any

interface _InputSpec {
    name: string
    complete: InputCompleter
    parse: InputParser
}
export type InputSpec = Readonly<_InputSpec>

interface _OptionSpec {
    short: string
    long: string
    input: InputSpec
}
export type OptionSpec = Readonly<_OptionSpec>

interface _Command {
    name: string
    specs: List<string>
    allNames: List<string>
    description: string
    documentation: string
    options: List<OptionSpec>
    argumentsSpec: List<InputSpec>
    action: CommandAction
}
export type Command = Readonly<_Command>

type ShortOptSpec = [string, string, InputSpec]
type CommandSpec = {
    specs: string | string[]
    description: string
    documentation?: string
    options?: ShortOptSpec[]
    argumentsSpec?: InputSpec[]
    action: CommandAction
}

function parseCommandSpec(spec: string): List<string> {
    throw 'unimplemnet'
}
