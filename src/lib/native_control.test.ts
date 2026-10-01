import * as Native from "@src/lib/native"

type DispatchExCmd = (excmd: string) => Promise<unknown>
interface NativeControl {
    start(): Promise<void>
    disconnect(reprobe?: boolean): void
    stop(): void
}
const createNativeControlImpl = (
    Native as typeof Native & {
        createNativeControl(options: {
            enabled?: boolean
            dispatchExCmd: DispatchExCmd
        }): NativeControl
    }
).createNativeControl
const controls: NativeControl[] = []
const createNativeControl = (
    options: Parameters<typeof createNativeControlImpl>[0],
) => {
    const control = createNativeControlImpl(options)
    controls.push(control)
    return control
}

type Listener<T extends unknown[]> = (...args: T) => unknown
class FakeEvent<T extends unknown[]> {
    private listeners: Listener<T>[] = []
    addListener = jest.fn((listener: Listener<T>) =>
        this.listeners.push(listener),
    )
    removeListener = jest.fn((listener: Listener<T>) => {
        this.listeners = this.listeners.filter(
            candidate => candidate !== listener,
        )
    })
    emit(...args: T) {
        return this.listeners.map(listener => listener(...args))
    }
}

class FakePort {
    postMessage = jest.fn()
    disconnect = jest.fn()
    onMessage = new FakeEvent<[unknown]>()
    onDisconnect = new FakeEvent<[]>()
}

const sendNativeMessage = jest.fn()
const connectNative = jest.fn()
Object.assign(browser.runtime, { sendNativeMessage, connectNative })
const capableVersion = {
    cmd: "version",
    version: "0.6.0",
    capabilities: ["control-port-v1"],
}

const controlRequest = (
    id = "request-1",
    excmd: unknown = "tabopen example.com",
) => ({
    protocol: 1,
    type: "control.request",
    id,
    operation: "ex",
    command: excmd,
})

async function connectedControl(dispatchExCmd: jest.Mock = jest.fn()) {
    const port = new FakePort()
    sendNativeMessage.mockResolvedValue(capableVersion)
    connectNative.mockReturnValue(port)
    const control = createNativeControl({ enabled: true, dispatchExCmd })
    await control.start()
    port.postMessage.mockClear()
    return { control, dispatchExCmd, port }
}

beforeEach(() => {
    sendNativeMessage.mockReset()
    connectNative.mockReset()
})

afterEach(() => {
    controls.splice(0).forEach(control => control.stop())
    Native.reconnectNativeControls()
    jest.useRealTimers()
})

test("native control is disabled by default", async () => {
    const control = createNativeControl({ dispatchExCmd: jest.fn() })

    await control.start()

    expect(sendNativeMessage).not.toHaveBeenCalled()
    expect(connectNative).not.toHaveBeenCalled()
})

test("an enabled control probes once and leaves legacy messaging unchanged without the capability", async () => {
    const legacyResponse = {
        cmd: "run",
        version: null,
        content: "legacy",
        code: 0,
    }
    sendNativeMessage
        .mockResolvedValueOnce({ cmd: "version", version: "0.5.0" })
        .mockResolvedValueOnce(legacyResponse)
    const control = createNativeControl({
        enabled: true,
        dispatchExCmd: jest.fn(),
    })

    await Promise.all([control.start(), control.start()])
    await control.start()

    expect(sendNativeMessage).toHaveBeenCalledTimes(1)
    expect(sendNativeMessage).toHaveBeenCalledWith("tridactyl", {
        cmd: "version",
    })
    expect(connectNative).not.toHaveBeenCalled()
    await expect(
        Native.sendNativeMsg("run", { command: "printf legacy" }),
    ).resolves.toBe(legacyResponse)
    expect(sendNativeMessage).toHaveBeenLastCalledWith("tridactyl", {
        cmd: "run",
        command: "printf legacy",
    })
})

