#!/usr/bin/env node

/** Generate minimum-version WebExtension globals from pinned declarations and BCD. */

const fs = require("fs")
const crypto = require("crypto")
const path = require("path")
const ts = require("typescript")
const bcd = require("@mdn/browser-compat-data")
const targets = require("../browser-targets.json")
const policy = require("./browser_types_policy.json")

const declarationPath = require.resolve(
    "@types/firefox-webext-browser/index.d.ts",
)

function compareVersions(left, right) {
    const versionPattern = /^(≤)?\d+(\.\d+)*$/
    if (
        !versionPattern.test(String(left)) ||
        !versionPattern.test(String(right))
    )
        return undefined
    const leftParts = String(left).replace(/^≤/, "").split(".").map(Number)
    const rightParts = String(right).replace(/^≤/, "").split(".").map(Number)
    for (let i = 0; i < Math.max(leftParts.length, rightParts.length); i++) {
        const difference = (leftParts[i] || 0) - (rightParts[i] || 0)
        if (difference) return difference
    }
    return 0
}

function supportState(statement, minimumVersion, alternativeName) {
    if (Array.isArray(statement)) {
        const states = statement.map(item =>
            supportState(item, minimumVersion, alternativeName),
        )
        if (states.includes("supported")) return "supported"
        return states.includes("tooRecent") ? "tooRecent" : "unsupported"
    }
    if (
        !statement ||
        typeof statement !== "object" ||
        statement.flags ||
        statement.prefix ||
        (statement.alternative_name &&
            statement.alternative_name !== alternativeName) ||
        statement.partial_implementation
    )
        return "unsupported"
    const added = statement.version_added
    if (added === false || added == null) return "unsupported"
    if (statement.version_removed) {
        const removed = compareVersions(
            statement.version_removed,
            minimumVersion,
        )
        if (removed === undefined || removed <= 0) return "unsupported"
    }
    if (added === true) return "supported"
    const comparison = compareVersions(added, minimumVersion)
    if (comparison === undefined) return "unsupported"
    if (String(added).startsWith("≤") && comparison > 0) return "unsupported"
    return comparison > 0 ? "tooRecent" : "supported"
}

function nodeName(node) {
    if (node && (ts.isIdentifier(node) || ts.isStringLiteral(node))) {
        return node.text
    }
    throw new Error("Browser runtime declarations must have simple names")
}

function applyEdits(source, edits) {
    const unique = [
        ...new Map(
            edits.map(edit => [
                `${edit.start}:${edit.end}:${edit.text || ""}`,
                { ...edit, text: edit.text || "" },
            ]),
        ).values(),
    ].sort((left, right) => left.start - right.start || left.end - right.end)
    for (let index = 1; index < unique.length; index++) {
        if (unique[index].start < unique[index - 1].end)
            throw new Error(
                `Overlapping browser declaration edits at ${unique[index].start}`,
            )
    }
    let text = source
    for (const edit of unique.reverse()) {
        text = text.slice(0, edit.start) + edit.text + text.slice(edit.end)
    }
    return text
}

function collectRuntimeDeclarations(source, fileName = "index.d.ts") {
    const sourceFile = ts.createSourceFile(
        fileName,
        source,
        ts.ScriptTarget.Latest,
        true,
    )
    const declarations = []

    function visitModule(node, namespace = [], ambient = false) {
        const current = namespace.concat(nodeName(node.name))
        const declared =
            ambient ||
            sourceFile.isDeclarationFile ||
            (node.modifiers || []).some(
                modifier => modifier.kind === ts.SyntaxKind.DeclareKeyword,
            )
        if (!node.body) return
        if (ts.isModuleDeclaration(node.body)) {
            visitModule(node.body, current, declared)
            return
        }
        const runtimePath = name =>
            current.slice(1).concat(nodeName(name)).join(".")
        for (const statement of node.body.statements) {
            if (ts.isModuleDeclaration(statement)) {
                visitModule(statement, current, declared)
            } else if (declared && current[0] === "browser") {
                if (ts.isFunctionDeclaration(statement)) {
                    declarations.push({
                        node: statement,
                        path: runtimePath(statement.name),
                    })
                } else if (ts.isVariableStatement(statement)) {
                    const list = statement.declarationList.declarations
                    for (const declaration of list) {
                        declarations.push({
                            node: declaration,
                            path: runtimePath(declaration.name),
                            statement,
                        })
                    }
                }
            }
        }
    }

    for (const statement of sourceFile.statements) {
        if (ts.isModuleDeclaration(statement)) visitModule(statement)
    }
    return { declarations, sourceFile }
}

function applyAlias(apiPath, aliases) {
    const alias = Object.keys(aliases)
        .sort((left, right) => right.length - left.length)
        .find(prefix => apiPath === prefix || apiPath.startsWith(prefix + "."))
    return alias ? aliases[alias] + apiPath.slice(alias.length) : apiPath
}

function supportForPath(api, apiPath, target, minimum, alternativePath) {
    let feature = api
    let state
    const alternativeParts = alternativePath && alternativePath.split(".")
    for (const [index, name] of apiPath.split(".").entries()) {
        feature = feature && feature[name]
        if (!feature) return { mapped: false, state }
        if (feature.__compat) {
            const next = supportState(
                (feature.__compat.support || {})[target],
                minimum,
                alternativeParts?.slice(0, index + 1).join("."),
            )
            if (
                state === undefined ||
                (state === "supported" && next !== "supported") ||
                (state === "tooRecent" && next === "unsupported")
            )
                state = next
        }
    }
    return { mapped: state !== undefined, state }
}

function nodeAtPath(api, apiPath) {
    let feature = api
    for (const name of apiPath.split(".")) {
        feature = feature && feature[name]
    }
    return feature
}

function featureAtPath(api, apiPath) {
    const feature = nodeAtPath(api, apiPath)
    return feature && feature.__compat ? feature : undefined
}

