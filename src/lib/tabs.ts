import * as Messaging from "@src/lib/messaging"

const allTabs = -1;

// tabProxy accumulates all accesses to a tab's properties and then, when the
// value of said properties are read, set or called, sends a request to the
// corresponding tab to either retrieve or set the value.
const tabProxy = (tabId, props) => new Proxy(()=>undefined, {
    get(target, p, receiver) {
        if (p === Symbol.toPrimitive) {
            const prop = `tabs[${tabId}].${props.join(".")}`;
            throw `${prop} cannot be used directly - use ${prop}.get() instead`;
        }
        return tabProxy(tabId, props.concat(p));
    },
    apply(target, thisArg, argArray) {
        const last = props[props.length -1];
        switch (last) {
            case "get":
            case "set":
            case "apply":
                break;
            default:
                const call = `tabs[${tabId}].${props.join(".")}`;
                const args = `(${argArray.join(", ")})`;
                throw `${call}${args} cannot be called directly, use ${call}.apply${args} instead`;
        };
        let msg = Messaging.messageAllTabs;
        if (tabId !== allTabs) {
            msg = (...args) => Messaging.messageTab(tabId, ...args);
        }
        return msg("omniscient_content", last, [{target: props.slice(0, props.length - 1), value: argArray}]);
    },
})

export const tabsProxy = new Proxy(Object.create(null), {
    get(target, p, receiver) {
        let id = Number(p);
        if (typeof id === "number" && isFinite(id)) {
            // We're accessing tabs[i] - meaning that we should return a proxy
            // for a single tab
            return tabProxy(id, [])
        }
        throw "Foreground tabs proxy needs to be indexed by tab ID.";
        // Ideally, if p is a string, we should construct a proxy for all
        // existing tabs. This unfortunately does not seem to work:
        // Messaging.messageAllTab seems to return an array of undefined when
        // running e.g. `tabs.document.title`.
        // return tabProxy(allTabs, []);
    }
})
