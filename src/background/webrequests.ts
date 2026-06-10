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

export const registerWebRequestAutocmd = async (
    requestEvent: string,
    pattern: string,
    func: string,
) => {
    // I'm being lazy - strictly the functions map strings to void | blocking responses
    // eslint-disable-next-line @typescript-eslint/ban-types
    const listener = eval(func) as Function

    if (!LISTENERS[requestEvent]) LISTENERS[requestEvent] = {}

    await browser.webRequest["on" + requestEvent].addListener(
        listener,
        { urls: [pattern] },
        requestEventExpraInfoSpecMap[requestEvent],
    )
    const oldListener = LISTENERS[requestEvent][pattern];
    // Add the new listener to our list if everything was successful
    LISTENERS[requestEvent][pattern] = listener

    // Remove any previously registered autocmd for the same pattern
    if (oldListener) {
        await browser.webRequest["on" + requestEvent].removeListener(
            oldListener
        )
    }
}

export const unregisterWebRequestAutocmd = async (requestEvent, pattern) => {
    if (LISTENERS[requestEvent] && LISTENERS[requestEvent][pattern]) {
        await browser.webRequest["on" + requestEvent].removeListener(
            LISTENERS[requestEvent][pattern],
        )
    }
}
