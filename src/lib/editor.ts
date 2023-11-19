/** # Editor Functions
 *
 * This file contains functions to manipulate the content of textareas/input fields/contenteditable elements.
 *
 * If you want to bind them to keyboard shortcuts, be sure to prefix them with "text.". For example, if you want to bind control-a to `beginning_of_line` in all modes, use:
 *
 * ```
 * bind --mode=ex <C-a> text.beginning_of_line
 * bind --mode=input <C-a> text.beginning_of_line
 * bind --mode=insert <C-a> text.beginning_of_line
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

import {
    wrap_input,
    needs_text,
    getWordBoundaries,
    wordAfterPos,
    rot13_helper,
    jumble_helper
} from "@src/lib/editor_utils"

/**
 * Behaves like readline's [delete_char](http://web.mit.edu/gnu/doc/html/rlman_1.html#SEC14), i.e. deletes the character to the right of the caret.
 **/
export const delete_char = wrap_input(
    needs_text((text, selectionStart, selectionEnd) => {
        if (selectionStart !== selectionEnd) {
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
        if (selectionStart !== selectionEnd) {
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
    if (selectionStart !== selectionEnd) {
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
    (text, selectionStart) => {
        if (text.length < 2) return [null, null, null]
        // When at the beginning of the text, transpose the first and second characters
        if (selectionStart === 0) selectionStart = 1
        // When at the end of the text, transpose the last and second-to-last characters
        if (selectionStart >= text.length) selectionStart = text.length - 1

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
    text: string,
    selectionStart,
    selectionEnd,
    fn: (s: string) => string,
): [string, number, number] {
    if (text.length === 0) return [null, null, null]
    // If the caret is at the end of the text, move it just before the last character
    if (selectionStart >= text.length) {
        selectionStart = text.length - 1
    }
    const boundaries = getWordBoundaries(text, selectionStart, false)
    const beginning =
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
    needs_text((text, selectionStart) => {
        if (selectionStart >= text.length) {
            selectionStart = text.length - 1
        }
        // Find the word the caret is in
        let firstBoundaries = getWordBoundaries(text, selectionStart, false)
        let secondBoundaries = firstBoundaries
        // If there is a word after the word the caret is in, use it for the transselectionStartition, otherwise use the word before it
        const nextWord = wordAfterPos(text, firstBoundaries[1])
        if (nextWord > -1) {
            secondBoundaries = getWordBoundaries(text, nextWord, false)
        } else {
            firstBoundaries = getWordBoundaries(
                text,
                firstBoundaries[0] - 1,
                true,
            )
        }
        const firstWord = text.substring(firstBoundaries[0], firstBoundaries[1])
        const secondWord = text.substring(
            secondBoundaries[0],
            secondBoundaries[1],
        )
        const beginning =
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
    needs_text((text, selectionStart, selectionEnd) =>
        applyWord(text, selectionStart, selectionEnd, word =>
            word.toUpperCase(),
        ),
    ),
)

/**
 * Behaves like readline's [downcase_word](http://web.mit.edu/gnu/doc/html/rlman_1.html#SEC14). Makes the word the caret is in lowercase.
 **/
export const downcase_word = wrap_input(
    needs_text((text, selectionStart, selectionEnd) =>
        applyWord(text, selectionStart, selectionEnd, word =>
            word.toLowerCase(),
        ),
    ),
)

/**
 * Behaves like readline's [capitalize_word](http://web.mit.edu/gnu/doc/html/rlman_1.html#SEC14). Makes the initial character of the word the caret is in uppercase.
 **/
export const capitalize_word = wrap_input(
    needs_text((text, selectionStart, selectionEnd) =>
        applyWord(
            text,
            selectionStart,
            selectionEnd,
            word => word[0].toUpperCase() + word.substring(1),
        ),
    ),
)

/**
 * Behaves like readline's [kill_line](http://web.mit.edu/gnu/doc/html/rlman_1.html#SEC15), i.e. deletes every character to the right of the caret until reaching either the end of the text or the newline character (\n).
 **/
export const kill_line = wrap_input(
    needs_text((text, selectionStart) => {
        let newLine = text.substring(selectionStart).search("\n")
        if (newLine !== -1) {
            // If the caret is right before the newline, kill the newline
            if (newLine === 0) newLine = 1
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
    needs_text((text, selectionStart) => {
        // If the caret is at the beginning of a line, join the lines
        if (selectionStart > 0 && text[selectionStart - 1] === "\n") {
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
            newLine > 0 && text[newLine - 1] !== "\n";
            --newLine
        );
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
    needs_text((text, selectionStart) => {
        let firstNewLine
        let secondNewLine
        // Find the newline before the caret
        for (
            firstNewLine = selectionStart;
            firstNewLine > 0 && text[firstNewLine - 1] !== "\n";
            --firstNewLine
        );
        // Find the newline after the caret
        for (
            secondNewLine = selectionStart;
            secondNewLine < text.length && text[secondNewLine - 1] !== "\n";
            ++secondNewLine
        );
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
    needs_text((text, selectionStart) => {
        const boundaries = getWordBoundaries(text, selectionStart, false)
        if (selectionStart < boundaries[1]) {
            boundaries[0] = selectionStart
            // Remove everything between the newline and the caret
            return [
                text.substring(0, boundaries[0]) +
                    text.substring(boundaries[1]),
                boundaries[0],
                null,
            ]
        } else {
            return [null, selectionStart, null]
        }
    }),
)

/**
 * Behaves like readline's [backward_kill_word](http://web.mit.edu/gnu/doc/html/rlman_1.html#SEC15). Deletes every character from the caret to the beginning of a word with word being defined by the wordpattern setting.
 **/
export const backward_kill_word = wrap_input(
    needs_text((text, selectionStart) => {
        const boundaries = getWordBoundaries(text, selectionStart, true)
        if (selectionStart > boundaries[0]) {
            boundaries[1] = selectionStart
            // Remove everything between the newline and the caret
            return [
                text.substring(0, boundaries[0]) +
                    text.substring(boundaries[1]),
                boundaries[0],
                null,
            ]
        } else {
            return [null, selectionStart, null]
        }
    }),
)

/**
 * Behaves like readline's [beginning_of_line](http://web.mit.edu/gnu/doc/html/rlman_1.html#SEC12). Moves the caret to the right of the first newline character found at the left of the caret. If no newline can be found, move the caret to the beginning of the text.
 **/
export const beginning_of_line = wrap_input(
    needs_text((text, selectionStart) => {
        while (
            text[selectionStart - 1] !== undefined &&
            text[selectionStart - 1] !== "\n"
        )
            selectionStart -= 1
        return [null, selectionStart, null]
    }),
)

/**
 * Behaves like readline's [end_of_line](http://web.mit.edu/gnu/doc/html/rlman_1.html#SEC12). Moves the caret to the left of the first newline character found at the right of the caret. If no newline can be found, move the caret to the end of the text.
 **/
export const end_of_line = wrap_input(
    needs_text((text, selectionStart) => {
        while (
            text[selectionStart] !== undefined &&
            text[selectionStart] !== "\n"
        )
            selectionStart += 1
        return [null, selectionStart, null]
    }),
)

/**
 * Behaves like readline's [forward_char](http://web.mit.edu/gnu/doc/html/rlman_1.html#SEC12). Moves the caret one character to the right.
 **/
export const forward_char = wrap_input((text, selectionStart) => [
    null,
    selectionStart + 1,
    null,
])

/**
 * Behaves like readline's [backward_char](http://web.mit.edu/gnu/doc/html/rlman_1.html#SEC12). Moves the caret one character to the left.
 **/
export const backward_char = wrap_input(
    (text, selectionStart) => [null, selectionStart - 1, null],
)

/**
 * Behaves like readline's [forward_word](http://web.mit.edu/gnu/doc/html/rlman_1.html#SEC12). Moves the caret one word to the right, with words being defined by the wordpattern setting.
 **/
export const forward_word = wrap_input(
    needs_text((text, selectionStart) => {
        if (selectionStart === text.length) return [null, null, null]
        const boundaries = getWordBoundaries(text, selectionStart, false)
        return [null, boundaries[1], null]
    }),
)

/**
 * Behaves like readline's [backward_word](http://web.mit.edu/gnu/doc/html/rlman_1.html#SEC12). Moves the caret one word to the left, with words being defined by the wordpattern setting.
 **/
export const backward_word = wrap_input(
    (text, selectionStart) => {
        if (selectionStart === 0) return [null, null, null]
        const boundaries = getWordBoundaries(text, selectionStart, true)
        return [null, boundaries[0], null]
    },
)

/**
 * Insert text in the current input.
 **/
export const insert_text = wrap_input(
    (text, selectionStart, selectionEnd, arg) => [
        text.slice(0, selectionStart) + arg + text.slice(selectionEnd),
        selectionStart + arg.length,
        null,
    ],
)

export const rot13 = wrap_input((text, selectionStart, selectionEnd) => [
    rot13_helper(text.slice(0, selectionStart) + text.slice(selectionEnd)),
    selectionStart,
    null,
])

export const jumble = wrap_input((text, selectionStart, selectionEnd) => [
    jumble_helper(text.slice(0, selectionStart) + text.slice(selectionEnd)),
    selectionStart,
    null,
])
