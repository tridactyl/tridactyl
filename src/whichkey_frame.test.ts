import * as Messaging from "@src/lib/messaging"

jest.mock("@src/lib/messaging", () => ({
    messageOwnTab: jest.fn().mockResolvedValue(undefined),
    addListener: jest.fn(),
    attributeCaller: jest.fn().mockReturnValue({}),
}))

jest.mock("@src/lib/logging", () => {
    return jest
        .fn()
        .mockImplementation(() => ({ debug: jest.fn(), error: jest.fn() }))
})

const mockMessaging = Messaging as jest.Mocked<typeof Messaging>

// Set up DOM element expected by whichkey_frame.ts before module import
document.body.innerHTML = `
  <div id="whichkey-binds"></div>
`

// Mock rAF to fire synchronously so height-measurement callback runs in tests
let rafCallback: FrameRequestCallback | null = null
global.requestAnimationFrame = (cb: FrameRequestCallback) => {
    rafCallback = cb
    return 1
}
function flushRaf() {
    if (rafCallback) {
        rafCallback(0)
        rafCallback = null
    }
}

import * as wkf from "@src/whichkey_frame"

function matches(n: number): [string, string][] {
    return Array.from({ length: n }, (_, i) => [
        String.fromCharCode(97 + (i % 26)),
        `cmd${i}`,
    ])
}

beforeEach(() => {
    jest.clearAllMocks()
    rafCallback = null
    document.getElementById("whichkey-binds")!.innerHTML = ""
})

describe("update() column building", () => {
    it("creates correct number of columns", () => {
        wkf.update(matches(6), 2, 1, 0)
        const binds = document.getElementById("whichkey-binds")!
        expect(binds.querySelectorAll(".wk-column").length).toBe(2)
    })

    it("single column when columnCount is 1", () => {
        wkf.update(matches(4), 1, 1, 0)
        const binds = document.getElementById("whichkey-binds")!
        expect(binds.querySelectorAll(".wk-column").length).toBe(1)
    })

    it("splits matches evenly across columns", () => {
        wkf.update(matches(6), 2, 1, 0)
        const binds = document.getElementById("whichkey-binds")!
        const cols = binds.querySelectorAll(".wk-column")
        expect(cols[0].querySelectorAll(".wk-row").length).toBe(3)
        expect(cols[1].querySelectorAll(".wk-row").length).toBe(3)
    })

    it("each row has key and exstr spans", () => {
        wkf.update(matches(2), 1, 1, 0)
        const binds = document.getElementById("whichkey-binds")!
        const rows = binds.querySelectorAll(".wk-row")
        expect(rows.length).toBe(2)
        expect(rows[0].querySelector(".wk-key")).not.toBeNull()
        expect(rows[0].querySelector(".wk-exstr")).not.toBeNull()
    })

    it("no prefix: full keyStr gets wk-key-next", () => {
        wkf.update([["gf", "tabfirst"]], 1, 1, 0)
        expect(document.querySelector(".wk-key-prefix")).toBeNull()
        expect(document.querySelector(".wk-key-next")!.textContent).toBe("gf")
    })

    it("with prefix: pressed part gets wk-key-prefix, rest gets wk-key-next", () => {
        wkf.update([["gf", "tabfirst"]], 1, 1, 1)
        expect(document.querySelector(".wk-key-prefix")!.textContent).toBe("g")
        expect(document.querySelector(".wk-key-next")!.textContent).toBe("f")
    })

    it("angle-bracket token counted as one prefix token", () => {
        wkf.update([["<C-g>f", "cmd"]], 1, 1, 1)
        expect(document.querySelector(".wk-key-prefix")!.textContent).toBe(
            "<C-g>",
        )
        expect(document.querySelector(".wk-key-next")!.textContent).toBe("f")
    })

    it("clears previous binds on re-render", () => {
        wkf.update(matches(4), 1, 1, 0)
        wkf.update(matches(2), 1, 2, 0)
        const binds = document.getElementById("whichkey-binds")!
        expect(binds.querySelectorAll(".wk-row").length).toBe(2)
    })
})

describe("update() height measurement", () => {
    it("calls messageOwnTab with generation after rAF", () => {
        jest.spyOn(window, "getComputedStyle").mockReturnValue({
            height: "20px",
        } as CSSStyleDeclaration)
        wkf.update(matches(3), 1, 42, 0)
        flushRaf()
        expect(mockMessaging.messageOwnTab).toHaveBeenCalledWith(
            "whichkey_content",
            "resize",
            expect.arrayContaining([42]),
        )
    })

    it("reports natural height = rows * rowHeight", () => {
        jest.spyOn(window, "getComputedStyle").mockReturnValue({
            height: "20px",
        } as CSSStyleDeclaration)
        wkf.update(matches(5), 1, 7, 0)
        flushRaf()
        const args = (mockMessaging.messageOwnTab as jest.Mock).mock
            .calls[0][2] as [number, number]
        expect(args[0]).toBe(100)
        expect(args[1]).toBe(7)
    })
})
