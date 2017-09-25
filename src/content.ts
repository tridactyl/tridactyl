// Some supporting stuff for ExCmds.
// Example code. Needs to be replaced
namespace content {

    function historyHandler(message: Message) {
        window.history.go(message.number)
    }


    function scrollHandler(message: Message) {
        window.scrollBy(0, message.number)
    }

    function evalHandler(message: Message) {
        eval(message.string)
    }

    function messageHandler(message: Message): boolean {
        switch(message.command) {
            case "history":
                historyHandler(message)
                break
            case "scroll":
                scrollHandler(message)
                break
            case "eval":
                evalHandler(message)
                break
        }
        return true
    }

    function sleep(ms: Number) {
        return new Promise(function (resolve) {
            setTimeout(resolve, ms)
        })
    }

    console.log("Tridactyl content script loaded, boss!")
    browser.runtime.onMessage.addListener(messageHandler)
}
