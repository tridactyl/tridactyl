import { List, Record } from 'immutable'
import * as G from './globalState'

interface Completion {
    readonly name: string
    readonly description: string
    readonly expansion?: string | undefined
    readonly icon?: string | undefined
    readonly flags?: string | undefined
}

interface CompletionGroup {
    readonly name: string
    readonly selectable: boolean
    readonly completions: List<Completion>
}

type Completed =
    | Promise<List<CompletionGroup>>

type Completer = (state: G.GlobalState, query: string) => Completed

function getExpandedCompletion(c: Completion) {
    return c.expansion || c.name
}

export {
    Completed,
    Completer,
    Completion,
    CompletionGroup,
    getExpandedCompletion,
}
