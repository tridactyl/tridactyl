import {MsgSafeNode} from './msgsafe'
// From saka-key lib/dom.js, under Apachev2

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
