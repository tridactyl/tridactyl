// Typescript elides unused named imports, so we deliberately do not
// name this import so that its tagged template literal sticks around.
import "./lib/html-tagged-template"

import * as React from "react"
import * as ReactDOM from "react-dom"
import TriContainer from "./components/TriContainer"

import Logger from "./logging"
const logger = new Logger("cmdline")

ReactDOM.render(<TriContainer />, document.getElementById("tridactyl-ui-container"))
