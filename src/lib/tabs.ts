import * as Messaging from "@src/lib/messaging"

const allTabs = -1

const msg = (tabId, ...args) => {
    if (tabId === allTabs) {
        return Messaging.messageAllTabs("omniscient_content", ...args)
    } else {
        return Messaging.messageTab(tabId, "omniscient_content", ...args)
    }
}

// This function is used to generate proxies. We use a function rather than an
// object created through Object.create(null) in order to make our proxy
// callable. As all proxy calls should be handled through the proxy's "apply"
// function, we make ItWouldBeAMistakeToCallThis throw an error, to make bugs
// as obvious as possible.
const ItWouldBeAMistakeToCallThis = () => {
    throw Error("Error, base function ItWouldBeAMistakeToCallThis was called!")
}

// tabProxy accumulates all accesses to a tab's properties and then, when the
// value of said properties are read, set or called, sends a request to the
// corresponding tab to either retrieve or set the value.
const tabProxy = (tabId, props) =>
    new Proxy(ItWouldBeAMistakeToCallThis, {
        get(target, p) {
            if (p === Symbol.toPrimitive) {
                // Symbol.toPrimitive will be accessed when the user attempts
                // to use a content process value without awaiting it first,
                // e.g.:
                //
                // tri.tabs[3].document.title + "!"
                //
                // It is a mistake to do this, so we throw an error - see the
                // if condition checking for "then" for more details.
                throw Error(
                    `TypeError: tabs[${tabId}].${props.join(".")} is a Promise, you need to await its value.`,
                )
            }
            if (p === "then") {
                // Because we can only access content process values by
                // messaging a tab, we can only get values as a promise. We
                // take advantage of this fact to wait until we get an access
                // to a "then" property before fetching anything - this enables
                // rapid traversal of objects instead of having to perform slow
                // back and forths for every property.
                //
                // This works with the "await" keyword too as awaits are turned
                // into calls to "then" by the javascript engine.
                // One drawback of this approach is that properties named
                //
                // "then" in the content process cannot be directly accessed.
                // We consider this an okay trade-off, as there exists an
                // alternative: using tri.tabs[3].eval("x.then") instead.
                const promise = msg(tabId, "get", [
                    { target: props, value: undefined },
                ])
                return promise.then.bind(promise)
            }
            return tabProxy(tabId, props.concat(p))
        },
        set(target, p, value) {
            msg(tabId, "set", [{ target: props.concat(p), value }])
            return true
        },
        apply(target, thisArg, argArray) {
            return msg(tabId, "apply", [{ target: props, value: argArray }])
        },
    })

export const tabsProxy = new Proxy(Object.create(null), {
    get(target, p) {
        const id = Number(p)
        if (typeof id === "number" && isFinite(id)) {
            // We're accessing tabs[i] - meaning that we should return a proxy
            // for a single tab
            return tabProxy(id, [])
        }
        if (typeof p === "string") {
            // If `p` is a string, then we return a proxy with a sentinel value
            // indicating that the request should be sent to all tabs instead.
            return tabProxy(allTabs, [])[p]
        }
        throw new Error(`'tabs' object can only be accessed by a number (e.g. tabs[3]) or a string (e.g. tabs.document or tabs['document']). Type of accessor: "${typeof p}"`)
    },
})
