const bcd = require("@mdn/browser-compat-data")
const api = bcd.webextensions.api

function propertyNameOrValue(n) {
    return n.property.type == "Literal" ? n.property.value : n.property.name
}

function compareVersions(left, right) {
    const versionPattern = /^(≤)?\d+(\.\d+)*$/
    if (!versionPattern.test(String(left)) || !versionPattern.test(String(right)))
        return undefined
    const versionParts = String(left).replace(/^≤/, "").split(".").map(Number)
    const minimumParts = String(right).replace(/^≤/, "").split(".").map(Number)
    const length = Math.max(versionParts.length, minimumParts.length)
    for (let i = 0; i < length; i++) {
        const difference = (versionParts[i] || 0) - (minimumParts[i] || 0)
        if (difference !== 0) return difference
    }
    return 0
}

function supportState(statement, minimumVersion) {
    if (Array.isArray(statement)) {
        const states = statement.map(item => supportState(item, minimumVersion))
        if (states.includes("supported")) return "supported"
        if (states.includes("tooRecent")) return "tooRecent"
        return "unsupported"
    }
    if (
        !statement ||
        typeof statement !== "object" ||
        statement.flags ||
        statement.prefix ||
        statement.alternative_name ||
        statement.partial_implementation
    ) {
        return "unsupported"
    }
    const added = statement.version_added
    if (added === false || added === null || added === undefined)
        return "unsupported"
    if (statement.version_removed) {
        if (minimumVersion === undefined) return "unsupported"
        const removed = compareVersions(statement.version_removed, minimumVersion)
        if (removed === undefined || removed <= 0) return "unsupported"
    }
    if (minimumVersion === undefined) {
        return added === true || compareVersions(added, added) !== undefined
            ? "supported"
            : "unsupported"
    }
    if (added === true) return "supported"
    const comparison = compareVersions(added, minimumVersion)
    if (comparison === undefined) return "unsupported"
    if (String(added).startsWith("≤") && comparison > 0)
        return "unsupported"
    return comparison > 0 ? "tooRecent" : "supported"
}

function detectBrowserUsage(
    context,
    node,
    browser,
    minimumVersion,
    compatibilityApi,
) {
    let localApi = compatibilityApi
    const fullName = []
    while (
        node.type == "MemberExpression" &&
        propertyNameOrValue(node) in localApi
    ) {
        const n = node
        node = node.parent
        const name = propertyNameOrValue(n)
        fullName.push(name)
        localApi = localApi[name]
        if (!localApi.__compat) {
            continue
        }
        const support = localApi.__compat.support || {}
        const state = supportState(support[browser], minimumVersion)
        if (state === "unsupported") {
            context.report({
                node: n,
                messageId: "unsupportedApis",
                data: {
                    name: browser,
                    api: fullName.join("."),
                },
            })
        } else if (state === "tooRecent") {
            context.report({
                node: n,
                messageId: "apiTooRecent",
                data: {
                    api: fullName.join("."),
                    name: browser,
                    version: minimumVersion,
                },
            })
        }
    }
}

function createUnsupportedApis(browser, compatibilityApi = api) {
    return {
        meta: {
            schema: [
                {
                    type: "object",
                    properties: { minimumVersion: { type: "string" } },
                    additionalProperties: false,
                },
            ],
            messages: {
                unsupportedApis: "{{ api }} unsupported on '{{ name }}'",
                apiTooRecent:
                    "{{ api }} is not supported on {{ name }} {{ version }}",
            },
        },
        create(context) {
            const { minimumVersion } = context.options[0] || {}
            const detect = node =>
                detectBrowserUsage(
                    context,
                    node,
                    browser,
                    minimumVersion,
                    compatibilityApi,
                )
            return {
                'MemberExpression[object.name="browser"]': detect,
                'MemberExpression[object.name="browserBg"]': detect,
            }
        },
    }
}

module.exports = createUnsupportedApis
module.exports.supportState = supportState
