export const RESPONSE_MARKER = "__tridactyl_rpc_response"

export function sendMessageResponse(sendResponse, response) {
    void Promise.resolve(response).then(
        value => sendResponse({ [RESPONSE_MARKER]: true, value }),
        error =>
            sendResponse({
                [RESPONSE_MARKER]: true,
                error: {
                    message: error?.message || String(error),
                    name: error?.name,
                    stack: error?.stack,
                },
            }),
    )
    return true
}

export async function unwrapMessageResponse(responsePromise: Promise<any>) {
    const response = await responsePromise
    if (!response?.[RESPONSE_MARKER]) return response
    if (response.error) {
        const error = new Error(response.error.message)
        error.name = response.error.name || error.name
        error.stack = response.error.stack || error.stack
        throw error
    }
    return response.value
}
