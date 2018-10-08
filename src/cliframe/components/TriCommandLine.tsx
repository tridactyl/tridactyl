import * as React from "react"
import * as Redux from "redux"
import Logger from "@src/lib/logging"

const logger = new Logger("cmdline")

interface TriCommandLineProps {
    store: Redux.Store<any, Redux.AnyAction>
}

export default function TriCommandLine({
    store,
}: TriCommandLineProps): JSX.Element {
    return <div id="tridactyl-commandline">
        <span id="tridactyl-colon"></span>
        <input id="tridactyl-input"
               ref={this.inputRef}
               autoFocus={true}
               value={this.state.commandlineContents}
               onKeyDown={evt => this.handleKeyDown(evt)}
               onChange={evt => this.handleInputUpdate(evt)}></input>
    </div>
}
