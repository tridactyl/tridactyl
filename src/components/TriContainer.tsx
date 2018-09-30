import * as Messaging from "../messaging"
import { theme } from "../styling"
import * as React from "react"

/** The tridactyl UI container.
 *
 *  TODO: The `tridactyl-input-symbol` is traditionally a ':' but should also be able to show '/' when in find mode.
 *  TODO: hard mode: vi style editing on cli, like set -o mode vi
 *
 */

export default class TriContainer extends React.Component<any, any> {
    constructor(props, context) {
	super(props, context)

	/* Set up state */
	this.state = {
	    commandlineContents: "",
	}

	/* Apply our theme */
	theme(document.querySelector(":root"))
    }

    render() {
	return(
	    <div id="tridactyl-commandline-root">
		<div id="tridactyl-completions"></div>
		<div id="tridactyl-commandline">
		    <span id="tridactyl-colon"></span>
		    <input id="tridactyl-input"
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
		/* process() */
		break

            case "Escape":
		keyevent.preventDefault()
		this.hide_and_clear()
		break
	}
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

    /* 
     *     
     *     // Refs. Use sparingly.
     *     private cmdline: Commandline
     * 
     *     constructor(props, context) {
     *         super(props, context)
     * 
     *         this.state = {
     *             cmdlineString: "",
     *             renderCmdline: true,
     *             cmdMode: "cmd",
     *         }
     * 
     *         // Commandline callbacks
     *         this.handleCmdlineInput = this.handleCmdlineInput.bind(this)
     *         this.handleCmdlineKeyDown = this.handleCmdlineKeyDown.bind(this)
     *     }
     * 
     *     private setCursor(pos = 0) {
     *         this.cmdline.inputRef.selectionStart = pos
     *         this.cmdline.inputRef.selectionEnd = pos
     *     }
     * 
     *     // Controls the input element's value.
     *     private handleCmdlineInput(event: React.FormEvent<HTMLInputElement>): void {
     *         this.setState({
     *             cmdlineString: event.currentTarget.value,
     *         })
     *     }
     * 
     *     private handleCmdlineKeyDown(event) {
     *         switch (event.key) {
     *             case "Enter":
     *                 this.setState({ cmdlineString: "" })
     *                 //process()
     *                 break
     * 
     *             case "j":
     *                 if (event.ctrlKey) {
     *                     // stop Firefox from giving focus to the omnibar
     *                     event.preventDefault()
     *                     event.stopPropagation()
     *                     //process()
     *                 }
     *                 break
     * 
     *             case "m":
     *                 if (event.ctrlKey) {
     *                     //process()
     *                 }
     *                 break
     * 
     *             case "Escape":
     *                 event.preventDefault()
     *                 //hide_and_clear()
     *                 break
     * 
     *             // Todo: fish-style history search
     *             // persistent history
     *             case "ArrowUp":
     *                 //history(-1)
     *                 break
     * 
     *             case "ArrowDown":
     *                 //history(1)
     *                 break
     * 
     *             case "a":
     *                 if (event.ctrlKey) {
     *                     event.preventDefault()
     *                     event.stopPropagation()
     *                     this.setCursor()
     *                 }
     *                 break
     * 
     *             case "e":
     *                 if (event.ctrlKey) {
     *                     event.preventDefault()
     *                     event.stopPropagation()
     *                     this.setCursor(this.state.cmdlineString.length)
     *                 }
     *                 break
     * 
     *             case "u":
     *                 if (event.ctrlKey) {
     *                     event.preventDefault()
     *                     event.stopPropagation()
     *                     this.setState({
     *                         cmdlineString: this.state.cmdlineString.slice(
     *                             this.cmdline.inputRef.selectionStart,
     *                         ),
     *                     })
     *                     this.setCursor()
     *                 }
     *                 break
     * 
     *             case "k":
     *                 if (event.ctrlKey) {
     *                     event.preventDefault()
     *                     event.stopPropagation()
     *                     this.setState({
     *                         cmdlineString: this.state.cmdlineString.slice(
     *                             0,
     *                             this.cmdline.inputRef.selectionStart,
     *                         ),
     *                     })
     *                 }
     *                 break
     * 
     *             // Clear input on ^C if there is no selection
     *             // should probably just defer to another library
     *             case "c":
     *                 if (
     *                     event.ctrlKey &&
     *                     !event.target.value.substring(
     *                         event.target.selectionStart,
     *                         event.target.selectionEnd,
     *                     )
     *                 ) {
     *                     //hide_and_clear()
     *                     this.setState({ cmdlineString: "" })
     *                 }
     *                 break
     * 
     *             case "f":
     *                 if (event.ctrlKey) {
     *                     // Stop ctrl+f from doing find
     *                     event.preventDefault()
     *                     event.stopPropagation()
     *                     //tabcomplete()
     *                 }
     *                 break
     * 
     *             case "Tab":
     *                 // Stop tab from losing focus
     *                 event.preventDefault()
     *                 event.stopPropagation()
     *                 if (event.shiftKey) {
     *                     //activeCompletions.forEach(comp => comp.prev())
     *                 } else {
     *                     //activeCompletions.forEach(comp => comp.next())
     *                 }
     *                 // tabcomplete()
     *                 break
     * 
     *             //case " ":
     *             //    const command = getCompletion()
     *             //    activeCompletions.forEach(comp => (comp.completion = undefined))
     *             //    if (command) fillcmdline(command, false)
     *             //    break
     *         }
     *     }
     *  */
    
    /* public render() {
     *     const cmdlineString = this.state.cmdlineString
     *     const renderCmdline = this.state.renderCmdline

     *     return (
     *         <div id="tridactyl-container">
     *             <Commandline
     *                 ref={node => {
     *                     if (node) {
     *                         this.cmdline = node
     *                     }
     *                 }}
     *                 handleInput={this.handleCmdlineInput}
     *                 handleKeyDown={this.handleCmdlineKeyDown}
     *                 cmdlineString={cmdlineString}
     *                 isVisible={renderCmdline}
     *                 cmdMode={this.state.cmdMode}
     *             />
     *         </div>
     *     )
     * } */
}
