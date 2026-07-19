/**
 * Runtime helpers over the compact metadata schema generated at build time.
 * TypeDoc-specific conversion stays in scripts/convert_typedoc_metadata.js.
 */

import metadataJson from "../.metadata.generated.json"
import staticThemesJson from "../.themes.generated.json"

export const staticThemes: string[] = staticThemesJson

type Node = Record<string, any>

const metadata = metadataJson as unknown as {
    version: number
    commands: Record<string, Node>
    settings: Record<string, Node>
}
if (metadata.version !== 1)
    throw new Error(`Unsupported metadata version: ${metadata.version}`)

export const excmdsFunctions = metadata.commands
export const defaultConfigMembers = metadata.settings

export function getDoc(node: Node | undefined): string {
    return node?.doc || ""
}

export function memberDoc(node: Node | undefined): string {
    return node?.doc || ""
}

export function memberType(node: Node | undefined): Node | undefined {
    return node?.type
}

export function paramTypes(fnNode: Node | undefined): Node[] {
    return fnNode?.params || []
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
    const decl = t?.type === "reflection" ? t.declaration : undefined
    const named: Record<string, Node> = {}
    let indexSig: Node | undefined
    for (const ch of decl?.children || []) {
        const childType = memberType(ch)
        if (ch.name && childType) named[ch.name] = childType
    }
    for (const sig of decl?.indexSignatures || [])
        if (sig?.type) indexSig = sig.type

    const sub = named[path[0]] ?? indexSig
    if (!sub) return value
    if (typeKind(sub) === "object")
        return convertMember(sub, path.slice(1), value)
    return convert(sub, value)
}
