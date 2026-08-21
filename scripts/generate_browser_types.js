#!/usr/bin/env node

/** Generate minimum-version WebExtension globals from pinned declarations and BCD. */

const fs = require("fs")
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
    const edits = []
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
        const start = statement.getStart(sourceFile)
        const sourceText = node =>
            source.slice(node.getStart(sourceFile), node.end)
        const replacement =
            source.slice(start, all[0].getStart(sourceFile)) +
            kept.map(entry => sourceText(entry.node)).join(", ") +
            source.slice(all[all.length - 1].end, statement.end)
        edits.push({ start, end: statement.end, text: replacement })
    }
    let text = source
    for (const edit of edits.sort((left, right) => right.start - left.start)) {
        text = text.slice(0, edit.start) + edit.text + text.slice(edit.end)
    }

    const rows = mapping.paths.map(apiPath => ({
        path: apiPath,
        reason: mapping.decisions.get(apiPath).reason,
    }))
    const retained = rows.filter(row => mapping.decisions.get(row.path).keep)
    const removed = rows.filter(row => !mapping.decisions.get(row.path).keep)
    return {
        text: `// Generated for ${target} ${minimum}; do not edit.\n${text}`,
        report: {
            target,
            minimumVersion: minimum,
            counts: {
                runtimeDeclarations: declarations.length,
                runtimePaths: mapping.paths.length,
                mappedPaths: mapping.mapped,
                unmappedPaths: mapping.unmapped.length,
                retainedPaths: retained.length,
                removedPaths: removed.length,
            },
            retained,
            removed,
        },
    }
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
    const directory = path.join(outputRoot, "compat")
    fs.mkdirSync(directory, { recursive: true })
    fs.writeFileSync(path.join(directory, "index.d.ts"), declaration)
}

function generateAll(options = {}) {
    const sourcePath = options.sourcePath || declarationPath
    const outputRoot =
        options.outputRoot ||
        path.resolve(__dirname, "../generated/browser-types")
    const source = fs.readFileSync(sourcePath, "utf8")
    const reports = {}
    for (const target of Object.keys(targets).sort()) {
        const result = transformDeclarations(
            source,
            target,
            targets[target].minimumVersion,
            bcd.webextensions.api,
            policy,
        )
        result.report.advisory = targets[target].advisory === true
        const directory = path.join(outputRoot, target)
        fs.mkdirSync(directory, { recursive: true })
        fs.writeFileSync(path.join(directory, "index.d.ts"), result.text)
        fs.writeFileSync(
            path.join(directory, "report.json"),
            JSON.stringify(result.report, null, 2) + "\n",
        )
        reports[target] = result.report
    }
    emitCompatDeclaration(outputRoot)
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
    transformDeclarations,
}
