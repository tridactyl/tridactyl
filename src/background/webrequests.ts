export const requestEventExpraInfoSpecMap = {
    AuthRequired: ["blocking", "responseHeaders"],
    BeforeRedirect: ["responseHeaders"],
    BeforeRequest: ["blocking", "requestBody"],
    BeforeSendHeaders: ["blocking", "requestHeaders"],
    Completed: ["responseHeaders"],
    ErrorOccured: [],
    HeadersReceived: ["blocking", "responseHeaders"],
    ResponseStarted: ["responseHeaders"],
    SendHeaders: ["requestHeaders"],
}
export const requestEvents = Object.keys(requestEventExpraInfoSpecMap)

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
        requestEventExpraInfoSpecMap[requestEvent],
    )
}

export const unregisterWebRequestAutocmd = (requestEvent, pattern) =>
    browser.webRequest["on" + requestEvent].removeListener(
        LISTENERS[requestEvent][pattern],
    )
