// Some supporting stuff for ExCmds.
// Example code. Needs to be replaced
namespace content {

    function historyHandler(message: Message) {
        window.history.go(message.number)
    }

    function scrollHandler(message: Message, scope?: string) {
        if (!scope) window.scrollBy(0, message.number)
        else if (scope === "lines") window.scrollByLines(message.number)
        else if (scope === "pages") window.scrollByPages(message.number)
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
            case "scroll_lines":
                scrollHandler(message, "lines")
                break
            case "scroll_pages":
                scrollHandler(message, "pages")
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
