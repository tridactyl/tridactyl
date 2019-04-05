/** # Editor Functions
 *
 * This file contains functions to manipulate the content of textareas/input fields/contenteditable elements.
 *
 * If you want to bind them to keyboard shortcuts, be sure to prefix them with "text.". For example, if you want to bind control-a to `beginning_of_line` in all modes, use:
 *
 * ```
 * bind --mode=ex <C-a> text.beginning_of_line
 * bind --mode=input <C-a> text.beginning_of_line
 * bind --mode=insert <C-a> text.begining_of_line
 * ```
 *
 * Also keep in mind that if you want to bind something in insert mode, you'll probably also want to bind it in input mode (insert mode is entered by clicking on text areas while input mode is entered by using `gi`).
 *
 * If you're looking for command-line only functions, go [there](/static/docs/modules/_src_commandline_frame_.html).
 *
 * Contrary to the main tridactyl help page, this one doesn't tell you whether a specific function is bound to something. For now, you'll have to make do with with `:bind` and `:viewconfig`.
 *
 */
/** ignore this line */

// We have a single dependency on config: getting the value of the WORDPATTERN setting
// Perhaps we could find a way to get rid of it?
import * as config from "@src/lib/config"

/** @hidden **/
type editor_function = (
    text: string,
    start: number,
    end: number,
    arg?: any,
) => [string, number, number]

/** @hidden
 * Applies a function to an element. If the element is an HTMLInputElement and its type isn't "text", it is first turned into a "text" element. This is necessary because some elements (e.g. "email") do not have a selectionStart/selectionEnd.
 * https://developer.mozilla.org/en-US/docs/Web/API/HTMLInputElement/setSelectionRange .
 **/
function applyToElem(e, fn) {
    let result
    if (e instanceof HTMLInputElement && e.type != "text") {
        let t = e.type
        e.type = "text"
        result = fn(e)
        e.type = t
    } else {
        result = fn(e)
    }
    return result
}

/** @hidden
 * Returns values necessary for editor functions to work on textarea/input elements
 *
 * @param e the element
 * @return [string, number, number] The content of the element, the position of the caret, the position of the end of the visual selection
 */
function getSimpleValues(e: any) {
    return applyToElem(e, e => [e.value, e.selectionStart, e.selectionEnd])
}

/** @hidden
 * Returns values necessary for editor functions to work on contentEditable elements
 *
 * @param e a contentEditable element
 * @return [string, number, number] The content of the element, the position of the caret, the position of the end of the visual selection
 */
function getContentEditableValues(e: any): [string, number, number] {
    let selection = e.ownerDocument.getSelection()
    // The selection might actually not be in e so we need to make sure it is
    let n = selection.anchorNode
    while (n && n != e) { n = n.parentNode }
    // The selection isn't for e, so we can't do anything
    if (!n) { return [null, null, null] }
    // selection might span multiple elements, might not start with the first element in e or end with the last element in e so the easiest way to compute caret position from beginning of e is to first compute distance from caret to end of e, then move beginning of selection to beginning of e and then use distance from end of selection to compute distance from beginning of selection
    let r = selection.getRangeAt(0).cloneRange()
    let selectionLength = r.toString().length
    r.setEnd(e, e.childNodes.length)
    let lengthFromCaretToEndOfText = r.toString().length
    r.setStart(e, 0)
    let s = r.toString()
    let caretPos = s.length - lengthFromCaretToEndOfText
    return [s, caretPos, caretPos + selectionLength]
}

/** @hidden
 * Change text in regular textarea/input fields. Note: this destroys the field's history (i.e. C-z won't work).
 *
 * @param e The element
 * @param text The new content of the element, null if it shouldn't change
 * @param start The new position of the caret, null if the caret shouldn't move
 * @param end The end of the visual selection, null if you just want to move the caret
 */
function setSimpleValues(e, text, start, end) {
    return applyToElem(e, e => {
        if (text !== null) { e.value = text }
        if (start !== null) {
            if (end === null) { end = start }
            e.selectionStart = start
            e.selectionEnd = end
        }
    })
}

