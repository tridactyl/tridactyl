import * as CommandLineContent from './commandline_content'

// Some supporting stuff for ExCmds.

type ContentCommand = (...any) => void

/** Functions to perform actions on the content page */
// Could build these with a factory, but that breaks introspection because
// .name is a read-only value.
const commands = new Map<string, ContentCommand>([
    function scrollpx(x: number, y: number) {
        window.scrollBy(x, y)
    },
    function scrollline(n: number) {
        window.scrollByLines(n)
    },
    function scrollpage(n: number) {
        window.scrollByPages(n)
    },
    function scrollto(x: number, y: number) {
        window.scrollTo(x, y)
    },
    function history(n: number) {
        window.history.go(n)
    },
    function showcommandline() {
        CommandLineContent.show()
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

browser.runtime.onMessage.addListener(messageReceiver)
