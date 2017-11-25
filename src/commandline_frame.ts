/** Script used in the commandline iframe. Communicates with background. */

import "./lib/html-tagged-template"

import * as Completions from './completions'
import * as Messaging from './messaging'
import * as SELF from './commandline_frame'
import './number.clamp'
import state from './state'

let activeCompletions: Completions.CompletionSource[] = undefined
let completionsDiv = window.document.getElementById("completions") as HTMLElement
let clInput = window.document.getElementById("tridactyl-input") as HTMLInputElement

/* This is to handle Escape key which, while the cmdline is focused,
 * ends up firing both keydown and input listeners. In the worst case
 * hides the cmdline, shows and refocuses it and replaces its text
 * which could be the prefix to generate a completion.
 * tl;dr TODO: delete this and better resolve race condition
 */
let isVisible = false
function resizeArea() {
    if (isVisible) {
        Messaging.message("commandline_background", "show")
    }
}

// This is a bit loosely defined at the moment.
// Should work so long as there's only one completion source per prefix.
function getCompletion() {
    for (const comp of activeCompletions) {
        if (comp.state === 'normal' && comp.completion !== undefined) {
            return comp.completion
        }
    }
}

function enableCompletions() {
    if (! activeCompletions) {
        activeCompletions = [
            new Completions.BufferCompletionSource(completionsDiv),
            new Completions.HistoryCompletionSource(completionsDiv),
        ]

        const fragment = document.createDocumentFragment()
        activeCompletions.forEach(comp => fragment.appendChild(comp.node))
        completionsDiv.appendChild(fragment)
    }
}
/* document.addEventListener("DOMContentLoaded", enableCompletions) */

export function focus() {
    enableCompletions()
    document.body.classList.remove('hidden')
    clInput.focus()
}

async function sendExstr(exstr) {
    Messaging.message("commandline_background", "recvExStr", [exstr])
}

/* Process the commandline on enter. */
clInput.addEventListener("keydown", function (keyevent) {
    switch (keyevent.key) {
        case "Enter":
            process()
            break

        case "j":
            if (keyevent.ctrlKey){
               process()
            }
            break

        case "m":
            if (keyevent.ctrlKey){
               process()
            }
            break

        case "Escape":
            keyevent.preventDefault()
            hide_and_clear()
            break

        // Todo: fish-style history search
        // persistent history
        case "ArrowUp":
            history(-1)
            break

        case "ArrowDown":
            history(1)
            break

        // Clear input on ^C
        // Todo: hard mode: vi style editing on cli, like set -o mode vi
        // should probably just defer to another library
        case "c":
            if (keyevent.ctrlKey) hide_and_clear()
            break

        case "f":
            if (keyevent.ctrlKey){
                // Stop ctrl+f from doing find
                keyevent.preventDefault()
                keyevent.stopPropagation()
                tabcomplete()
            }
            break

        case "Tab":
            // Stop tab from losing focus
            keyevent.preventDefault()
            keyevent.stopPropagation()
            if (keyevent.shiftKey){
                activeCompletions.forEach(comp =>
                    comp.prev()
                )
            } else {
                activeCompletions.forEach(comp =>
                    comp.next()
                )

            }
            // tabcomplete()
            break

    }
})

clInput.addEventListener("input", () => {
    // Fire each completion and add a callback to resize area
    console.log(activeCompletions)
    activeCompletions.forEach(comp =>
        comp.filter(clInput.value).then(() => resizeArea())
    )
})

let cmdline_history_position = 0
let cmdline_history_current = ""

async function hide_and_clear(){
    clInput.value = ""

    // Try to make the close cmdline animation as smooth as possible.
    document.body.classList.add('hidden')
    Messaging.message('commandline_background', 'hide')
    // Delete all completion sources - I don't think this is required, but this
    // way if there is a transient bug in completions it shouldn't persist.
    activeCompletions.forEach(comp => completionsDiv.removeChild(comp.node))
    activeCompletions = undefined
    isVisible = false
}

function tabcomplete(){
    let fragment = clInput.value
    let matches = state.cmdHistory.filter((key)=>key.startsWith(fragment))
    let mostrecent = matches[matches.length - 1]
    if (mostrecent != undefined) clInput.value = mostrecent
}

function history(n){
    if (cmdline_history_position == 0){
        cmdline_history_current = clInput.value
    }
    let wrapped_ind = state.cmdHistory.length + n - cmdline_history_position
    wrapped_ind = wrapped_ind.clamp(0, state.cmdHistory.length)

    const pot_history = state.cmdHistory[wrapped_ind]
    clInput.value = pot_history == undefined ? cmdline_history_current : pot_history
    cmdline_history_position = cmdline_history_position - n
}

/* Send the commandline to the background script and await response. */
function process() {
    console.log(clInput.value)
    clInput.value = getCompletion() || clInput.value
    console.log(clInput.value)
    sendExstr(clInput.value)

    // Save non-secret commandlines to the history.
    const [func,...args] = clInput.value.trim().split(/\s+/)
    if (! browser.extension.inIncognitoContext &&
        ! (func === 'winopen' && args[0] === '-private')
    ) {
        state.cmdHistory = state.cmdHistory.concat([clInput.value])
    }
    console.log(state.cmdHistory)
    cmdline_history_position = 0

    hide_and_clear()
}

export function fillcmdline(newcommand?: string, trailspace = true){
    if (newcommand !== "") {
        if (trailspace) clInput.value = newcommand + " "
        else clInput.value = newcommand
    }
    // Focus is lost for some reason.
    focus()
    isVisible = true
    clInput.dispatchEvent(new Event('input')) // dirty hack for completions
}

function applyWithTmpTextArea(fn) {
    let textarea
    try {
        textarea = document.createElement("textarea")
        // Scratchpad must be `display`ed, but can be tiny and invisible.
        // Being tiny and invisible means it won't make the parent page move.
        textarea.style.cssText = 'visible: invisible; width: 0; height: 0; position: fixed'
        textarea.contentEditable = "true"
        document.documentElement.appendChild(textarea)
        return fn(textarea)
    } finally {
        document.documentElement.removeChild(textarea)
    }
}

export function setClipboard(content: string) {
    return applyWithTmpTextArea(scratchpad => {
        scratchpad.value = content
        scratchpad.select()
        if (document.execCommand("Copy")) {
            // // todo: Maybe we can consider to using some logger and show it with status bar in the future
            console.log('set clipboard:', scratchpad.value)
        } else throw "Failed to copy!"
    })
}

export function getClipboard() {
    return applyWithTmpTextArea(scratchpad => {
        scratchpad.focus()
        document.execCommand("Paste")
        console.log('get clipboard', scratchpad.textContent)
        return scratchpad.textContent
    })
}

Messaging.addListener('commandline_frame', Messaging.attributeCaller(SELF))
