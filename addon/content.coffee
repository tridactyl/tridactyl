# Just a test
#
#

console.log("hello")

historyHandler = (message) ->
    window.history.go(message.number)

browser.runtime.onMessage.addListener(historyHandler)
