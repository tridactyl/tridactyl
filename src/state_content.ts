import Logger from "./logging"
const logger = new Logger("state")

export type ModeName =
    | "normal"
    | "insert"
    | "hint"
    | "ignore"
    | "gobble"
    | "input"
    | "find"

export class PrevInput {
    inputId: string
    tab: number
    jumppos?: number
}

class State {
    mode: ModeName = "normal"
    cmdHistory: string[] = []
    prevInputs: PrevInput[] = [
        {
            inputId: undefined,
            tab: undefined,
            jumppos: undefined,
        },
    ]
}

export type ContentStateProperty = "mode" | "cmdHistory" | "prevInputs"

export type ContentStateChangedCallback = (
    property: ContentStateProperty,
    oldValue: any,
    newValue: any,
) => void

const onChangedListeners: ContentStateChangedCallback[] = []

export function addContentStateChangedListener(
    callback: ContentStateChangedCallback,
) {
    onChangedListeners.push(callback)
}

export const contentState = (new Proxy(
    { mode: "normal" },
    {
        get: function(target, property: ContentStateProperty) {
            return target[property]
        },

        set: function(target, property: ContentStateProperty, newValue) {
            logger.debug("Content state changed!", property, newValue)

            const oldValue = target[property]
            target[property] = newValue

            for (let listener of onChangedListeners) {
                listener(property, oldValue, newValue)
            }
            return true
        },
    },
) as any) as State
