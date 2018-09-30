import * as Messaging from "../messaging"
import * as Styling from "../styling"
import * as React from "react"
import Logger from "../logging"

const logger = new Logger("cmdline")

type TriContainerState = {
    commandlineContents: string
}

/** The tridactyl UI container.
 *
 *  TODO: The `tridactyl-input-symbol` is traditionally a ':' but should also be able to show '/' when in find mode.
 *  TODO: hard mode: vi style editing on cli, like set -o mode vi
 *
 */
export default class TriContainer extends React.Component<any, any> {
    constructor(
	props,
	context,
	private inputRef = React.createRef<HTMLInputElement>(),
	public state: TriContainerState = {
	    commandlineContents: "",
	},
    ) {
	super(props, context)
	Styling.theme(document.querySelector(":root"))
    }

    render() {
	return(
	    <div id="tridactyl-commandline-root">
		<div id="tridactyl-completions"></div>
		<div id="tridactyl-commandline">
		    <span id="tridactyl-colon"></span>
		    <input id="tridactyl-input"
			   ref={this.inputRef}
			   autoFocus={true}
			   value={this.state.commandlineContents}
			   onKeyDown={evt => this.handleKeyDown(evt)}
			   onChange={evt => this.handleInputUpdate(evt)}></input>
		</div>
	    </div>
	)
    }

    private handleKeyDown(keyevent) {
	switch (keyevent.key) {
            case "Enter":
		this.process()
		this.hide_and_clear()
		break

            case "j":
                /* Just like hitting enter, but we need to keep firefox
		 * from focusing the omnibar. */
		if (keyevent.ctrlKey) {
		    keyevent.preventDefault()
                    keyevent.stopPropagation()
                    this.process()
		    this.hide_and_clear()
		}
		break

            case "m":
                /* Just like hitting enter, but we need to keep firefox
		 * from doing whatever it does with the key. */
		if (keyevent.ctrlKey) {
		    keyevent.preventDefault()
                    keyevent.stopPropagation()
		    this.process()
		    this.hide_and_clear()
		}
		break

            case "a":
		if (keyevent.ctrlKey) {
                    keyevent.preventDefault()
                    keyevent.stopPropagation()
                    this.setCursor()
		}
		break

            case "e":
		if (keyevent.ctrlKey) {
                    keyevent.preventDefault()
                    keyevent.stopPropagation()
                    this.setCursor(this.state.commandlineContents.length)
		}
		break

            case "Escape":
		keyevent.preventDefault()
		this.hide_and_clear()
		break
	}
    }

    private setCursor(n = 0) {
	this.inputRef.current.setSelectionRange(n, n, "none")
    }

    private hide_and_clear() {
	this.setState({
	    commandlineContents: "",
	})
	Messaging.message("commandline_background", "hide")
    }

    private handleInputUpdate(updateevent) {
	this.setState({
	    commandlineContents: updateevent.target.value,
	})
    }

    /* Send the commandline to the background script and await response. */
    private async process() {
	const command = this.state.commandlineContents
	const [func, ...args] = command.trim().split(/\s+/)
	if (func.length === 0 || func.startsWith("#")) {
            return
	}
	this.sendExstr(command)
    }

    private async sendExstr(exstr) {
	Messaging.message("commandline_background", "recvExStr", [exstr])
    }
}