/** @hidden
 * Change text in contentEditable elements in a non-destructive way (i.e. C-z will undo changes).
 * @param e The content editable element
 * @param text The new content the element should have. null if you just want to move the caret around
 * @param start The new caret position. null if you just want to change text.
 * @param end The end of the visual selection. null if you just want to move the caret.
 */
function setContentEditableValues(e, text, start, end) {
    const selection = e.ownerDocument.getSelection()
    if (selection.rangeCount < 1) {
        let r = new Range()
        r.setStart(e, 0)
        r.setEnd(e, e.childNodes.length)
        selection.addRange(r)
    }
    if (text !== null) {
        const range = selection.getRangeAt(0)
        const anchorNode = selection.anchorNode
        const focusNode = selection.focusNode
        range.setStart(anchorNode, 0)
        range.setEndAfter(focusNode, focusNode.length)
        e.ownerDocument.execCommand("insertText", false, text)
    }
    if (start !== null) {
        if (end === null) { end = start }
        let range = selection.getRangeAt(0)
        range.setStart(range.startContainer, start)
        range = selection.getRangeAt(0)
        range.setEnd(range.startContainer, end)
    }
}

/** @hidden
 * Take an editor function as parameter and return it wrapped in a function that will handle grabbing text and caret position from the HTML element it takes as parameter
 *
 * @param editor_function A function that takes a [string, selectionStart, selectionEnd] tuple as argument and returns a [string, selectionStart, selectionEnd] tuple corresponding to the new state of the text.
 *
 * @return boolean Whether the editor function was actually called or not
 *
 **/
function wrap_input(
    fn: editor_function,
): (e: HTMLElement, arg?: any) => boolean {
    return (e: HTMLElement, arg?: any) => {
        let getValues = getSimpleValues
        let setValues = setSimpleValues
        if (e.isContentEditable) {
            getValues = getContentEditableValues
            setValues = setContentEditableValues
        }
        const [origText, origStart, origEnd] = getValues(e)
        if (origText === null || origStart === null) { return false }
        setValues(e, ...fn(origText, origStart, origEnd, arg))
        return true
    }
}

/** @hidden
 * Take an editor function as parameter and wrap it in a function that will handle error conditions
 */
function needs_text(fn: editor_function, arg?: any): editor_function {
    return (
        text: string,
        selectionStart: number,
        selectionEnd: number,
        arg?: any,
    ) => {
        if (
            text.length === 0 ||
            selectionStart === null ||
            selectionStart === undefined
        ) {
            return [null, null, null]
        }
        return fn(
            text,
            selectionStart,
            typeof selectionEnd == "number" ? selectionEnd : selectionStart,
            arg,
        )
    }
}

/** @hidden
 * Detects the boundaries of a word in text according to the wordpattern setting. If POSITION is in a word, the boundaries of this word are returned. If POSITION is out of a word and BEFORE is true, the word before POSITION is returned. If BEFORE is false, the word after the caret is returned.
 */
