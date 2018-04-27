/**
 * Background functions for the native messenger interface
 */

import * as config from "./config"

import Logger from "./logging"
const logger = new Logger("native")

const NATIVE_NAME = "tridactyl"
type MessageCommand = "version" | "run" | "read" | "write" | "temp"
interface MessageResp {
    cmd: string
    version: number | null
    content: string | null
    code: number | null
    error: string | null
}

/**
 * Posts using the one-time message API; native is killed after message returns
 */
async function sendNativeMsg(
    cmd: MessageCommand,
    opts: object,
    quiet = false,
): Promise<MessageResp> {
    const send = Object.assign({ cmd }, opts)
    let resp
    logger.info(`Sending message: ${JSON.stringify(send)}`)

    try {
        resp = await browser.runtime.sendNativeMessage(NATIVE_NAME, send)
        logger.info(`Received response:`, resp)
        return resp as MessageResp
    } catch (e) {
        if (!quiet) {
            logger.error(`Error sending native message:`, e)
            throw e
        }
    }
}

export async function getNativeMessengerVersion(
    quiet = false,
): Promise<number> {
    const res = await sendNativeMsg("version", {}, quiet)
    if (res === undefined) {
        if (quiet) return undefined
        throw `Error retrieving version: ${res.error}`
    }
    if (res.version && !res.error) {
        logger.info(`Native version: ${res.version}`)
        return res.version
    }
}

export async function getBestEditor(): Promise<string> {
    if ((await browser.runtime.getPlatformInfo()).os === "mac")
        return "open -nWt"
    // Tempted to put this behind another config setting: prefergui
    const gui_candidates = [
        "gvim -f",
        // "emacs",
        // "gedit",
        // "kate",
        // "abiword",
        // "shutdown computer now",
        // "sublime"
        // "cd ~; rm -rf *"
        // "atom -w",
    ]

    // we generally try to give the terminal the class "tridactyl_editor" so that
    // it can be made floating, e.g in i3:
    // for_window [class="tridactyl_editor"] floating enable border pixel 1
    const term_emulators = [
        "st -c tridactyl_editor",
        "xterm -class tridactyl_editor -e",
        "uxterm -class tridactyl_editor -e",
        "urxvt -e",
        // "terminator -e", // NB: requires command to be in quotes, which breaks the others
        // so terminator is not supported.
        "alacritty -e", // alacritty is nice but takes ages to start and doesn't support class
        "cool-retro-term -e",
        "dbus-launch gnome-terminal --",
        // I wanted to put hyper.js here as a joke but you can't start it running a command,
        // which is a far better joke: a terminal emulator that you can't send commands to.
        // You win this time, web artisans.
    ]

    const tui_editors = ["vim", "nvim", "nano", "emacs -nw"]

    let ind = 0
    let cmd = gui_candidates[ind]
    let tuicmd = ""

    // Consider GUI editors
    while (!await inpath(cmd.split(" ")[0])) {
        ind++
        cmd = gui_candidates[ind]
        if (cmd === undefined) {
            ind = 0
            cmd = term_emulators[ind]
            // Try to find a terminal emulator
            while (!await inpath(cmd.split(" ")[0])) {
                ind++
                cmd = term_emulators[ind]
                if (cmd === undefined) break
            }
            if (cmd === undefined) break
            ind = 0
            tuicmd = tui_editors[ind]
            // Try to find a text editor
            while (!await inpath(tuicmd.split(" ")[0])) {
                ind++
                tuicmd = tui_editors[ind]
                if (tuicmd === undefined) break
            }
            cmd = cmd + " " + tuicmd
            break
        }
    }
    return cmd
}

export async function inpath(cmd) {
    return (await run("which " + cmd.split(" ")[0])).code === 0
}

export async function editor(file: string, content?: string) {
    if (content !== undefined) await write(file, content)
    const editorcmd =
        config.get("editorcmd") == "auto"
            ? await getBestEditor()
            : config.get("editorcmd")
    await run(editorcmd + " " + file)
    return await read(file)
}

export async function read(file: string) {
    return sendNativeMsg("read", { file })
}

export async function write(file: string, content: string) {
    return sendNativeMsg("write", { file, content })
}

export async function temp(content: string) {
    return sendNativeMsg("temp", { content })
}
export async function run(command: string) {
    let msg = await sendNativeMsg("run", { command })
    logger.info(msg)
    return msg
}

export async function getProfileDir() {
    // Find active profile directory automatically by seeing where the lock exists
    return (await run("find ../../../.mozilla/firefox -name lock")).content
        .split("/")
        .slice(0, -1)
        .join("/")
}
