/** Messaging-safe copies of objects. Drops non-primitive properties.
 *
 *  Objects to be passed by messaging API must only comprise of the following,
 *  otherwise they're silently dropped. The silent drop is probably a bug. If
 *  you include a Symbol() you get a DataCloneError.
 *
 *   - string
 *   - number
 *   - boolean
 *   - null
 *   - undefined
 *   - objects containing attributes only of the above types
 *
 *  Could just copy all primitive attributes, but then we don't get the
 *  interface... If we have to do this again, consider generating automatically
 *  from typescript/lib/lib.dom.d.ts
 *
 * */

const messageSafeTypes = new Set([
    "string",
    "number",
    "boolean",
    "null",
    "undefined",
])

function pick(o, ...props) {
    return Object.assign({}, ...props.map(prop => ({ [prop]: o[prop] })))
}

/** Messaging-safe, one level copy of obj
 *
 *  Doesn't work for special objects like Events: Object.keys() is too
 *  parsimonious.
 *
 */
export function generic(obj): any {
    let ret = {}
    for (let key of Object.keys(obj)) {
        if (messageSafeTypes.has(typeof obj[key])) {
            ret[key] = obj[key]
        }
    }
    return ret
}

/** Messaging-safe, one level copy of obj
 *
 *  Also looks at prototype properties. Works for e.g. Event.
 *
 */
export function generic_all_props(obj): any {
    let ret = {}
    for (let key in obj) {
        if (messageSafeTypes.has(typeof obj[key])) {
            ret[key] = obj[key]
        }
    }
    return ret
}

export interface MsgSafeKeyboardEvent {
    // KeyboardEvent
    readonly altKey: boolean
    readonly shiftKey: boolean
    readonly metaKey: boolean
    readonly ctrlKey: boolean
    readonly repeat: boolean
    readonly isComposing: boolean

    readonly key: string
    readonly code: string
    readonly location: number
    readonly locale: string

    // Event
    readonly bubbles: boolean
    readonly cancelable: boolean
    readonly composed: boolean
    readonly defaultPrevented: boolean
    readonly eventPhase: number

    readonly timeStamp: string
    readonly type: string
    readonly isTrusted: boolean

    readonly target: MsgSafeNode
}

/** MsgSafe copy of keyevent. */
export function KeyboardEvent(ke): MsgSafeKeyboardEvent {
    let copy = pick(
        ke,
        "shiftKey",
        "metaKey",
        "altKey",
        "ctrlKey",
        "repeat",
        "key",
        "bubbles",
        "composed",
        "defaultPrevented",
        "eventPhase",
        "timeStamp",
        "type",
        "isTrusted",
    )
    copy.target = Node(ke.target)

    // Works but adds > 200 properties.
    // let copy = generic_all_props(ke)
    // copy.target = generic_all_props(ke.target)

    return copy
}

export interface MsgSafeNode {
    // w3 Node interface
    readonly nodeName: string
    readonly nodeValue: string
    readonly nodeType: number
    readonly namespaceURI: string
    readonly prefix?: string
    readonly localName: string
    readonly baseURI: string
    readonly textContent: string

    // w3 Element interface
    readonly tagName?: string

    // InputElement
    readonly type?: string

    // WAI-ARIA
    readonly role?: string

    // unknown spec
    readonly contentEditable?: string
    readonly isContentEditable?: boolean
    readonly disabled?: boolean
    readonly readonly?: boolean
}

export function Node(node: HTMLElement): MsgSafeNode {
    return pick(
        node,
        // w3 Node interface
        "nodeName",
        "nodeValue",
        "nodeType",
        "namespaceURI",
        "prefix",
        "localName",
        "baseURI",
        "textContent",

        // w3 Element interface
        "tagName",

        // InputElement
        "type",

        // WAI-ARIA
        "role",

        // unknown spec
        "contentEditable",
        "isContentEditable",
        "disabled",
        "readonly",
    )
}
