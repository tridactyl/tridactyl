export function addurltocsp(response){
    let headers = response["responseHeaders"]
    let cspind = headers.findIndex(header => header.name == "content-security-policy")
    // if it's found
    if (cspind > -1) {
        // sledgehammer approach: delete it
        headers[cspind]["value"] = "script-src moz: 'self'"
        // headers[cspind]["value"] = headers[cspind]["value"].replace(
        //     "script-src","script-src moz:").replace(
        //     "default-src","default-src moz:")
        //
        //     Hard coded doesn't work. Missing something.
        // headers[cspind]["value"] = "style-src 'self'; report-uri https://sentry.mafiasi.de/api/15/csp-report/?sentry_key=30c7c96fda184c3981f2ee5aa7cf8fa9; default-src moz: 'self'; script-src moz: 'self' sentry.mafiasi.de 'nonce-GQTbfotsa2WChjMo' 'nonce-SnTfBGzkDF5ABVyG' 'nonce-04f00A0OQnOBQv5Q'; img-src 'self' data:"
    }
    // min version FF57
    // headers is an array of objects with name, value
    // name: content-security-policy
    // example value: "style-src 'self'; report-uri https://sentry.mafiasi.de/api/15/csp-report/?sentry_key=30c7c96fda184c3981f2ee5aa7cf8fa9; default-src 'self'; script-src 'self' sentry.mafiasi.de 'nonce-GQTbfotsa2WChjMo' 'nonce-SnTfBGzkDF5ABVyG' 'nonce-04f00A0OQnOBQv5Q'; img-src 'self' data:"
    
    // want to add ourselves to list of allowed scripts
    
    // can be async and return promise - check whether that helps

    // not very typescripty - this is a blockingResponse containing httpHeaders
    return {responseHeaders: headers}
}

browser.webRequest.onHeadersReceived.addListener(addurltocsp,{urls:["<all_urls>"], types:["main_frame"]},["responseHeaders","blocking"])
// csp tends to be in method GET and type "main_frame"
