/**
 * Command-line completions as a redux module.
 */

import * as Logging from "@src/lib/logging"
import * as Itertools from "@src/lib/itertools"

const logger = new Logging.Logger("completions")

// The current state of the user's input, after some processing.
export interface ExcmdInputState {
    // The current input as a raw string
    currentLine: string
    // The token the user is currently typing
    currentToken: string
    // The position of the user's cursor in current_line
    cursorPosition: number
}

// Type for a completion function. Must be async.
export type CompletionFn = (inputState: ExcmdInputState, lastCompletions: Completion[]) => Promise<Completion[]>

// Holds information for a single completion option. These objects
// have a one-to-one correspondence with lines in the completion
// popup.
export interface Completion {
    // What to do to the command line if this completion is selected
    // for autocompletion
    readonly accept: (ExcmdInputState) => string
    // Function to use to update this completion
    readonly update: (Completion, ExcmdInputState) => Completion
    // Which completion function this option came from. Used by the
    // completion framework to tie completions back to their sources
    // so they can be updated.
    readonly source: CompletionFn
    // Whether this source is focused or not
    readonly focused: boolean
    // Whether this source matches the current input state or not
    readonly matching: boolean
}

let completionFunctions = []

// Add a completion source function to the list of completion sources
export function addCompletionSource(completionFn: CompletionFn) {
    completionFunctions.push(completionFn)
}

// Function for getting completions. Pass along the list of
// completions so that completion sources can do incremental updates
// when appropriate.
async function initCompletions(currentCompletions: Completion[], inputState: ExcmdInputState): Promise<Completion[]> {
    let partitionedCompletions: Map<CompletionFn, Completion[]> = new Map()
    for (let completionSource of completionFunctions) {
        partitionedCompletions.set(completionSource, [])
    }
    for (let completion of currentCompletions) {
        let sourceCompletions = partitionedCompletions.get(completion.source)
        sourceCompletions.push(completion)
    }
    let promises = []
    for (let [source, completionsForSource] of partitionedCompletions) {
        promises.push(source(inputState, completionsForSource))
    }
    let result = await Promise.all(promises)
    return Itertools.flatten(result)
}


export interface CompletionState {
    completions: Completion[]
    fuse: Fuse
}

function processInputIntoExcmdInputState(input: string): ExcmdInputState {
    return {
        currentLine: input,
        currentToken: "",
        cursorPosition: -1,
    }
}

export function updateCompletionInput(comp: CompletionState, newinput: string): CompletionState {
    const inputState = processInputIntoExcmdInputState(newinput)
    return {
        completions: comp.completions.map(c => c.update(c, inputState)),
        fuse: comp.fuse,
    }
}

export function startCompletions(): CompletionState {
    // TODO: implement
    return {
        // completions: initCompletions([], {currentLine: "", currentToken: "", cursorPosition: -1})
        completions: [],
        fuse: null,
    }
}

type FocusDirection = "previous" | "next"

export function focusCompletionDirection(comp: CompletionState, action: FocusDirection): CompletionState {
    // TODO: implement
    return comp
}

export function focusCompletionIndex(comp: CompletionState, index: number): CompletionState {
    // TODO: implement
    return comp
}

export function autocomplete(comp: CompletionState, currentInput: string): [CompletionState, string] {
    // TODO: implement
    return [comp, currentInput]
}
