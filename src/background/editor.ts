import { messageActiveTab } from "@src/lib/messaging"
import * as _EditorCmds from "@src/lib/editor"

type cmdsType = typeof _EditorCmds
type ArgumentsType<T> = T extends (elem, ...args: infer U) => any ? U : never

export const EditorCmds = new Proxy(_EditorCmds as any, {
    get(target, property) {
        if (target[property]) {
            return (...args) =>
                messageActiveTab("editorfn_content", property as string, args)
        }
        return target[property]
    },
}) as {
    [k in keyof cmdsType]: (
        ...args: ArgumentsType<cmdsType[k]>
    ) => Promise<ReturnType<cmdsType[k]>>
}