function nestedDeclarationEdits(
    sourceFile,
    target,
    minimum,
    api,
    mappingPolicy,
    runtimeDecisions,
) {
    const interfaces = new Map()
    const typeAliases = []
    const functions = []
    const events = []

    function visitModule(node, namespace = []) {
        const current = namespace.concat(nodeName(node.name))
        if (!node.body) return
        if (ts.isModuleDeclaration(node.body)) {
            visitModule(node.body, current)
            return
        }
        if (current[0] !== "browser") return
        const apiNamespace = current.slice(1).join(".")
        for (const statement of node.body.statements) {
            if (ts.isModuleDeclaration(statement)) {
                visitModule(statement, current)
            } else if (ts.isInterfaceDeclaration(statement)) {
                interfaces.set(`${apiNamespace}.${statement.name.text}`, {
                    name: statement.name.text,
                    namespace: apiNamespace,
                    node: statement,
                })
            } else if (ts.isTypeAliasDeclaration(statement)) {
                typeAliases.push({ namespace: apiNamespace, node: statement })
            } else if (ts.isFunctionDeclaration(statement)) {
                functions.push({ namespace: apiNamespace, node: statement })
            } else if (ts.isVariableStatement(statement)) {
                for (const declaration of statement.declarationList.declarations) {
                    events.push({ namespace: apiNamespace, node: declaration })
                }
            }
        }
    }

    for (const statement of sourceFile.statements) {
        if (ts.isModuleDeclaration(statement)) visitModule(statement)
    }

    function typeReferences(type, includeFunctionTypes = false) {
        const references = []
        function visit(node) {
            if (ts.isFunctionTypeNode(node) && !includeFunctionTypes) return
            if (ts.isTypeReferenceNode(node)) references.push(node)
            ts.forEachChild(node, visit)
        }
        if (type) visit(type)
        return references
    }

    function typeNames(type, includeFunctionTypes = false) {
        return typeReferences(type, includeFunctionTypes).map(reference =>
            reference.typeName.getText(),
        )
    }

    function resolveType(namespace, name) {
        const normalized = name.replace(/^browser\./, "")
        if (normalized.includes(".")) return normalized
        return `${namespace}.${normalized}`
    }

    const aliasesByName = new Map(
        typeAliases.map(declaration => [
            `${declaration.namespace}.${declaration.node.name.text}`,
            declaration,
        ]),
    )

    function functionTypes(type, namespace) {
        const results = []
        const resultSet = new Set()
        const seen = new Set()
        function visitNamed(name, currentNamespace) {
            const typeName = resolveType(currentNamespace, name)
            if (seen.has(typeName)) return
            seen.add(typeName)
            const alias = aliasesByName.get(typeName)
            if (alias) visit(alias.node.type, alias.namespace)
            const declaration = interfaces.get(typeName)
            if (!declaration) return
            for (const member of declaration.node.members) {
                if (ts.isCallSignatureDeclaration(member))
                    visit(member, declaration.namespace)
            }
            for (const clause of declaration.node.heritageClauses || []) {
                for (const inherited of clause.types)
                    visitNamed(
                        inherited.expression.getText(),
                        declaration.namespace,
                    )
            }
        }
        function visit(node, currentNamespace) {
            if (ts.isFunctionTypeNode(node) || ts.isCallSignatureDeclaration(node)) {
                if (!resultSet.has(node)) {
                    resultSet.add(node)
                    results.push(node)
                }
                return
            }
            if (ts.isTypeReferenceNode(node)) {
                visitNamed(node.typeName.getText(), currentNamespace)
                for (const argument of node.typeArguments || [])
                    visit(argument, currentNamespace)
                return
            }
            ts.forEachChild(node, child => visit(child, currentNamespace))
        }
        if (type) visit(type, namespace)
        return results
    }

    const contexts = new Map()
    const eventInterfaces = new Map()
    const eventInterfaceUsages = new Map()
    const resultContexts = new Map()
    const retainedEvents = new Set()
    const retainedFunctions = []
    function addContext(typeName, context) {
        if (!interfaces.has(typeName)) return
        const entries = contexts.get(typeName) || []
        if (
            entries.some(
                entry =>
                    entry.operation === context.operation &&
                    entry.slot === context.slot &&
                    entry.sourceParameter === context.sourceParameter,
            )
        )
            return
        entries.push(context)
        contexts.set(typeName, entries)
    }

    function addResultContext(typeName, operation) {
        if (!interfaces.has(typeName)) return
        const operations = resultContexts.get(typeName) || []
        if (!operations.includes(operation)) operations.push(operation)
        resultContexts.set(typeName, operations)
    }

    function addCallbackContexts(callback, namespace, operation) {
        if (!callback) return
        for (const parameter of callback.parameters) {
            if (!ts.isIdentifier(parameter.name)) continue
            for (const name of typeNames(parameter.type, true)) {
                const childType = resolveType(namespace, name)
                addContext(childType, {
                    operation,
                    slot: parameter.name.text,
                    sourceParameter: parameter,
                    ancestry: [childType],
                })
            }
        }
        for (const name of typeNames(callback.type, true))
            addResultContext(resolveType(namespace, name), operation)
    }

    for (const declaration of functions) {
        const operation = `${declaration.namespace}.${nodeName(declaration.node.name)}`
        if (!runtimeDecisions.get(operation)?.keep) continue
        retainedFunctions.push({ ...declaration, operation })
        for (const parameter of declaration.node.parameters) {
            if (!parameter.name || !ts.isIdentifier(parameter.name)) continue
            for (const name of typeNames(parameter.type)) {
                const typeName = resolveType(declaration.namespace, name)
                addContext(typeName, {
                    operation,
                    slot: parameter.name.text,
                    sourceParameter: parameter,
                    ancestry: [typeName],
                })
            }
        }
        for (const name of typeNames(declaration.node.type)) {
            addResultContext(
                resolveType(declaration.namespace, name),
                operation,
            )
        }
    }

    for (const declaration of events) {
        if (!declaration.node.name || !ts.isIdentifier(declaration.node.name))
            continue
        const operation = `${declaration.namespace}.${declaration.node.name.text}`
        if (!runtimeDecisions.get(operation)?.keep) continue
        retainedEvents.add(declaration.node)
        for (const callback of functionTypes(
            declaration.node.type,
            declaration.namespace,
        ))
            addCallbackContexts(callback, declaration.namespace, operation)
        for (const reference of typeReferences(declaration.node.type)) {
            const name = reference.typeName.getText()
            const typeName = resolveType(declaration.namespace, name)
            if (!interfaces.has(typeName)) continue
            const isEvent = interfaces
                .get(typeName)
                .node.members.some(
                    member =>
                        ts.isMethodSignature(member) &&
                        member.name &&
                        nodeName(member.name) === "addListener",
                )
            if (!isEvent) addResultContext(typeName, operation)
            if (!isEvent) continue
            const entries = eventInterfaces.get(typeName) || []
            entries.push(operation)
            eventInterfaces.set(typeName, entries)
            const usages = eventInterfaceUsages.get(typeName) || []
            usages.push({
                operation,
                argumentCount: reference.typeArguments?.length || 0,
            })
            eventInterfaceUsages.set(typeName, usages)
        }
    }

    for (const [typeName, usages] of eventInterfaceUsages) {
        const declaration = interfaces.get(typeName)
        for (const [index, parameter] of (
            declaration.node.typeParameters || []
        ).entries()) {
            const operations = usages
                .filter(usage => usage.argumentCount <= index)
                .map(usage => usage.operation)
            for (const callback of functionTypes(
                parameter.default,
                declaration.namespace,
            ))
                for (const operation of operations)
                    addCallbackContexts(
                        callback,
                        declaration.namespace,
                        operation,
                    )
        }
    }
    for (const [typeName, operations] of eventInterfaces) {
        const declaration = interfaces.get(typeName)
        for (const member of declaration.node.members) {
            if (!ts.isMethodSignature(member) || nodeName(member.name) !== "addListener")
                continue
            const callbacks = functionTypes(
                member.parameters[0]?.type,
                declaration.namespace,
            )
            for (const operation of operations) {
                for (const callback of callbacks)
                    addCallbackContexts(
                        callback,
                        declaration.namespace,
                        operation,
                    )
                for (const parameter of member.parameters.slice(1)) {
                    if (!ts.isIdentifier(parameter.name)) continue
                    for (const name of typeNames(parameter.type)) {
                        const childType = resolveType(
                            declaration.namespace,
                            name,
                        )
                        addContext(childType, {
                            operation,
                            slot: parameter.name.text,
                            sourceParameter: parameter,
                            ancestry: [childType],
                        })
                    }
                }
            }
        }
    }

    let contextCount = -1
    while (contextCount !== [...contexts.values()].flat().length) {
        contextCount = [...contexts.values()].flat().length
        for (const [typeName, entries] of [...contexts]) {
            const declaration = interfaces.get(typeName)
            for (const member of declaration.node.members) {
                if (!member.name || !member.type) continue
                const property = nodeName(member.name)
                for (const entry of entries) {
                    for (const name of typeNames(member.type)) {
                        const childType = resolveType(
                            declaration.namespace,
                            name,
                        )
                        const ancestry = entry.ancestry || [typeName]
                        if (ancestry.includes(childType)) continue
                        addContext(childType, {
                            operation: entry.operation,
                            slot: `${entry.slot}.${property}`,
                            sourceParameter: entry.sourceParameter,
                            ancestry: ancestry.concat(childType),
                        })
                    }
                }
            }
        }
    }

    let resultContextCount = -1
    while (resultContextCount !== [...resultContexts.values()].flat().length) {
        resultContextCount = [...resultContexts.values()].flat().length
        for (const [typeName, operations] of [...resultContexts]) {
            const declaration = interfaces.get(typeName)
            for (const member of declaration.node.members) {
                if (!member.type) continue
                for (const name of typeNames(member.type)) {
                    const childType = resolveType(declaration.namespace, name)
                    for (const operation of operations)
                        addResultContext(childType, operation)
                }
            }
        }
    }

    const aliases = mappingPolicy.aliases || {}
    const configured = mappingPolicy.nested_unmapped || {}
    const invalid = Object.keys(configured).filter(
        apiPath =>
            !Array.isArray(configured[apiPath]) ||
            new Set(configured[apiPath]).size !== configured[apiPath].length ||
            configured[apiPath].some(name => !(name in targets)),
    )
    if (invalid.length)
        throw new Error(
            `Nested unmapped policy drift (invalid: ${invalid.join(", ")})`,
        )

    function classify(apiPath) {
        const bcdPath = applyAlias(apiPath, aliases)
        const alternativePath = bcdPath === apiPath ? undefined : apiPath
        const support = supportForPath(
            api,
            bcdPath,
            target,
            minimum,
            alternativePath,
        )
        if (featureAtPath(api, bcdPath)) {
            return {
                mapped: true,
                path: apiPath,
                reason: support.state,
            }
        }
        if (support.state && support.state !== "supported")
            return { mapped: false, path: apiPath, reason: support.state }
        if (nodeAtPath(api, bcdPath)) {
            return { mapped: true, path: apiPath, reason: "structural" }
        }
        const explicitlyConfigured = apiPath in configured
        const retained = configured[apiPath]?.includes(target) === true
        const retainedRuntimeParent = [...runtimeDecisions].some(
            ([path, value]) => value.keep && apiPath.startsWith(`${path}.`),
        )
        const inherited =
            (support.state === "supported" || retainedRuntimeParent) &&
            mappingPolicy.nested_defaults?.targets?.includes(target) === true
        return {
            mapped: false,
            path: apiPath,
            reason: retained
                ? "unmapped-retained"
                : explicitlyConfigured
                  ? "unmapped-removed"
                  : inherited
                  ? "inherited-parent"
                  : "unmapped-removed",
        }
    }

    function decision(apiPaths) {
        const results = apiPaths.map(classify)
        return {
            keep: results.every(
                result =>
                    result.reason === "supported" ||
                    result.reason === "structural" ||
                    result.reason === "inherited-parent" ||
                    result.reason === "unmapped-retained",
            ),
            results,
        }
    }

    function contextPaths(context, property) {
        const candidates = [
            `${context.operation}.${context.slot}.${property}`,
            `${context.operation}.${property}`,
        ]
        const operation = nodeAtPath(
            api,
            applyAlias(context.operation, aliases),
        )
        const encoded = Object.keys(operation || {})
            .filter(
                name =>
                    name === `${property}_value` ||
                    name === `${context.slot}_${property}_parameter`,
            )
            .map(name => `${context.operation}.${name}`)
        if (featureAtPath(api, applyAlias(candidates[0], aliases)))
            return [candidates[0]]
        if (encoded.length) return encoded
        if (featureAtPath(api, applyAlias(candidates[1], aliases)))
            return [candidates[1]]
        const nested =
            context.sourceParameter &&
            ts.isFunctionTypeNode(context.sourceParameter.parent)
                ? []
                : Object.keys(operation || {}).flatMap(name => {
                      const candidate = `${context.operation}.${name}.${property}`
                      return featureAtPath(api, applyAlias(candidate, aliases))
                          ? [candidate]
                          : []
                  })
        if (nested.length) return nested
        return [
            nodeAtPath(
                api,
                applyAlias(`${context.operation}.${context.slot}`, aliases),
            )
                ? candidates[0]
                : candidates[1],
        ]
    }

    const rows = []
    function decide(apiPaths) {
        const result = decision(apiPaths)
        rows.push(...result.results)
        return result.keep
    }

    const edits = []
    const disabledParameters = new Set()

    function filterCallback(callback, operations) {
        let trailing = true
        for (let index = callback.parameters.length - 1; index >= 0; index--) {
            const parameter = callback.parameters[index]
            if (!ts.isIdentifier(parameter.name)) continue
            const apiPaths = operations.flatMap(operation =>
                [
                    `${operation}.${parameter.name.text}`,
                    ...typeNames(parameter.type).map(
                        name =>
                            `${operation}.${name.split(".").pop().replace(/^_/, "")}`,
                    ),
                ].filter(apiPath =>
                    featureAtPath(api, applyAlias(apiPath, aliases)),
                ),
            )
            if (!apiPaths.length || decide(apiPaths)) {
                trailing = false
                continue
            }
            if (!trailing)
                throw new Error(
                    `Unsupported callback parameter cannot be removed safely: ${apiPaths.join(", ")}`,
                )
            disabledParameters.add(parameter)
            edits.push({
                start:
                    index === 0
                        ? parameter.getStart(sourceFile)
                        : callback.parameters[index - 1].end,
                end: parameter.end,
                text: "",
            })
        }
        const returnPaths = operations.map(
            operation => `${operation}.return_promise`,
        )
        const returnTypes = ts.isUnionTypeNode(callback.type)
            ? callback.type.types
            : [callback.type]
        const promiseTypes = returnTypes.filter(
            type =>
                ts.isTypeReferenceNode(type) &&
                type.typeName.getText().split(".").pop() === "Promise",
        )
        if (promiseTypes.length && !decide(returnPaths)) {
            const kept = returnTypes.filter(type => !promiseTypes.includes(type))
            if (!kept.length)
                throw new Error(
                    `All callback returns are unsupported for ${operations.join(", ")}`,
                )
            edits.push({
                start: callback.type.getStart(sourceFile),
                end: callback.type.end,
                text: kept
                    .map(type =>
                        sourceFile.text.slice(type.getStart(sourceFile), type.end),
                    )
                    .join(" | "),
            })
        }
    }

    function parameterPaths(declaration, parameter) {
        if (!ts.isIdentifier(parameter.name)) return []
        const operation = nodeAtPath(
            api,
            applyAlias(declaration.operation, aliases),
        )
        const candidates = [
            `${declaration.operation}.${parameter.name.text}`,
            `${declaration.operation}.${parameter.name.text}_parameter`,
        ]
        const mapped = candidates.filter(candidate =>
            featureAtPath(api, applyAlias(candidate, aliases)),
        )
        if (mapped.length) return mapped

        const properties = new Set()
        for (const name of typeNames(parameter.type)) {
            const typeName = resolveType(declaration.namespace, name)
            for (const member of interfaces.get(typeName)?.node.members || []) {
                if (member.name) properties.add(nodeName(member.name))
            }
        }
        return Object.keys(operation || {})
            .filter(name => {
                const candidate = `${declaration.operation}.${name}`
                const feature = nodeAtPath(
                    api,
                    applyAlias(candidate, aliases),
                )
                return (
                    featureAtPath(api, applyAlias(candidate, aliases)) &&
                    Object.keys(feature || {}).some(property =>
                        properties.has(property),
                    )
                )
            })
            .map(name => `${declaration.operation}.${name}`)
    }

    for (const declaration of retainedFunctions) {
        const parameters = declaration.node.parameters
        let trailing = true
        for (let index = parameters.length - 1; index >= 0; index--) {
            const parameter = parameters[index]
            const apiPaths = parameterPaths(declaration, parameter)
            if (!apiPaths.length || decide(apiPaths)) {
                trailing = false
                continue
            }
            if (
                !trailing ||
                (!parameter.questionToken && !parameter.initializer)
            )
                throw new Error(
                    `Unsupported function parameter cannot be removed safely: ${apiPaths.join(", ")}`,
                )
            disabledParameters.add(parameter)
            edits.push({
                start:
                    index === 0
                        ? parameter.getStart(sourceFile)
                        : parameters[index - 1].end,
                end: parameter.end,
                text: "",
            })
        }
    }

    for (const declaration of events) {
        if (!retainedEvents.has(declaration.node)) continue
        if (!ts.isIdentifier(declaration.node.name)) continue
        const operation = `${declaration.namespace}.${declaration.node.name.text}`
        for (const callback of functionTypes(
            declaration.node.type,
            declaration.namespace,
        ))
            filterCallback(callback, [operation])
    }

    for (const [typeName, usages] of eventInterfaceUsages) {
        const declaration = interfaces.get(typeName)
        for (const [index, parameter] of (
            declaration.node.typeParameters || []
        ).entries()) {
            const operations = usages
                .filter(usage => usage.argumentCount <= index)
                .map(usage => usage.operation)
            if (!operations.length) continue
            for (const callback of functionTypes(
                parameter.default,
                declaration.namespace,
            ))
                filterCallback(callback, [...new Set(operations)])
        }
    }

    for (const [typeName, operations] of eventInterfaces) {
        const declaration = interfaces.get(typeName)
        for (const member of declaration.node.members) {
            if (!ts.isMethodSignature(member) || nodeName(member.name) !== "addListener")
                continue
            const callbacks = functionTypes(
                member.parameters[0]?.type,
                declaration.namespace,
            )
            for (const callback of callbacks)
                filterCallback(callback, [...new Set(operations)])
        }
    }

    function aliasedUnion(declaration) {
        const seen = new Set()
        while (declaration && !seen.has(declaration)) {
            seen.add(declaration)
            if (ts.isUnionTypeNode(declaration.node.type)) return declaration.node.type
            if (!ts.isTypeReferenceNode(declaration.node.type)) return undefined
            declaration = aliasesByName.get(
                resolveType(
                    declaration.namespace,
                    declaration.node.type.typeName.getText(),
                ),
            )
        }
    }
    const unionContexts = new Map()
    for (const declaration of typeAliases) {
        const union = aliasedUnion(declaration)
        if (!union) continue
        const typePath = `${declaration.namespace}.${declaration.node.name.text}`
        const bcdPath = applyAlias(typePath, aliases)
        const typeSupport = supportForPath(
            api,
            bcdPath,
            target,
            minimum,
            bcdPath === typePath ? undefined : typePath,
        )
        if (typeSupport.mapped && typeSupport.state !== "supported") continue
        const entries = unionContexts.get(union) || []
        entries.push(declaration)
        unionContexts.set(union, entries)
    }
    for (const [union, declarations] of unionContexts) {
        const members = union.types
        const kept = members.filter(member => {
            if (
                !ts.isLiteralTypeNode(member) ||
                !ts.isStringLiteral(member.literal)
            )
                return true
            const apiPaths = declarations
                .map(
                    declaration =>
                        `${declaration.namespace}.${declaration.node.name.text}.${member.literal.text}`,
                )
                .filter(apiPath =>
                    featureAtPath(api, applyAlias(apiPath, aliases)),
                )
            return !apiPaths.length || decide(apiPaths)
        })
        if (kept.length === members.length) continue
        if (!kept.length)
            throw new Error(`All values are unsupported for aliased union`)
        edits.push({
            start: union.getStart(sourceFile),
            end: union.end,
            text: kept
                .map(member =>
                    sourceFile.text.slice(
                        member.getStart(sourceFile),
                        member.end,
                    ),
                )
                .join(" | "),
        })
    }

    for (const [typeName, operations] of eventInterfaces) {
        const declaration = interfaces.get(typeName)
        for (const operation of operations) {
            for (const member of declaration.node.members) {
                if (!ts.isMethodSignature(member) || !member.name) continue
                if (nodeName(member.name) !== "addListener") continue
                let trailing = true
                for (let index = member.parameters.length - 1; index > 0; index--) {
                    const parameter = member.parameters[index]
                    if (!ts.isIdentifier(parameter.name)) continue
                    const apiPath = `${operation}.${parameter.name.text}`
                    if (decide([apiPath])) {
                        trailing = false
                        continue
                    }
                    if (!trailing || !parameter.questionToken)
                        throw new Error(
                            `Unsupported event parameter cannot be removed safely: ${apiPath}`,
                        )
                    disabledParameters.add(parameter)
                    edits.push({
                        start: member.parameters[index - 1].end,
                        end: parameter.end,
                        text: "",
                    })
                }
            }
        }
    }

    for (const [typeName, declaration] of interfaces) {
        for (const member of declaration.node.members) {
            if (!member.name) continue
            const property = nodeName(member.name)
            const candidates = new Set()
            const canonical = `${typeName}.${property}`
            const canonicalPath = applyAlias(canonical, aliases)
            const canonicalMapped = featureAtPath(api, canonicalPath)
            const canonicalSupport = supportForPath(
                api,
                canonicalPath,
                target,
                minimum,
                canonicalPath === canonical ? undefined : canonical,
            )
            for (const operation of resultContexts.get(typeName) || []) {
                const localType = declaration.name.replace(/^_/, "")
                const localPath = `${operation}.${localType}.${property}`
                const operationNode = nodeAtPath(
                    api,
                    applyAlias(operation, aliases),
                )
                const encoded = Object.keys(operationNode || {})
                    .filter(name =>
                        name.endsWith(`_${property}_property`),
                    )
                    .map(name => `${operation}.${name}`)
                const directPath = `${operation}.${property}`
                const localCandidates = [
                    localPath,
                    ...(declaration.name.includes("Return") ? [directPath] : []),
                ]
                    .concat(encoded)
                    .filter(candidate =>
                        featureAtPath(api, applyAlias(candidate, aliases)),
                    )
                if (canonicalMapped) candidates.add(canonical)
                for (const candidate of localCandidates) candidates.add(candidate)
                if (!canonicalMapped && !localCandidates.length)
                    candidates.add(
                        canonicalSupport.state === undefined ? localPath : canonical,
                    )
            }
            for (const context of contexts.get(typeName) || []) {
                if (disabledParameters.has(context.sourceParameter)) continue
                if (canonicalSupport.state !== undefined)
                    candidates.add(canonical)
                for (const candidate of contextPaths(context, property))
                    candidates.add(candidate)
            }
            if (candidates.size && !decide([...candidates])) {
                edits.push({
                    start: member.getFullStart(),
                    end: member.end,
                    text: "",
                })
            }
        }

    }
    return { edits, rows }
}