export function getWordBoundaries(
    text: string,
    position: number,
    before: boolean,
): [number, number] {
    if (position < 0 || position > text.length) {
        throw new Error(
            `getWordBoundaries: position (${position}) should be within text ("${text}") boundaries (0, ${
                text.length
            })`,
        )
    }
    let pattern = new RegExp(config.get("wordpattern"), "g")
    let boundary1 = position < text.length ? position : text.length - 1
    let direction = before ? -1 : 1
    // if the caret is not in a word, try to find the word before or after it
    while (
        boundary1 >= 0 &&
        boundary1 < text.length &&
        !text[boundary1].match(pattern)
    ) {
        boundary1 += direction
    }

    if (boundary1 < 0) {
        boundary1 = 0
    } else if (boundary1 >= text.length) {
        boundary1 = text.length - 1
    }

    // if a word couldn't be found in this direction, try the other one
    while (
        boundary1 >= 0 &&
        boundary1 < text.length &&
        !text[boundary1].match(pattern)
    ) {
        boundary1 -= direction
    }

    if (boundary1 < 0) {
        boundary1 = 0
    } else if (boundary1 >= text.length) {
        boundary1 = text.length - 1
    }

    if (!text[boundary1].match(pattern)) {
        // there is no word in text
        throw new Error(
            `getWordBoundaries: no characters matching wordpattern (${
                pattern.source
            }) in text (${text})`,
        )
    }

    // now that we know the caret is in a word (it could be in the middle depending on POSITION!), try to find its beginning/end
    while (
        boundary1 >= 0 &&
        boundary1 < text.length &&
        !!text[boundary1].match(pattern)
    ) {
        boundary1 += direction
    }
    // boundary1 is now outside of the word, bring it back inside of it
    boundary1 -= direction

    let boundary2 = boundary1
    // now that we know the caret is at the beginning/end of a word, we need to find the other boundary
    while (
        boundary2 >= 0 &&
        boundary2 < text.length &&
        !!text[boundary2].match(pattern)
    ) {
        boundary2 -= direction
    }
    // boundary2 is outside of the word, bring it back in
    boundary2 += direction

    // Add 1 to the end boundary because the end of a word is marked by the character after said word
    if (boundary1 > boundary2) { return [boundary2, boundary1 + 1] }
    return [boundary1, boundary2 + 1]
}

/** @hidden
 * Finds the next word as defined by the wordpattern setting after POSITION. If POSITION is in a word, POSITION is moved forward until it is out of the word.
 * @return number The position of the next word in text or -1 if the next word can't be found.
 */
export function wordAfterPos(text: string, position: number) {
    if (position < 0) {
        throw new Error(`wordAfterPos: position (${position}) is less that 0`)
    }
    let pattern = new RegExp(config.get("wordpattern"), "g")
    // move position out of the current word
    while (position < text.length && !!text[position].match(pattern)) {
        position += 1
    }
    // try to find characters that match wordpattern
    while (position < text.length && !text[position].match(pattern)) {
        position += 1
    }
    if (position >= text.length) { return -1 }
    return position
}

/**
 * Behaves like readline's [delete_char](http://web.mit.edu/gnu/doc/html/rlman_1.html#SEC14), i.e. deletes the character to the right of the caret.
 **/
export const delete_char = wrap_input(
    needs_text((text, selectionStart, selectionEnd) => {
        if (selectionStart != selectionEnd) {
            // If the user selected text, then we need to delete that instead of a single char
            text =
                text.substring(0, selectionStart) + text.substring(selectionEnd)
        } else {
            text =
                text.substring(0, selectionStart) +
                text.substring(selectionStart + 1)
        }
        return [text, selectionStart, null]
    }),
)

/**
 * Behaves like readline's [delete_backward_char](http://web.mit.edu/gnu/doc/html/rlman_1.html#SEC14), i.e. deletes the character to the left of the caret.
 **/
export const delete_backward_char = wrap_input(
    needs_text((text, selectionStart, selectionEnd) => {
        if (selectionStart != selectionEnd) {
            text =
                text.substring(0, selectionStart) + text.substring(selectionEnd)
        } else {
            text =
                text.substring(0, selectionStart - 1) +
                text.substring(selectionStart)
        }
        selectionStart -= 1
        return [text, selectionStart, null]
    }),
)

/**
 * Behaves like readline's [tab_insert](http://web.mit.edu/gnu/doc/html/rlman_1.html#SEC14), i.e. inserts a tab character to the left of the caret.
 **/
export const tab_insert = wrap_input((text, selectionStart, selectionEnd) => {
    if (selectionStart != selectionEnd) {
        text =
            text.substring(0, selectionStart) +
            "\t" +
            text.substring(selectionEnd)
    } else {
        text =
            text.substring(0, selectionStart) +
            "\t" +
            text.substring(selectionStart)
    }
    selectionStart += 1
    return [text, selectionStart, null]
})