test("control-port-v1 opens one reusable port and opts in with a v1 hello", async () => {
    const port = new FakePort()
    sendNativeMessage.mockResolvedValue(capableVersion)
    connectNative.mockReturnValue(port)
    const control = createNativeControl({
        enabled: true,
        dispatchExCmd: jest.fn(),
    })

    await Promise.all([control.start(), control.start()])
    await control.start()

    expect(sendNativeMessage).toHaveBeenCalledTimes(1)
    expect(connectNative).toHaveBeenCalledTimes(1)
    expect(connectNative).toHaveBeenCalledWith("tridactyl")
    expect(port.postMessage).toHaveBeenCalledTimes(1)
    expect(port.postMessage).toHaveBeenCalledWith({
        protocol: 1,
        type: "control.handshake",
        enable: true,
    })
})

test("a rejected host handshake disconnects the control port", async () => {
    const port = new FakePort()
    sendNativeMessage.mockResolvedValue(capableVersion)
    connectNative.mockReturnValue(port)
    const control = createNativeControl({
        enabled: true,
        dispatchExCmd: jest.fn(),
    })
    await control.start()

    await Promise.all(
        port.onMessage.emit({
            type: "control.handshake",
            protocol: 1,
            enabled: false,
            error: "could not start the control endpoint",
        }),
    )

    expect(port.disconnect).toHaveBeenCalledTimes(1)
})

test("an excmd request is dispatched and receives a correlated success response", async () => {
    const dispatchExCmd = jest.fn().mockResolvedValue("opened")
    const { port } = await connectedControl(dispatchExCmd)

    await Promise.all(port.onMessage.emit(controlRequest()))

    expect(dispatchExCmd).toHaveBeenCalledTimes(1)
    expect(dispatchExCmd).toHaveBeenCalledWith("tabopen example.com")
    expect(port.postMessage).toHaveBeenCalledWith({
        protocol: 1,
        type: "control.response",
        id: "request-1",
        ok: true,
        result: "opened",
    })
})

test("invalid protocol, method, and params return correlated errors without dispatch", async () => {
    const { dispatchExCmd, port } = await connectedControl()
    const invalid = [
        [
            { ...controlRequest("bad-protocol"), protocol: 2 },
            "unsupported control protocol",
        ],
        [
            { ...controlRequest("bad-method"), operation: "read" },
            "unsupported control operation",
        ],
        [controlRequest("bad-params", 42), "control command must be a string"],
    ] as const

    for (const [request, code] of invalid) {
        await Promise.all(port.onMessage.emit(request))
        expect(port.postMessage).toHaveBeenLastCalledWith({
            protocol: 1,
            type: "control.response",
            id: request.id,
            ok: false,
            error: expect.stringContaining(code),
        })
    }
    expect(dispatchExCmd).not.toHaveBeenCalled()
})

test("command failures become correlated control errors", async () => {
    const dispatchExCmd = jest.fn().mockRejectedValue(new Error("Not an excmd"))
    const { port } = await connectedControl(dispatchExCmd)

    await Promise.all(port.onMessage.emit(controlRequest()))

    expect(port.postMessage).toHaveBeenCalledWith({
        protocol: 1,
        type: "control.response",
        id: "request-1",
        ok: false,
        error: "Not an excmd",
    })
})

test("a duplicate pending request does not execute its command twice", async () => {
    let finish: (result: string) => void
    const pending = new Promise<string>(resolve => (finish = resolve))
    const dispatchExCmd = jest.fn().mockReturnValue(pending)
    const { port } = await connectedControl(dispatchExCmd)
    const request = controlRequest()

    const first = port.onMessage.emit(request)
    await Promise.resolve()
    const duplicate = port.onMessage.emit(request)
    await Promise.resolve()

    expect(dispatchExCmd).toHaveBeenCalledTimes(1)
    finish("opened")
    await Promise.all([...first, ...duplicate])
    expect(dispatchExCmd).toHaveBeenCalledTimes(1)
})

test("a concurrent command is rejected as busy instead of running late", async () => {
    let finish: (result: string) => void
    const pending = new Promise<string>(resolve => (finish = resolve))
    const dispatchExCmd = jest.fn().mockReturnValue(pending)
    const { port } = await connectedControl(dispatchExCmd)

    const first = port.onMessage.emit(controlRequest("first"))
    await Promise.resolve()
    await Promise.all(port.onMessage.emit(controlRequest("second", "reload")))

    expect(dispatchExCmd).toHaveBeenCalledTimes(1)
    expect(port.postMessage).toHaveBeenLastCalledWith({
        protocol: 1,
        type: "control.response",
        id: "second",
        ok: false,
        error: "native control is busy",
    })
    finish("opened")
    await Promise.all(first)
})

