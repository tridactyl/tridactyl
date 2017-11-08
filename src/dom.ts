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

/**
 * Dispatch a mouse event to the target element
 * based on cVim's implementation
 * @param {HTMLElement} element
 * @param {'hover' | 'unhover' | 'click'} type
 * @param {{ ctrlKey, shiftKey, altKey, metaKey }} modifierKeys
 */
export function mouseEvent (element: Element, type: 'hover'|'unhover'|'click', modifierKeys = {}) {
  let events
  switch (type) {
    case 'hover':
      events = ['mouseover', 'mouseenter', 'mousemove']
      break
    case 'unhover':
      events = ['mousemove', 'mouseout', 'mouseleave']
      break
    case 'click':
      events = ['mouseover', 'mousedown', 'mouseup', 'click']
      break
  }
  events.forEach(type => {
    const event = new MouseEvent(type, {
      bubbles: true,
      cancelable: true,
      view: window,
      detail: 1, // usually the click count
      ...modifierKeys
    })
    element.dispatchEvent(event)
  })
}

/** Iterable of elements that match xpath.

    Adapted from stackoverflow
*/
export function* elementsByXPath(xpath, parent?)
{
  let query = document.evaluate(xpath,
      parent || document,
      null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
  for (let i=0, length=query.snapshotLength; i<length; ++i) {
    yield query.snapshotItem(i);
  }
}


// Saka-key caches getComputedStyle. Maybe it's a good idea!
/* let cgetComputedStyle = cacheDecorator(getComputedStyle) */

/** is the element within a rect and not obscured by another element?

    From: https://github.com/lusakasa/saka-key/blob/9f560b3a718a9efda809dcb794de14b4e675b35a/src/modes/hints/client/findHints.js#L97
    Based on https://github.com/guyht/vimari/blob/master/vimari.safariextension/linkHints.js

*/
export function isVisible (element: Element) {
    const clientRect = element.getClientRects()[0]
    const computedStyle = getComputedStyle(element)
    // remove elements that are barely within the viewport, tiny, or invisible
    switch (true) {
        case !clientRect:
        case clientRect.top < 0:
        case clientRect.top >= innerHeight - 4:
        case clientRect.left < 0:
        case clientRect.left >= innerWidth - 4:
        case clientRect.width < 3:
        case clientRect.height < 3:
        case computedStyle.visibility !== 'visible':
        case computedStyle.display === 'none':
            return false
    }

    // Eliminate elements hidden by another overlapping element.
    // To do that, get topmost element at some offset from upper-left corner of clientRect
    // and check whether it is the element itself or one of its descendants.
    // The offset is needed to account for coordinates truncation and elements with rounded borders.
    //
    // Coordinates truncation occcurs when using zoom. In that case, clientRect coords should be float,
    // but we get integers instead. That makes so that elementFromPoint(clientRect.left, clientRect.top)
    // sometimes returns an element different from the one clientRect was obtained from.
    // So we introduce an offset to make sure elementFromPoint hits the right element.
    //
    // For elements with a rounded topleft border, the upper left corner lies outside the element.
    // Then, we need an offset to get to the point nearest to the upper left corner, but within border.
    const coordTruncationOffset = 2 // A value of 1 has been observed not to be enough,
    // so we heuristically choose 2, which seems to work well.
    // We know a value of 2 is still safe (lies within the element) because,
    // from the code above, widht & height are >= 3.
    const radius = parseFloat(computedStyle.borderTopLeftRadius)
    const roundedBorderOffset = Math.ceil(radius * (1 - Math.sin(Math.PI / 4)))
    const offset = Math.max(coordTruncationOffset, roundedBorderOffset)
    if (offset >= clientRect.width || offset >= clientRect.height) {
        return false
    }
    let el: Node = document.elementFromPoint(
        clientRect.left + offset,
        clientRect.top + offset
    )
    while (el && el !== element) {
        el = el.parentNode
    }
    if (!el) {
        return false
    }
    return true
}