/**
 * Behaves like readline's [transpose_chars](http://web.mit.edu/gnu/doc/html/rlman_1.html#SEC14), i.e. transposes the character to the left of the caret with the character to the right of the caret and then moves the caret one character to the right. If there are no characters to the right or to the left of the caret, uses the two characters the closest to the caret.
 **/
export const transpose_chars = wrap_input(
    (text, selectionStart, selectionEnd) => {
        if (text.length < 2) { return [null, null, null] }
        // When at the beginning of the text, transpose the first and second characters
        if (selectionStart == 0) { selectionStart = 1 }
        // When at the end of the text, transpose the last and second-to-last characters
        if (selectionStart >= text.length) { selectionStart = text.length - 1 }

        text =
            text.substring(0, selectionStart - 1) +
            text.substring(selectionStart, selectionStart + 1) +
            text.substring(selectionStart - 1, selectionStart) +
            text.substring(selectionStart + 1)
        selectionStart += 1
        return [text, selectionStart, null]
    },
)

/** @hidden
 * Applies a function to the word the caret is in, or to the next word if the caret is not in a word, or to the previous word if the current word is empty.
 */
function applyWord(
    text,
    selectionStart,
    selectionEnd,
    fn: (string) => string,
): [string, number, number] {
    if (text.length == 0) { return [null, null, null] }
    // If the caret is at the end of the text, move it just before the last character
    if (selectionStart >= text.length) {
        selectionStart = text.length - 1
    }
    let boundaries = getWordBoundaries(text, selectionStart, false)
    let beginning =
        text.substring(0, boundaries[0]) +
        fn(text.substring(boundaries[0], boundaries[1]))
    text = beginning + text.substring(boundaries[1])
    selectionStart = beginning.length + 1
    return [text, selectionStart, null]
}

/**
 * Behaves like readline's [transpose_words](http://web.mit.edu/gnu/doc/html/rlman_1.html#SEC14). Basically equivalent to [[im_transpose_chars]], but using words as defined by the wordpattern setting.
 **/
export const transpose_words = wrap_input(
    needs_text((text, selectionStart, selectionEnd) => {
        if (selectionStart >= text.length) {
            selectionStart = text.length - 1
        }
        // Find the word the caret is in
        let firstBoundaries = getWordBoundaries(text, selectionStart, false)
        let secondBoundaries = firstBoundaries
        // If there is a word after the word the caret is in, use it for the transselectionStartition, otherwise use the word before it
        let nextWord = wordAfterPos(text, firstBoundaries[1])
        if (nextWord > -1) {
            secondBoundaries = getWordBoundaries(text, nextWord, false)
        } else {
            firstBoundaries = getWordBoundaries(
                text,
                firstBoundaries[0] - 1,
                true,
            )
        }
        let firstWord = text.substring(firstBoundaries[0], firstBoundaries[1])
        let secondWord = text.substring(
            secondBoundaries[0],
            secondBoundaries[1],
        )
        let beginning =
            text.substring(0, firstBoundaries[0]) +
            secondWord +
            text.substring(firstBoundaries[1], secondBoundaries[0])
        selectionStart = beginning.length
        return [
            beginning + firstWord + text.substring(secondBoundaries[1]),
            selectionStart,
            null,
        ]
    }),
)

/**
 * Behaves like readline's [upcase_word](http://web.mit.edu/gnu/doc/html/rlman_1.html#SEC14). Makes the word the caret is in uppercase.
 **/
export const upcase_word = wrap_input(
    needs_text((text, selectionStart, selectionEnd) => {
        return applyWord(text, selectionStart, selectionEnd, word =>
            word.toUpperCase(),
        )
    }),
)

/**
 * Behaves like readline's [downcase_word](http://web.mit.edu/gnu/doc/html/rlman_1.html#SEC14). Makes the word the caret is in lowercase.
 **/
export const downcase_word = wrap_input(
    needs_text((text, selectionStart, selectionEnd) => {
        return applyWord(text, selectionStart, selectionEnd, word =>
            word.toLowerCase(),
        )
    }),
)

