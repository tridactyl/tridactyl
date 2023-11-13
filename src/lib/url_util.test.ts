/** Some tests for URL utilities */

import * as UrlUtil from "@src/lib/url_util"

function test_increment() {
    let cases = [
        // simple increment
        [1, "http://example.com/item/1", "http://example.com/item/2"],
        // test non-1 increment
        [2, "http://example.com/item/1", "http://example.com/item/3"],
        // test negative
        [-1, "http://example.com/item/3", "http://example.com/item/2"],
        // test other numbers unaffected
        [1, "http://www1.example.com/1", "http://www1.example.com/2"],
        // test numbers as part of words work
        [1, "http://example.com/book1", "http://example.com/book2"],
        // test urls with no incrementable parts return null
        [1, "http://example.com", null],
    ]

    for (let [step, input, output] of cases) {
        test(`${input} + ${step} --> ${output}`, () =>
            expect(UrlUtil.incrementUrl(input, step)).toEqual(output))
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

        test(`root of ${url} --> ${exp_root}`, () =>
            expect(root ? root.href : root).toEqual(exp_root))
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
        ["http://example.com/path1/path2", "http://example.com/path1/"],
        [
            "http://example.com/path1/path2/path3",
            "http://example.com/path1/path2/",
        ],
        // subdomains
        ["http://sub.example.com", "http://example.com/"],
        // subdom with path, leave subdom
        ["http://sub.example.com/path", "http://sub.example.com/"],
        // trailing slash
        ["http://sub.example.com/path/", "http://sub.example.com/"],
        ["http://sub.example.com/path/to/", "http://sub.example.com/path/"],
        // repeated slash
        ["http://example.com/path//", "http://example.com/"],
        ["http://example.com//path//", "http://example.com//"],
        ["http://example.com//path//", "http://example.com//"],
    ]

    for (let [url, exp_parent] of cases) {
        let parent = UrlUtil.getUrlParent(new URL(url), {trailingSlash: true})

        test(`parent of ${url} --> ${exp_parent}`, () =>
            expect(parent ? parent.href : parent).toEqual(exp_parent))
    }
}

function test_parent_with_slash_strip() {
    const cases = [
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
        [
            "http://example.com/path1/path2/path3",
            "http://example.com/path1/path2",
        ],
        // subdomains
        ["http://sub.example.com", "http://example.com/"],
        // subdom with path, leave subdom
        ["http://sub.example.com/path", "http://sub.example.com/"],
        // trailing slash
        ["http://sub.example.com/path/", "http://sub.example.com/"],
        ["http://sub.example.com/path/to/", "http://sub.example.com/path"],
        // repeated slash
        ["http://example.com/path//", "http://example.com/"],
        ["http://example.com//path//", "http://example.com/"],
        ["http://example.com//path//", "http://example.com/"],
    ]

    for (const [url, exp_parent] of cases) {
        const parent = UrlUtil.getUrlParent(
            new URL(url),
            {trailingSlash: false}
        )

        test(`parent of ${url} --> ${exp_parent}`, () =>
            expect(parent ? parent.href : parent).toEqual(exp_parent))
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
        [
            "data:image/png;base64,data/data/data/data",
            "base64-data_data_data_.png",
        ],
        // non-base64
        ["data:image/png,dat", "dat.png"],
        // unknown mime
        ["data:something/wierd,data", "data"],
    ]

    for (let [url, exp_fn] of cases) {
        let fn = UrlUtil.getDownloadFilenameForUrl(new URL(url))

        test(`filename for ${url} --> ${exp_fn}`, () =>
            expect(fn).toEqual(exp_fn))
    }
}

function test_query_delete() {
    let cases = [
        // no query
        ["http://example.com/", "query", "http://example.com/"],
        // single query=val, removed
        ["http://example.com/?query=val", "query", "http://example.com/"],
        // single query (no val), removed
        ["http://example.com/?query", "query", "http://example.com/"],
        // single query=val, not removed
        [
            "http://example.com/?query=val",
            "nomatch",
            "http://example.com/?query=val",
        ],
        // single query (no val), not removed
        ["http://example.com/?query", "nomatch", "http://example.com/?query"],

        // multiple queries, first removed
        [
            "http://example.com/?query=val&another=val2",
            "query",
            "http://example.com/?another=val2",
        ],
        // multiple queries, second removed
        [
            "http://example.com/?query=val&another=val2",
            "another",
            "http://example.com/?query=val",
        ],
        // multiple queries, repeated removed
        [
            "http://example.com/?query=val&another=val2&query=val3",
            "query",
            "http://example.com/?another=val2",
        ],
    ]

    for (let [url, q, exp_res] of cases) {
        let modified = UrlUtil.deleteQuery(new URL(url), q)

        test(`delete query ${q} of ${url} --> ${exp_res}`, () =>
            expect(modified.href).toEqual(exp_res))
    }
}

