/** Key-sequence parser
 *
 *  Given an iterable of keys and a mapping of keys to objects, return:
 *
 *   - parser(keyseq, map):
 *   	the mapped object and a count
 *   	OR a suffix of keys[] that, if more keys are pressed, could map to an object.
 *   - completions(keyseq, map):
 *   	an array of keysequences in map that keyseq is a valid prefix of.
 *
 *  No key sequence in map may be a prefix of another key sequence in map. This
 *  is a point of difference from Vim that removes any time-dependence in the
 *  parser.
 *
 */

export type KeyModifiers = {
    altKey?: boolean,
    ctrlKey?: boolean,
    metaKey?: boolean,
    shiftKey?: boolean,
}

export class MinimalKey {
    readonly altKey = false
    readonly ctrlKey = false
    readonly metaKey = false
    readonly shiftKey = false

    constructor(
        readonly key: string,
        modifiers?: KeyModifiers,
    ) {
        for (let mod in modifiers) {
            this[mod] = modifiers[mod]
        }
    }

    /** Does this key match a given MinimalKey extending object? */
    match(keyevent) {
        for (let attr in this) {
            if (this[attr] !== keyevent[attr]) return false
        }
        return true
    }
}

/** String starting with a bracket expr or a literal < to MinimalKey and remainder.

    Bracket expressions generally start with a < contain no angle brackets or
    whitespace and end with a >. These special-cased expressions are also
    permitted: <{optional modifier}<> or <{optional modifier}>>

    If the string passed does not match this definition, it is treated as a
    literal <.

    In sort of Backus Naur:

        - bracketexpr ::= '<' modifier? key '>'
        - modifier ::= 'm'|'s'|'a'|'c' '-'
        - key ::= '<'|'>'|/[^\s<>]+/

    Modifiers are case insensitive.

    The following case insensitive vim compatibility aliases are also defined:

        cr: 'Enter',
        return: 'Enter',
        space: 'Enter',
        bar: '|',
        del: 'Delete',
        bs: 'Backspace',
        lt: '<',

    Compatibility breaks:

    Shift + key must use the correct capitalisation of key: <S-j> != J, <S-J> == J.

    In Vim <A-x> == <M-x> on most systems. Not so here: we can't detect
    platform, so just have to use what the browser gives us.

    Vim has a predefined list of special key sequences, we don't: there are too
    many (and they're non-standard).[1].

    In Vim, you're still allowed to use <lt> within angled brackets: 
        <M-<> == <M-lt> == <M-<lt>>
    Here only the first two will work.

    Restrictions:

    It is not possible to map to a keyevent that actually sends the key value
    of any of the aliases or to any multi-character sequence containing a space
    or >. It is unlikely that browsers will ever do either of those things.

    [1]: https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent/key/Key_Values

*/
export function bracketexprToKey(be: string): [MinimalKey, string] {

    function extractModifiers(be: string): [string, any] {
        const modifiers = new Map([
            ["A-", "altKey"],
            ["C-", "ctrlKey"],
            ["M-", "metaKey"],
            ["S-", "shiftKey"],
        ])

        let extracted = {}
        let mod = modifiers.get(be.slice(1, 3).toUpperCase())
        if (mod) {
            extracted[mod] = true
            // Remove modifier prefix
            be = '<' + be.slice(3)
        }
        return [be, extracted]
    }

    let modifiers: KeyModifiers
    let beWithoutModifiers: string
    [beWithoutModifiers, modifiers] = extractModifiers(be)

    // Special cases:
    if (be === '<<>') {
        return [new MinimalKey('<', modifiers), be.slice(3)]
    } else if (beWithoutModifiers === '<>>') {
        return [new MinimalKey('<', modifiers), be.slice(3)]
    }

    // General case:
    const beRegex = /<[^\s]+?>/u

    // Vim compatibility aliases
    const aliases = {
        cr: 'Enter',
        return: 'Enter',
        space: 'Enter',
        bar: '|',
        del: 'Delete',
        bs: 'Backspace',
        lt: '<',
    }
    if (beRegex.exec(be) !== null) {
        // Extract complete bracket expression and remove
        let bracketedBit = beRegex.exec(be)[0]
        be = be.replace(bracketedBit, "")

        // Extract key and alias if required
        let key = beRegex.exec(beWithoutModifiers)[0].slice(1, -1)
        if (key.toLowerCase() in aliases) key = aliases[key.toLowerCase()]

        // Return constructed key and remainder of the string
        return [new MinimalKey(key, modifiers), be]
    } else {
        // Wasn't a bracket expression. Treat it as a literal <
        return [new MinimalKey('<'), be.slice(1)]
    }
}

export function mapstrToKeyseq(mapstr: string): MinimalKey[] {
    const keyseq: MinimalKey[] = []
    let key: MinimalKey
    while (mapstr.length) {
        if (mapstr[0] === '<') {
            [key, mapstr] = bracketexprToKey(mapstr)
            keyseq.push(key)
        } else {
            keyseq.push(new MinimalKey(mapstr[0]))
            mapstr = mapstr.slice(1)
        }
    }
    return keyseq
}

// {{{ Utility functions for dealing with KeyboardEvents

import {MsgSafeKeyboardEvent} from './msgsafe'

type KeyEventLike = MinimalKey | MsgSafeKeyboardEvent | KeyboardEvent

export function hasModifiers(keyEvent: KeyEventLike) {
    return keyEvent.ctrlKey || keyEvent.altKey || keyEvent.metaKey || keyEvent.shiftKey
}

/** shiftKey is true for any capital letter, most numbers, etc. Generally care about other modifiers. */
export function hasNonShiftModifiers(keyEvent: KeyEventLike) {
    return keyEvent.ctrlKey || keyEvent.altKey || keyEvent.metaKey
}

export function isSimpleKey(keyEvent: KeyEventLike) {
    return ! (keyEvent.key.length > 1 || hasNonShiftModifiers(keyEvent))
}
