/** Experiment with TS-provided reflect metadata.
 *
 *  Issues:
 *      1. string[] -> String(), which is just wrong
 *      2. ...args -> Object().
 *      3. Argument names are lost
 *      4. Property names and types are lost in e.g. opts: {full: true, blah: 1}
 *      5. Union types and literals are lost
 *
 *  Workarounds:
 *      1. Use other decorators to express options
 *      2. Use a special type for arrays
 *      3. Use a custom compiler pass to extract metadata to JSON.
 *              - Small example available on TS Compiler API wiki page[1]
 *
 *  Harder solution:
 *      1. Add a custom TS transformation step that extracts required information from AST
 *              - ts-simple-ast
 *              - ttypescript
 *              - TS Compiler API
 *
 *  [1]: https://github.com/Microsoft/TypeScript/wiki/Using-the-Compiler-API#using-the-type-checker
 */
import "reflect-metadata"

export class Foo {
    @printMeta
    @logArgs
    typed(a: number, b: "foo", c, d: {a: "foo"|"bar"}, ...e: string[]) {
        return a
    }
}

function logArgs(t, n, pd) {
    const orig = pd.value
    pd.value = (...args) => {console.log(orig, ...args); return orig(...args)}
}

function printMeta(target, name, propDesc) {
    ["design:type", "design:paramtypes", "design:returntype"].forEach(key =>
        console.log(key, Reflect.getMetadata(key, target, name)))
}

;(window as any).Foo = Foo

import * as csp from "csp-serdes"

;(window as any).csp = csp

// class Excmds {
//     @options(["--background", "--related"])
//     @background
//     tabopen() {
//     }
// }
