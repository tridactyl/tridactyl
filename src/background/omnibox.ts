/**
 * Allows users to enter tridactyl commands from the omnibox by using
 * the `:` keyword.
 */
import { browser, Omnibox } from "webextension-polyfill-ts"
import * as controller from "@src/lib/controller"

export async function inputStartedListener() {
}

export async function inputChangedListener(
    currentInput: string,
    emitSuggestion: (suggestions: Omnibox.SuggestResult[]) => void
) {
}

export async function inputEnteredListener(
    input: string, disposition:
    Omnibox.OnInputEnteredDisposition) {
    controller.acceptExCmd(input)
}

export async function inputCancelledListener() {
}

export async function init() {
    browser.omnibox.onInputStarted.addListener(inputStartedListener)
    browser.omnibox.onInputChanged.addListener(inputChangedListener)
    browser.omnibox.onInputEntered.addListener(inputEnteredListener)
    browser.omnibox.onInputCancelled.addListener(inputCancelledListener)
    browser.omnibox.setDefaultSuggestion({
        description: `Execute a Tridactyl exstr (for example, "tabopen -c container www.google.com")`,
    })
}
