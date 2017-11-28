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
    scrollByPages(n: number):  void
}

// Fix typescript bugs
interface StringConstructor {
    toLowerCase(): string;
}

// Web extension types not in web-ext-types yet
declare namespace browser.find {
    function find(query, object): any
}

// setZoom has an optional first argument of tabId. Unclear how first argument can be optional.
declare namespace browser.tabs {
    function setZoom(zoomFactor: number): Promise<void>;
    function setZoom(tabId: number, zoomFactor: number): Promise<void>;
    function toggleReaderMode(tabId?: number): Promise<void>;
}

// html-tagged-template.js
declare function html(strings: TemplateStringsArray, ...values: any[]): HTMLElement
