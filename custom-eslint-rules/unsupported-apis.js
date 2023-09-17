const bcd = require('@mdn/browser-compat-data');
const api = bcd.webextensions.api;
const supported_browsers = ["firefox", "chrome"];

function detectBrowserUsage(context, node) {
    let localApi = api;
    let fullName = [];
    while (node.type == "MemberExpression" && node.property.name in localApi) {
        const n = node;
        node = node.parent;
        fullName.push(n.property.name);
        localApi = localApi[n.property.name];
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
                    }
                });
            }
        }
    }
}

module.exports = {
    meta: {
        messages: {
            unsupportedApis: "Unsupported on '{{ name }}'"
        }
    },
    create(context) {
        return {
            'MemberExpression[object.name="browser"]': (n) => detectBrowserUsage(context, n),
        };
    }
};
