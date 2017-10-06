import {MsgSafeKeyboardEvent, MsgSafeNode} from './msgsafe'
import * as Parsing from "./parsing"
import state from "./state"

// {{{ From saka-key lib/dom.js, under Apachev2

/**
 * Given a DOM element, returns true if you can edit it with key presses or
 * if the element is of a type that should handle its own keypresses
 * (e.g. role=application for google docs/sheets)
 * TODO: work on case sensitivity
 * consider all the possible cases
 * @param {HTMLElement} element
 * @returns {boolean}
 */
export function isTextEditable (element: MsgSafeNode) {
  if (element) {
    switch (element.nodeName) {
      case 'INPUT':
        return isEditableHTMLInput(element)
      case 'TEXTAREA':
      case 'OBJECT':
        return true
    }
    switch (true) {
      case element.contentEditable.toUpperCase() === 'TRUE':
      case element.role === 'application':
        return true
    }
  }
  return false
}

/**
 * Returns whether the passed HTML input element is editable
 * @param {HTMLInputElement} element
 */
function isEditableHTMLInput (element: MsgSafeNode) {
  if (element.disabled || element.readonly) return false
  switch (element.type) {
    case undefined:
    case 'text':
    case 'search':
    case 'email':
    case 'url':
    case 'number':
    case 'password':
    case 'date':
    case 'tel':
      return true
  }
  return false
}

// }}}

/** Accepts keyevents, resolves them to maps, maps to exstrs, executes exstrs */
function *ParserController () {
    while (true) {
        let ex_str = ""
        let keys = []
        try {
            while (true) { 
                let keyevent: MsgSafeKeyboardEvent = yield
                let keypress = keyevent.key

                if (isTextEditable(keyevent.target)) {
                    state.mode = "INSERT"
                } else {
                    state.mode = "NORMAL"
                }
                console.log(keyevent, state.mode)

                // Special keys (e.g. Backspace) are not handled properly
                // yet. So drop them. This also drops all modifier keys.
                // When we put in handling for other special keys, remember
                // to continue to ban modifiers.
                if (keypress.length > 1) {
                    continue
                }

                keys.push(keypress)
                let response = Parsing.normalmode.parser(keys)
                switch(state.mode){
                    case "NORMAL":
                        response = Parsing.normalmode.parser(keys)
                        break

                    case "INSERT":
                        response = Parsing.insertmode.parser(keys)
                        break
                }

                console.debug(keys, response)

                if (response.ex_str){
                    ex_str = response.ex_str
                    break
                } else {
                    keys = response.keys
                }
            }
            acceptExCmd(ex_str)
        } catch (e) {
            // Rumsfeldian errors are caught here
            console.error("Tridactyl ParserController fatally wounded:", e)
        }
    }
}

let generator = ParserController() // var rather than let stops weirdness in repl.
generator.next()

/** Feed keys to the ParserController */
export function acceptKey(keyevent: MsgSafeKeyboardEvent) {
    generator.next(keyevent)
}

/** Parse and execute ExCmds */
export function acceptExCmd(ex_str: string) {
    // TODO: Errors should go to CommandLine.
    try {
        let [func, args] = Parsing.exmode.parser(ex_str)
        try {
            func(...args)
        } catch (e) {
            // Errors from func are caught here (e.g. no next tab)
            console.error(e)
        }
    } catch (e) {
        // Errors from parser caught here
        console.error(e)
    }
}
