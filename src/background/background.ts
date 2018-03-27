import * as I from 'immutable'
import * as C from './completion'
import * as E from './excommand'
import * as G from './globalState'
import * as P from './exparse'

const commandRegistry = I.Map<string, E.Command>()
let state = new G.GlobalState()

/**
 * The primary method by which the command line should be obtaining completions.
 * This should map a user-entered exstring into an array of `CompletionGroup`s
 * for the GUI to eat up.
 *
 * @param exstr The user-entered exstr with no alterations.
 */
export async function getCompletions(
    exstr: string
): Promise<C.CompletionGroup[]> {
    const command = getCommand(exstr)
    const completions = await command.getCompletions(state, exstr)
    return completions.toArray()
}

/**
 * Runs the command that the user has submitted for execution. If an error is
 * thrown anywhere in the process, then it will be immediately aborted and
 * reported to the user.
 *
 * @param exstr The user-ented exstr with no alterations.
 */
export async function runCommand(exstr: string): Promise<void> {
    const command = getCommand(exstr)
}

export function getGlobalState(): G.GlobalState {
    return state
}

function getCommand(exstr: string): E.Command {
    const cmdToken = P.getCommand(exstr)
    const expanded = P.expandCommand(cmdToken, state.mappings)
    const command = commandRegistry.get(expanded)
    if (!command) throw Error(`Command ${cmdToken} not found.`)
    return command
}