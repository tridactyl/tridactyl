/**
 * Background functions for the native messenger interface
 */

const GET_CFG_CMD = "getconfig"
const GET_VER_CMD = "version"

const NATIVE_NAME = "tridactyl"
type MessageCommand = "getconfig" | "version"
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
