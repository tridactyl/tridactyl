import { messageActiveTab } from "@src/lib/messaging.ts"
import * as _EditorCmds from "@src/lib/editor.ts"
import * as Messages from "@src/message_protocols"

type cmdsType = typeof _EditorCmds
type ArgumentsType<T> = T extends (elem, ...args: infer U) => any ? U: never;

export const EditorCmds = new Proxy(_EditorCmds as any, {
    get(target, property) {
        if (target[property]) {
            return (...args) => messageActiveTab<Messages.Editor>()("editorfn_content", property as keyof Messages.Editor["editorfn_content"], args as any)
        }
        return target[property]
    }
}) as { [k in keyof cmdsType]: (...args: ArgumentsType<cmdsType[k]>) => Promise<ReturnType<cmdsType[k]>> }
