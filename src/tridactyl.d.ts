// Interfaces common to the tridactyl project.

// For some obscure reason, tsc doesn't like .d.ts files to share a name with
// .ts files. So don't do that.

// Ill-advised monkeypatching
interface Number {
    mod(n: number): number
    clamp(lo: number, hi: number): number
}

// Firefox-specific dom properties
interface Window {
    scrollByLines(n: number): void
    scrollByPages(n: number): void
    eval(str: string): any
}

// Record that we've added a property with convenience objects to the
// window object:
interface Window {
    tri: any
}

// This isn't an actual firefox type but it's nice to have one for this kind of object
// https://developer.mozilla.org/en-US/Add-ons/WebExtensions/API/find/find
interface findResult {
    count: number
    rangeData: Array<{
        framePos: number
        startTextNodePos: number
        endTextNodePos: number
        startOffset: number
        endOffset: number
        text: string
    }>
    rectData: {
        rectsAndTexts: Array<{
            top: number
            left: number
            bottom: number
            right: number
        }>
        textList: string[]
    }
}

interface HTMLElement {
    // Let's be future proof:
    // https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement/focus
    focus(options?: any): void
}


// NB: update isMinimalElement function in lib/dom if adding properties to this!
interface MinimalElement {
    getBoundingClientRect(): DOMRect
    childNodes: NodeList
    getClientRects(): DOMRectList
    matches(selector: string): boolean
    parentElement: Element
}

/* eslint-disable @typescript-eslint/ban-types */
// these functions really can be anything, ditto for the objects
declare function exportFunction(
    func: Function,
    targetScope: object,
    options?: { defineAs?: string; allowCrossOriginArguments?: boolean },
): Function
/* eslint-enable @typescript-eslint/ban-types */

// Web extension types not in web-ext-types yet
declare namespace browser.find {
    function find(query, object): any
}

declare namespace browser.tabs {
    function setZoom(zoomFactor: number): Promise<void>
    // setZoom has an optional first argument of tabId: https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/tabs/setZoom#Parameters
    // eslint-disable-next-line @typescript-eslint/unified-signatures
    function setZoom(tabId: number, zoomFactor: number): Promise<void>
    function toggleReaderMode(tabId?: number): Promise<void>
}

// web-ext-browser barely declares a third of the management
// interface, and we can't switch to @types/firefox-webext-browser yet
// because their enums are all messed up (see
// https://github.com/DefinitelyTyped/DefinitelyTyped/pull/28369)
// Instead, we'll copy-paste as much as we need from the fixed branch:
// https://github.com/DefinitelyTyped/DefinitelyTyped/blob/d1180e5218a7bf69e6f0da5ac2e2584bd57a1cdf/types/firefox-webext-browser/index.d.ts
interface WebExtEventBase<
    TAddListener extends (...args: any[]) => any,
    TCallback
> {
    addListener: TAddListener

    removeListener(cb: TCallback): void

    hasListener(cb: TCallback): boolean
}

// html-tagged-template.js
declare function html(
    strings: TemplateStringsArray,
    ...values: any[]
): HTMLElement

declare namespace browser.search {
    function search(searchProperties: {
        query: string
        engine?: string
        tabId?: number
    }): void
    function get(): Promise<
        Array<{
            name: string
            isDefault: boolean
            alias?: string
            faviconURL?: string
        }>
    >
}

// Stop typedoc complaining about toBeAll.
declare namespace jest {
    interface Matchers<R> {
        toBeAll: any
    }
}

// jest-webextension-mock doesn't know about this Firefox specific API
declare namespace browser.commands {
    function update(details)
}
