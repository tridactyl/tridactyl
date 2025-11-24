export function log(x, base) {
    return Math.log(x) / Math.log(base)
}

// Copied from Numeric Javascript under the MIT license
// https://github.com/sloisel/numeric/blob/656fa1254be540f428710738ca9c1539625777f1/src/numeric.js#L922
export function linspace(a: number, b: number, n?: number) {
    if (typeof n === "undefined") n = Math.max(Math.round(b - a) + 1, 1)
    if (n < 2) {
        return n === 1 ? [a] : []
    }
    let i
    const ret = Array(n)
    n--
    for (i = n; i >= 0; i--) {
        ret[i] = (i * b + (n - i) * a) / n
    }
    return ret
}

export function buckets(values: number[], numBuckets: number): number[] {
    const min = values.reduce((a, b) => Math.min(a, b))
    const max = values.reduce((a, b) => Math.max(a, b))
    return linspace(min, max, numBuckets)
}

export function bucketize(
    values: number[],
    buckets: number[],
): Map<number, number> {
    // Init result storage
    const result: Map<number, number> = new Map<number, number>()
    for (const bucketval of buckets) {
        result.set(bucketval, 0)
    }

    // We place a value in a bucket by going through the buckets from
    // smallest to largest, finding the smallest bucket that's larger
    // than or equal to than the value. This will have the following
    // results:
    //
    // * A value that's larger than all bucket values will not be
    //   placed at all.
    // * A value with exactly the value of the largest bucket will be
    //   placed in the largest bucket.
    // * A value with exactly the value of the smallest bucket will be
    //   placed in the smallest bucket.
    // * A value that's smaller than all bucket values will be placed
    //   in the smallest bucket.
    //
    // If we build our buckets as linspace(min(values), max(values)),
    // then this means that the largest bucket is guaranteed to have
    // exactly one element in it.
    const placeValue = (val: number) => {
        for (const bucketval of buckets) {
            if (bucketval >= val) {
                result.set(bucketval, result.get(bucketval) + 1)
                return
            }
        }
    }

    // Bucketize every value.
    for (const val of values) {
        placeValue(val)
    }

    // Return just the counts in each bucket
    return result
}

// thanks daniel metzner https://stackoverflow.com/questions/59412625/generate-random-uuid-javascript#tab-top
export function uuidv4(): string {
    return "10000000-1000-4000-8000-100000000000".replace(/[018]/g, (c: any) =>
        // eslint-disable-next-line no-bitwise
        (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
    )
}

export function isuuidv4(uuid: string) {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(uuid)
}
