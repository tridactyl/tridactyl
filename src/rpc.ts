import {BGRPCExports} from '~background'

import * as R from 'ramda'

export type Sender = browser.runtime.MessageSender

export type RPCMsg = {
    path: string[],
    args: any[],
}

export type RPCFunc = (...args: any[]) => Promise<any>;
export type RPCExports = {
    [key: string]: RPCFunc | { [key: string]: RPCFunc }
}

export type Target =
    'background' | { tab: number } // | { frame: number }

let uuid = 0

export const send = async (who: Target, msg: RPCMsg) => {
    const id = uuid++
    console.log('Tx', id, who, msg)

    let prom
    if (who === 'background')
        prom = browser.runtime.sendMessage(msg)
    else if (who.tab !== undefined)
        prom = browser.tabs.sendMessage(who.tab, msg)

    try {
        const response = await prom
        console.log('TxRx', id, response)
        return response
    } catch (err) {
        console.error('TxRxErr', id, err)
        throw err
    }
}

function getIn(path: any[], obj: Object) {
    return path.reduce((o, n) => o[n], obj)
}

export const onMessage = (rpcexports: RPCExports) =>
    async (msg: RPCMsg, sender: Sender) => {
        const {path, args} = msg
        console.log(`Rx`, msg, sender)
        return getIn(path, rpcexports)(...args)
    }

// For a proxy to be callable, the target to the proxy must also be callable,
// even though you don't have to do anything with it :/
const voidfn = () => {}

export function nestingproxy (target: Target, path: string[] = []): RPCExports {
    return new Proxy(voidfn, {
        get: (_, name: string) => nestingproxy(target, path.concat([name])),
        apply: (_, __, args: any[]) => send(target, {path, args})
    }) as any
}

export function rpc(target: 'background'): BGRPCExports;
export function rpc(target: Target) {
    return nestingproxy(target) as any
}
