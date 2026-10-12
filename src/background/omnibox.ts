/**
 * Allows users to enter tridactyl commands from the omnibox by using
 * the `:` keyword.
 */
import * as controller from "@src/lib/controller"
import * as compat from "@src/lib/compat"
import { requireDesktopBg } from "@src/lib/webext"

export function inputEnteredListener(
    input: string,
) {
    controller.acceptExCmd(input)
}

export function init() {
    compat.omnibox.onInputEntered.addListener(inputEnteredListener)
    void requireDesktopBg()
        .then(desktop =>
            desktop.omnibox.setDefaultSuggestion({
                description: `Execute a Tridactyl exstr (for example, "tabopen -c container www.google.com")`,
            }),
        )
        .catch(() => undefined)
}
