import * as ActionTypes from "@src/cliframe/actionTypes"

export function startCompletionSession(): ActionTypes.StartCompletionSessionAction {
    return {
        type: "START_COMPLETION_SESSION"
    }
}

export function focusDirection(direction: ActionTypes.FocusChangeDirection): ActionTypes.FocusDirectionAction {
    return {
        type: "FOCUS_COMPLETION",
        direction,
    }
}

export function focusIndex(index: number): ActionTypes.FocusIndexAction {
    return {
        type: "FOCUS_COMPLETION",
        direction: "index",
        index,
    }
}

export function updateInputState(newinput: string): ActionTypes.UpdateInputStateAction {
    return {
        type: "UPDATE_INPUT_STATE",
        newinput,
    }
}

export function autocomplete(): ActionTypes.AutocompleteFocusedAction {
    return {
        type: "AUTOCOMPLETE_FOCUSED_COMPLETION"
    }
}

export function endCompletionSession(): ActionTypes.EndCompletionSessionAction {
    return {
        type: "END_COMPLETION_SESSION"
    }
}

export function submitExcmd(): ActionTypes.SubmitExcmdAction {
    return {
        type: "SUBMIT_EXCMD"
    }
}
