export function head(iter) {
    let result = iter.next()
    if (result.done) throw RangeError("Iterable is so done.")
    else return result.value
}

/** Zip some arrays together

    If you need variable length args, you need izip for now.
    
*/
export function zip(...arrays) {
    // Make an array of length values
    // TODO: Explain how this works
    return [...Array(arrays[0].length)].map((_, i) => arrays.map((a) => a[i]))
}

export function* range(length) {
    for (let index = 0; index < length; index++) {
        yield index
    }
}

export function* enumerate(iterable) {
    let index = 0
    for (let element of iterable) {
        yield [index, element]
        index++
    }
}

/* Zip arbitrary iterators together */
export function* izip(...arrays) {
    let iterators = arrays.map(e=>e[Symbol.iterator]())
    let box = Array(arrays.length)
    for (let v of iterators[0]) {
        box[0] = v
        let i
        try {
            for ([i, v] of enumerate(iterators.slice(1))) {
                box[i + 1] = head(v)
            }
            yield [...box]
        } catch (e) {
            return
        }
    }
}

/* Test if two iterables are equal */
export function iterEq(...arrays) {
    for (let a of zip(...arrays)) {
        if (! a.reduce((x,y)=>(x===y))) return false
    }
    return true
}

export function zeros(n) {
    return new Array(n).fill(0)
}

Number.prototype.mod = function (n: number): number {
    return knuth_mod(this, n)
}

/** Takes sign of divisor -- incl. returning -0 */
export function knuth_mod(dividend, divisor) {
    return dividend - divisor * Math.floor(dividend/divisor)
}

export function* islice(iterable, stop) {
    let index = 0
    const iter = iterable[Symbol.iterator]()
    while (index++ < stop) {
        const res = iter.next()
        if (res.done) return index - 1
        else yield res
    }
    return index - 1
}

/** All permutations of n items from array */
export function* permutationsWithReplacement(arr, n) {
    const len = arr.length
    const counters = zeros(n)
    let index = 1
    for (let _ of range(Math.pow(len, n))) {
        yield counters.map(i=>arr[i])
        for (let i of range(counters.length)) {
            if (index.mod(Math.pow(len, i)) === 0)
                counters[i] = (counters[i] + 1).mod(len)
        }
        index++
    }
}

export function* map(arr, func) {
    for (const v of arr)
        yield func(v)
}
