import * as config from "@src/lib/config"
import state from "@src/state"
import * as State from "@src/state"
import * as Logging from "@src/lib/logging"
import { contentState } from "@src/content/state_content"
import {
    activeTabId,
    openInNewTab,
    activeTabContainerId,
    inContentScript,
} from "@src/lib/webext"
const logger = new Logging.Logger("dom")

// From saka-key lib/dom.js, under Apachev2

/**
 * Given a DOM element, returns true if you can edit it with key presses or
 * if the element is of a type that should handle its own keypresses
 * (e.g. role=application for google docs/sheets)
 * TODO: work on case sensitivity
 * consider all the possible cases
 * @param {HTMLElement} element
 * @returns {boolean}
 */
export function isTextEditable(element: Element) {
    if (element) {
        // Disabled options can remain focusable, so prefer their listbox owner.
        const keyboardWidget =
            element.closest('[role="listbox"]') ||
            element.closest(
                '[role="combobox"], [role="option"], [aria-haspopup="listbox"], .ui.selection.dropdown[tabindex]:not(.disabled)',
            )
        if (
            (element as any).readOnly === true ||
            (keyboardWidget || element).closest('[aria-disabled="true"]')
        )
            return false
        // HTML is always upper case, but XHTML is not necessarily upper case
        if (element.nodeName.toUpperCase() === "INPUT") {
            return isEditableHTMLInput(element as HTMLInputElement)
        }

        if (
            ["SELECT", "TEXTAREA", "OBJECT"].includes(
                element.nodeName.toUpperCase(),
            )
        ) {
            return true
        }

        // Keyboard widgets own their input; Semantic UI does not expose a role.
        if (keyboardWidget) {
            return true
        }

        // These properties are only defined on HTMLElements
        const win = element.ownerDocument?.defaultView
        if (win && element instanceof win.HTMLElement) {
            if (element.contentEditable === undefined) {
                // This happens on e.g. svgs.
                return false
            }
            if (element.isContentEditable) {
                return true
            }
        }

        // ARIA stuff isn't pulled out into fields, so we have to
        // manually inspect the attributes to find it.
        // Google products perform some witchcraft with its search input as
        // seen in #1031, the conditional seems to be enough to fix it.
        if (element.hasOwnProperty("attributes")) {
            for (const attr of element.attributes) {
                if (attr.name === "role" && attr.value === "application") {
                    return true
                }
            }
        }
    }
    return false
}

/**
 * Returns whether the passed HTML input element is editable
 * @param {HTMLInputElement} element
 */
function isEditableHTMLInput(element: HTMLInputElement) {
    if (element.disabled || element.readOnly) return false
    switch (element.type) {
        case undefined:
        case "text":
        case "search":
        case "email":
        case "url":
        case "number":
        case "password":
        case "date":
        case "tel":
            return true
    }
    return false
}

export function isWithinDisabledFormControl(element: Element): boolean {
    return element.closest(":disabled:not(fieldset)") !== null
}

/**
 * Dispatch a mouse event to the target element
 * based on cVim's implementation
 * @param {HTMLElement} element
 * @param {'hover' | 'unhover' | 'click'} type
 * @param {{ ctrlKey, shiftKey, altKey, metaKey }} modifierKeys
 */
export function mouseEvent(
    element: Element,
    type: "hover" | "unhover" | "click",
    modifierKeys = {},
) {
    let events = []
    switch (type) {
        case "unhover":
            events = ["mousemove", "mouseout", "mouseleave"]
            break
        case "click":
            events = ["mousedown", "mouseup", "click"]
        case "hover":
            events = ["mouseover", "mouseenter", "mousemove"].concat(events)
            break
    }
    events.forEach(type => {
        const event = new MouseEvent(type, {
            bubbles: true,
            cancelable: true,
            view: window,
            detail: 1, // usually the click count
            ...modifierKeys,
        })
        element.dispatchEvent(event)
    })
}

