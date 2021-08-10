/** Testing the new argument parser for :hint */

import { OpenMode, HintConfig } from "../lib/hint_util"

expect.extend({
    toMatchOptions(received: HintConfig, expected: any) {
        const errors = []

        // For each key in the expected object, check the parsed option matches the value
        for (const [key, value] of Object.entries(expected)) {
            let result: boolean

            if (Array.isArray(value)) {
                // Arrays need special handling instead of ===
                result =
                    value.length == received[key].length &&
                    value.every((val, i) => received[key][i] === val)
            } else {
                result = received[key] === value
            }

            if (!result) {
                // Add to error list when the comparison fails
                errors.push(
                    `expected ${key} === ${JSON.stringify(
                        value,
                    )}, got ${JSON.stringify(received[key])}`,
                )
            }
        }

        if (errors.length > 0) {
            return { message: () => errors.join("\n"), pass: false }
        } else {
            return {
                message: () =>
                    `expected ${JSON.stringify(
                        received,
                    )} to not match ${JSON.stringify(expected)}`,
                pass: true,
            }
        }
    },
})

// Add this type definition so Jest/TypeScript doesn't complain
declare global {
    namespace jest {
        interface Matchers<R> {
            toMatchOptions(expected: any): CustomMatcherResult
        }
    }
}

// Most test cases are from GitHub advanced search:
// https://github.com/search?q=hint+filename%3Atridactylrc+filename%3A.tridactylrc&type=Code&ref=advsearch&l=&l=
//
// Expected results are written based on what the doc (spec) specifies, and the
// new parser should observe those options correctly.
const testCases = [
    {
        sources: ["-b"],
        expected: {
            openMode: OpenMode.BackgroundTab,
            warnings: [],
        },
    },
    {
        sources: ["-br", "-qb"],
        expected: {
            rapid: true,
            openMode: OpenMode.BackgroundTab,
            warnings: [],
        },
    },
    {
        sources: ["-i"],
        expected: {
            openMode: OpenMode.Images,
            warnings: [],
        },
    },
    {
        sources: ['-c [class*="expand"],[class="togg"]'],
        expected: {
            selectors: ['[class*="expand"],[class="togg"]'],
            warnings: [],
        },
    },
    {
        sources: [
            "-cF img i => tri.excmds.yankimage(tri.urlutils.getAbsoluteURL(i.src))",
        ],
        expected: {
            selectors: ["img"],
            callback:
                "i => tri.excmds.yankimage(tri.urlutils.getAbsoluteURL(i.src))",
            warnings: [],
        },
    },
    {
        sources: [
            "-qW js -p tri.excmds.shellescape(JS_ARG).then(url => tri.excmds.exclaim_quiet('~/scripts/mpv/append ' + url))",
        ],
        expected: {
            rapid: true,
            excmd:
                "js -p tri.excmds.shellescape(JS_ARG).then(url => tri.excmds.exclaim_quiet('~/scripts/mpv/append ' + url))",
            warnings: [],
        },
    },
    {
        sources: ["-Jbc [data-test-id=post-content] a,.Comment a"],
        expected: {
            jshints: false,
            openMode: OpenMode.BackgroundTab,
            selectors: ["[data-test-id=post-content]", "a,.Comment", "a"],
            warnings: [],
        },
    },
    {
        sources: ["-Jc .rc > .r > a"],
        expected: {
            jshints: false,
            selectors: [".rc", ">", ".r", ">", "a"],
            warnings: [],
        },
    },
    {
        sources: [
            "-Jcb ul:not(#duckbar_dropdowns) .zcm__item .zcm__link,.result__a,.result--more",
        ],
        expected: {
            jshints: false,
            openMode: OpenMode.BackgroundTab,
            selectors: [
                "ul:not(#duckbar_dropdowns)",
                ".zcm__item",
                ".zcm__link,.result__a,.result--more",
            ],
            warnings: [],
        },
    },
    {
        sources: ["-qpipe a href"],
        expected: {
            rapid: true,
            pipeAttribute: "href",
            selectors: ["a"],
            warnings: [],
        },
    },
]

// Check all test cases
for (const { sources, expected } of testCases) {
    for (const source of sources) {
        // Split the command line into arguments
        const args = source.split(" ")

        // Parse and compare
        test(source, () =>
            expect(HintConfig.parse(args)).toMatchOptions(expected),
        )
    }
}
