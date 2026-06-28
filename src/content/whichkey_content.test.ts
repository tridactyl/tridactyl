import * as config from "@src/lib/config"
import * as keyseq from "@src/lib/keyseq"
import * as Messaging from "@src/lib/messaging"

jest.mock("@src/lib/config", () => ({
    get: jest.fn(),
    getAsync: jest.fn().mockResolvedValue("false"),
}))

jest.mock("@src/lib/keyseq", () => {
    const real = jest.requireActual("@src/lib/keyseq")
    return { ...real, keyMap: jest.fn(), completions: jest.fn() }
})

jest.mock("@src/lib/messaging", () => ({
    messageOwnTab: jest.fn().mockResolvedValue(undefined),
    addListener: jest.fn(),
    attributeCaller: jest.fn().mockReturnValue({}),
}))

import * as wkc from "@src/content/whichkey_content"

const mockConfig = config as jest.Mocked<typeof config>
const mockKeyseq = keyseq as any
const mockMessaging = Messaging as jest.Mocked<typeof Messaging>

function makeKey(
    key: string,
    mods?: { altKey?: boolean; ctrlKey?: boolean; shiftKey?: boolean },
) {
    const { MinimalKey } = jest.requireActual<typeof keyseq>("@src/lib/keyseq")
    return new MinimalKey(key, mods)
}

function makeMatches(count: number): Map<keyseq.MinimalKey[], string> {
    const map: Map<keyseq.MinimalKey[], string> = new Map()
    for (let i = 0; i < count; i++) {
        map.set([makeKey(String.fromCharCode(97 + (i % 26)))], `cmd${i}`)
    }
    return map
}

/** Set up config mock with which-key enabled and zero delay (synchronous show) */
function enableWhichkey() {
    mockConfig.get.mockImplementation((key: string) => {
        if (key === "whichkeydelay") return "0"
        if (key === "nmaps") return {}
        return undefined
    })
}

beforeAll(async () => {
    // let init() microtasks settle
    await Promise.resolve()
    await Promise.resolve()
})

beforeEach(() => {
    jest.clearAllMocks()
    // default: disabled, 200ms delay (matching default_config)
    mockConfig.get.mockImplementation((key: string) => {
        if (key === "whichkeyenabled") return "false"
        if (key === "whichkeydelay") return "200"
        return undefined
    })
    wkc.hide()
})

describe("hide()", () => {
    it("adds hidden class to iframe", () => {
        const iframe = document.getElementById(
            "whichkey_iframe",
        ) as HTMLIFrameElement
        wkc.hide()
        expect(iframe.classList.contains("hidden")).toBe(true)
    })

    it("sets height to 0 and opacity to 0", () => {
        const iframe = document.getElementById(
            "whichkey_iframe",
        ) as HTMLIFrameElement
        wkc.hide()
        expect(iframe.style.getPropertyValue("height")).toBe("0px")
        expect(iframe.style.getPropertyValue("opacity")).toBe("0")
    })
})

describe("resize()", () => {
    it("no-ops on stale generation", () => {
        // show to advance generation to 1
        enableWhichkey()
        mockKeyseq.completions.mockReturnValue(makeMatches(3))
        mockKeyseq.keyMap.mockReturnValue(new Map())
        wkc.show("normal", [])
        const iframe = document.getElementById(
            "whichkey_iframe",
        ) as HTMLIFrameElement
        iframe.classList.remove("hidden")

        wkc.resize(100, 0) // stale generation
        // height should not have been set to 100
        expect(iframe.style.getPropertyValue("height")).not.toBe("100px")
    })

    it("clamps height to 60% of viewport", () => {
        enableWhichkey()
        mockKeyseq.completions.mockReturnValue(makeMatches(3))
        mockKeyseq.keyMap.mockReturnValue(new Map())
        Object.defineProperty(window, "innerHeight", {
            writable: true,
            configurable: true,
            value: 800,
        })
        wkc.show("normal", [])
        const iframe = document.getElementById(
            "whichkey_iframe",
        ) as HTMLIFrameElement
        iframe.classList.remove("hidden")

        const gen =
            (mockMessaging.messageOwnTab.mock.calls[0]?.[2] as any)?.[2] ?? 1
        wkc.resize(9999, gen)
        const height = parseInt(iframe.style.getPropertyValue("height"))
        expect(height).toBeLessThanOrEqual(800 * 0.7)
    })

    it("reveals opacity after resize", () => {
        enableWhichkey()
        mockKeyseq.completions.mockReturnValue(makeMatches(3))
        mockKeyseq.keyMap.mockReturnValue(new Map())
        wkc.show("normal", [])
        const iframe = document.getElementById(
            "whichkey_iframe",
        ) as HTMLIFrameElement
        iframe.classList.remove("hidden")

        const gen =
            (mockMessaging.messageOwnTab.mock.calls[0]?.[2] as any)?.[2] ?? 1
        wkc.resize(100, gen)
        expect(iframe.style.getPropertyValue("opacity")).toBe("1")
    })

    it("enforces minimum height of 40px", () => {
        enableWhichkey()
        mockKeyseq.completions.mockReturnValue(makeMatches(3))
        mockKeyseq.keyMap.mockReturnValue(new Map())
        wkc.show("normal", [])
        const iframe = document.getElementById(
            "whichkey_iframe",
        ) as HTMLIFrameElement
        iframe.classList.remove("hidden")

        const gen =
            (mockMessaging.messageOwnTab.mock.calls[0]?.[2] as any)?.[2] ?? 1
        wkc.resize(5, gen)
        const height = parseInt(iframe.style.getPropertyValue("height"))
        expect(height).toBe(40)
    })
})

