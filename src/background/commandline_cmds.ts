import { getCommandlineFns } from "@src/lib/commandline_cmds"
import { messageActiveTab } from "@src/lib/messaging"

const functions = getCommandlineFns({} as any)
type ft = typeof functions
type ArgumentsType<T> = T extends (...args: infer U) => any ? U : never

export const CmdlineCmds = new Proxy(functions as any, {
    get(target, property) {
        if (target[property]) {
            return (...args) =>
                messageActiveTab("commandline_cmd", property as string, args)
        }
        return target[property]
    },
}) as {
    [k in keyof ft]: (
        ...args: ArgumentsType<ft[k]>
    ) => Promise<ReturnType<ft[k]>>
}
