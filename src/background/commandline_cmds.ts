import { getCommandlineFns } from "@src/lib/commandline_cmds"
import { messageActiveTab } from "@src/lib/messaging"
import * as Messages from "@src/message_protocols"

const functions = getCommandlineFns({} as any)
type ft = typeof functions
type ArgumentsType<T> = T extends (...args: infer U) => any ? U: never;

export const CmdlineCmds = new Proxy (functions as any, {
    get(target, property) {
        if (target[property]) {
            return () => messageActiveTab<Messages.CmdlineFrame>()("commandline_cmd", property as keyof Messages.CmdlineFrame["commandline_cmd"], [])
        }
        return target[property]
    }
}) as { [k in keyof ft]: (...args: ArgumentsType<ft[k]>) => Promise<ReturnType<ft[k]>> }