/** Exclude whitespace and wrappers with one substantial text-bearing child. */
function hasDistinctText(element: Element, includeInvisibleChildren: boolean) {
    let childWithText: Element | undefined
    for (const node of element.childNodes) {
        if (
            (node.nodeType === Node.TEXT_NODE ||
                node.nodeType === Node.CDATA_SECTION_NODE) &&
            (node as CharacterData).data.trim() !== ""
        ) {
            return true
        }
        if (node.nodeType !== Node.ELEMENT_NODE) continue
        if (node.textContent.trim() === "") continue
        if (childWithText) return true
        childWithText = node as Element
    }
    return (
        childWithText !== undefined &&
        !includeInvisibleChildren &&
        !isSubstantial(childWithText)
    )
}

export function elementsWithText(includeInvisible = false) {
    return getElemsBySelector("*", [
        isVisibleFilter(includeInvisible),
        hint => hasDistinctText(hint, includeInvisible),
    ])
}

/** Iterable of elements that match xpath.

    Adapted from stackoverflow
 */
export function* elementsByXPath(xpath, parent?) {
    const query = document.evaluate(
        xpath,
        parent || document,
        null,
        XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
        null,
    )
    for (let i = 0, length = query.snapshotLength; i < length; ++i) {
        yield query.snapshotItem(i)
    }
}

/** Type for functions that can filter element arrays */
type ElementFilter = (element: Element) => boolean

/** Is the element of "substantial" size and shown on the page. The element
 * doesn't need to be in the viewport. This is useful when you want to
 * scroll to something, but still want to exclude tiny and useless items
 */
export function isSubstantial(element: Element) {
    const clientRect = element.getClientRects()[0]
    if (!clientRect) return false
    const computedStyle = getComputedStyle(element)
    // remove elements that are barely within the viewport, tiny, or invisible
    switch (true) {
        case clientRect.width < 3:
        case clientRect.height < 3:
        case computedStyle.visibility !== "visible":
        case computedStyle.display === "none":
            return false
    }
    return true
}

/** This function decides whether the height attribute contained in a
   ComputedStyle matters.  For example, the height attribute doesn't matter for
   elements that have "display: inline" because their height is overriden by
   the height of the node they are in. */
export function heightMatters(style: CSSStyleDeclaration) {
    switch (style.display) {
        case "inline":
        case "table-column":
        case "table-column-group":
            /* These two depend on other factors such as the element's type (span,
         div...) or its parent's style. If the previous cases aren't enough to
         decide whether the width attribute of the element matters, we should
         maybe try to test for them.
      case "initial":
      case "inherit":*/
            return false
    }
    return true
}

/* See [[heightMatters]] */
export function widthMatters(style: CSSStyleDeclaration) {
    switch (style.display) {
        case "inline":
        case "table-column":
        case "table-column-group":
        case "table-header-group":
        case "table-footer-group":
        case "table-row-group":
        case "table-cell":
        case "table-row":
            /* Take a look at [[heightMatters]] in order to understand why these two
         cases are commented
      case "initial":
      case "inherit?:*/
            return false
    }
    return true
}

export function isVisibleFilter(
    includeInvisible: boolean,
): (_: Element | Range) => boolean {
    return (elem: Element | Range) => includeInvisible || isVisible(elem)
}

// Saka-key caches getComputedStyle. Maybe it's a good idea!
/* let cgetComputedStyle = cacheDecorator(getComputedStyle) */

/** is the element within a rect and not obscured by another element?

    From: https://github.com/lusakasa/saka-key/blob/9f560b3a718a9efda809dcb794de14b4e675b35a/src/modes/hints/client/findHints.js#L97
    Based on https://github.com/guyht/vimari/blob/master/vimari.safariextension/linkHints.js

 */
