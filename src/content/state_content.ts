import Logger from "@src/lib/logging"
const logger = new Logger("state")

export type ModeName =
    | "normal"
    | "insert"
    | "hint"
    | "ignore"
    | "gobble"
    | "input"

export class PrevInput {
    inputId: string
    tab: number
    jumppos?: number
}

export class State {
    mode: ModeName = "normal"
    cmdHistory: string[] = []
    prevInputs: PrevInput[] = [
        {
            inputId: undefined,
            tab: undefined,
            jumppos: undefined,
        },
    ]
    suffix: string = ""
    onChangedListeners: ContentStateChangedCallback[] = []
}

export type ContentStateChangedCallback = (
    property: keyof State,
    oldMode: ModeName,
    oldValue: any,
    newValue: any,
) => void;

export function addContentStateChangedListener(
    callback: ContentStateChangedCallback,
) {
    contentState.onChangedListeners.push(callback)
}

export const contentState: State = (new Proxy(
    new State(),
    {
        get(target, property: keyof State) {
            return target[property]
        },

        set(target, property: keyof State, newValue) {
            logger.debug("Content state changed!", property, newValue)

            const oldValue = target[property]
            const mode = target.mode
            target[property] = newValue

            // Don't get into a loop on callbacks, lol
            if (property === "onChangedListeners") { return true }

            for (const listener of target.onChangedListeners) {
                listener(property, mode, oldValue, newValue)
            }
            return true
        },
    },
) as any) as State