function decidePaths(declarations, target, minimum, api, mappingPolicy) {
    const paths = [
        ...new Set(declarations.map(declaration => declaration.path)),
    ].sort()
    const aliases = mappingPolicy.aliases || {}
    const configured = mappingPolicy.unmapped || {}
    const support = new Map(
        paths.map(apiPath => {
            const bcdPath = applyAlias(apiPath, aliases)
            const alternativePath = bcdPath === apiPath ? undefined : apiPath
            return [
                apiPath,
                supportForPath(api, bcdPath, target, minimum, alternativePath),
            ]
        }),
    )
    const unmapped = paths.filter(apiPath => !support.get(apiPath).mapped)
    const configuredPaths = Object.keys(configured).sort()
    const unlisted = unmapped.filter(apiPath => !(apiPath in configured))
    const stale = configuredPaths.filter(apiPath => !unmapped.includes(apiPath))
    const targetNames = Object.keys(targets)
    const invalid = configuredPaths.filter(apiPath => {
        const retainedTargets = configured[apiPath]
        return (
            !Array.isArray(retainedTargets) ||
            new Set(retainedTargets).size !== retainedTargets.length ||
            retainedTargets.some(name => !targetNames.includes(name))
        )
    })
    if (unlisted.length || stale.length || invalid.length) {
        const details = []
        if (unlisted.length) details.push(`unlisted: ${unlisted.join(", ")}`)
        if (stale.length) details.push(`stale: ${stale.join(", ")}`)
        if (invalid.length) details.push(`invalid: ${invalid.join(", ")}`)
        throw new Error(`Unmapped runtime policy drift (${details.join("; ")})`)
    }

    const decisions = new Map()
    for (const apiPath of paths) {
        const { mapped, state } = support.get(apiPath)
        if (!mapped) {
            if (state && state !== "supported") {
                decisions.set(apiPath, { keep: false, reason: state })
                continue
            }
            const keep = configured[apiPath].includes(target)
            decisions.set(apiPath, {
                keep,
                reason: keep ? "unmapped-retained" : "unmapped-removed",
            })
            continue
        }
        decisions.set(apiPath, { keep: state === "supported", reason: state })
    }
    return {
        decisions,
        mapped: paths.length - unmapped.length,
        paths,
        unmapped,
    }
}