export function isVisible(thing: Element | Range) {
    if (thing instanceof Element) {
        while (typeof thing.getBoundingClientRect !== "function") {
            thing = thing.parentElement
        }
    }
    if (thing.getClientRects().length === 0) return false
    const clientRect = thing.getBoundingClientRect()
    switch (true) {
        case !clientRect:
        case clientRect.bottom < 4:
        case clientRect.top >= innerHeight - 4:
        case clientRect.right < 4:
        case clientRect.left >= innerWidth - 4:
            return false
    }

    if (thing instanceof Range) return true

    const element = thing
    // remove elements that are barely within the viewport, tiny, or invisible
    // Only call getComputedStyle when necessary
    const computedStyle = getComputedStyle(element)
    switch (true) {
        case widthMatters(computedStyle) && clientRect.width < 3:
        case heightMatters(computedStyle) && clientRect.height < 3:
        case computedStyle.visibility !== "visible":
        case computedStyle.display === "none":
            return false
    }
    return true

    /* // Eliminate elements hidden by another overlapping element. */
    /* // To do that, get topmost element at some offset from upper-left corner of clientRect */
    /* // and check whether it is the element itself or one of its descendants. */
    /* // The offset is needed to account for coordinates truncation and elements with rounded borders. */
    /* // */
    /* // Coordinates truncation occcurs when using zoom. In that case, clientRect coords should be float, */
    /* // but we get integers instead. That makes so that elementFromPoint(clientRect.left, clientRect.top) */
    /* // sometimes returns an element different from the one clientRect was obtained from. */
    /* // So we introduce an offset to make sure elementFromPoint hits the right element. */
    /* // */
    /* // For elements with a rounded topleft border, the upper left corner lies outside the element. */
    /* // Then, we need an offset to get to the point nearest to the upper left corner, but within border. */
    /* const coordTruncationOffset = 2 // A value of 1 has been observed not to be enough, */
    /* // so we heuristically choose 2, which seems to work well. */
    /* // We know a value of 2 is still safe (lies within the element) because, */
    /* // from the code above, widht & height are >= 3. */
    /* const radius = parseFloat(computedStyle.borderTopLeftRadius) */
    /* const roundedBorderOffset = Math.ceil(radius * (1 - Math.sin(Math.PI / 4))) */
    /* const offset = Math.max(coordTruncationOffset, roundedBorderOffset) */
    /* if (offset >= clientRect.width || offset >= clientRect.height) { */
    /*     return false */
    /* } */
    /* let el: Node = document.elementFromPoint( */
    /*     clientRect.left + offset, */
    /*     clientRect.top + offset */
    /* ) */
    /* while (el && el !== element) { */
    /*     el = el.parentNode */
    /* } */
    /* if (!el) { */
    /*     return false */
    /* } */
    /* return true */
}

/** More accurate element visibility checking than isVisible.
 */
export async function getVisibleElemsBySelector(selector: string | null = "*", filters: ElementFilter[] = [], elements: Element[] = []): Promise<HTMLElement[]> {
    // Get frames with an accessible ItersectionObserver constructor (including top window)
    const frameWins = [window as any].concat(
        ...getAllDocumentFrames()
            .filter(frame => {
                try {
                    return (
                        (frame.contentWindow as Window & typeof globalThis).IntersectionObserver &&
                        isVisible(frame)
                    )
                } catch (e) {
                    return false
                }
            })
            .map(frame => frame.contentWindow),
    )

    // Create IntersectionObservers in all frames
    return Promise.all(
        frameWins.map(async win => {
            const elems = selector
                ? Array.from(
                    win.document.querySelectorAll(selector),
                ).concat(...getShadowElementsBySelector(selector, win.document))
                : elements.filter(elem => elem.ownerDocument === win.document)
            if (elems.length === 0) {
                return []
            }

            // Entries won't be available immediately, wait for a promise
            return new Promise(resolve => {
                const visible: HTMLElement[] = []
                let observer
                let started = false
                try {
                    observer = new win.IntersectionObserver(
                        entries => {
                            started = true
                            for (const entry of entries) {
                                if (
                                    entry.isIntersecting &&
                                    entry.boundingClientRect.width > 3 &&
                                    entry.boundingClientRect.height > 3
                                ) {
                                    visible.push(entry.target)
                                }
                            }
                            observer.disconnect()

                            resolve(visible)
                        },
                        { threshold: 0.01 },
                    )
                    elems.forEach(elem => observer.observe(elem))
                } catch (e) {
                    resolve([])
                }

                // Just in case the IntersectionObserver fails somehow (can this happen?)
                setTimeout(() => {
                    if (!started) {
                        logger.error("IntersectionObserver failed to observe")
                        observer.disconnect()
                        resolve([])
                    }
                }, 500)
            })
        }),
    ).then(intersectingElems =>
        intersectingElems
            .flat()
            .filter(el => isPainted(el as HTMLElement) &&
                filters.every(filter => filter(el as HTMLElement))
            ) as HTMLElement[]
    )
}

