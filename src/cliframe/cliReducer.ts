import * as Messaging from "@src/lib/messaging"
import * as Complete from "@src/lib/completefns"
import { TriCliAction, FocusIndexAction, FocusDirectionAction } from "@src/cliframe/actionTypes"
import { TriCliState } from "@src/cliframe/store"

export function rootCliReducer(state: TriCliState, action: TriCliAction): TriCliState {
    switch (action.type) {
        case "START_COMPLETION_SESSION": {
            return {
                completion: Complete.startCompletions(),
                currentCliInput: "",
            }
        }
        case "UPDATE_INPUT_STATE": {
            return {
                completion: Complete.updateCompletionInput(state.completion, action.newinput),
                currentCliInput: action.newinput,
            }
        }
        case "FOCUS_COMPLETION": {
            if (action.direction == "index") {
                return {
                    completion: Complete.focusCompletionIndex(state.completion, action.index),
                    currentCliInput: state.currentCliInput,
                }
            } else {
                return {
                    completion: Complete.focusCompletionDirection(state.completion, action.direction),
                    currentCliInput: state.currentCliInput,
                }
            }
        }
        case "AUTOCOMPLETE_FOCUSED_COMPLETION": {
            const [nextcompletions, nextinput] = Complete.autocomplete(state.completion, state.currentCliInput)
            return {
                completion: nextcompletions,
                currentCliInput: nextinput,
            }
        }
        case "END_COMPLETION_SESSION": {
            return {
                completion: {
                    completions: [],
                    fuse: null,
                },
                currentCliInput: "",
            }
        }
        case "SUBMIT_EXCMD": {
            Messaging.message("commandline_background", "recvExStr", [state.currentCliInput])
            return {
                completion: {
                    completions: [],
                    fuse: null,
                },
                currentCliInput: "",
            }
        }
    }
    return state
}
