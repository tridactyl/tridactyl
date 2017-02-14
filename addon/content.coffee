# Just a test
#
#
#

config =
    scrollDown: "j"
    scrollUp:   "k"
    back:       "H"
    forward:    "L"


console.log("hello")

historyHandler = (message) ->
    window.history.go(message.number)

scrollHandler = (message) ->
    window.scrollBy(0, message.number)
    # First 0 corresponds to horizontal scroll, which is literally never needed ever
    # We should work out some way to have a configuration file and hooks
    # And generally document things well

arbitraryHandler = (message) ->
    window[message.object].apply(window,message.args)
    # apply's first argument tells it what "this" is
    # I don't understand why it is needed, isn't "window" "this"?
    # only works with direct methods e.g. "scrollBy", not "history.go"

messageHandler = (message) ->
    switch(message.command)
        when "history" then historyHandler(message)
        when "scroll" then scrollHandler(message)
        when "arbitrary" then arbitraryHandler(message)

browser.runtime.onMessage.addListener(messageHandler)

keyHandler = (event) ->
    switch(event.key)
        when config.scrollDown then scrollHandler({number:10})
        when config.scrollUp then scrollHandler({number:-10})
        when config.back then historyHandler({number:-1})
        when config.forward then historyHandler({number:1})

document.addEventListener("keydown", keyHandler)
