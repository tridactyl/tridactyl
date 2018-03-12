/**
 * Background functions for the native messenger interface
 */

const GET_CFG_CMD = 'getconfig'
const GET_VER_CMD = 'version'

const NATIVE_NAME = 'tridactyl'
type MessageCommand = 'getconfig' | 'version'
interface MessageResp {
    cmd: string
    version: number | null
    content: string | null
    error: string | null
}

/**
 * Posts using the one-time message API; native is killed after message returns
 */
async function sendNativeMsg(cmd: MessageCommand, opts: object): Promise<any> {
    const send = Object.assign({ cmd }, opts)
    return browser.runtime.sendNativeMessage(NATIVE_NAME, send)
}

export async function getFilesystemUserConfig(): Promise<string> {
    const res = (await sendNativeMsg('getconfig', {})) as MessageResp

    if (res.content && !res.error) {
        console.info(`Successfully retrieved fs config:\n${res.content}`)
        return res.content
    } else {
        console.error(`Error in retrieving config: ${res.error}`)
        throw `Error retrieving config: ${res.error}`
    }
}
