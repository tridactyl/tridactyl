// Typescript elides unused named imports, so we deliberately do not
// name this import so that its tagged template literal sticks around.
import * as React from "react"
import * as ReactDOM from "react-dom"
import Logger from "@src/lib/logging"
import TriCliFrame from "@src/cliframe/components/TriCliFrame"

const logger = new Logger("cmdline")

ReactDOM.render(<TriCliFrame />, document.getElementById("tridactyl-ui-container"))
