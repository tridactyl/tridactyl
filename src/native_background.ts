/**
 * Background functions for the native messenger interface
 */

const GET_CFG_CMD = "getconfig"
const GET_VER_CMD = "version"

const NATIVE_NAME = "tridactyl"
type MessageCommand = "getconfig" | "version" | "run" | "read" | "write"
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
    console.log(`Sending message: ${JSON.stringify(send)}`)

    try {
        resp = await browser.runtime.sendNativeMessage(NATIVE_NAME, send)
        console.log(`Received response:`, resp)
        return resp as MessageResp
    } catch (e) {
        console.error(`Error sending native message:`, e)
        throw e
    }
}

export async function getFilesystemUserConfig(): Promise<string> {
    const res = await sendNativeMsg("getconfig", {})

    if (res.content && !res.error) {
        console.info(`Successfully retrieved fs config:\n${res.content}`)
        return res.content
    } else {
        console.error(`Error in retrieving config: ${res.error}`)
        throw Error(`Error retrieving config: ${res.error}`)
    }
}

export async function getNativeMessengerVersion(): Promise<number> {
    const res = await sendNativeMsg("version", {})
    if (res.version && !res.error) {
        console.info(`Native version: ${res.version}`)
        return res.version
    }
    throw `Error retrieving version: ${res.error}`
}

export async function editor(file: string, content?: string) {
    // -f makes gvim stay in foreground so that we know when it is exited
    // does this mean that the native messenger can't be used for anything
    // till it returns?
    // should probably think about this harder.
    if (content !== undefined) await write(file, content)
    await run("gvim -f " + file)
    return await read(file)
}

export async function read(file: string) {
    return sendNativeMsg("read", { file })
}

export async function write(file: string, content: string) {
    return sendNativeMsg("write", { file, content })
}

export async function run(command: string) {
    const res = await sendNativeMsg("run", { command })
    console.log("command finished")
    return res
}
