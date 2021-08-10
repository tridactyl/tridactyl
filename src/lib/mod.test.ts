/** Some real tests for mod and also an example of how to unit test. */

import { euclid_mod, knuth_mod, my_mod } from "../lib/number.mod"

expect.extend({
    /** Expect equal to all values in array */
    toBeAll(received, values: Array<any>) {
        for (let val of values) {
            if (received !== val) {
                return {
                    message: () =>
                        `expected ${received} === for each v in ${values}`,
                    pass: false,
                }
            }
        }
        return {
            message: () => `expected ${received} !== for some v in ${values}`,
            pass: true,
        }
    },
})

/** Manually written tests */
const testcases = [
    [-3, 3, 0],
    [-2, 3, 1],
    [-1, 3, 2],
    [0, 3, 0],
    [1, 3, 1],
    [2, 3, 2],
    [3, 3, 0],
    [4, 3, 1],
    [5, 3, 2],
    [6, 3, 0],
]

for (let [a, b, ans] of testcases) {
    test(`${a} (mod ${b}) -- .mod`, () => expect(a.mod(b)).toEqual(ans))
    test(`${a} (mod ${b}) -- euclid`, () =>
        expect(euclid_mod(a, b)).toEqual(ans))
    test(`${a} (mod ${b}) -- knuth`, () => expect(knuth_mod(a, b)).toEqual(ans))
    test(`${a} (mod ${b}) -- my`, () => expect(my_mod(a, b)).toEqual(ans))
}

/** Test with mixed dividend, positive divisor */
for (let i = 0; i < 100; i++) {
    let a = ((Math.random() - 0.5) * 10000) | 0
    let b = (Math.random() * 10000) | 0
    b = b === 0 ? 17 : b // Don't be 0.
    test(`${a} (mod ${b}) -- equivalence check`, () =>
        expect(a.mod(b)).toBeAll([
            my_mod(a, b),
            euclid_mod(a, b),
            knuth_mod(a, b),
        ]))
}

/** Test with a mix of +ve and -ve */
for (let i = 0; i < 100; i++) {
    let a = ((Math.random() - 0.5) * 10000) | 0
    let b = ((Math.random() - 0.5) * 10000) | 0
    b = b === 0 ? 17 : b // Don't be 0.
    test(`${a} (mod ${b}) -- equivalence check`, () =>
        expect(a.mod(b)).toBeAll([my_mod(a, b), knuth_mod(a, b)]))
}
