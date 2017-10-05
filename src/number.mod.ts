/** Number theory-friendly modulo implementation

    If divisor is positive, return value will be too.
*/
Number.prototype.mod = function (n: number): number {
    return knuth_mod(this, n)
}

/** Takes sign of divisor -- incl. returning -0 */
export function knuth_mod(dividend, divisor) {
    return dividend - divisor * Math.floor(dividend/divisor)
}

/** Equivalent to knuth_mod but doesn't return -0 */
export function my_mod(dividend, divisor) {
    return ((dividend % divisor) + divisor) % divisor
}

/** Always gives a positive result.
    
    Equivalent to knuth_mod when divisor is +ve
    Equivalent to % when dividend is +ve
*/
export function euclid_mod(dividend, divisor) {
    let abs_divisor = Math.abs(divisor)
    let quotient = Math.floor(dividend/abs_divisor)
    return dividend - abs_divisor * quotient
}

export {}
