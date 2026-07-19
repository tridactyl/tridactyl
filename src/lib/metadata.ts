/**
 * Runtime metadata over `typedoc --json` output for src/excmds.ts and
 * src/lib/config.ts. Exposes plain-object indexes (keyed by symbol name) plus
 * a small set of free helpers that operate on raw typedoc nodes.
 *
 * @hidden symbols are dropped by typedoc itself before they reach this loader,
 * so consumers never see them.
 */

import metadataJson from "../.metadata.generated.json"
import staticThemesJson from "../.themes.generated.json"

export const staticThemes: string[] = staticThemesJson

// =============================================================================
// Indexes — built once at module load by walking the typedoc tree.
// =============================================================================

type Node = any

const reflections: Record<number, Node> = {}
const fileBuckets: Record<
    string,
    { functions: Record<string, Node>; classes: Record<string, Node> }
> = {
    excmds: { functions: {}, classes: {} },
    "lib/config": { functions: {}, classes: {} },
}

function moduleName(node: Node): string {
    return (node.name || "").replace(/^"|"$/g, "").replace(/\\/g, "/")
}

function walk(node: Node) {
    if (!node || typeof node !== "object") return
    if (Array.isArray(node)) {
        for (const v of node) walk(v)
        return
    }
    if (node.id !== undefined) reflections[node.id] = node
    if (node.kindString === "Module") {
        const bucket = fileBuckets[moduleName(node)]
        for (const child of bucket ? node.children || [] : []) {
            if (child.kindString === "Function") {
                bucket.functions[child.name] = child
            } else if (child.kindString === "Class") {
                bucket.classes[child.name] = child
            }
        }
    }
    if (node.children) walk(node.children)
}
walk(metadataJson)

export const excmdsFunctions: Record<string, Node> =
    fileBuckets.excmds.functions

const defaultConfig: Node | undefined =
    fileBuckets["lib/config"].classes["default_config"]

export const defaultConfigMembers: Record<string, Node> = (() => {
    const out: Record<string, Node> = {}
    for (const ch of defaultConfig?.children || []) out[ch.name] = ch
    return out
})()

// =============================================================================
// Doc / type access on function and class-member nodes.
// =============================================================================

function readComment(c: Node | undefined): string {
    if (!c) return ""
    let s: string = c.shortText || ""
    if (c.text) s += (s ? "\n\n" : "") + c.text
    return s.replace(/\n+$/, "")
}

export function getDoc(node: Node | undefined): string {
    if (!node) return ""
    return (
        readComment(node.signatures?.[0]?.comment) || readComment(node.comment)
    )
}

export function memberDoc(node: Node | undefined): string {
    if (!node) return ""
    if (node.kindString === "Accessor") {
        const sig = (node.getSignature || [])[0] || (node.setSignature || [])[0]
        if (sig?.comment) return readComment(sig.comment)
    }
    return readComment(node.comment)
}

/**
 * Returns a typedoc type node for a class member, preserving the children of
 * inferred object literals so downstream helpers can inspect their types.
 */
export function memberType(node: Node | undefined): Node | undefined {
    if (!node) return undefined
    if (node.kindString === "Object literal") {
        return { type: "reflection", declaration: node }
    }
    if (node.type) return node.type
    if (node.kindString === "Accessor") {
        const sig = (node.getSignature || [])[0] || (node.setSignature || [])[0]
        return sig?.type
    }
    return undefined
}

/** Parameter list for a function node — each entry has `name`, `type`, `flags`. */
export function paramTypes(fnNode: Node | undefined): Node[] {
    return fnNode?.signatures?.[0]?.parameters || []
}

// =============================================================================
// Type coercion + stringification over typedoc type nodes.
// =============================================================================

function resolveType(t: Node | undefined): Node | undefined {
    const seen = new Set<number>()
    while (
        t?.type === "reference" &&
        t.id !== undefined &&
        !t.typeArguments?.length &&
        !seen.has(t.id)
    ) {
        seen.add(t.id)
        t = reflections[t.id]?.type || t
    }
    return t
}

function intrinsicName(t) {
    switch (t.name) {
        case "string":
        case "number":
        case "boolean":
        case "object":
            return t.name
        case "void":
        case "undefined":
        case "never":
            return "void"
        default:
            return "any"
    }
}

/** Normalised kind: "string" | "number" | "boolean" | "object" | "array" | "void" | "any" | ... */
export function typeKind(t: Node | undefined): string {
    t = resolveType(t)
    if (!t) return "any"
    switch (t.type) {
        case "intrinsic":
            return intrinsicName(t)
        case "array":
        case "tuple":
        case "union":
            return t.type
        case "reflection":
            return t.declaration?.signatures?.length ? "function" : "object"
        case "literal":
            return "LiteralType"
        case "reference":
            return t.name || "reference"
        default:
            return "any"
    }
}

