import * as I from 'immutable'

interface _Completion {
    name: string
    description?: string
    expansion?: string | undefined
    flags?: string | undefined
    icon?: string | undefined
}

interface _CompletionGroup {
    name: string
    selectable: boolean
    completions: I.List<Completion>
}

export type Completion = Readonly<_Completion>
export type CompGroup = Readonly<_CompletionGroup>
export type AllComps = I.List<CompGroup>
