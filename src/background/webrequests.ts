export const requestEvents = [
    "AuthRequired",
    "BeforeRedirect",
    "BeforeRequest",
    "BeforeSendHeaders",
    "Completed",
    "ErrorOccured",
    "HeadersReceived",
    "ResponseStarted",
    "SendHeaders",
]

// I'm being lazy - strictly the functions map strings to void | blocking responses
// eslint-disable-next-line @typescript-eslint/ban-types
export const LISTENERS: Record<string, Record<string, Function>> = {}

export const registerWebRequestAutocmd = (
    requestEvent: string,
    pattern: string,
    func: string,
) => {
    // I'm being lazy - strictly the functions map strings to void | blocking responses
    // eslint-disable-next-line @typescript-eslint/ban-types
    const listener = eval(func) as Function
    if (!LISTENERS[requestEvent]) LISTENERS[requestEvent] = {}
    LISTENERS[requestEvent][pattern] = listener
    return browser.webRequest["on" + requestEvent].addListener(
        listener,
        { urls: [pattern] },
        ["blocking", "requestBody"],
    )
}

export const unregisterWebRequestAutocmd = (requestEvent, pattern) =>
    browser.webRequest["on" + requestEvent].removeListener(
        LISTENERS[requestEvent][pattern],
    )
