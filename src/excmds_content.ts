// Some supporting stuff for ExCmds.
// Example code. Needs to be replaced
namespace ExCmdsContent {

    type ContentCommand = (...any) => void

    /** Functions to perform actions on the content page */
    // Could build these with a factory, but that breaks introspection because
    // .name is a read-only value.
    const commands = new Map<string, ContentCommand>([
        function scrollpx(n: number) {
            window.scrollBy(0, n)
        },
        function scrollline(n: number) {
            window.scrollByLines(n)
        },
        function scrollpage(n: number) {
            window.scrollByPages(n)
        },
        function history(n: number) {
            window.history.go(n)
        },
        function focuscmdline() {
            CommandLineContent.focus()
        }
    ].map((command):any => [command.name, command]))

    function messageReceiver(message) {
        if (message.type === "excmd_contentcommand") {
            console.log(message)
            if (commands.has(message.command)) {
                if (message.args == null) {
                    commands.get(message.command)()
                } else {
                    commands.get(message.command)(...message.args)
                }
            } else {
                console.error("Invalid excmd_contentcommand!", message)
            }
        }
    }

    console.log("Tridactyl content script loaded, boss!")
    browser.runtime.onMessage.addListener(messageReceiver)

    /* function historyHandler(message: Message) { */
    /*     window.history.go(message.number) */
    /* } */

    /* function scrollHandler(message: Message, scope?: string) { */
    /*     if (!scope) window.scrollBy(0, message.number) */
    /*     else if (scope === "lines") window.scrollByLines(message.number) */
    /*     else if (scope === "pages") window.scrollByPages(message.number) */
    /* } */

    /* function evalHandler(message: Message) { */
    /*     eval(message.string) */
    /* } */

    /* function messageHandler(message: Message): boolean { */
    /*     switch(message.command) { */
    /*         case "history": */
    /*             historyHandler(message) */
    /*             break */
    /*         case "scroll": */
    /*             scrollHandler(message) */
    /*             break */
    /*         case "scroll_lines": */
    /*             scrollHandler(message, "lines") */
    /*             break */
    /*         case "scroll_pages": */
    /*             scrollHandler(message, "pages") */
    /*             break */
    /*         case "focusCommandLine": */
    /*             focusCommandLine() */
    /*             break */
    /*         case "eval": */
    /*             evalHandler(message) */
    /*             break */
    /*     } */
    /*     return true */
    /* } */

    /* function sleep(ms: Number) { */
    /*     return new Promise(function (resolve) { */
    /*         setTimeout(resolve, ms) */
    /*     }) */
    /* } */

    /* console.log("Tridactyl content script loaded, boss!") */
    /* browser.runtime.onMessage.addListener(messageHandler) */
}
