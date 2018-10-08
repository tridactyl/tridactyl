export type TriCliActionLiteral =
    | "START_COMPLETION_SESSION"
    | "FOCUS_COMPLETION"
    | "UPDATE_INPUT_STATE"
    | "AUTOCOMPLETE_FOCUSED_COMPLETION"
    | "END_COMPLETION_SESSION"
    | "SUBMIT_EXCMD"

export interface StartCompletionSessionAction {
    type: "START_COMPLETION_SESSION"
}

export type FocusChangeDirection = "previous" | "next"

export interface FocusDirectionAction {
    type: "FOCUS_COMPLETION"
    direction: FocusChangeDirection
}

export interface FocusIndexAction {
    type: "FOCUS_COMPLETION"
    direction: "index"
    index: number
}

export interface UpdateInputStateAction {
    type: "UPDATE_INPUT_STATE"
    newinput: string
}

export interface AutocompleteFocusedAction {
    type: "AUTOCOMPLETE_FOCUSED_COMPLETION"
}

export interface EndCompletionSessionAction {
    type: "END_COMPLETION_SESSION"
}

export interface SubmitExcmdAction {
    type: "SUBMIT_EXCMD"
}

export type TriCliAction =
    | StartCompletionSessionAction
    | FocusDirectionAction
    | FocusIndexAction
    | UpdateInputStateAction
    | AutocompleteFocusedAction
    | EndCompletionSessionAction
    | SubmitExcmdAction
