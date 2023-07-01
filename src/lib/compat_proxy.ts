import { message } from "@src/lib/messaging"

const compatProxy = new Proxy(Object.create(null), {
    get(target, api) {
        return new Proxy(
            {},
            {
                get(_, func) {
                    return (...args) => {
                        if (typeof browser[api][func] === 'function') {
                            return browser[api][func](...args)
                        }
                        // return Promise.reject(new Error(`browser.${String(api)}.${String(func)} isn't a function`))
                        // ideally what we want is to use TypeScript's knowledge of browser to create an "empty"
                        // return value of the same type as the function we're trying to call, but I don't know how to do that
                        // if function missing, return an empty object of the same type using TypeScript

                        // return ReturnType<typeof browser[api][func]> // can't use api because it's _any_, let's fix one thing at a time

                        // return new ReturnType<typeof browser.runtime.getURL>() // Error: ReturnType refers to a type
                    }
                },
            },
        )
    },
}) as typeof browser

export default compatProxy