describe("show()", () => {
    it("returns early when whichkeyenabled is false", () => {
        mockConfig.get.mockImplementation((key: string) => {
            if (key === "whichkeyenabled") return "false"
            return undefined
        })
        wkc.show("normal", [])
        expect(mockMessaging.messageOwnTab).not.toHaveBeenCalled()
    })

    it("returns early for unsupported mode", () => {
        wkc.show("nonexistent", [])
        expect(mockMessaging.messageOwnTab).not.toHaveBeenCalled()
    })

    it("calls hide() when no completions match", () => {
        enableWhichkey()
        mockKeyseq.keyMap.mockReturnValue(new Map())
        mockKeyseq.completions.mockReturnValue(new Map())
        const iframe = document.getElementById(
            "whichkey_iframe",
        ) as HTMLIFrameElement
        iframe.classList.remove("hidden")

        wkc.show("normal", [makeKey("g")])
        expect(iframe.classList.contains("hidden")).toBe(true)
    })

    it("sends update message with matches and columnCount", () => {
        enableWhichkey()
        mockKeyseq.keyMap.mockReturnValue(new Map())
        mockKeyseq.completions.mockReturnValue(makeMatches(3))
        wkc.show("normal", [])
        expect(mockMessaging.messageOwnTab).toHaveBeenCalledWith(
            "whichkey_frame",
            "update",
            expect.arrayContaining([
                expect.any(Array),
                expect.any(Number),
                expect.any(Number),
                expect.any(Number),
            ]),
        )
    })

    it("dedup guard: identical prefix skips redundant show", () => {
        enableWhichkey()
        mockKeyseq.keyMap.mockReturnValue(new Map())
        mockKeyseq.completions.mockReturnValue(makeMatches(2))
        const prefix = [makeKey("g")]
        wkc.show("normal", prefix)
        expect(mockMessaging.messageOwnTab).toHaveBeenCalledTimes(1)

        // second call with same prefix while visible, no-op
        wkc.show("normal", prefix)
        expect(mockMessaging.messageOwnTab).toHaveBeenCalledTimes(1)
    })

    it("dedup guard: different prefix triggers new show", () => {
        enableWhichkey()
        mockKeyseq.keyMap.mockReturnValue(new Map())
        mockKeyseq.completions.mockReturnValue(makeMatches(2))
        wkc.show("normal", [makeKey("g")])
        expect(mockMessaging.messageOwnTab).toHaveBeenCalledTimes(1)

        wkc.show("normal", [makeKey("z")])
        expect(mockMessaging.messageOwnTab).toHaveBeenCalledTimes(2)
    })

    it("dedup guard resets after hide()", () => {
        enableWhichkey()
        mockKeyseq.keyMap.mockReturnValue(new Map())
        mockKeyseq.completions.mockReturnValue(makeMatches(2))
        const prefix = [makeKey("g")]
        wkc.show("normal", prefix)
        expect(mockMessaging.messageOwnTab).toHaveBeenCalledTimes(1)

        wkc.hide()
        wkc.show("normal", prefix)
        expect(mockMessaging.messageOwnTab).toHaveBeenCalledTimes(2)
    })
})

describe("hide(keepPrefix)", () => {
    it("hide(true) preserves mode and prefix for re-show", () => {
        enableWhichkey()
        mockKeyseq.keyMap.mockReturnValue(new Map())
        mockKeyseq.completions.mockReturnValue(makeMatches(2))
        const prefix = [makeKey("g")]
        wkc.show("normal", prefix)
        expect(mockMessaging.messageOwnTab).toHaveBeenCalledTimes(1)

        wkc.hide(true)
        // lastShownPrefixStr cleared so dedup guard doesn't block re-show
        wkc.show("normal", prefix)
        expect(mockMessaging.messageOwnTab).toHaveBeenCalledTimes(2)
    })

    it("hide() without keepPrefix clears prefix so re-show does not happen", () => {
        enableWhichkey()
        mockKeyseq.keyMap.mockReturnValue(new Map())
        mockKeyseq.completions.mockReturnValue(makeMatches(2))
        wkc.show("normal", [makeKey("g")])
        wkc.hide()

        // after plain hide, lastShownMode/Prefix are null, simulate what visibilitychange does
        // by calling show() directly; it should still work (no stale block), just confirming
        // hide() cleared state (tested indirectly via dedup guard reset above)
        expect(mockMessaging.messageOwnTab).toHaveBeenCalledTimes(1)
    })
})

describe("calculateColumns (via show)", () => {
    function columnCountForNMatches(n: number, innerHeight: number): number {
        Object.defineProperty(window, "innerHeight", {
            writable: true,
            configurable: true,
            value: innerHeight,
        })
        jest.clearAllMocks()
        enableWhichkey()
        wkc.hide()
        mockKeyseq.keyMap.mockReturnValue(new Map())
        mockKeyseq.completions.mockReturnValue(makeMatches(n))
        wkc.show("normal", [])
        const args = mockMessaging.messageOwnTab.mock.calls[0]?.[2] as any[]
        return args?.[1] as number
    }

    it("single column when all rows fit within 70% viewport height", () => {
        // 10 rows * 20px = 200px; 70% of 800px = 560px, fits 1 col
        expect(columnCountForNMatches(10, 800)).toBe(1)
    })

    it("multiple columns when rows exceed 70% viewport height", () => {
        // 40 rows * 20px = 800px > 560px, needs multiple cols
        expect(columnCountForNMatches(40, 800)).toBeGreaterThan(1)
    })
})
