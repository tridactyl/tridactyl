/** Some tests for URL utilities */

import {incrementUrl, getUrlRoot} from './url_util'

function test_increment() {

    let cases = [
        // simple increment
        [1, "http://example.com/item/1",   "http://example.com/item/2"],
        // test non-1 increment
        [2, "http://example.com/item/1",   "http://example.com/item/3"],
        // test negative
        [-1, "http://example.com/item/3",   "http://example.com/item/2"],
        // test other numbers unaffected
        [1, "http://www1.example.com/1",   "http://www1.example.com/2"],
        // test numbers as part of words work
        [1, "http://example.com/book1",   "http://example.com/book2"],
        // test urls with no incrementable parts return null
        [1, "http://example.com", null]
    ]

    for (let [step, input, output] of cases) {

        test(`${input} + ${step} --> ${output}`, 
            () => expect(incrementUrl(input, step)).toEqual(output)
        )
    }
}

function test_root() {

    let cases = [
        // simple URL
        ["http://example.com/dir/page.html", "http://example.com/"],
        // already root, with subdir
        ["http://www.example.com/", "http://www.example.com/"],
        // unsupported protocol
        ["about:config", null],
    ]

    for (let [url, exp_root] of cases) {
        let root = getUrlRoot(new URL(url))

        test(`root of ${url} --> ${exp_root}`,
            () => expect(root ? root.href : root).toEqual(exp_root)
        )
    }
}

test_increment()
test_root()
