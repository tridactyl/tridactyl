const {
    findVariable,
    getPropertyName,
    getStaticValue,
} = require("@eslint-community/eslint-utils")

const listenerMethods = new Set(["addEventListener", "removeEventListener"])
const keyboardEvent = name => /^key(down|up|press)$/.test(name)
const keyboardHandler = name => /^onkey(down|up|press)$/i.test(name)

module.exports = {
    meta: {
        type: "problem",
        schema: [],
        docs: {
            description: "Require guarded keyboard listeners across Tridactyl.",
        },
        messages: {
            guarded:
                "Wrap keyboard listeners with guarded(...) from @src/lib/keyseq at registration and removal.",
            direct: "Call event listener methods directly so keyboard guards can be checked.",
            attribute:
                "Register keyboard listeners with addEventListener and guarded(...).",
        },
    },
    create(context) {
        const scope = node => context.sourceCode.getScope(node)
        const property = node => getPropertyName(node, scope(node))
        const variable = node => findVariable(scope(node), node)
        const value = node => node && getStaticValue(node, scope(node))
        const report = (node, messageId) => context.report({ node, messageId })

        function isGuarded(node) {
            if (node?.type !== "CallExpression") return false
            const callee = node.callee
            const namespace = callee.type === "MemberExpression"
            if (namespace && property(callee) !== "guarded") return false
            const binding = namespace ? callee.object : callee
            if (binding.type !== "Identifier") return false
            const definition = variable(binding)?.defs[0]
            const specifier = definition?.node
            if (definition?.type === "ImportBinding") {
                return (
                    specifier.parent.source.value === "@src/lib/keyseq" &&
                    (namespace
                        ? specifier.type === "ImportNamespaceSpecifier"
                        : specifier.imported?.name === "guarded")
                )
            }
            // Content scripts load the key module after the extension enable check.
            const init = specifier?.init
            return (
                namespace &&
                definition?.parent?.kind === "const" &&
                specifier.id.type === "Identifier" &&
                init?.type === "AwaitExpression" &&
                init.argument.type === "ImportExpression" &&
                init.argument.source.value === "@src/lib/keyseq"
            )
        }

        function check(callback, node) {
            const constant = value(callback)
            if (constant && constant.value == null) return
            if (!isGuarded(callback)) report(node, "guarded")
        }

        function checkDirect(node) {
            if (
                node.parent.type !== "CallExpression" ||
                node.parent.callee !== node
            )
                report(node, "direct")
        }

        return {
            CallExpression(node) {
                const callee = node.callee
                const name =
                    callee.type === "MemberExpression"
                        ? property(callee)
                        : callee.type === "Identifier" &&
                            !variable(callee)?.defs.length
                          ? callee.name
                          : null
                const eventName = value(node.arguments[0])?.value
                // A dynamic event name can select a keyboard event.
                if (
                    listenerMethods.has(name) &&
                    (typeof eventName !== "string" || keyboardEvent(eventName))
                ) {
                    check(node.arguments[1], node)
                }
                if (name === "setAttribute" && keyboardHandler(eventName)) {
                    report(node, "attribute")
                }
            },
            AssignmentExpression(node) {
                if (
                    node.left.type === "MemberExpression" &&
                    keyboardHandler(property(node.left))
                )
                    check(node.right, node)
            },
            MemberExpression(node) {
                if (listenerMethods.has(property(node))) checkDirect(node)
            },
            Property(node) {
                if (
                    node.parent.type === "ObjectPattern" &&
                    listenerMethods.has(property(node))
                ) {
                    report(node, "direct")
                }
            },
            Identifier(node) {
                if (!listenerMethods.has(node.name)) return
                const binding = variable(node)
                if (
                    binding?.defs.length === 0 &&
                    binding.references.some(
                        reference =>
                            reference.identifier === node && reference.isRead(),
                    )
                ) {
                    checkDirect(node)
                }
            },
        }
    },
}
