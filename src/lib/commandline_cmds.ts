import { messageOwnTab } from "../lib/messaging"
import * as State from "../state"
import { contentState } from "../content/state_content"

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))

async function awaitProxyEq(proxy, a: string, b: string) {
    let counter = 0
    while (proxy[a] != proxy[b] && counter < 50) {
        await sleep(10)
        counter += 1
    }
    return proxy[a] == proxy[b]
}

// One day we'll use typeof commandline_state from commandline_frame.ts
export function getCommandlineFns(cmdline_state: {
    [otherStuff: string]: any
    fns: ReturnType<typeof getCommandlineFns>
}) {
    return {
        /**
         * Insert the first command line history line that starts with the content of the command line in the command line.
         */
        complete: async () => {
            const fragment = cmdline_state.clInput.value
            const matches = (await State.getAsync("cmdHistory")).filter(key =>
                key.startsWith(fragment),
            )
            const mostrecent = matches[matches.length - 1]
            if (mostrecent !== undefined)
                cmdline_state.clInput.value = mostrecent
            return cmdline_state.refresh_completions(
                cmdline_state.clInput.value,
            )
        },

        /**
         * Selects the next completion.
         */
        next_completion: async () => {
            await awaitProxyEq(
                contentState,
                "current_cmdline",
                "cmdline_filter",
            )
            if (cmdline_state.activeCompletions)
                cmdline_state.activeCompletions.forEach(comp => comp.next())
        },

        /**
         * Selects the previous completion.
         */
        prev_completion: async () => {
            await awaitProxyEq(
                contentState,
                "current_cmdline",
                "cmdline_filter",
            )
            if (cmdline_state.activeCompletions)
                cmdline_state.activeCompletions.forEach(comp => comp.prev())
        },

        /**
         * Deselects the currently selected completion.
         */
        deselect_completion: () => {
            if (cmdline_state.activeCompletions)
                cmdline_state.activeCompletions.forEach(comp => comp.deselect())
        },

        /**
         * Inserts the currently selected completion and a space in the command line.
         */
        insert_completion: async () => {
            await awaitProxyEq(
                contentState,
                "current_cmdline",
                "cmdline_filter",
            )
            const command = cmdline_state.getCompletion()
            if (cmdline_state.activeCompletions) {
                cmdline_state.activeCompletions.forEach(
                    comp => (comp.completion = undefined),
                )
            }
            let result = Promise.resolve([])
            if (command) {
                cmdline_state.clInput.value = command + " "
                result = cmdline_state.refresh_completions(
                    cmdline_state.clInput.value,
                )
            }
            return result
        },

        /**
         * If a completion is selected, inserts it in the command line with a space.
         * If no completion is selected, inserts a space where the caret is.
         */
        insert_space_or_completion: () => {
            const command = cmdline_state.getCompletion()
            if (cmdline_state.activeCompletions) {
                cmdline_state.activeCompletions.forEach(
                    comp => (comp.completion = undefined),
                )
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
                cmdline_state.clInput.selectionStart = cmdline_state.clInput.selectionEnd =
                    selectionStart + 1
            }
            return cmdline_state.refresh_completions(
                cmdline_state.clInput.value,
            )
        },

        /** Hide the command line and cmdline_state.clear its content without executing it. **/
        hide_and_clear: () => {
            cmdline_state.clear(true)
            cmdline_state.keyEvents = []

            // Try to make the close cmdline animation as smooth as possible.
            messageOwnTab("commandline_content", "hide")
            messageOwnTab("commandline_content", "blur")
            // Delete all completion sources - I don't think this is required, but this
            // way if there is a transient bug in completions it shouldn't persist.
            if (cmdline_state.activeCompletions)
                cmdline_state.activeCompletions.forEach(comp =>
                    cmdline_state.completionsDiv.removeChild(comp.node),
                )
            cmdline_state.activeCompletions = undefined
            cmdline_state.isVisible = false
        },

        /**
         * Check if the command is valid
         */
        is_valid_commandline: (command: string): boolean => {
            if (command === undefined) return false

            const func = command.trim().split(/\s+/)[0]

            if (func.length === 0 || func.startsWith("#")) {
                return false
            }
            return true
        },

        /**
         * Save non-secret commands to the cmdHistory and update the cmdline_history_position
         */
        store_ex_string: (command: string) => {
            const [func, ...args] = command.trim().split(/\s+/)

            // Save non-secret commandlines to the history.
            if (
                !browser.extension.inIncognitoContext &&
                !(func === "winopen" && args[0] === "-private")
            ) {
                State.getAsync("cmdHistory").then(c => {
                    cmdline_state.state.cmdHistory = c.concat([command])
                })
                cmdline_state.cmdline_history_position = 0
            }
        },

        /**
         * Selects the next history line.
         */
        next_history: () => cmdline_state.history(1),

        /**
         * Selects the prev history line.
         */
        prev_history: () => cmdline_state.history(-1),
        /**
         * Execute the content of the command line and hide it.
         **/
        accept_line: async () => {
            await awaitProxyEq(
                contentState,
                "current_cmdline",
                "cmdline_filter",
            )
            const command =
                cmdline_state.getCompletion() || cmdline_state.clInput.value

            cmdline_state.fns.hide_and_clear()

            if (cmdline_state.fns.is_valid_commandline(command) === false)
                return

            cmdline_state.fns.store_ex_string(command)

            // Send excmds directly to our own tab, which fixes the
            // old bug where a command would be issued in one tab but
            // land in another because the active tab had
            // changed. Background-mode excmds will be received by the
            // own tab's content script and then bounced through a
            // shim to the background, but the latency increase should
            // be acceptable becuase the background-mode excmds tend
            // to be a touch less latency-sensitive.
            return messageOwnTab("controller_content", "acceptExCmd", [command])
        },

        execute_ex_on_completion_args: (excmd: string) =>
            execute_ex_on_x(true, cmdline_state, excmd),

        execute_ex_on_completion: (excmd: string) =>
            execute_ex_on_x(false, cmdline_state, excmd),

        copy_completion: () => {
            const command = cmdline_state.getCompletion()
            cmdline_state.fns.hide_and_clear()
            return messageOwnTab("controller_content", "acceptExCmd", [
                "clipboard yank " + command,
            ])
        },
    }
}

function execute_ex_on_x(args_only: boolean, cmdline_state, excmd: string) {
    const args =
        cmdline_state.getCompletion(args_only) || cmdline_state.clInput.value

    const cmdToExec = (excmd ? excmd + " " : "") + args
    cmdline_state.fns.store_ex_string(cmdToExec)

    return messageOwnTab("controller_content", "acceptExCmd", [cmdToExec])
}
