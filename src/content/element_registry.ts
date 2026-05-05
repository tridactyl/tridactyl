import { getSelector } from "@src/lib/dom"

// If order matters (eg insert cmdline before mode indicator?), use an array
// const tridactylElementRegistry = new Set()

// In fact, let's use an array
let tridactylElementRegistry = []

let tridactylSetupFnRegistry = []

export function registerElement(element: Element) {
    if (tridactylElementRegistry.indexOf(element) === -1) {
        tridactylElementRegistry.push(element)
    }
}

export function unregisterElement(element: Element) {
    tridactylElementRegistry = tridactylElementRegistry.filter(e => e !== element)
}

export function appendAndRegisterElement(element: Element, parentElement: Element) {
    parentElement.appendChild(element)
    registerElement(element)
}

// Call Element.remove on each element, but keep them in the registry
export function removeAllElements() {
    tridactylElementRegistry.forEach(element => {
        element.remove()
    })
}

// Call appendChild on each element's target parent, attempting to match its old parent
export function appendAllElements() {
    tridactylElementRegistry.forEach(element => {
        const originalParent = element.parentElement
        let newParent
        if (originalParent) {
            const parentSelector = getSelector(element.parentElement)
            newParent = document.querySelector(parentSelector)
        } else {
            newParent = document.documentElement
        }
        newParent.appendChild(element)
    })
}

export function registerSetupFunction(fn: any) {
    if (tridactylSetupFnRegistry.indexOf(fn) === -1) {
        tridactylSetupFnRegistry.push(fn)
    }
}

// Separate functions which only need to be run if the original document was lost
let restorativeFunctions = []
export function registerRestoreFunction(fn: any) {
    if (restorativeFunctions.indexOf(fn) === -1) {
        restorativeFunctions.push(fn)
    }
}

export function unregisterSetupFunction(fn: any) {
    tridactylSetupFnRegistry = tridactylSetupFnRegistry.filter(f => f !== fn)
}

// Should usually only be called once, but may be called again (due to document.open / document.write)
// merges "restorativeFunctions" into the fn registry so that they will be run on any subsequent calls
export function callAllSetupFunctions() {
    tridactylSetupFnRegistry.forEach(fn => fn())
    restorativeFunctions.forEach(fn => tridactylSetupFnRegistry.push(fn))
    restorativeFunctions = []
}

