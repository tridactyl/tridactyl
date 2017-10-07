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
        window.scrollBy(0, n)
    },
    function scrollto(a: number, b?: number) {
        console.log(eval('content.document.scrollingElement.scrollHeight'))
        window.scrollTo(b ? a : window.scrollX,
            b ? b : a.clamp(-100, 100) * eval("content.document.scrollingElement.scrollHeight") / 100)
        // window.scrollTo(amount[0] || 0,
        //     (amount[1] ? amount[1] : amount * eval('content.document.scrollingElement.scrollHeight'))
    },
    function history(n: number) {
        window.history.go(n)
    },
    function open(url: string) {
        window.location.href = url
    },
    function showcommandline() {
        CommandLineContent.focus()
    },
    function hidecommandline() {
        CommandLineContent.hide()
    },
].map((command):any => [command.name, command]))

function messageReceiver(message: Message) {
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
