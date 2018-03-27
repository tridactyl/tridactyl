import * as E from './excommand'
import * as I from 'immutable'

interface GlState {
    searchEngine: string
    searchProviders: I.Map<string, string>
    hintChars: string
    theme: 'dark' | 'light'
    mappings: I.Map<string, string>
    aliases: I.Map<string, string>
    messages: I.List<string>
}

const defaultGlState: GlState = {
    searchEngine: 'google',
    searchProviders: I.Map<string, string>(),
    hintChars: 'aoeuidhtnspyfgcrlqjkxmwvz',
    theme: 'light',
    mappings: I.Map<string, string>(),
    aliases: I.Map<string, string>(),
    messages: I.List(),
}

export type GlobalState = I.Record<GlState> & Readonly<GlState>
export const GlobalState = I.Record(defaultGlState, 'GlobalState')