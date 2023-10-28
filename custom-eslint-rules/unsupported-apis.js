const bcd = require('@mdn/browser-compat-data');
const api = bcd.webextensions.api;
const supported_browsers = ["firefox", "chrome"];
const minimalSupportedFirefoxVersion = 114;

function propertyNameOrValue(n) {
    return (n.property.type == "Literal" ? n.property.value : n.property.name)
}

function detectBrowserUsage(context, node) {
    let localApi = api;
    let fullName = [];
    while (node.type == "MemberExpression" && propertyNameOrValue(node) in localApi) {
        const n = node;
        node = node.parent;
        let name = propertyNameOrValue(n);
        fullName.push(name);
        localApi = localApi[name];
        if (!localApi.__compat) {
            continue;
        }
        let support = localApi.__compat.support;
        for (let browser of supported_browsers) {
            if (support[browser].version_added === false) {
                context.report({
                    node: n,
                    messageId: "unsupportedApis",
                    data: {
                        name: browser,
                        api: fullName.join("."),
                    }
                });
            } else {
                const version = Number(support[browser].version_added);
                if (!isNaN(version) && version > minimalSupportedFirefoxVersion) {
                    context.report({
                        node: n,
                        messageId: "apiTooRecent",
                        data: {
                            api: fullName.join("."),
                            version: minimalSupportedFirefoxVersion
                        }
                    });
                }
            }
        }
    }
}

module.exports = {
    meta: {
        messages: {
            unsupportedApis: "{{ api }} unsupported on '{{ name }}'",
            apiTooRecent: "{{ api }} is not supported on firefox {{ version }}",
        }
    },
    create(context) {
        return {
            'MemberExpression[object.name="browser"]': (n) => detectBrowserUsage(context, n),
            'MemberExpression[object.name="browserBg"]': (n) => detectBrowserUsage(context, n),
        };
    }
};