function transformDeclarations(source, target, minimum, api, mappingPolicy) {
    const { declarations, sourceFile } = collectRuntimeDeclarations(source)
    const mapping = decidePaths(
        declarations,
        target,
        minimum,
        api,
        mappingPolicy,
    )
    const nested = nestedDeclarationEdits(
        sourceFile,
        target,
        minimum,
        api,
        mappingPolicy,
        mapping.decisions,
    )
    const edits = nested.edits
    const variables = new Map()
    function remove(node) {
        edits.push({ start: node.getFullStart(), end: node.end, text: "" })
    }
    for (const declaration of declarations) {
        if (declaration.statement) {
            const entries = variables.get(declaration.statement) || []
            entries.push(declaration)
            variables.set(declaration.statement, entries)
        } else if (!mapping.decisions.get(declaration.path).keep) {
            remove(declaration.node)
        }
    }
    for (const [statement, entries] of variables) {
        const kept = entries.filter(
            entry => mapping.decisions.get(entry.path).keep,
        )
        if (kept.length === entries.length) continue
        if (!kept.length) {
            remove(statement)
            continue
        }
        const all = statement.declarationList.declarations
        const keptNodes = new Set(kept.map(entry => entry.node))
        for (let index = 0; index < all.length; ) {
            if (keptNodes.has(all[index])) {
                index++
                continue
            }
            const first = index
            while (index + 1 < all.length && !keptNodes.has(all[index + 1]))
                index++
            edits.push({
                start:
                    first === 0
                        ? all[first].getStart(sourceFile)
                        : all[first - 1].end,
                end:
                    first === 0
                        ? all[index + 1].getStart(sourceFile)
                        : all[index].end,
                text: "",
            })
            index++
        }
    }
    const text = applyEdits(source, edits)

    const rows = mapping.paths.map(apiPath => ({
        path: apiPath,
        reason: mapping.decisions.get(apiPath).reason,
    }))
    const retained = rows.filter(row => mapping.decisions.get(row.path).keep)
    const removed = rows.filter(row => !mapping.decisions.get(row.path).keep)
    const nestedRows = [
        ...new Map(nested.rows.map(row => [row.path, row])).values(),
    ].sort((left, right) => left.path.localeCompare(right.path))
    const retainedNested = nestedRows.filter(
        row =>
            row.reason === "supported" ||
            row.reason === "structural" ||
            row.reason === "inherited-parent" ||
            row.reason === "unmapped-retained",
    )
    const removedNested = nestedRows.filter(
        row => !retainedNested.includes(row),
    )
    const generatedText = `// Generated for ${target} ${minimum}; do not edit.\n${text}`
    return {
        text: generatedText,
        report: {
            target,
            minimumVersion: minimum,
            declarationSha256: crypto
                .createHash("sha256")
                .update(generatedText)
                .digest("hex"),
            counts: {
                runtimeDeclarations: declarations.length,
                runtimePaths: mapping.paths.length,
                mappedPaths: mapping.mapped,
                unmappedPaths: mapping.unmapped.length,
                retainedPaths: retained.length,
                removedPaths: removed.length,
                nestedPaths: nestedRows.length,
                mappedNestedPaths: nestedRows.filter(row => row.mapped).length,
                unmappedNestedPaths: nestedRows.filter(row => !row.mapped).length,
                retainedNestedPaths: retainedNested.length,
                removedNestedPaths: removedNested.length,
            },
            retained,
            removed,
            nested: {
                retained: retainedNested,
                removed: removedNested,
            },
        },
    }
}

