/** # Command line functions
 *
 * This file contains functions to interact with the command line.
 *
 * If you want to bind them to keyboard shortcuts, be sure to prefix them with "ex.". For example, if you want to bind control-p to `prev_completion`, use:
 *
 * ```
 * bind --mode=ex <C-p> ex.prev_completion
 * ```
 *
 * Note that you can also bind Tridactyl's [editor functions](/static/docs/modules/_src_lib_editor_.html) in the command line.
 *
 * Contrary to the main tridactyl help page, this one doesn't tell you whether a specific function is bound to something. For now, you'll have to make do with `:bind` and `:viewconfig`.
 *
 */
/** ignore this line */

/** Script used in the commandline iframe. Communicates with background. */

import * as perf from "@src/perf"
import "@src/lib/number.clamp"
import "@src/lib/html-tagged-template"
import * as Completions from "@src/completions"
import { TabAllCompletionSource } from "@src/completions/TabAll"
import { BufferCompletionSource } from "@src/completions/Tab"
import { BmarkCompletionSource } from "@src/completions/Bmark"
import { ExcmdCompletionSource } from "@src/completions/Excmd"
import { FileSystemCompletionSource } from "@src/completions/FileSystem"
import { HelpCompletionSource } from "@src/completions/Help"
import { HistoryCompletionSource } from "@src/completions/History"
import { PreferenceCompletionSource } from "@src/completions/Preferences"
import { SettingsCompletionSource } from "@src/completions/Settings"
import * as Messaging from "@src/lib/messaging"
import * as Config from "@src/lib/config"
import "@src/lib/number.clamp"
import state from "@src/state"
import Logger from "@src/lib/logging"
import { theme } from "@src/content/styling"

import * as genericParser from "@src/parsers/genericmode"
import * as tri_editor from "@src/lib/editor"

/** @hidden **/
const logger = new Logger("cmdline")

/** @hidden **/
let activeCompletions: Completions.CompletionSource[] = undefined
/** @hidden **/
let completionsDiv = window.document.getElementById(
    "completions",
) as HTMLElement
/** @hidden **/
let clInput = window.document.getElementById(
    "tridactyl-input",
) as HTMLInputElement

// first theming of commandline iframe
theme(document.querySelector(":root"))

/** @hidden
 * This is to handle Escape key which, while the cmdline is focused,
 * ends up firing both keydown and input listeners. In the worst case
 * hides the cmdline, shows and refocuses it and replaces its text
 * which could be the prefix to generate a completion.
 * tl;dr TODO: delete this and better resolve race condition
 */
let isVisible = false
/** @hidden **/
function resizeArea() {
    if (isVisible) {
        Messaging.messageOwnTab("commandline_content", "show")
        Messaging.messageOwnTab("commandline_content", "focus")
        focus()
    }
}

/** @hidden
 * This is a bit loosely defined at the moment.
 * Should work so long as there's only one completion source per prefix.
 */
function getCompletion() {
    if (!activeCompletions) return undefined

    for (const comp of activeCompletions) {
        if (comp.state === "normal" && comp.completion !== undefined) {
            return comp.completion
        }
    }
}

/** @hidden **/
export function enableCompletions() {
    if (!activeCompletions) {
        activeCompletions = [
            BmarkCompletionSource,
            TabAllCompletionSource,
            BufferCompletionSource,
            ExcmdCompletionSource,
            FileSystemCompletionSource,
            HelpCompletionSource,
            HistoryCompletionSource,
            PreferenceCompletionSource,
            SettingsCompletionSource,
        ]
            .map(constructorr => {
                try {
                    return new constructorr(completionsDiv)
                } catch (e) {}
            })
            .filter(c => c)

        const fragment = document.createDocumentFragment()
        activeCompletions.forEach(comp => fragment.appendChild(comp.node))
        completionsDiv.appendChild(fragment)
        logger.debug(activeCompletions)
    }
}
/* document.addEventListener("DOMContentLoaded", enableCompletions) */

/** @hidden **/
let noblur = e => setTimeout(() => clInput.focus(), 0)

/** @hidden **/
export function focus() {
    clInput.focus()
    clInput.addEventListener("blur", noblur)
}

/** @hidden **/
async function sendExstr(exstr) {
    Messaging.message("commandline_background", "recvExStr", [exstr])
}

/** @hidden **/
let HISTORY_SEARCH_STRING: string

/** @hidden
 * Command line keybindings
 **/
