import * as React from "react"
import * as Redux from "redux"
import Logger from "@src/lib/logging"

const logger = new Logger("cmdline")


interface CompletionsProps {
    store: Redux.Store<any, Redux.AnyAction>
}


export default function TriCompletions ({
    store,
}: CompletionsProps): JSX.Element {
    return <div />
}
