import { getCommandlineFns } from "@src/lib/commandline_cmds"
import { messageOwnTab } from "@src/lib/messaging"
import * as Messages from "@src/message_protocols"

const functions = getCommandlineFns({} as any)
type ft = typeof functions
type ArgumentsType<T> = T extends (...args: infer U) => any ? U: never;

export const CmdlineCmds = new Proxy (functions as any, {
    get(target, property) {
        if (target[property]) {
            return (...args) => messageOwnTab<Messages.CmdlineFrame>()("commandline_cmd", property as keyof Messages.CmdlineFrame["commandline_cmd"], args as any)
        }
        return target[property]
    }
}) as { [k in keyof ft]: (...args: ArgumentsType<ft[k]>) => Promise<ReturnType<ft[k]>> }
