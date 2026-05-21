// prevent dumb reactivity on function factories
export function memoise<TArg, TResult>(fn: (arg: TArg) => TResult) {
  const cache = new Map<TArg, TResult>()
  return (arg: TArg): TResult => {
    if (!cache.has(arg)) {
      cache.set(arg, fn(arg))
    }
    return cache.get(arg)!
  }
}
