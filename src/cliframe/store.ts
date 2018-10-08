import * as Complete from "@src/lib/completefns"
import * as Redux from "redux"
import { rootCliReducer } from "@src/cliframe/cliReducer.ts"

export type TriCliState = {
    readonly completion: Complete.CompletionState
    readonly currentCliInput: string
}

export function configureStore(preloadedState) {
    return Redux.createStore(
        rootCliReducer,
        preloadedState,
        Redux.applyMiddleware(
        )
    )
}
