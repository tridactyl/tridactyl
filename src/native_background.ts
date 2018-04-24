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
    error: string | null
}

/**
 * Posts using the one-time message API; native is killed after message returns
 */
async function sendNativeMsg(
    cmd: MessageCommand,
    opts: object,
): Promise<MessageResp> {
    const send = Object.assign({ cmd }, opts)
    let resp
    logger.info(`Sending message: ${JSON.stringify(send)}`)

    try {
        resp = await browser.runtime.sendNativeMessage(NATIVE_NAME, send)
        logger.info(`Received response:`, resp)
        return resp as MessageResp
    } catch (e) {
        logger.error(`Error sending native message:`, e)
        throw e
    }
}

export async function getNativeMessengerVersion(): Promise<number> {
    const res = await sendNativeMsg("version", {})
    if (res.version && !res.error) {
        logger.info(`Native version: ${res.version}`)
        return res.version
    }
    throw `Error retrieving version: ${res.error}`
}

export async function editor(file: string, content?: string) {
    if (content !== undefined) await write(file, content)
    await run(config.get("editorcmd") + " " + file)
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
    return sendNativeMsg("run", { command })
}
