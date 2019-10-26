import { messageActiveTab } from "@src/lib/messaging"
import * as hinting_content from "@src/content/hinting"
import * as Messages from "@src/message_protocols"

const functions = hinting_content.getHintCommands()
type ft = typeof functions
type ArgumentsType<T> = T extends (...args: infer U) => any ? U : never;

export const HintingCmds = new Proxy(functions as any, {
    get(target, property) {
        if (target[property]) {
            // TODO: potential bug here with arguments
            return (...args: string[]) => messageActiveTab<Messages.Content>()("controller_content", "acceptExCmd", [[property.toString(), ...args].join("")])
        }
        return target[property]
    }
}) as { [k in keyof ft]: (...args: ArgumentsType<ft[k]>) => Promise<ReturnType<ft[k]>> }
