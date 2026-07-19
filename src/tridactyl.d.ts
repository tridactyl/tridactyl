// Interfaces common to the tridactyl project.

// For some obscure reason, tsc doesn't like .d.ts files to share a name with
// .ts files. So don't do that.

// Ill-advised monkeypatching
interface Number {
    mod(n: number): number
    clamp(lo: number, hi: number): number
}

// Record that we've added convenience objects to window.
interface Window {
    tri: any
}

interface HTMLElement {
    // Firefox-only (?) Element attribute
    // https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/dom/openOrClosedShadowRoot
    openOrClosedShadowRoot: ShadowRoot | null
}

/* eslint-disable @typescript-eslint/no-unsafe-function-type */
// these functions really can be anything, ditto for the objects
declare function exportFunction(
    func: Function,
    targetScope: object,
    options?: { defineAs?: string; allowCrossOriginArguments?: boolean },
): Function
/* eslint-enable @typescript-eslint/no-unsafe-function-type */

// html-tagged-template.js
declare function html(
    strings: TemplateStringsArray,
    ...values: any[]
): HTMLElement

// Custom matcher from src/lib/mod.test.ts.
declare namespace jest {
    interface Matchers<R> {
        toBeAll: any
    }
}
