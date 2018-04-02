import * as I from 'immutable'
import * as M from './messages'

interface _GlState {
    mappings: I.Map<string, string>
    messages: I.List<M.Message>
    theme: 'light' | 'dark'
    cmdHistory: I.List<string>
}

const defaultState: _GlState = {
    mappings: I.Map(),
    messages: I.List(),
    theme: 'light',
    cmdHistory: I.List()
}

interface _LocalState {
    mode: 'normal' | 'op-pending' | 'command' | 'hint' | 'find'
}

const defaultLocalState: _LocalState = {
    mode: 'normal'
}

export type GlobalState = I.Record<_GlState> & Readonly<_GlState>
export type LocalState = I.Record<_LocalState> & Readonly<_LocalState>
export const GlobalState = I.Record(defaultState, 'GlobalState')
export const LocalState = I.Record(defaultLocalState, 'LocalState')