// Like isVisible with no rect checks
// Useful to catch "visibility: hidden;" css rule which eludes the IntersectionObserver
export function isPainted(elem: HTMLElement) {
    const s = getComputedStyle(elem)
    return (
        s.visibility !== "hidden" && s.display !== "none" && s.opacity !== "0"
    )
}

/** Return all frames that belong to the document (frames that belong to
 * extensions are ignored).
 *
 * @param doc   The document the frames should be fetched from
 */
export function getAllDocumentFrames(doc = document) {
    const win = doc?.defaultView as any
    if (!win || !(doc instanceof win.HTMLDocument)) return []
    const frames = (
        Array.from(doc.getElementsByTagName("iframe")) as HTMLIFrameElement[] &
            HTMLFrameElement[]
    )
        .concat(Array.from(doc.getElementsByTagName("frame")))
        .filter(frame => !frame.src.startsWith("moz-extension://"))
    return frames.concat(
        frames.reduce((acc, f) => {
            // Errors could be thrown because of CSP
            let newFrames = []
            try {
                const doc = f.contentDocument || f.contentWindow.document
                newFrames = getAllDocumentFrames(doc)
            } catch (e) {}
            return acc.concat(newFrames)
        }, []),
    )
}

/** Return the first non-collapsed selection in this document or an accessible frame. */
export function getSelection(doc = document) {
    const selection = doc.getSelection()
    if (selection && !selection.isCollapsed) return selection
    for (const frame of getAllDocumentFrames(doc)) {
        try {
            const frameSelection = frame.contentDocument?.getSelection()
            if (frameSelection && !frameSelection.isCollapsed) return frameSelection
        } catch {}
    }
    return selection
}

/** Computes the unique CSS selector of a specific HTMLElement */
export function getSelector(e: HTMLElement) {
    function uniqueSelector(e: HTMLElement) {
        // Only matching alphanumeric selectors because others chars might have special meaning in CSS
        if (e.id && /^[a-zA-Z0-9]+$/.exec(e.id)) return `[id="${e.id}"]`
        // If we reached the top of the document
        if (!e.parentElement) return "HTML"
        // Compute the position of the element
        const index =
            Array.from(e.parentElement.children)
                .filter(child => child.tagName === e.tagName)
                .indexOf(e) + 1
        return (
            uniqueSelector(e.parentElement) +
            ` > ${e.tagName}:nth-of-type(${index})`
        )
    }
    return uniqueSelector(e)
}

/* Get all the elements that match the given selector inside shadow DOM */
function getShadowElementsBySelector(selector: string, within = document) {
    let elems = []
    const roots: (Document | ShadowRoot)[] = [within]

    while (roots.length) {
        const root = roots.pop() as ShadowRoot
        root.querySelectorAll("*").forEach(elem => {
            if ((elem as HTMLElement).openOrClosedShadowRoot) {
                roots.push((elem as HTMLElement).openOrClosedShadowRoot)
                try {
                    elems = elems.concat(
                        ...roots[roots.length - 1].querySelectorAll(selector),
                    )
                } catch {}
            }
        })
    }
    return elems
}

/** Get all elements that match the given selector
 *
 * @param selector   `the CSS selector to choose elements with
 * @param filters     filter to use (in thre given order) to further chose
 *                    items, or [] for all
 */
export function getElemsBySelector(selector: string, filters: ElementFilter[]) {
    let elems = Array.from(document.querySelectorAll(selector))
    elems = elems.concat(...getShadowElementsBySelector(selector))
    const frameElems = getAllDocumentFrames().reduce((acc, frame) => {
        let newElems = []
        // Errors could be thrown by CSP
        try {
            const doc = frame.contentDocument || frame.contentWindow.document
            newElems = Array.from(doc.querySelectorAll(selector))
        } catch (e) {}
        return acc.concat(newElems)
    }, [])

    elems = elems.concat(frameElems)

    for (const filter of filters) {
        elems = elems.filter(filter)
    }

    return elems
}

