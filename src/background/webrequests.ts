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
// eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
export const LISTENERS: Record<string, Record<string, Function>> = {}

export const registerWebRequestAutocmd = (
    requestEvent: string,
    pattern: string,
    func: string | string[],
) => {
    // I'm being lazy - strictly the functions map strings to void | blocking responses
    // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
    const listeners = [func].flat().map(source => (eval(source) as Function).bind(undefined))
    const listener = details => listeners.reduce((response, listener) => listener(details) ?? response, undefined)

    if (!LISTENERS[requestEvent]) LISTENERS[requestEvent] = {}

    browser.webRequest["on" + requestEvent].addListener(
        listener,
        { urls: [pattern] },
        requestEventExpraInfoSpecMap[requestEvent],
    )
    const oldListener = LISTENERS[requestEvent][pattern];
    // Add the new listener to our list if everything was successful
    LISTENERS[requestEvent][pattern] = listener

    // Remove any previously registered autocmd for the same pattern
    if (oldListener) {
        browser.webRequest["on" + requestEvent].removeListener(
            oldListener
        )
    }
}

export const unregisterWebRequestAutocmd = (requestEvent, pattern) => {
    if (LISTENERS[requestEvent] && LISTENERS[requestEvent][pattern]) {
        browser.webRequest["on" + requestEvent].removeListener(
            LISTENERS[requestEvent][pattern],
        )
    }
}
