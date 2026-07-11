const bcd = require("@mdn/browser-compat-data")
const api = bcd.webextensions.api

function propertyNameOrValue(n) {
    return n.property.type == "Literal" ? n.property.value : n.property.name
}

function isVersionNewer(version, minimumVersion) {
    const versionParts = String(version).split(".").map(Number)
    const minimumParts = String(minimumVersion).split(".").map(Number)
    if (versionParts.some(Number.isNaN) || minimumParts.some(Number.isNaN))
        return false
    const length = Math.max(versionParts.length, minimumParts.length)
    for (let i = 0; i < length; i++) {
        const difference = (versionParts[i] || 0) - (minimumParts[i] || 0)
        if (difference !== 0) return difference > 0
    }
    return false
}

function detectBrowserUsage(context, node, browser, minimumVersion) {
    let localApi = api
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
        const support = localApi.__compat.support
        if (support[browser].version_added === false) {
            context.report({
                node: n,
                messageId: "unsupportedApis",
                data: {
                    name: browser,
                    api: fullName.join("."),
                },
            })
        } else {
            const version = support[browser].version_added
            if (
                minimumVersion !== undefined &&
                isVersionNewer(version, minimumVersion)
            ) {
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
}

module.exports = browser => ({
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
            detectBrowserUsage(context, node, browser, minimumVersion)
        return {
            'MemberExpression[object.name="browser"]': detect,
            'MemberExpression[object.name="browserBg"]': detect,
        }
    },
})