/** Get the nth input element on a page
 *
 * @param nth         the element index, can be negative to start at the end
 * @param filters     filter to use (in thre given order) to further chose
 *                    items, or [] for all
 */
export function getNthElement(
    selectors: string,
    nth: number,
    filters: ElementFilter[],
): HTMLElement {
    const inputs = getElemsBySelector(selectors, filters)

    if (inputs.length) {
        const index = Number(nth)
            .clamp(-inputs.length, inputs.length - 1)
            .mod(inputs.length)

        return inputs[index] as HTMLElement
    }

    return null
}

/** Comparison function by offsetWidth/Height, used for sorting elements by their
 *  area on the page
 */
export function compareElementArea(a: HTMLElement, b: HTMLElement): number {
    const aArea = a.offsetWidth * a.offsetHeight
    const bArea = b.offsetWidth * b.offsetHeight

    return aArea - bArea
}

export const hintworthy_js_elems: Set<Element> = new Set()
const MAX_HINTWORTHY_JS_ELEMS = 1000
const HINTWORTHY_JS_ELEMS_PRUNE_INTERVAL = 100
let hintworthy_js_elems_additions = 0

export function pruneHintworthyJSElems() {
    for (const elem of hintworthy_js_elems) {
        if (!elem.isConnected) {
            hintworthy_js_elems.delete(elem)
        }
    }
    while (hintworthy_js_elems.size > MAX_HINTWORTHY_JS_ELEMS) {
        hintworthy_js_elems.delete(hintworthy_js_elems.values().next().value)
    }
    hintworthy_js_elems_additions = 0
}

/** Adds or removes an element from the hintworthy_js_elems array of the
 *  current tab.
 *
 *  @param {EventTarget} elem  The element add/removeEventListener is called on
 *  @param {boolean} add       true when called from addEventListener,
 *                             false from removeEventListener
 *  @param {string} event      The event name given to add/removeEventListener
 *
 *  This function must be security reviewed when Custom Elements land in Firefox
 *  https://bugzilla.mozilla.org/show_bug.cgi?id=1406825
 *
 *  This function is exported to the web content window but should only be
 *  callable from our modified add/removeEventListener because we remove the
 *  reference to it before web content runs (if added afterwards a
 *  mutationobserver on the window object would probably capture a reference to
 *  this function).
 *
 *  Just in case web content does get a direct reference or the built-in
 *  add/removeEventListener code doesn't validate elem correctly, this function
 *  must assume that its inputs are potentially malicious.
 */
export function registerEvListenerAction(
    elem: EventTarget,
    add: boolean,
    event: string,
) {
    // We're only interested in the subset of EventTargets that are Elements.
    if (!(elem instanceof window.Element)) {
        return
    }

    // Prevent bad elements from being processed
    //
    // This is defence in depth: we should never receive an invalid elem here
    // because add/removeEventListener currently throws a TypeError if the given
    // element is not a standard library EventTarget subclass.
    try {
        // Node prototype functions work on the C++ representation of the
        // Node, which a faked JS object won't have.
        // hasChildNodes() is chosen because it should be cheap.
        Node.prototype.hasChildNodes.apply(elem)
    } catch (e) {
        // Don't throw a real exception because addEventListener wouldn't and we
        // don't want to break content code.
        logger.error("Elem is not a real Node", elem)
        return
    }

    switch (event) {
        case "click":
        case "mousedown":
        case "mouseup":
        case "mouseover":
            if (add) {
                hintworthy_js_elems.add(elem)
                hintworthy_js_elems_additions += 1
                if (
                    hintworthy_js_elems_additions >=
                        HINTWORTHY_JS_ELEMS_PRUNE_INTERVAL ||
                    hintworthy_js_elems.size > MAX_HINTWORTHY_JS_ELEMS
                ) {
                    pruneHintworthyJSElems()
                }
            } else {
                // Possible bug: If a page adds an event listener for "click" and
                // "mousedown" and removes "mousedown" twice, we lose track of the
                // elem even though it still has a "click" listener.
                // Fixing this might not be worth the added complexity.
                hintworthy_js_elems.delete(elem)
            }
    }
}

/** Replace the page's addEventListener with a closure containing a reference
 *  to the original addEventListener and [[registerEvListenerAction]]. Do the
 *  same with removeEventListener.
 */
