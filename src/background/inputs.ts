import * as E from './excommand'
import * as I from 'immutable'
import * as U from '../util'
import * as C from '../common'

const EMPTY_COMPLETER: E.InputCompleter = _ => I.List()
const UNFINISHED_COMPLETER: E.InputCompleter = _ => {
    throw 'unimplemented'
}

const UNFINISHED_SPEC: E.InputSpec = {
    name: 'unimplemented',
    complete: UNFINISHED_COMPLETER,
    parse: U.identity,
}

export const TAB_ID: E.InputSpec = UNFINISHED_SPEC

export const IDENTITY: E.InputSpec = {
    name: 'N/A',
    complete: EMPTY_COMPLETER,
    parse: U.identity,
}

export const BOOLEAN: E.InputSpec = {
    ...makeListInput('True/False', I.List.of('true', 'false')),
    parse: (tk: string) => U.parseBool(tk),
}

export const NUMBER: E.InputSpec = {
    name: 'Number',
    complete: EMPTY_COMPLETER,
    parse: (tk: string) => parseInt(tk, 10),
}

export const HIST_BMARK: E.InputSpec = {
    name: 'History/Bookmars',
    complete: UNFINISHED_COMPLETER,
    parse: U.identity,
}

export const CONTX_ID: E.InputSpec = {
    name: 'Container (Contextual Identity)',
    complete: UNFINISHED_COMPLETER,
    parse: U.identity,
}

export function toRest(i: E.InputSpec): E.InputSpec {
    throw 'unimplemented'
}

export function toOptional(i: E.InputSpec): E.InputSpec {
    throw 'unimplemenetd'
}

export function makeListInput(name: string, list: I.List<string>): E.InputSpec {
    return {
        name: name,
        complete: makeListCompleter(name, list),
        parse: (token: string) => {
            if (list.contains(token)) return token
            throw Error(`Token does not exist on list: ${token}`)
        },
    }
}

function makeListCompleter(
    name: string,
    list: I.List<string>
): E.InputCompleter {
    throw `unimplemented`
}

function histItemToComp(h: browser.history.HistoryItem): U.Maybe<C.Completion> {
    if (!(h.title && h.url)) return null
    return {
        name: h.title,
        description: h.url,
        expansion: h.url,
    }
}

function bmarkToComp(
    b: browser.bookmarks.BookmarkTreeNode
): U.Maybe<C.Completion> {
    if (!b.url) return null
    return {
        name: b.title,
        description: b.url,
        expansion: b.url,
    }
}
