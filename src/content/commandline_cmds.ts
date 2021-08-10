import { getCommandlineFns } from "../lib/commandline_cmds"
import { messageOwnTab } from "../lib/messaging"

const functions = getCommandlineFns({} as any)
type ft = typeof functions
type ArgumentsType<T> = T extends (...args: infer U) => any ? U : never

export const CmdlineCmds = new Proxy(functions as any, {
    get(target, property) {
        if (target[property]) {
            return (...args) =>
                messageOwnTab("commandline_cmd", property as string, args)
        }
        return target[property]
    },
}) as {
    [k in keyof ft]: (
        ...args: ArgumentsType<ft[k]>
    ) => Promise<ReturnType<ft[k]>>
}