test("stopping control prevents later messages from executing", async () => {
    const dispatchExCmd = jest.fn()
    const port = new FakePort()
    sendNativeMessage.mockResolvedValue(capableVersion)
    connectNative.mockReturnValue(port)
    const control = createNativeControl({ enabled: true, dispatchExCmd })
    await control.start()

    control.stop()
    await Promise.all(port.onMessage.emit(controlRequest()))

    expect(dispatchExCmd).not.toHaveBeenCalled()
})

test("non-JSON command results become correlated errors", async () => {
    const cyclic: any = {}
    cyclic.self = cyclic
    const { port } = await connectedControl(jest.fn().mockResolvedValue(cyclic))

    await Promise.all(port.onMessage.emit(controlRequest()))

    expect(port.postMessage).toHaveBeenLastCalledWith({
        protocol: 1,
        type: "control.response",
        id: "request-1",
        ok: false,
        error: "control result is not serializable",
    })
})

test("disconnect clears the port and reconnects once only when requested", async () => {
    jest.useFakeTimers()
    const firstPort = new FakePort()
    const secondPort = new FakePort()
    sendNativeMessage.mockResolvedValue(capableVersion)
    connectNative.mockReturnValueOnce(firstPort).mockReturnValueOnce(secondPort)
    const control = createNativeControl({
        enabled: true,
        dispatchExCmd: jest.fn(),
    })
    await control.start()

    firstPort.onDisconnect.emit()
    jest.runOnlyPendingTimers()
    await Promise.resolve()
    expect(connectNative).toHaveBeenCalledTimes(1)

    await Promise.all([control.start(), control.start()])
    expect(sendNativeMessage).toHaveBeenCalledTimes(1)
    expect(connectNative).toHaveBeenCalledTimes(2)
    expect(secondPort.postMessage).toHaveBeenCalledTimes(1)
})

test("disconnect cancels existing capability-probe callers before reconnecting", async () => {
    let resolveProbe!: (response: typeof capableVersion) => void
    const probe = new Promise<typeof capableVersion>(resolve => {
        resolveProbe = resolve
    })
    const port = new FakePort()
    sendNativeMessage
        .mockReturnValueOnce(probe)
        .mockResolvedValueOnce(capableVersion)
    connectNative.mockReturnValue(port)
    const control = createNativeControl({
        enabled: true,
        dispatchExCmd: jest.fn(),
    })

    const initialStart = control.start()
    const staleWaiter = control.start()
    control.disconnect(true)
    const restarted = control.start()
    resolveProbe(capableVersion)
    await Promise.all([initialStart, staleWaiter, restarted])

    expect(sendNativeMessage).toHaveBeenCalledTimes(2)
    expect(connectNative).toHaveBeenCalledTimes(1)
    expect(port.postMessage).toHaveBeenCalledTimes(1)
})

test("global disconnect suspends controls created while an update runs", async () => {
    Native.disconnectNativeControls()
    const port = new FakePort()
    sendNativeMessage.mockResolvedValue(capableVersion)
    connectNative.mockReturnValue(port)
    const control = createNativeControl({
        enabled: true,
        dispatchExCmd: jest.fn(),
    })

    await control.start()
    expect(sendNativeMessage).not.toHaveBeenCalled()

    Native.reconnectNativeControls()
    await control.start()
    expect(sendNativeMessage).toHaveBeenCalledTimes(1)
    expect(connectNative).toHaveBeenCalledTimes(1)
})

test("reprobing preserves an established control port", async () => {
    const { control, port } = await connectedControl()

    Native.reconnectNativeControls(true)
    await control.start()

    expect(port.disconnect).not.toHaveBeenCalled()
    expect(connectNative).toHaveBeenCalledTimes(1)
})

test("stopping control disconnects the persistent port", async () => {
    const port = new FakePort()
    sendNativeMessage.mockResolvedValue(capableVersion)
    connectNative.mockReturnValue(port)
    const control = createNativeControl({
        enabled: true,
        dispatchExCmd: jest.fn(),
    })
    await control.start()

    control.stop()

    expect(port.disconnect).toHaveBeenCalledTimes(1)
})
