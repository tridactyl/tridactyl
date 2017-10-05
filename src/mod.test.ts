import {euclid_mod, knuth_mod, my_mod, koushien_mod} from './number.mod'

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

    /* [-5, -4, 0] */
]

function assert(value) {
    return expect(value).toEqual(true)
}

for (let [a, b, ans] of testcases) {
    /* test(`${a}.mod(${b}) === ${ans}, ${a.mod(b)}`, ()=>expect(a.mod(b) === ans).toEqual(true)) */
    /* test(`${a} (mod ${b})`, ()=>expect(a.mod(b)).toEqual(ans)) */
    test(`${a} (mod ${b}) -- euclid`, ()=>expect(euclid_mod(a, b)).toEqual(ans))
    test(`${a} (mod ${b}) -- knuth`, ()=>expect(knuth_mod(a, b)).toEqual(ans))
    test(`${a} (mod ${b}) -- my`, ()=>expect(my_mod(a, b)).toEqual(ans))
}


for (let i=0; i<1000; i++) {
    let a = (Math.random()-0.5) * 10000|0
    let b = Math.random() * 10000|0
    test(`${a} (mod ${b}) -- equivalence check`, () => expect(knuth_mod(a,b)).toEqual(my_mod(a,b)).toEqual(koushien_mod(a,b)))
}

/** Test with a mix of +ve and -ve */
for (let i=0; i<1000; i++) {
    let a = (Math.random()-0.5) * 10000|0
    let b = (Math.random()-0.5) * 10000|0
    test(`${a} (mod ${b}) -- equivalence check`, () => expect(knuth_mod(a,b)).toEqual(koushien_mod(a,b)))
}
