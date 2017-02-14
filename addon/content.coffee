# Just a test
#
#

console.log("hello")

historyHandler = (message) ->
    window.history.go(message.number)

scrollHandler = (message) ->
    window.scrollBy(0, message.number)


messageHandler = (message) ->
    switch(message.command)
        when "history" then historyHandler(message)
        when "scroll" then scrollHandler(message)

browser.runtime.onMessage.addListener(messageHandler)
