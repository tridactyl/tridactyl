import { acceptExCmd, setExCmds } from "@src/lib/controller"

jest.mock("@src/lib/config", () => ({
    get: jest.fn((key: string) => (key === "repeatblacklist" ? [] : {})),
}))
jest.mock("@src/parsers/exmode", () => ({ parser: jest.fn() }))
jest.mock("@src/state", () => ({
    getAsync: jest.fn().mockResolvedValue(undefined),
    setAsync: jest.fn().mockResolvedValue(undefined),
}))
const parser: jest.Mock = jest.requireMock("@src/parsers/exmode").parser

const acceptNativeExCmd = (excmd: string) =>
    (
        acceptExCmd as unknown as (
            excmd: string,
            source: "native",
        ) => Promise<unknown>
    )(excmd, "native")

beforeEach(() => {
    parser.mockReset()
    setExCmds({ "": {} })
})

test("native execution propagates parser errors", async () => {
    const error = new Error("parse failed")
    parser.mockImplementation(() => {
        throw error
    })

    await expect(acceptNativeExCmd("invalid")).rejects.toBe(error)
})

test("native execution propagates command errors", async () => {
    const error = new Error("command failed")
    parser.mockReturnValue([jest.fn().mockRejectedValue(error), []])

    await expect(acceptNativeExCmd("boom")).rejects.toBe(error)
})

test("nested native execution propagates errors", async () => {
    const error = new Error("nested command failed")
    parser
        .mockReturnValueOnce([() => acceptExCmd("nested"), []])
        .mockReturnValueOnce([jest.fn().mockRejectedValue(error), []])

    await expect(acceptNativeExCmd("outer")).rejects.toBe(error)
})

test("overlapping execution does not inherit the native source", async () => {
    let finish!: () => void
    const pending = new Promise<void>(resolve => (finish = resolve))
    parser
        .mockReturnValueOnce([jest.fn().mockReturnValue(pending), []])
        .mockReturnValueOnce([
            jest.fn().mockRejectedValue(new Error("interactive failure")),
            [],
        ])

    const native = acceptNativeExCmd("pending")
    await expect(acceptExCmd("interactive")).resolves.toBeUndefined()
    finish()
    await expect(native).resolves.toBeUndefined()
})

test("interactive execution continues to swallow parser and command errors", async () => {
    parser
        .mockImplementationOnce(() => {
            throw new Error("parse failed")
        })
        .mockReturnValueOnce([
            jest.fn().mockRejectedValue(new Error("command failed")),
            [],
        ])

    await expect(acceptExCmd("invalid", "commandline")).resolves.toBeUndefined()
    await expect(acceptExCmd("boom", "content")).resolves.toBeUndefined()
})
