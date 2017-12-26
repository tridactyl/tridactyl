/** Some tests for URL utilities */

import * as UrlUtil from './url_util'

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
            () => expect(UrlUtil.incrementUrl(input, step)).toEqual(output)
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
        let root = UrlUtil.getUrlRoot(new URL(url))

        test(`root of ${url} --> ${exp_root}`,
            () => expect(root ? root.href : root).toEqual(exp_root)
        )
    }
}

function test_parent() {

    let cases = [
        // root URL, nothing to do!
        ["http://example.com", null],
        // URL with query string
        ["http://example.com?key=value", "http://example.com/"],
        // url with hash/anchor - strip the fragment
        ["http://example.com#anchor", "http://example.com/"],
        // query + hash: lose the hash only
        ["http://example.com?key=val#hash", "http://example.com/?key=val"],
        // single level path
        ["http://example.com/path", "http://example.com/"],
        // multi-level path
        ["http://example.com/path1/path2", "http://example.com/path1"],
        // subdomains
        ["http://sub.example.com", "http://example.com/"],
        // subdom with path, leave subdom
        ["http://sub.example.com/path", "http://sub.example.com/"],
        // trailing slash
        ["http://sub.example.com/path/", "http://sub.example.com/"],
        // repeated slash
        ["http://example.com/path//", "http://example.com/"],
        // repeated slash
        ["http://example.com//path//", "http://example.com/"],
    ]

    for (let [url, exp_parent] of cases) {
        let parent = UrlUtil.getUrlParent(new URL(url))

        test (`parent of ${url} --> ${exp_parent}`,
            () => expect(parent ? parent.href : parent).toEqual(exp_parent)
        )
    }
}

function test_download_filename() {

    let cases = [

        // simple domain only
        ["http://example.com", "example.com"],
        ["http://example.com/", "example.com"],
        ["http://sub.example.com/", "sub.example.com"],


        // simple paths
        ["http://example.com/path", "path"],
        ["http://example.com/path.ext", "path.ext"],
        ["http://example.com/path/more", "more"],

        // ends in /
        ["http://example.com/path/", "path"],

        // ignore query strings
        ["http://example.com/page?q=v", "page"],
        ["http://example.com/page/?q=v", "page"],

        // Data urls

        // base 64 with mime
        ["data:image/png;base64,dat", "base64-dat.png"],
        ["data:image/png;base64,data/data/data/data", "base64-data_data_data_.png"],
        // non-base64
        ["data:image/png,dat", "dat.png"],
        // unknown mime
        ["data:something/wierd,data", "data"],
    ]

    for (let [url, exp_fn] of cases) {
        let fn = UrlUtil.getDownloadFilenameForUrl(new URL(url))

        test (`filename for ${url} --> ${exp_fn}`,
            () => expect(fn).toEqual(exp_fn)
        )
    }
}

test_increment()
test_root()
test_parent()
test_download_filename()