/**
 * Behaves like readline's [capitalize_word](http://web.mit.edu/gnu/doc/html/rlman_1.html#SEC14). Makes the initial character of the word the caret is in uppercase.
 **/
export const capitalize_word = wrap_input(
    needs_text((text, selectionStart, selectionEnd) => {
        return applyWord(
            text,
            selectionStart,
            selectionEnd,
            word => word[0].toUpperCase() + word.substring(1),
        )
    }),
)

/**
 * Behaves like readline's [kill_line](http://web.mit.edu/gnu/doc/html/rlman_1.html#SEC15), i.e. deletes every character to the right of the caret until reaching either the end of the text or the newline character (\n).
 **/
export const kill_line = wrap_input(
    needs_text((text, selectionStart, selectionEnd) => {
        let newLine = text.substring(selectionStart).search("\n")
        if (newLine != -1) {
            // If the caret is right before the newline, kill the newline
            if (newLine == 0) { newLine = 1 }
            text =
                text.substring(0, selectionStart) +
                text.substring(selectionStart + newLine)
        } else {
            text = text.substring(0, selectionStart)
        }
        return [text, selectionStart, null]
    }),
)

/**
 * Behaves like readline's [backward_kill_line](http://web.mit.edu/gnu/doc/html/rlman_1.html#SEC15), i.e. deletes every character to the left of the caret until either the beginning of the text is found or a newline character ("\n") is reached.
 **/
export const backward_kill_line = wrap_input(
    needs_text((text, selectionStart, selectionEnd) => {
        // If the caret is at the beginning of a line, join the lines
        if (selectionStart > 0 && text[selectionStart - 1] == "\n") {
            return [
                text.substring(0, selectionStart - 1) +
                    text.substring(selectionStart),
                selectionStart,
                null,
            ]
        }
        let newLine
        // Find the closest newline
        for (
            newLine = selectionStart;
            newLine > 0 && text[newLine - 1] != "\n";
            --newLine
        ) {}
        // Remove everything between the newline and the caret
        return [
            text.substring(0, newLine) + text.substring(selectionStart),
            newLine,
            null,
        ]
    }),
)

/**
 * Behaves like readline's [kill_whole_line](http://web.mit.edu/gnu/doc/html/rlman_1.html#SEC15). Deletes every character between the two newlines the caret is in. If a newline can't be found on the left of the caret, everything is deleted until the beginning of the text is reached. If a newline can't be found on the right, everything is deleted until the end of the text is found.
 **/
export const kill_whole_line = wrap_input(
    needs_text((text, selectionStart, selectionEnd) => {
        let firstNewLine
        let secondNewLine
        // Find the newline before the caret
        for (
            firstNewLine = selectionStart;
            firstNewLine > 0 && text[firstNewLine - 1] != "\n";
            --firstNewLine
        ) {}
        // Find the newline after the caret
        for (
            secondNewLine = selectionStart;
            secondNewLine < text.length && text[secondNewLine - 1] != "\n";
            ++secondNewLine
        ) {}
        // Remove everything between the newline and the caret
        return [
            text.substring(0, firstNewLine) + text.substring(secondNewLine),
            firstNewLine,
            null,
        ]
    }),
)

/**
 * Behaves like readline's [kill_word](http://web.mit.edu/gnu/doc/html/rlman_1.html#SEC15). Deletes every character from the caret to the end of a word, with words being defined by the wordpattern setting.
 **/
export const kill_word = wrap_input(
    needs_text((text, selectionStart, selectionEnd) => {
        let boundaries = getWordBoundaries(text, selectionStart, false)
        if (selectionStart > boundaries[0] && selectionStart < boundaries[1]) {
            boundaries[0] = selectionStart
        }
        // Remove everything between the newline and the caret
        return [
            text.substring(0, boundaries[0]) +
                text.substring(boundaries[1] + 1),
            boundaries[0],
            null,
        ]
    }),
)

