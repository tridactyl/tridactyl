/* Shim for the keyboard API because it won't hit in FF57. */

/* Interface:
    
    All keyboard events will be sent to whatever listens to Port keydown-shim.

   oldUse:

    function setup_port(p) {
        if (p.name === "keydown-shim") {
            this.port = p
            this.unlisten()
        }
    }

    export var port: browser.runtime.Port = undefined
    var unlisten = browser.runtime.onConnect.addListener(setup_port)

    newUse:

    function listen(msg) {
        if (msg.name === "keydown") {
            feed(msg.keydown)
        }
    }

    {
        ...
        browser.tabs.sendMessage({command: "keydown-suppress", preventDefault: true})
        ...
    }

    browser.runtime.onMessage.addListener(listen);

*/

namespace keydown_content {
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
      shallow.target = pick(ke.target, 'tagName')
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
        browser.runtime.sendMessage({command: "keydown", event: shallowKeyboardEvent(ke)})
    }

    // Listen for suppression messages from bg script.
    function backgroundListener(message) {
        if (message.command === "keydown-suppress") {
          if ('preventDefault' in message.data) {
            preventDefault = message.data.preventDefault
          }
          if ('stopPropagation' in message.data) {
            stopPropagation = message.data.stopPropagation
          }
        }
        // This is to shut up the type checker.
        return false
    }

    // State
    let preventDefault = false
    let stopPropagation = false

    // Add listeners
    window.addEventListener("keydown", keyeventHandler)
    browser.runtime.onMessage.addListener(backgroundListener) 
}

