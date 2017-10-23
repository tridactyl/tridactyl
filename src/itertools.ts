export function head(iter) {
    let result = iter.next()
    if (result.done) throw RangeError("Iterable is so done.")
    else return result.value
}

/* Zip some iterables together */
export function zip(...arrays) {
    // Make an array of length values
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

/* Zip arbitrary generators together */
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