/**
 * Behaves like readline's [backward_kill_word](http://web.mit.edu/gnu/doc/html/rlman_1.html#SEC15). Deletes every character from the caret to the beginning of a word with word being defined by the wordpattern setting.
 **/
export const backward_kill_word = wrap_input(
    needs_text((text, selectionStart, selectionEnd) => {
        let boundaries = getWordBoundaries(text, selectionStart, true)
        if (selectionStart > boundaries[0] && selectionStart < boundaries[1]) {
            boundaries[1] = selectionStart
        }
        // Remove everything between the newline and the caret
        return [
            text.substring(0, boundaries[0]) + text.substring(boundaries[1]),
            boundaries[0],
            null,
        ]
    }),
)

/**
 * Behaves like readline's [beginning_of_line](http://web.mit.edu/gnu/doc/html/rlman_1.html#SEC12). Moves the caret to the right of the first newline character found at the left of the caret. If no newline can be found, move the caret to the beginning of the text.
 **/
export const beginning_of_line = wrap_input(
    needs_text((text, selectionStart, selectionEnd) => {
        while (
            text[selectionStart - 1] != undefined &&
            text[selectionStart - 1] != "\n"
        ) {
            selectionStart -= 1
        }
        return [null, selectionStart, null]
    }),
)

/**
 * Behaves like readline's [end_of_line](http://web.mit.edu/gnu/doc/html/rlman_1.html#SEC12). Moves the caret to the left of the first newline character found at the right of the caret. If no newline can be found, move the caret to the end of the text.
 **/
export const end_of_line = wrap_input(
    needs_text((text, selectionStart, selectionEnd) => {
        while (
            text[selectionStart] != undefined &&
            text[selectionStart] != "\n"
        ) {
            selectionStart += 1
        }
        return [null, selectionStart, null]
    }),
)

/**
 * Behaves like readline's [forward_char](http://web.mit.edu/gnu/doc/html/rlman_1.html#SEC12). Moves the caret one character to the right.
 **/
export const forward_char = wrap_input((text, selectionStart, selectionEnd) => {
    return [null, selectionStart + 1, null]
})

/**
 * Behaves like readline's [backward_char](http://web.mit.edu/gnu/doc/html/rlman_1.html#SEC12). Moves the caret one character to the left.
 **/
export const backward_char = wrap_input(
    (text, selectionStart, selectionEnd) => {
        return [null, selectionStart - 1, null]
    },
)

/**
 * Behaves like readline's [forward_word](http://web.mit.edu/gnu/doc/html/rlman_1.html#SEC12). Moves the caret one word to the right, with words being defined by the wordpattern setting.
 **/
export const forward_word = wrap_input(
    needs_text((text, selectionStart, selectionEnd) => {
        let boundaries = getWordBoundaries(text, selectionStart, false)
        if (selectionStart >= boundaries[0] && selectionStart < boundaries[1]) {
            boundaries = getWordBoundaries(text, boundaries[1], false)
        }
        return [null, boundaries[0], null]
    }),
)

/**
 * Behaves like readline's [backward_word](http://web.mit.edu/gnu/doc/html/rlman_1.html#SEC12). Moves the caret one word to the right, with words being defined by the wordpattern setting.
 **/
export const backward_word = wrap_input(
    (text, selectionStart, selectionEnd) => {
        if (selectionStart == 0) { return [null, null, null] }
        let boundaries = getWordBoundaries(text, selectionStart, true)
        if (selectionStart >= boundaries[0] && selectionStart < boundaries[1]) {
            boundaries = getWordBoundaries(text, boundaries[0] - 1, true)
        }
        return [null, boundaries[0], null]
    },
)

/**
 * Insert text in the current input.
 **/
export const insert_text = wrap_input(
    (text, selectionStart, selectionEnd, arg) => {
        return [
            text.slice(0, selectionStart) + arg + text.slice(selectionEnd),
            selectionStart + arg.length,
            null,
        ]
    },
)