export function hijackPageListenerFunctions(): void {
    if (!inContentScript()) {
        return
    }
    const exportedName = "registerEvListenerAction"
    exportFunction(registerEvListenerAction, window, { defineAs: exportedName })

    const eval_str = ["addEventListener", "removeEventListener"].reduce(
        (acc, cur) => `${acc};
      EventTarget.prototype.${cur} = ((realFunction, register) => {
         return function (...args) {
               let result = realFunction.apply(this, args)
               try {
                  register(this, ${cur === "addEventListener"}, args[0])
               } catch (e) {
                  // Don't let the page know something wrong happened here
               }
               return result
         }
      })(EventTarget.prototype.${cur}, ${exportedName})`,
        "",
    )

    window.eval(eval_str + `;delete ${exportedName}`)
}

const hijackedAttachShadows = new WeakSet()
export function hijackPageAttachShadow(
    onShadowRoot: (root: ShadowRoot) => void,
    win = window,
): void {
    if (!inContentScript()) return
    try {
        const prototype = win.Element.prototype
        const attachShadow = win.eval("p => p.attachShadow")(prototype)
        if (typeof attachShadow !== "function" || hijackedAttachShadows.has(attachShadow)) return

        const observeShadowRoot = (host: HTMLElement) => {
            try {
                // Xray input plus a native brand check rejects fake Elements.
                Element.prototype.hasAttributes.apply(host)
                const root = host.openOrClosedShadowRoot
                if (root) onShadowRoot(root)
            } catch {}
        }
        const wrapped = win.eval(`(prototype, realFunction, observe, apply) => {
            const wrapped = function (...args) {
                const result = apply(realFunction, this, args)
                try { observe(this) } catch {}
                return result
            }
            prototype.attachShadow = wrapped
            return wrapped
        }`)(
            prototype,
            attachShadow,
            exportFunction(observeShadowRoot, win),
            exportFunction(Reflect.apply, win),
        )
        hijackedAttachShadows.add(wrapped)
    } catch (e) {
        logger.warning("Could not hijack attachShadow:", e)
    }
}

/** Focuses an input element and makes sure the cursor is put at the end of the input */
export function focus(e: HTMLElement): void {
    e.focus()
    // https://developer.mozilla.org/en-US/docs/Web/API/HTMLInputElement/setSelectionRange
    // "Note that accordingly to the WHATWG forms spec selectionStart,
    // selectionEnd properties and setSelectionRange method apply only to
    // inputs of types text, search, URL, tel and password"
    // So you can't put the cursor at the end of an email field. I can't
    // believe how stupid this is.
    if (
        e instanceof HTMLInputElement &&
        ["text", "search", "url", "tel", "password"].includes(
            e.type.toLowerCase(),
        )
    ) {
        let pos = 0
        if (config.get("cursorpos") === "end") pos = e.value.length
        e.setSelectionRange(pos, pos)
    }
}

/** DOM reference to the last used Input field
 */
let LAST_USED_INPUT: HTMLElement = null

export function getLastUsedInput(): HTMLElement {
    return LAST_USED_INPUT
}

/** WARNING: This function can potentially recieve malicious input! For the
 *  whole discussion about this, see
 *  https://github.com/tridactyl/tridactyl/pull/225
 *
 *  Remember to check whether WebComponents change anything security-wise:
 *  https://developer.mozilla.org/en-US/docs/Web/Web_Components/Custom_Elements
 *  https://bugzilla.mozilla.org/show_bug.cgi?id=1406825
 * */
function onPageFocus(elem: HTMLElement): boolean {
    try {
        elem = elem.openOrClosedShadowRoot
            ? elem.openOrClosedShadowRoot.activeElement as HTMLElement
            : elem
    } catch {}
    if (isTextEditable(elem) && isSubstantial(elem)) {
        LAST_USED_INPUT = elem
    }
    const setting =
        config.get("modesubconfigs", contentState.mode, "allowautofocus") ||
        config.get("allowautofocus")
    return setting === "true"
}