function validateNestedPolicy(reports, mappingPolicy) {
    const observed = new Map()
    for (const [target, report] of Object.entries(reports)) {
        for (const row of [
            ...report.nested.retained,
            ...report.nested.removed,
        ]) {
            if (row.mapped) continue
            const targetNames = observed.get(row.path) || new Set()
            targetNames.add(target)
            observed.set(row.path, targetNames)
        }
    }
    const configured = mappingPolicy.nested_unmapped || {}
    const stale = Object.keys(configured).filter(apiPath => !observed.has(apiPath))
    const staleTargets = Object.entries(configured).flatMap(
        ([apiPath, targetNames]) =>
            targetNames
                .filter(target => !observed.get(apiPath)?.has(target))
                .map(target => `${apiPath}:${target}`),
    )
    if (stale.length || staleTargets.length) {
        const details = []
        if (stale.length) details.push(`stale: ${stale.join(", ")}`)
        if (staleTargets.length)
            details.push(`stale targets: ${staleTargets.join(", ")}`)
        throw new Error(`Nested unmapped policy drift (${details.join("; ")})`)
    }
}

function validateNestedDefaults(source, mappingPolicy, reports) {
    const defaults = mappingPolicy.nested_defaults
    if (!defaults) return
    const version = JSON.parse(
        fs.readFileSync(path.join(path.dirname(declarationPath), "package.json")),
    ).version
    const hash = crypto.createHash("sha256").update(source).digest("hex")
    const validTargets =
        Array.isArray(defaults.targets) &&
        new Set(defaults.targets).size === defaults.targets.length &&
        defaults.targets.every(target => target in targets)
    if (
        !validTargets ||
        defaults.bcdVersion !== bcd.__meta.version ||
        defaults.declarationVersion !== version ||
        defaults.sha256 !== hash
    )
        throw new Error(
            `Nested default policy drift (expected ${version} ${hash})`,
        )
    if (!reports) return
    const inventory = Object.entries(reports)
        .flatMap(([target, report]) =>
            [
                `${target}:declaration:${report.declarationSha256 || ""}`,
                ...[...report.nested.retained, ...report.nested.removed].map(
                    row => `${target}:${row.path}:${row.mapped}:${row.reason}`,
                ),
            ],
        )
        .sort()
    const inventoryHash = crypto
        .createHash("sha256")
        .update(inventory.join("\n"))
        .digest("hex")
    if (defaults.nestedSha256 !== inventoryHash)
        throw new Error(
            `Nested inventory policy drift (expected ${inventoryHash})`,
        )
}

