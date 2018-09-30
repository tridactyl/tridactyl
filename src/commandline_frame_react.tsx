import * as React from "react"
import * as ReactDOM from "react-dom"
import TriContainer from "./components/TriContainer"

import Logger from "./logging"
const logger = new Logger("cmdline")

ReactDOM.render(<TriContainer />, document.getElementById("tridactyl-ui-container"))
