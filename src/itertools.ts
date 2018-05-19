import "./number.mod"

export function head(iter) {
    iter = iter[Symbol.iterator]()
    let result = iter.next()
    if (result.done) throw RangeError("Empty iterator has no head/tail")
    else return result.value
}

/** Get the last item of an array or iterable */
export function tail(iter) {
    if (Array.isArray(iter)) {
        if (iter.length < 1) throw RangeError("Empty iterator has no head/tail")
        return iter[iter.length - 1]
    } else {
        // Re-use error handling in head()
        let last = head(iter)
        for (last of iter) {
        }
        return last
    }
}

export function* filter(iter, predicate) {
    for (let v of iter) {
        if (predicate(v)) yield v
    }
}

export function find(iter, predicate) {
    return head(filter(iter, predicate))
}

/** Zip some arrays together

    If you need variable length args, you need izip for now.
    
*/
export function zip(...arrays) {
    // Make an array of length values
    // TODO: Explain how this works
    return [...Array(arrays[0].length)].map((_, i) => arrays.map(a => a[i]))
}

export function* range(length) {
    if (length < 0) return
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
    let iterators = arrays.map(e => e[Symbol.iterator]())
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
        if (!a.reduce((x, y) => x === y)) return false
    }
    return true
}

export function zeros(n) {
    return new Array(n).fill(0)
}

/** islice(iter, stop) = Give the first `stop` elements 
    islice(iter, start, stop)
        skip `start` elements, then give `stop - start` elements,
        unless `stop` is null, then emit indefinitely

    If the iterator runs out early so will this.
*/
export function* islice(iterable, start: number, stop?: number) {
    const iter = iterable[Symbol.iterator]()

    // If stop is not defined then they're using the two argument variant
    if (stop === undefined) {
        stop = start
        start = 0
    }

    // Skip elements until start
    for (let _ of range(start)) {
        const res = iter.next()
        if (res.done) return
    }

    // Emit elements
    if (stop === null) {
        yield* iter
    } else {
        for (let i = start; i < stop; i++) {
            const res = iter.next()
            if (res.done) return
            else yield res.value
        }
    }
}

export function* chain(...iterables) {
    for (const iter of iterables) {
        yield* iter[Symbol.iterator]()
    }
}

/** All permutations of n items from array */
export function* permutationsWithReplacement(arr, n) {
    const len = arr.length
    const counters = zeros(n)
    let index = 1
    for (let _ of range(Math.pow(len, n))) {
        yield counters.map(i => arr[i])
        for (let i of range(counters.length)) {
            if (index.mod(Math.pow(len, counters.length - 1 - i)) === 0)
                counters[i] = (counters[i] + 1).mod(len)
        }
        index++
    }
}

export function* map(arr, func) {
    for (const v of arr) yield func(v)
}

// Returns an array of unique elements.
export function unique(arr) {
    return arr.reduce((acc, cur) => {
        if (!acc.includes(cur)) acc.push(cur)
        return acc
    }, [])
}

/** Yield values that are unique under hasher(value) */
export function* uniqueBy(arr, hasher) {
    const hashes = new Set()
    for (let e of arr) {
        let hash = hasher(e)
        if (!hashes.has(hash)) {
            yield e
            hashes.add(hash)
        }
    }
}

export function flatten(arr) {
    let result = []
    for (let elem of arr) {
        if (elem instanceof Array) {
            result = result.concat(flatten(elem))
        } else {
            result.push(elem)
        }
    }
    return result
}