function collectCompatMethods(source, fileName = "compat.d.ts") {
    const sourceFile = ts.createSourceFile(
        fileName,
        source,
        ts.ScriptTarget.Latest,
        true,
    )
    const methods = []
    const capabilities = new Map()
    const exportedFunctions = []

    function visitType(type, path, result = methods) {
        if (!type || !ts.isTypeLiteralNode(type)) return
        for (const member of type.members) {
            if (!member.name) continue
            const memberPath = path.concat(nodeName(member.name))
            if (
                ts.isMethodSignature(member) ||
                (ts.isPropertySignature(member) &&
                    member.type &&
                    ts.isFunctionTypeNode(member.type))
            ) {
                result.push({ node: member, path: memberPath.join(".") })
            } else if (ts.isPropertySignature(member)) {
                visitType(member.type, memberPath, result)
            }
        }
    }

    for (const statement of sourceFile.statements) {
        const exported = (statement.modifiers || []).some(
            modifier => modifier.kind === ts.SyntaxKind.ExportKeyword,
        )
        if (ts.isFunctionDeclaration(statement)) {
            if (exported) exportedFunctions.push(nodeName(statement.name))
            continue
        }
        if (!ts.isVariableStatement(statement)) continue
        for (const declaration of statement.declarationList.declarations) {
            const name = nodeName(declaration.name)
            if (exported) {
                visitType(declaration.type, [name])
            } else if (
                ["desktopApis", "firefoxApis", "firefoxDesktopApis"].includes(
                    name,
                )
            ) {
                const entries = []
                visitType(declaration.type, [], entries)
                capabilities.set(name, new Set(entries.map(entry => entry.path)))
            }
        }
    }
    return { capabilities, exportedFunctions, methods, sourceFile }
}