let keyParser = keys => genericParser.parser("exmaps", keys)
/** @hidden **/
let keyEvents = []
/** @hidden **/
clInput.addEventListener(
    "keydown",
    function(keyevent: KeyboardEvent) {
        keyEvents.push(keyevent)
        let response = keyParser(keyEvents)
        if (response.isMatch) {
            keyevent.preventDefault()
            keyevent.stopImmediatePropagation()
        }
        if (response.exstr) {
            keyEvents = []
            Messaging.message("controller_background", "acceptExCmd", [
                response.exstr,
            ])
        } else {
            keyEvents = response.keys
        }
    },
    true,
)

/**
 * Insert the first command line history line that starts with the content of the command line in the command line.
 */
export function complete() {
    let fragment = clInput.value
    let matches = state.cmdHistory.filter(key => key.startsWith(fragment))
    let mostrecent = matches[matches.length - 1]
    if (mostrecent != undefined) clInput.value = mostrecent
    return refresh_completions(clInput.value)
}

/**
 * Selects the next completion.
 */
export function next_completion() {
    if (activeCompletions) activeCompletions.forEach(comp => comp.next())
}

/**
 * Selects the previous completion.
 */
export function prev_completion() {
    if (activeCompletions) activeCompletions.forEach(comp => comp.prev())
}

/**
 * Inserts the currently selected completion and a space in the command line.
 */
export function insert_completion() {
    const command = getCompletion()
    if (activeCompletions) {
        activeCompletions.forEach(comp => (comp.completion = undefined))
    }
    let result = Promise.resolve([])
    if (command) {
        clInput.value = command + " "
        result = refresh_completions(clInput.value)
    }
    return result
}

/**
 * If a completion is selected, inserts it in the command line with a space.
 * If no completion is selected, inserts a space where the caret is.
 */
export function insert_space_or_completion() {
    const command = getCompletion()
    if (activeCompletions) {
        activeCompletions.forEach(comp => (comp.completion = undefined))
    }
    if (command) {
        clInput.value = command + " "
    } else {
        const selectionStart = clInput.selectionStart
        const selectionEnd = clInput.selectionEnd
        clInput.value =
            clInput.value.substring(0, selectionStart) +
            " " +
            clInput.value.substring(selectionEnd)
        clInput.selectionStart = clInput.selectionEnd = selectionStart + 1
    }
    return refresh_completions(clInput.value)
}

export function refresh_completions(exstr) {
    if (!activeCompletions) enableCompletions()
    return Promise.all(
        activeCompletions.map(comp => comp.filter(exstr).then(resizeArea)),
    )
}

/** @hidden **/
let timeoutId: any = 0
/** @hidden **/
let onInputPromise: Promise<any> = Promise.resolve()
/** @hidden **/
clInput.addEventListener("input", () => {
    const exstr = clInput.value
    // Prevent starting previous completion computation if possible
    clearTimeout(timeoutId)
    // Schedule completion computation. We do not start computing immediately because this would incur a slow down on quickly repeated input events (e.g. maintaining <Backspace> pressed)
    let myTimeoutId = setTimeout(async () => {
        try {
            // Make sure the previous computation has ended
            await onInputPromise
        } catch (e) {
            // we don't actually care because this is the previous computation, which we will throw away
            logger.warning(e)
        }

        // If we're not the current completion computation anymore, stop
        if (timeoutId != myTimeoutId) return

        onInputPromise = refresh_completions(exstr)
    }, 100)
    // Declare self as current completion computation
    timeoutId = myTimeoutId
})

/** @hidden **/
let cmdline_history_position = 0
/** @hidden **/
let cmdline_history_current = ""

/** @hidden
 * Clears the command line.
 * If you intend to close the command line after this, set evlistener to true in order to enable losing focus.
 *  Otherwise, no need to pass an argument.
 */
export function clear(evlistener = false) {
    if (evlistener) clInput.removeEventListener("blur", noblur)
    clInput.value = ""
    cmdline_history_position = 0
    cmdline_history_current = ""
}

/** Hide the command line and clear its content without executing it. **/
export async function hide_and_clear() {
    clear(true)
    keyEvents = []

    // Try to make the close cmdline animation as smooth as possible.
    Messaging.messageOwnTab("commandline_content", "hide")
    Messaging.messageOwnTab("commandline_content", "blur")
    // Delete all completion sources - I don't think this is required, but this
    // way if there is a transient bug in completions it shouldn't persist.
    if (activeCompletions)
        activeCompletions.forEach(comp => completionsDiv.removeChild(comp.node))
    activeCompletions = undefined
    isVisible = false
}

/** @hidden **/
function setCursor(n = 0) {
    clInput.setSelectionRange(n, n, "none")
}

/**
 * Selects the next history line.
 */
export function next_history() {
    return history(1)
}