async function setInput(el) {
    const tab = await activeTabId()
    // store maximum of 10 elements to stop this getting bonkers huge
    const arr = (await State.getAsync("prevInputs")).concat({
        tab,
        inputId: el.id,
    })
    state.prevInputs = arr.slice(Math.max(arr.length - 10, 0))
}

/** Replaces the page's HTMLElement.prototype.focus with our own, onPageFocus */
function hijackPageFocusFunction(win = window): void {
    const exportedName = "onPageFocus"
    exportFunction(onPageFocus, win, { defineAs: exportedName })

    const eval_str = `HTMLElement.prototype.focus = ((realFocus, ${exportedName}) => {
        return function (...args) {
            if (${exportedName}(this, args))
                return realFocus.apply(this, args)
        }
     })(HTMLElement.prototype.focus, ${exportedName})`

    win.eval(eval_str + `;delete ${exportedName}`)
}

const focusListenerDocs = new WeakSet()
export function setupFocusHandler(doc = document, onFocus?: () => void): void {
    const win = doc?.defaultView
    if (!win || focusListenerDocs.has(doc)) return
    let focusoutTimer = 0

    // Handles when a user selects an input
    const setFocus = elem => {
        win.clearTimeout(focusoutTimer)
        if (isTextEditable(elem)) {
            LAST_USED_INPUT = elem
            setInput(elem)
        }
        onFocus?.()
    }
    const knownRoot = new WeakSet()
    const listen = root => {
        root.addEventListener("focusin", handler)
        knownRoot.add(root)
    }
    const handler = e => {
        let elem = e.target as HTMLElement
        const r = elem.openOrClosedShadowRoot
        if (!r) {
            setFocus(elem)
            return
        }
        if (knownRoot.has(r)) {
            // r[handler] will handle it
            return
        }
        while (elem.openOrClosedShadowRoot) {
            try {
                listen(elem.openOrClosedShadowRoot)
                elem = elem.openOrClosedShadowRoot.activeElement as HTMLElement
            } catch {
                // Inaccessible closed shadow
                knownRoot.add(r)
                break
            }
            if (!elem) return
        }
        setFocus(elem)
    }

    listen(doc)
    // Wait for any replacement focus to settle before reading activeElement.
    if (onFocus)
        doc.addEventListener("focusout", () => {
            focusoutTimer = win.setTimeout(onFocus)
        })
    focusListenerDocs.add(doc)

    // Run handler immediately if the newly found frame has focus
    if (doc.hasFocus() && doc.activeElement) {
        handler({ target: doc.activeElement })
    }

    // Handles when the page tries to select an input
    if (inContentScript()) {
        hijackPageFocusFunction(win)
    }
}

// CSS selectors. More readable for web developers. Not dead. Leaves browser to care about XML.
export const HINTTAGS_selectors = `
input:not([type=hidden]):not([disabled]),
a,
area,
button,
details,
iframe,
label,
select,
summary,
textarea,
[onclick],
[onmouseover],
[onmousedown],
[onmouseup],
[oncommand],
[role='link'],
[role='button'],
[role='checkbox'],
[role='combobox'],
[role='listbox'],
[role='listitem'],
[role='menuitem'],
[role='menuitemcheckbox'],
[role='menuitemradio'],
[role='option'],
[role='radio'],
[role='scrollbar'],
[role='slider'],
[role='spinbutton'],
[role='tab'],
[role='textbox'],
[role='treeitem'],
[class*='button'],
[tabindex]
`

// Selectors denoting elements where it makes sense to filter them by their
// text
export const HINTTAGS_filter_by_text_selectors = `
input:not([type=hidden]):not([disabled]),
a,
textarea,
button,
select,
[class*='button']
`

export const HINTTAGS_img_selectors = `
img,
[src]
`

export const HINTTAGS_anchor_selectors = `
[id],
[name]
`

export const HINTTAGS_killable_selectors = `
header,
footer,
nav,
span,
div,
iframe,
img,
button,
article,
summary
`

/** CSS selector for elements which point to a saveable resource
 */
export const HINTTAGS_saveable = `
[href]:not([href='#'])
`

/** Get array of "anchors": elements which have id or name and can be addressed
 * with the hash/fragment in the URL
 */
export function anchors(includeInvisible = false) {
    return getElemsBySelector(HINTTAGS_anchor_selectors, [
        isVisibleFilter(includeInvisible),
    ])
}