export function typeToString(t: Node | undefined): string {
    t = resolveType(t)
    if (!t) return "any"
    switch (t.type) {
        case "intrinsic":
            return t.name
        case "array":
            return `${typeToString(t.elementType)}[]`
        case "tuple":
            return `[${(t.elements || []).map(typeToString).join(", ")}]`
        case "union":
            return (t.types || []).map(typeToString).join(" | ")
        case "literal":
            return JSON.stringify(t.value)
        case "reference": {
            const args = (t.typeArguments || []).map(typeToString)
            return args.length
                ? `${t.name}<${args.join(", ")}>`
                : t.name || "reference"
        }
        case "reflection": {
            const decl = t.declaration || {}
            if (decl.signatures?.length) {
                const sig = decl.signatures[0]
                const args = (sig.parameters || []).map((p: Node) =>
                    typeToString(p.type),
                )
                return `(${args.join(", ")}) => ${typeToString(sig.type)}`
            }
            return "object"
        }
        default:
            return "any"
    }
}

function convertIntrinsic(t, value) {
    switch (t.name) {
        case "string":
            if (typeof value === "string") return value
            throw new Error(`Can't convert to string: ${value}`)
        case "number": {
            const n = parseFloat(value)
            if (!Number.isNaN(n)) return n
            throw new Error(`Can't convert to number: ${value}`)
        }
        case "boolean":
            if (value === "true") return true
            if (value === "false") return false
            throw new Error(`Can't convert ${value} to boolean`)
        case "object":
            try {
                return JSON.parse(value)
            } catch {
                throw new Error(`Can't convert to object: ${value}`)
            }
        case "void":
        case "undefined":
        case "never":
            return null
        default:
            return value
    }
}

export function convert(t: Node | undefined, value: any): any {
    t = resolveType(t)
    if (!t) return value
    switch (t.type) {
        case "intrinsic":
            return convertIntrinsic(t, value)
        case "array": {
            let arr = value
            if (!Array.isArray(arr)) {
                try {
                    arr = JSON.parse(arr)
                } catch {
                    throw new Error(`Can't convert ${value} to array:`)
                }
                if (!Array.isArray(arr))
                    throw new Error(`Can't convert ${value} to array:`)
            }
            return arr.map((v: any) => convert(t.elementType, v))
        }
        case "tuple": {
            let arr = value
            if (!Array.isArray(arr)) {
                try {
                    arr = JSON.parse(arr)
                } catch {
                    throw new Error(`Can't convert to tuple: ${value}`)
                }
                if (!Array.isArray(arr))
                    throw new Error(`Can't convert to tuple: ${value}`)
            }
            const elems = t.elements || []
            if (arr.length !== elems.length) {
                throw new Error(
                    `Error converting tuple: number of elements and type mismatch ${value}`,
                )
            }
            return arr.map((v: any, i: number) => convert(elems[i], v))
        }
        case "union":
            for (const u of t.types || []) {
                try {
                    return convert(u, value)
                } catch {}
            }
            throw new Error(
                `Can't convert "${value}" to any of: ${(t.types || []).map(typeToString).join(", ")}`,
            )
        case "literal":
            if (value === t.value) return value
            throw new Error(
                `Argument does not match expected value (${t.value}): ${value}`,
            )
        case "reflection": {
            const decl = t.declaration || {}
            if (decl.signatures?.length) {
                throw new Error(
                    `Conversion to function not implemented: ${value}`,
                )
            }
            try {
                return JSON.parse(value)
            } catch {
                throw new Error(`Can't convert to object: ${value}`)
            }
        }
        case "reference":
            throw new Error(
                "Conversion of simple type references not implemented.",
            )
        default:
            return value
    }
}

/** Walk `path` through an object-type reflection, coercing `value` against the matched leaf. */
export function convertMember(
    t: Node | undefined,
    path: string[],
    value: any,
): any {
    t = resolveType(t)
    const decl = t?.type === "reflection" ? t.declaration : undefined
    const named: Record<string, Node> = {}
    let indexSig: Node | undefined
    for (const ch of decl?.children || []) {
        const childType = memberType(ch)
        if (ch.name && childType) named[ch.name] = childType
    }
    const idx = decl?.indexSignature
    const idxArr = Array.isArray(idx) ? idx : idx ? [idx] : []
    for (const sig of idxArr) if (sig?.type) indexSig = sig.type

    const sub = named[path[0]] ?? indexSig
    if (!sub) return value
    if (typeKind(sub) === "object")
        return convertMember(sub, path.slice(1), value)
    return convert(sub, value)
}
