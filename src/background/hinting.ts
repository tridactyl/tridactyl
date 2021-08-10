import { messageActiveTab } from "../lib/messaging"
import * as hinting_content from "../content/hinting"

const functions = hinting_content.getHintCommands()
type ft = typeof functions
type ArgumentsType<T> = T extends (...args: infer U) => any ? U : never

export const HintingCmds = new Proxy(functions as any, {
    get(target, property) {
        if (target[property]) {
            return (...args) =>
                messageActiveTab(
                    "controller_content",
                    "acceptExCmd",
                    [property].concat(args),
                )
        }
        return target[property]
    },
}) as {
    [k in keyof ft]: (
        ...args: ArgumentsType<ft[k]>
    ) => Promise<ReturnType<ft[k]>>
}
