import * as React from "react"
import * as Messaging from "@src/lib/messaging"
import * as Styling from "@src/lib/styling"
import { configureStore } from "@src/cliframe/store"
import Logger from "@src/lib/logging"
import TriCompletions from "@src/cliframe/components/TriCompletions"
import TriCommandLine from "@src/cliframe/components/TriCommandLine"

const logger = new Logger("cmdline")

/** The tridactyl UI container.
 *
 *  TODO: The `tridactyl-input-symbol` is traditionally a ':' but should also be able to show '/' when in find mode.
 *  TODO: hard mode: vi style editing on cli, like set -o mode vi
 *
 */
export default class TriCliFrame extends React.Component<any, any> {
    constructor(
        props,
        context,
        private inputRef = React.createRef<HTMLInputElement>(),
        private store = configureStore({
            completions: [],
            currentCliInput: "",
        }),
    ) {
        super(props, context)
    }

    componentDidMount() {
        Styling.theme(document.querySelector(":root"))
    }

    public render() {
        return(
            <div id="tridactyl-commandline-root">
                <TriCompletions store={this.store} />
                <TriCommandLine store={this.store} />
            </div>
        )
    }

    // private handleKeyDown(keyevent) {
    //     switch (keyevent.key) {
    //         case "Enter":
    //             this.process()
    //             this.hide_and_clear()
    //             break
    // 
    //         case "j":
    //             /* Just like hitting enter, but we need to keep firefox
    //              * from focusing the omnibar. */
    //             if (keyevent.ctrlKey) {
    //                 keyevent.preventDefault()
    //                 keyevent.stopPropagation()
    //                 this.process()
    //                 this.hide_and_clear()
    //             }
    //             break
    // 
    //         case "m":
    //             /* Just like hitting enter, but we need to keep firefox
    //              * from doing whatever it does with the key. */
    //             if (keyevent.ctrlKey) {
    //                 keyevent.preventDefault()
    //                 keyevent.stopPropagation()
    //                 this.process()
    //                 this.hide_and_clear()
    //             }
    //             break
    // 
    //         case "a":
    //             if (keyevent.ctrlKey) {
    //                 keyevent.preventDefault()
    //                 keyevent.stopPropagation()
    //                 this.setCursor()
    //             }
    //             break
    // 
    //         case "e":
    //             if (keyevent.ctrlKey) {
    //                 keyevent.preventDefault()
    //                 keyevent.stopPropagation()
    //                 this.setCursor(this.state.commandlineContents.length)
    //             }
    //             break
    // 
    //         case "Tab":
    //             /* Keep the input from losing focus*/
    //             keyevent.preventDefault()
    //             keyevent.stopPropagation()
    //             if (keyevent.shiftKey) {
    //                 this.activeCompletions.forEach(comp => comp.prev())
    //             } else {
    //                 this.activeCompletions.forEach(comp => comp.next())
    //             }
    //             break
    // 
    //         case " ":
    //             const command = this.getCompletion()
    //             this.activeCompletions.forEach(comp => (comp.completion = undefined))
    //             if (command) this.fillcmdline(command, false)
    //             break
    // 
    //         case "Escape":
    //             keyevent.preventDefault()
    //             this.hide_and_clear()
    //             break
    //     }
    // }
    // 
    // private setCursor(n = 0) {
    //     this.inputRef.current.setSelectionRange(n, n, "none")
    // }
    // 
    // private hide_and_clear() {
    //     // Delete all completion sources - I don't think this is required, but this
    //     // way if there is a transient bug in completions it shouldn't persist.
    //     this.activeCompletions = []
    // 
    //     this.setState({
    //         commandlineContents: "",
    //     })
    // 
    //     Messaging.message("commandline_background", "hide")
    // }
    // 
    // private handleInputUpdate(updateevent) {
    //     this.setState({
    //         commandlineContents: updateevent.target.value,
    //     })
    // 
    //     this.enableCompletions()
    //     logger.debug(this.activeCompletions)
    //     this.activeCompletions.forEach(comp =>
    //         comp.filter(this.state.commandlineContents)
    //         /* .then(() => this.resizeArea()), */
    //     )
    // }
    // 
    // /* Send the commandline to the background script and await response. */
    // private async process() {
    //     const command = this.state.commandlineContents
    //     const [func, ...args] = command.trim().split(/\s+/)
    //     if (func.length === 0 || func.startsWith("#")) {
    //         return
    //     }
    //     this.sendExstr(command)
    // }
    // 
    // private async sendExstr(exstr) {
    //     Messaging.message("commandline_background", "recvExStr", [exstr])
    // }
    // 
    // // This is a bit loosely defined at the moment.
    // // Should work so long as there's only one completion source per prefix.
    // private getCompletion() {
    //     for (const comp of this.activeCompletions) {
    //         if (comp.hidden === "normal" && comp.completion !== undefined) {
    //             return comp.completion
    //         }
    //     }
    // }
    // 
    // private enableCompletions() {
    //     /* if (this.activeCompletions.length === 0) {
    //      *     this.activeCompletions = [
    //      *         // This won't work at all and may require redux.
    //      *         <BmarkCompletionSource />,
    //      *         <BufferAllCompletionSource />,
    //      *         <BufferCompletionSource />,
    //      *         <ExcmdCompletionSource />,
    //      *         <SettingsCompletionSource />,
    //      *         <HistoryCompletionSource />,
    //      *     ]
    //      * } */
    // }
    // 
    // public fillcmdline(
    //     newcommand?: string,
    //     trailspace = true
    // ) {
    //     if (trailspace) this.setState({commandlineContents: newcommand + " "})
    //     else this.setState({commandlineContents: newcommand})
    // 
    //     // Focus is lost for some reason.
    //     this.inputRef.current.focus()
    //     this.inputRef.current.dispatchEvent(new Event("input")) // dirty hack for completions
    // }
}