/**
 * Selects the prev history line.
 */
export function prev_history() {
    return history(-1)
}

/** @hidden **/
function history(n) {
    HISTORY_SEARCH_STRING =
        HISTORY_SEARCH_STRING === undefined
            ? clInput.value
            : HISTORY_SEARCH_STRING
    let matches = state.cmdHistory.filter(key =>
        key.startsWith(HISTORY_SEARCH_STRING),
    )
    if (cmdline_history_position == 0) {
        cmdline_history_current = clInput.value
    }
    let clamped_ind = matches.length + n - cmdline_history_position
    clamped_ind = clamped_ind.clamp(0, matches.length)

    const pot_history = matches[clamped_ind]
    clInput.value =
        pot_history == undefined ? cmdline_history_current : pot_history

    // if there was no clampage, update history position
    // there's a more sensible way of doing this but that would require more programmer time
    if (clamped_ind == matches.length + n - cmdline_history_position)
        cmdline_history_position = cmdline_history_position - n
}

/**
 * Execute the content of the command line and hide it.
 **/
export function accept_line() {
    const command = getCompletion() || clInput.value

    hide_and_clear()

    const [func, ...args] = command.trim().split(/\s+/)

    if (func.length === 0 || func.startsWith("#")) {
        return
    }

    // Save non-secret commandlines to the history.
    if (
        !browser.extension.inIncognitoContext &&
        !(func === "winopen" && args[0] === "-private")
    ) {
        state.cmdHistory = state.cmdHistory.concat([command])
    }
    cmdline_history_position = 0

    sendExstr(command)
}

/** @hidden **/
export function fillcmdline(
    newcommand?: string,
    trailspace = true,
    ffocus = true,
) {
    if (trailspace) clInput.value = newcommand + " "
    else clInput.value = newcommand
    isVisible = true
    let result = Promise.resolve([])
    // Focus is lost for some reason.
    if (ffocus) {
        focus()
        result = refresh_completions(clInput.value)
    }
    return result
}

/** @hidden
 * Create a temporary textarea and give it to fn. Remove the textarea afterwards
 *
 * Useful for document.execCommand
 **/
function applyWithTmpTextArea(fn) {
    let textarea
    try {
        textarea = document.createElement("textarea")
        // Scratchpad must be `display`ed, but can be tiny and invisible.
        // Being tiny and invisible means it won't make the parent page move.
        textarea.style.cssText =
            "visible: invisible; width: 0; height: 0; position: fixed"
        textarea.contentEditable = "true"
        document.documentElement.appendChild(textarea)
        return fn(textarea)
    } finally {
        document.documentElement.removeChild(textarea)
    }
}

/** @hidden **/
export async function setClipboard(content: string) {
    await Messaging.messageOwnTab("commandline_content", "focus")
    applyWithTmpTextArea(scratchpad => {
        scratchpad.value = content
        scratchpad.select()
        if (document.execCommand("Copy")) {
            // // todo: Maybe we can consider to using some logger and show it with status bar in the future
            logger.info("set clipboard:", scratchpad.value)
        } else throw "Failed to copy!"
    })
    // Return focus to the document
    await Messaging.messageOwnTab("commandline_content", "hide")
    return Messaging.messageOwnTab("commandline_content", "blur")
}

/** @hidden **/
export async function getClipboard() {
    await Messaging.messageOwnTab("commandline_content", "focus")
    const result = applyWithTmpTextArea(scratchpad => {
        scratchpad.focus()
        document.execCommand("Paste")
        return scratchpad.textContent
    })
    // Return focus to the document
    await Messaging.messageOwnTab("commandline_content", "hide")
    await Messaging.messageOwnTab("commandline_content", "blur")
    return result
}

/** @hidden **/
export function getContent() {
    return clInput.value
}

/** @hidden **/
export function editor_function(fn_name, ...args) {
    let result = Promise.resolve([])
    if (tri_editor[fn_name]) {
        tri_editor[fn_name](clInput, ...args)
        result = refresh_completions(clInput.value)
    } else {
        // The user is using the command line so we can't log message there
        // logger.error(`No editor function named ${fn_name}!`)
        console.error(`No editor function named ${fn_name}!`)
    }
    return result
}

import * as SELF from "@src/commandline_frame"
Messaging.addListener("commandline_frame", Messaging.attributeCaller(SELF))

// Listen for statistics from the commandline iframe and send them to
// the background for collection. Attach the observer to the window
// object since there's apparently a bug that causes performance
// observers to be GC'd even if they're still the target of a
// callback.
;(window as any).tri = Object.assign(window.tri || {}, {
    perfObserver: perf.listenForCounters(),
})
