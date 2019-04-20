import { messageOwnTab, message } from "@src/lib/messaging"

export function getCommandlineFns(cmdline_state) {
    return {
        /**
         * Insert the first command line history line that starts with the content of the command line in the command line.
         */
        "complete": () => {
            const fragment = cmdline_state.clInput.value
            const matches = cmdline_state.state.cmdHistory.filter(key => key.startsWith(fragment))
            const mostrecent = matches[matches.length - 1]
            if (mostrecent !== undefined) cmdline_state.clInput.value = mostrecent
            return cmdline_state.refresh_completions(cmdline_state.clInput.value)
        },

        /**
         * Selects the next completion.
         */
        "next_completion": () => {
            if (cmdline_state.activeCompletions) cmdline_state.activeCompletions.forEach(comp => comp.next())
        },

        /**
         * Selects the previous completion.
         */
        "prev_completion": () => {
            if (cmdline_state.activeCompletions) cmdline_state.activeCompletions.forEach(comp => comp.prev())
        },

        /**
         * Deselects the currently selected completion.
         */
        "deselect_completion": () => {
            if (cmdline_state.activeCompletions) cmdline_state.activeCompletions.forEach(comp => comp.deselect())
        },

        /**
         * Inserts the currently selected completion and a space in the command line.
         */
        "insert_completion": () => {
            const command = cmdline_state.getCompletion()
            if (cmdline_state.activeCompletions) {
                cmdline_state.activeCompletions.forEach(comp => (comp.completion = undefined))
            }
            let result = Promise.resolve([])
            if (command) {
                cmdline_state.clInput.value = command + " "
                result = cmdline_state.refresh_completions(cmdline_state.clInput.value)
            }
            return result
        },

        /**
         * If a completion is selected, inserts it in the command line with a space.
         * If no completion is selected, inserts a space where the caret is.
         */
        "insert_space_or_completion": () => {
            const command = cmdline_state.getCompletion()
            if (cmdline_state.activeCompletions) {
                cmdline_state.activeCompletions.forEach(comp => (comp.completion = undefined))
            }
            if (command) {
                cmdline_state.clInput.value = command + " "
            } else {
                const selectionStart = cmdline_state.clInput.selectionStart
                const selectionEnd = cmdline_state.clInput.selectionEnd
                cmdline_state.clInput.value =
                    cmdline_state.clInput.value.substring(0, selectionStart) +
                    " " +
                    cmdline_state.clInput.value.substring(selectionEnd)
                cmdline_state.clInput.selectionStart = cmdline_state.clInput.selectionEnd = selectionStart + 1
            }
            return cmdline_state.refresh_completions(cmdline_state.clInput.value)
        },

        /** Hide the command line and cmdline_state.clear its content without executing it. **/
        "hide_and_clear": () => {
            cmdline_state.clear(true)
            cmdline_state.keyEvents = []

            // Try to make the close cmdline animation as smooth as possible.
            messageOwnTab("commandline_content", "hide")
            messageOwnTab("commandline_content", "blur")
            // Delete all completion sources - I don't think this is required, but this
            // way if there is a transient bug in completions it shouldn't persist.
            if (cmdline_state.activeCompletions)
                cmdline_state.activeCompletions.forEach(comp => cmdline_state.completionsDiv.removeChild(comp.node))
            cmdline_state.activeCompletions = undefined
            cmdline_state.isVisible = false
        },

        /**
         * Selects the next history line.
         */
        "next_history": () => {
            return cmdline_state.history(1)
        },

        /**
         * Selects the prev history line.
         */
        "prev_history": () => {
            return cmdline_state.history(-1)
        },
        /**
         * Execute the content of the command line and hide it.
         **/
        "accept_line": () => {
            const command = cmdline_state.getCompletion() || cmdline_state.clInput.value

            cmdline_state.fns.hide_and_clear()

            const [func, ...args] = command.trim().split(/\s+/)

            if (func.length === 0 || func.startsWith("#")) {
                return
            }

            // Save non-secret commandlines to the history.
            if (
                !browser.extension.inIncognitoContext &&
                !(func === "winopen" && args[0] === "-private")
            ) {
                cmdline_state.state.cmdHistory = cmdline_state.state.cmdHistory.concat([command])
            }
            cmdline_state.cmdline_history_position = 0

            return message("controller_background", "acceptExCmd", [command])
        },
    }
}