function transformCompatDeclaration(
    source,
    target,
    minimum,
    api,
    mappingPolicy,
) {
    const { capabilities, exportedFunctions, methods } =
        collectCompatMethods(source)
    const configured = mappingPolicy.compat || {}
    const paths = [...new Set(methods.map(method => method.path))].sort()
    const configuredPaths = Object.keys(configured).sort()
    const unlisted = paths.filter(apiPath => !(apiPath in configured))
    const stale = configuredPaths.filter(apiPath => !paths.includes(apiPath))
    const targetNames = Object.keys(targets).sort()
    const statuses = new Set([
        "desktop",
        "fallback",
        "firefox",
        "firefoxDesktop",
        "native",
        "unavailable",
    ])
    const invalid = configuredPaths.filter(apiPath => {
        const entry = configured[apiPath]
        return (
            !entry ||
            (entry.api !== undefined && typeof entry.api !== "string") ||
            !entry.targets ||
            Object.keys(entry.targets).sort().join() !== targetNames.join() ||
            Object.values(entry.targets).some(status => !statuses.has(status))
        )
    })
    if (unlisted.length || stale.length || invalid.length) {
        const details = []
        if (unlisted.length) details.push(`unlisted: ${unlisted.join(", ")}`)
        if (stale.length) details.push(`stale: ${stale.join(", ")}`)
        if (invalid.length) details.push(`invalid: ${invalid.join(", ")}`)
        throw new Error(`Compat policy drift (${details.join("; ")})`)
    }
    const configuredExports = (mappingPolicy.compat_exports || []).slice().sort()
    const actualExports = [...new Set(exportedFunctions)].sort()
    if (configuredExports.join() !== actualExports.join())
        throw new Error(
            `Compat export policy drift (expected: ${actualExports.join(", ")})`,
        )

    const capabilityNames = {
        desktop: "desktopApis",
        firefox: "firefoxApis",
        firefoxDesktop: "firefoxDesktopApis",
    }
    const missingCapabilities = configuredPaths.filter(apiPath =>
        Object.values(configured[apiPath].targets).some(status => {
            const capability = capabilityNames[status]
            return capability && !capabilities.get(capability)?.has(apiPath)
        }),
    )
    if (missingCapabilities.length)
        throw new Error(
            `Compat capability drift (missing: ${missingCapabilities.join(", ")})`,
        )

    const edits = []
    for (const method of methods) {
        const entry = configured[method.path]
        const status = entry.targets[target]
        if (status === "native") {
            const configuredPath = entry.api || method.path
            const apiPath = applyAlias(
                configuredPath,
                mappingPolicy.aliases || {},
            )
            const support = supportForPath(
                api,
                apiPath,
                target,
                minimum,
                apiPath === configuredPath ? undefined : configuredPath,
            )
            if (!support.mapped || support.state !== "supported") {
                throw new Error(
                    `Compat policy marks ${method.path} native on ${target}, but ${configuredPath} is ${support.state || "unmapped"}`,
                )
            }
        } else if (status !== "fallback") {
            edits.push({ start: method.node.getFullStart(), end: method.node.end })
        }
    }
    let text = source
    for (const edit of edits.sort((left, right) => right.start - left.start)) {
        text = text.slice(0, edit.start) + text.slice(edit.end)
    }
    return text
}