export const enum TabTarget {
    CurrentTab,
    NewTab,
    NewBackgroundTab,
    NewWindow,
}

const tabTargetToModifierKey = {
    [TabTarget.CurrentTab]: {},
    [TabTarget.NewTab]: { ctrlKey: true, shiftKey: true },
    [TabTarget.NewBackgroundTab]: { ctrlKey: true },
    [TabTarget.NewWindow]: { shiftKey: true },
}

/** if `target === _blank` clicking the link is treated as opening a popup and is blocked. Use webext API to avoid that. */
export function simulateClick(
    target: HTMLElement,
    tabTarget: TabTarget = TabTarget.CurrentTab,
) {
    // target can be set to other stuff, and we'll fail in annoying ways.
    // There's no easy way around that while this code executes outside of the
    // magic 'short lived event handler' context.
    //
    // OTOH, hardly anyone uses that functionality any more.
    let usePopupBlockerWorkaround =
        (target as HTMLAnchorElement).target === "_blank" ||
        (target as HTMLAnchorElement).target === "_new"
    const href = (target instanceof SVGAElement)
        ? target.href.animVal
        : (target as HTMLAnchorElement).href;
    if (href?.startsWith("file:")) {
        // file URLS cannot be opend with browser.tabs.create
        // see https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/tabs/create#url
        // still create a new tab
        if (tabTarget === TabTarget.CurrentTab && usePopupBlockerWorkaround) {
            tabTarget = TabTarget.NewTab
        }
        usePopupBlockerWorkaround = false
    }
    if (usePopupBlockerWorkaround) {
        // Try to open the new tab in the same container as the current one.
        activeTabContainerId().then(containerId => {
            if (containerId)
                openInNewTab(href, {
                    related: true,
                    cookieStoreId: containerId,
                })
            else
                openInNewTab(href, {
                    related: true,
                })
        })
    } else {
        if (target instanceof HTMLDetailsElement) {
            target.open = !target.open
        }
        mouseEvent(target, "click", tabTargetToModifierKey[tabTarget])
        // DOM.focus has additional logic for focusing inputs
        focus(target)
    }
}

/** Recursively resolves an active shadow DOM element. */
export function deepestShadowRoot(sr: ShadowRoot | null): ShadowRoot | null {
    if (sr === null) return sr
    let shadowRoot = sr
    while ((shadowRoot.activeElement as HTMLElement)?.openOrClosedShadowRoot != null) {
        try {
            shadowRoot = (shadowRoot.activeElement as HTMLElement).openOrClosedShadowRoot
        } catch {
            // Restricted shadow, may not be able to access its properties
            break
        }
    }
    return shadowRoot
}

/** Return the active element, within shadow DOMs or iframes if necessary. */
export function activeElement(elem = document.activeElement) {
    while (elem !== null) {
        while ((elem as HTMLElement).openOrClosedShadowRoot !== null) {
            try {
                elem = (elem as HTMLElement).openOrClosedShadowRoot.activeElement
            } catch {
                // Restricted shadow root, can't access activeElement property
                return elem
            }
            if (!elem) return null
        }
        if (elem.tagName !== "IFRAME") return elem
        // Search within iframes if they're accessible
        try {
            const iframeActiveElem = (elem as HTMLIFrameElement).contentDocument.activeElement
            if (!iframeActiveElem) return elem
            elem = iframeActiveElem
        } catch (e) {
            return elem
        }
    }
}

export function getElementCentre(el) {
    const pos = el.getBoundingClientRect()
    return { x: 0.5 * (pos.left + pos.right), y: 0.5 * (pos.top + pos.bottom) }
}

export function getAbsoluteCentre(el) {
    const pos = getElementCentre(el)
    let frame = el.ownerDocument.defaultView.frameElement
    while (frame) {
        const framePos = frame.getBoundingClientRect()
        pos.x += framePos.left
        pos.y += framePos.top
        frame = frame.ownerDocument.defaultView.frameElement
    }
    return {
        x: pos.x + (window as any).mozInnerScreenX,
        y: pos.y + (window as any).mozInnerScreenY,
    }
}
