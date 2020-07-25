import * as R from "ramda"

// Synchronous version of runtime.getPlatformInfo()
// Not as exhaustive as the real thing
// Will return undefined if it can't work it out
export function getPlatformOs(): browser.runtime.PlatformOs {
    const platform = navigator.platform
    const mapping = {
        "win":  "Windows",
        "openbsd": "BSD",
        "mac": "Mac",
        "linux": "Linux",
    }
    return R.keys(R.filter(x=>platform.includes(x), mapping))[0] as keyof typeof mapping
}
