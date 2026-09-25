import * as R from "ramda"

export function hasBrowserApi(
    browserApi: typeof browser,
    path: string[],
): boolean {
    let value: any = browserApi
    for (const property of path) {
        if (value == null || !(property in Object(value))) return false
        value = value[property]
    }
    return value !== undefined
}

// Synchronous version of runtime.getPlatformInfo()
// Not as exhaustive as the real thing
// Will return undefined if it can't work it out
export function getPlatformOs(): browser.runtime.PlatformOs {
    const platform = navigator.platform
    const mapping = {
        win: "Win",
        openbsd: "BSD",
        mac: "Mac",
        linux: "Linux",
    }
    return R.keys(
        R.filter(x => platform.includes(x), mapping),
    )[0] as keyof typeof mapping
}