function emitCompatDeclaration(outputRoot) {
    const projectPath = path.resolve(__dirname, "../tsconfig.json")
    const project = ts.readConfigFile(projectPath, ts.sys.readFile)
    if (project.error)
        throw new Error(
            ts.flattenDiagnosticMessageText(project.error.messageText, "\n"),
        )
    const root = path.dirname(projectPath)
    const config = ts.parseJsonConfigFileContent(
        project.config,
        ts.sys,
        root,
        {
            declaration: true,
            emitDeclarationOnly: true,
            noEmitOnError: false,
            outDir: outputRoot,
            rootDir: path.join(root, "src"),
        },
        projectPath,
    )
    const program = ts.createProgram(config.fileNames, config.options)
    const compatPath = path.join(root, "src/lib/compat.ts")
    const sourceFile = program.getSourceFile(compatPath)
    const diagnostics = ts.getPreEmitDiagnostics(program, sourceFile)
    if (diagnostics.length)
        throw new Error(
            `Failed to type-check the compatibility declaration:\n${diagnostics
                .map(diagnostic =>
                    ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n"),
                )
                .join("\n")}`,
        )
    let declaration
    program.emit(
        sourceFile,
        (fileName, text) => {
            if (
                path.basename(fileName) === "compat.d.ts" &&
                path.basename(path.dirname(fileName)) === "lib"
            )
                declaration = text
        },
        undefined,
        true,
    )
    if (!declaration)
        throw new Error("Failed to emit the compatibility declaration")
    return declaration
}

function generateAll(options = {}) {
    const sourcePath = options.sourcePath || declarationPath
    const outputRoot =
        options.outputRoot ||
        path.resolve(__dirname, "../generated/browser-types")
    const source = fs.readFileSync(sourcePath, "utf8")
    validateNestedDefaults(source, policy)
    const compatDeclaration = emitCompatDeclaration(outputRoot)
    const reports = {}
    const outputs = {}
    for (const target of Object.keys(targets).sort()) {
        const result = transformDeclarations(
            source,
            target,
            targets[target].minimumVersion,
            bcd.webextensions.api,
            policy,
        )
        result.report.advisory = targets[target].advisory === true
        outputs[target] = {
            ...result,
            compat: transformCompatDeclaration(
                compatDeclaration,
                target,
                targets[target].minimumVersion,
                bcd.webextensions.api,
                policy,
            ),
        }
        reports[target] = result.report
    }
    validateNestedPolicy(reports, policy)
    validateNestedDefaults(source, policy, reports)
    fs.rmSync(path.join(outputRoot, "compat"), { recursive: true, force: true })
    for (const [target, result] of Object.entries(outputs)) {
        const directory = path.join(outputRoot, target)
        fs.mkdirSync(directory, { recursive: true })
        fs.writeFileSync(path.join(directory, "index.d.ts"), result.text)
        fs.writeFileSync(
            path.join(directory, "report.json"),
            JSON.stringify(result.report, null, 2) + "\n",
        )
        const compatDirectory = path.join(directory, "compat")
        fs.mkdirSync(compatDirectory, { recursive: true })
        fs.writeFileSync(
            path.join(compatDirectory, "index.d.ts"),
            result.compat,
        )
    }
    return reports
}

if (require.main === module) {
    const reports = generateAll()
    for (const target of Object.keys(reports).sort()) {
        const counts = reports[target].counts
        console.log(
            `${target}${targets[target].advisory ? " (advisory)" : ""}: ${counts.retainedPaths} retained, ${counts.removedPaths} removed`,
        )
    }
}

module.exports = {
    applyAlias,
    collectRuntimeDeclarations,
    decidePaths,
    emitCompatDeclaration,
    generateAll,
    supportState,
    transformCompatDeclaration,
    transformDeclarations,
    validateNestedDefaults,
    validateNestedPolicy,
}
