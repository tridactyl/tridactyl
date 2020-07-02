/** @hidden
 * Merges two objects and any child objects they may have
 */
export default function mergeDeep(o1, o2) {
    const r = Array.isArray(o1) ? o1.slice() : Object.create(o1)
    Object.assign(r, o1, o2)
    if (o2 === undefined) return r
    Object.keys(o1)
        .filter(
            key => typeof o1[key] === "object" && typeof o2[key] === "object",
        )
        .forEach(key => Object.assign(r[key], mergeDeep(o1[key], o2[key])))
    return r
}
