/** Shim for the keyboard API because it won't hit in FF57. */

// {{{ Helper functions

function pick (o, ...props) {
    return Object.assign({}, ...props.map(prop => ({[prop]: o[prop]})))
}

// Shallow copy of keyevent.
function shallowKeyboardEvent (ke): Event {
  let shallow = pick(
    ke,
    'shiftKey', 'metaKey', 'altKey', 'ctrlKey', 'repeat', 'key',
    'bubbles', 'composed', 'defaultPrevented', 'eventPhase',
    'timeStamp', 'type', 'isTrusted'
  )
  shallow.target = pick(
    ke.target,
    'type', 'nodeName', 'role', 'contentEditable',
    'tagName', 
  )
  shallow.target.ownerDocument = pick(ke.target.ownerDocument, 'URL')
  return shallow
} // }}}

function keyeventHandler(ke: KeyboardEvent) {
    // Suppress events, if requested
    if (preventDefault) {
      ke.preventDefault()
    }
    if (stopPropagation) {
      ke.stopPropagation()
    }
    browser.runtime.sendMessage({type: "keydown", event: shallowKeyboardEvent(ke)})
}

// Listen for suppression messages from bg script.
function backgroundListener(message) {
    if (message.type === "keydown-suppress") {
      if ('preventDefault' in message.data) {
        preventDefault = message.data.preventDefault
      }
      if ('stopPropagation' in message.data) {
        stopPropagation = message.data.stopPropagation
      }
    }
}

// State
let preventDefault = false
let stopPropagation = false

// Add listeners
window.addEventListener("keydown", keyeventHandler)
browser.runtime.onMessage.addListener(backgroundListener) 

// Dummy export so that TS treats this as a module.
export {}
