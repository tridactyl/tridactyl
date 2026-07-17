// prevent dumb reactivity on function factories
export function memoise<TArg, TResult>(fn: (arg: TArg) => TResult) {
    const cache = new Map<TArg, { value: TResult }>()
    return (arg: TArg): TResult => {
        let cached = cache.get(arg)
        if (!cached) {
            cached = { value: fn(arg) }
            cache.set(arg, cached)
        }
        return cached.value
    }
}
