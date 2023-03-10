/*
 * Clamp a number n between two values lo, hi
 * such that if n is in [lo, hi], we return n
 * otherwise if n < lo, return lo
 * else return hi.
 */
Number.prototype.clamp = function(
    this: number,
    lo: number,
    hi: number,
): number {
    return Math.max(lo, Math.min(this, hi))
}

export {}
