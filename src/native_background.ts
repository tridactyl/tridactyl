/**
 * Background functions for the native messenger interface
 */

import * as config from "./config"

import Logger from "./logging"
const logger = new Logger("native")

const NATIVE_NAME = "tridactyl"
type MessageCommand =
    | "version"
    | "run"
    | "read"
    | "write"
    | "temp"
    | "mkdir"
    | "eval"
    | "env"
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
    let gui_candidates = []
    let term_emulators = []
    let tui_editors = []
    let last_resorts = []
    if ((await browser.runtime.getPlatformInfo()).os === "mac") {
        gui_candidates = ["/Applications/MacVim.app/Contents/bin/mvim -f"]
        // if anyone knows of any "sensible" terminals that let you send them commands to run,
        // please let us know in issue #451!
        term_emulators = [
            "/Applications/cool-retro-term.app/Contents/MacOS/cool-retro-term -e",
        ]
        last_resorts = ["open -nWt"]
    } else {
        // Tempted to put this behind another config setting: prefergui
        gui_candidates = ["gvim -f"]

        // we generally try to give the terminal the class "tridactyl_editor" so that
        // it can be made floating, e.g in i3:
        // for_window [class="tridactyl_editor"] floating enable border pixel 1
        term_emulators = [
            "st -c tridactyl_editor",
            "xterm -class tridactyl_editor -e",
            "uxterm -class tridactyl_editor -e",
            "urxvt -e",
            "alacritty -e", // alacritty is nice but takes ages to start and doesn't support class
            "cool-retro-term -e",
            // Terminator and termite require  -e commands to be in quotes, hence the extra quote at the end.
            // The closing quote is implemented in the editor function.
            'terminator -e "',
            'termite --class tridactyl_editor -e "',
            "dbus-launch gnome-terminal --",
            // I wanted to put hyper.js here as a joke but you can't start it running a command,
            // which is a far better joke: a terminal emulator that you can't send commands to.
            // You win this time, web artisans.
        ]
        last_resorts = [
            "emacs",
            "gedit",
            "kate",
            "abiword",
            "sublime",
            "atom -w",
        ]
    }

    tui_editors = ["vim", "nvim", "nano", "emacs -nw"]

    // Consider GUI editors
    let cmd = await firstinpath(gui_candidates)

    if (cmd === undefined) {
        // Try to find a terminal emulator
        cmd = await firstinpath(term_emulators)
        if (cmd !== undefined) {
            // and a text editor
            let tuicmd = await firstinpath(tui_editors)
            cmd = cmd + " " + tuicmd
        } else {
            // or fall back to some really stupid stuff
            cmd = await firstinpath(last_resorts)
        }
    }

    return cmd
}

export async function inpath(cmd) {
    return (await run("which " + cmd.split(" ")[0])).code === 0
}

export async function firstinpath(cmdarray) {
    let ind = 0
    let cmd = cmdarray[ind]
    // Try to find a text editor
    while (!await inpath(cmd.split(" ")[0])) {
        ind++
        cmd = cmdarray[ind]
        if (cmd === undefined) break
    }
    return cmd
}

export async function editor(file: string, content?: string) {
    if (content !== undefined) await write(file, content)
    const editorcmd =
        config.get("editorcmd") == "auto"
            ? await getBestEditor()
            : config.get("editorcmd")
    // Dirty hacks for termite and terminator support part 2.
    const e = editorcmd.split(" ")[0]
    if (e === "termite" || e === "terminator") {
        await run(editorcmd + " " + file + '"')
    } else await run(editorcmd + " " + file)
    return await read(file)
}

export async function read(file: string) {
    return sendNativeMsg("read", { file })
}

export async function write(file: string, content: string) {
    return sendNativeMsg("write", { file, content })
}

export async function mkdir(dir: string, exist_ok: boolean) {
    return sendNativeMsg("mkdir", { dir, exist_ok })
}

export async function temp(content: string) {
    return sendNativeMsg("temp", { content })
}

export async function run(command: string) {
    let msg = await sendNativeMsg("run", { command })
    logger.info(msg)
    return msg
}

export async function getenv(variable: string) {
    return (await sendNativeMsg("env", { var: variable })).content
}

export async function ffargs() {
    // Using ' and + rather that ` because we don't want newlines
    let output = await sendNativeMsg("eval", {
        command:
            "handleMessage(" +
            '{"cmd": "run", "command": "ps -p " + str(os.getppid()) + " -o' +
            'args="})["content"]',
    })
    return output.content.trim().split(" ")
}

export async function getProfileDir() {
    // Find active profile directory automatically by seeing where the lock exists
    let hacky_profile_finder =
        "find ../../../.mozilla/firefox -maxdepth 2 -name lock"
    if ((await browser.runtime.getPlatformInfo()).os === "mac")
        hacky_profile_finder =
            "find ../../../Library/'Application Support'/Firefox/Profiles -maxdepth 2 -name .parentlock"
    let profilecmd = await run(hacky_profile_finder)
    if (profilecmd.code != 0) {
        throw new Error("Profile not found")
    } else {
        // Remove trailing newline
        profilecmd.content = profilecmd.content.trim()
        if (profilecmd.content.split("\n").length > 1) {
            throw new Error(
                "Multiple profiles in use. Can't tell which one you want. `set profiledir`, close other Firefox profiles or remove zombie lock files.",
            )
        } else {
            // Get parent directory of lock file
            return profilecmd.content
                .split("/")
                .slice(0, -1)
                .join("/")
        }
    }
}
