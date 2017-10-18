import * as CommandLineContent from './commandline_content'
import './number.clamp'

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
    /** If one argument is given, scroll to that percentage down the page.
        If two arguments are given, treat as x and y values to give to window.scrollTo
    */
    function scrollto(a: number, b?: number) {
        a = Number(a)
        // if b is undefined, Number(b) is NaN.
        b = Number(b)
        window.scrollTo(
            b ? a : window.scrollX,
            b ? b : a.clamp(0, 100) * (window.document.scrollingElement.scrollHeight / 100)
        )
    },
    function history(n: number) {
        window.history.go(n)
    },
    function open(url: string) {
        window.location.href = url
    },
    function resizecommandline() {
        CommandLineContent.resize()
    },
    function showcommandline() {
        CommandLineContent.focus()
    },
    function hidecommandline() {
        CommandLineContent.hide()
    },
    // Todo - send message to background
    function getcurrentURL(){
        return window.location.href
    },
    function clicknext(dir = "next"){
        let linkarray = Array.from(getlinks())
        // The desired one
        let regarray = [/\bnext|^>$|^(>>|»)$|^(>|»)|(>|»)$|\bmore\b/i, /\bprev\b|\bprevious\b|^<$|^(<<|«)$|^(<|«)|(<|«)$/i]

        // RPS is hardcoded because it never worked in Vimperator and it always annoyed me
        regarray = window.location.href.match(/rockpapershotgun/) ? [/newer/i,/older/i] : regarray

        let nextreg = (dir == "next") ? regarray[0] : regarray[1]

        // Might need to add more cases to this as we look at more sites
        let nextlinks = linkarray.filter((link) => (link.innerText.match(nextreg) || link.rel.match(nextreg)))
        window.location.href = nextlinks[0].href
    }
].map((command):any => [command.name, command]))

function getlinks(){
    return document.getElementsByTagName('a')
}

function messageReceiver(message: Message) {
    if (message.type === "excmd_contentcommand") {
        console.log(message)
        if (commands.has(message.command)) {
            try {
                if (message.args == null) {
                    commands.get(message.command)()
                } else {
                    commands.get(message.command)(...message.args)
                }
            } catch (e) {
                console.error(`${message.command} failed!`, e)
            }
        } else {
            console.error("Invalid excmd_contentcommand!", message)
        }
    }
}

browser.runtime.onMessage.addListener(messageReceiver)