function test_query_replace() {
    let cases = [
        // no query
        ["http://example.com/", "query", "val", "http://example.com/"],
        // single query
        [
            "http://example.com/?query=val",
            "query",
            "newval",
            "http://example.com/?query=newval",
        ],
        // single query, no replacement value
        [
            "http://example.com/?query=val",
            "query",
            "",
            "http://example.com/?query",
        ],
        // multiple, replace first
        [
            "http://example.com/?query1=val1&query2=val2",
            "query1",
            "newval1",
            "http://example.com/?query1=newval1&query2=val2",
        ],
        // multiple, replace last
        [
            "http://example.com/?query1=val1&query2=val2",
            "query2",
            "newval2",
            "http://example.com/?query1=val1&query2=newval2",
        ],
    ]

    for (let [url, q, v, exp_res] of cases) {
        let modified = UrlUtil.replaceQueryValue(new URL(url), q, v)

        test(`change query ${q} of ${url} --> ${exp_res}`, () =>
            expect(modified.href).toEqual(exp_res))
    }
}

function test_url_graft_path() {
    let cases = [
        // FROM LEFT
        [
            // complete replacement
            "http://example.com/foo/bar/quux",
            "0",
            "frob",
            "http://example.com/frob",
        ],
        [
            // one level down
            "http://example.com/foo/bar/quux",
            "1",
            "frob",
            "http://example.com/foo/frob",
        ],
        [
            // at last level
            "http://example.com/foo/bar/quux",
            "3",
            "frob",
            "http://example.com/foo/bar/quux/frob",
        ],

        // FROM RIGHT
        [
            // test of extend-only
            "http://example.com/test",
            "-1",
            "newchild",
            "http://example.com/test/newchild",
        ],
        [
            // test of one level up graft (i.e. sibling)
            "http://example.com/test",
            "-2",
            "newsibling",
            "http://example.com/newsibling",
        ],
        [
            // test of multi level up graft (i.e. cousin)
            "http://example.com/shop/by-id/42",
            "-3",
            "by-name/foobar",
            "http://example.com/shop/by-name/foobar",
        ],

        // ERRORS
        [
            // test of level too large and positive
            "http://example.com/foo",
            "2",
            "dummy",
            null,
        ],
        [
            // test of level too large and negative
            "http://example.com/foo",
            "-3",
            "dummy",
            null,
        ],
    ]

    for (let [url, level, tail, exp_res] of cases) {
        let modified = UrlUtil.graftUrlPath(new URL(url), tail, Number(level))

        test(`graft ${tail} onto ${url} at level ${level} --> ${exp_res}`, () =>
            expect(modified ? modified.href : modified).toEqual(exp_res))
    }
}

function test_url_query_interpolation() {
    let cases = [
        [
            // not percent-encoded and appended
            "http://example.com",
            "a/query",
            "http://example.com/a/query",
        ],
        [
            // not percent-encoded and interpolated
            "http://example.com/%s/path",
            "a/query",
            "http://example.com/a/query/path",
        ],
        [
            // percent-encoded and appended
            "http://example.com/?query=",
            "a/query",
            "http://example.com/?query=a%2Fquery",
        ],
        [
            // percent-encoded and interpolated
            "http://example.com/?query=%s&q2=v2",
            "a/query",
            "http://example.com/?query=a%2Fquery&q2=v2",
        ],
        [   // array indexing
            "http://example.com/?q1=%s1&q2=%s2",
            "a query",
            "http://example.com/?q1=a&q2=query"
        ],
        [   // array slicing
            "http://example.com/?q1=%s1&q2=%s[2:]",
            "a query with several words",
            "http://example.com/?q1=a&q2=query%20with%20several%20words"
        ]
    ]

    for (let [url, qy, exp_res] of cases) {
        let modified = UrlUtil.interpolateSearchItem(new URL(url), qy)

        test(`interpolate ${qy} into ${url} --> ${exp_res}`, () =>
            expect(modified.href).toEqual(exp_res))
    }
}

test_increment()
test_root()
test_parent()
test_parent_with_slash_strip()
test_download_filename()
test_query_delete()
test_query_replace()
test_url_graft_path()
test_url_query_interpolation()
