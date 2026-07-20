#!/usr/bin/env node

const fs = require("fs")

const TYPEDOC_SCHEMA_VERSION = "2.0"
const METADATA_VERSION = 1
const KIND = { Module: 2, Function: 64, Class: 128 }

const compareNames = (a, b) => (a < b ? -1 : a > b ? 1 : 0)
const sortedRecord = entries =>
    Object.fromEntries(entries.sort(([a], [b]) => compareNames(a, b)))

function convertMetadata(project) {
    if (project.schemaVersion !== TYPEDOC_SCHEMA_VERSION)
        throw new Error(
            `Unsupported TypeDoc schemaVersion ${JSON.stringify(project.schemaVersion)}; expected ${TYPEDOC_SCHEMA_VERSION}`,
        )

    const reflections = {}
    const collect = value => {
        if (!value || typeof value !== "object") return
        if (Array.isArray(value)) return value.forEach(collect)
        if (value.id !== undefined) reflections[value.id] = value
        Object.values(value).forEach(collect)
    }
    collect(project)

    const accessor = node => node?.getSignature || node?.setSignature
    const memberType = node => node?.type || accessor(node)?.type
    const commentText = comment =>
        (comment?.summary || [])
            .map(part => part.text || "")
            .join("")
            .replace(/\n+$/, "")

    const normalizeParameter = (parameter, resolving) => ({
        name: parameter.name,
        type: normalizeType(parameter.type, resolving),
        ...(parameter.flags?.isRest ? { flags: { isRest: true } } : {}),
    })

    const normalizeType = (type, resolving = new Set()) => {
        if (!type) return { type: "intrinsic", name: "any" }
        if (
            type.type === "reference" &&
            typeof type.target === "number" &&
            !type.typeArguments?.length &&
            reflections[type.target]?.type &&
            !resolving.has(type.target)
        ) {
            const next = new Set(resolving)
            next.add(type.target)
            return normalizeType(reflections[type.target].type, next)
        }

        switch (type.type) {
            case "intrinsic":
                return { type: "intrinsic", name: type.name }
            case "array":
                return {
                    type: "array",
                    elementType: normalizeType(type.elementType, resolving),
                }
            case "tuple":
                return {
                    type: "tuple",
                    elements: (type.elements || []).map(element =>
                        normalizeType(element, resolving),
                    ),
                }
            case "union":
                return {
                    type: "union",
                    types: (type.types || []).map(member =>
                        normalizeType(member, resolving),
                    ),
                }
            case "literal":
                return { type: "literal", value: type.value }
            case "reference":
                return {
                    type: "reference",
                    name: type.name,
                    ...(type.typeArguments?.length
                        ? {
                              typeArguments: type.typeArguments.map(argument =>
                                  normalizeType(argument, resolving),
                              ),
                          }
                        : {}),
                }
            case "reflection": {
                const source = type.declaration || {}
                const declaration = {}
                const signature = source.signatures?.[0]
                if (signature)
                    declaration.signatures = [
                        {
                            parameters: (signature.parameters || []).map(
                                parameter =>
                                    normalizeParameter(parameter, resolving),
                            ),
                            type: normalizeType(signature.type, resolving),
                        },
                    ]

                const children = (source.children || [])
                    .map(child => {
                        const type = memberType(child)
                        return type
                            ? {
                                  name: child.name,
                                  type: normalizeType(type, resolving),
                              }
                            : undefined
                    })
                    .filter(Boolean)
                    .sort((a, b) => compareNames(a.name, b.name))
                if (children.length) declaration.children = children

                const indexSignatures = (source.indexSignatures || []).map(
                    signature => ({
                        type: normalizeType(signature.type, resolving),
                    }),
                )
                if (indexSignatures.length)
                    declaration.indexSignatures = indexSignatures
                return { type: "reflection", declaration }
            }
            default:
                return { type: "intrinsic", name: "any" }
        }
    }

    const modules = Object.fromEntries(
        (project.children || [])
            .filter(node => node.kind === KIND.Module)
            .map(node => [
                (node.name || "").replace(/^"|"$/g, "").replace(/\\/g, "/"),
                node,
            ]),
    )
    const excmds = modules.excmds
    const configClass = modules["lib/config"]?.children?.find(
        node => node.kind === KIND.Class && node.name === "default_config",
    )
    if (!excmds || !configClass)
        throw new Error("TypeDoc output is missing excmds or default_config")

    const commands = sortedRecord(
        (excmds.children || [])
            .filter(node => node.kind === KIND.Function)
            .map(node => {
                const signature = node.signatures?.[0]
                return [
                    node.name,
                    {
                        doc:
                            commentText(signature?.comment) ||
                            commentText(node.comment),
                        params: (signature?.parameters || []).map(parameter =>
                            normalizeParameter(parameter),
                        ),
                    },
                ]
            }),
    )
    const settings = sortedRecord(
        (configClass.children || []).map(node => [
            node.name,
            {
                doc:
                    commentText(accessor(node)?.comment) ||
                    commentText(node.comment),
                type: normalizeType(memberType(node)),
            },
        ]),
    )

    return { version: METADATA_VERSION, commands, settings }
}

module.exports = { convertMetadata, METADATA_VERSION, TYPEDOC_SCHEMA_VERSION }

if (require.main === module) {
    const file = process.argv[2]
    if (!file) throw new Error("Usage: convert_typedoc_metadata.js FILE")
    const metadata = convertMetadata(JSON.parse(fs.readFileSync(file, "utf8")))
    fs.writeFileSync(file, JSON.stringify(metadata))
}
