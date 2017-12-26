export function addurltocsp(response){
    let headers = response["responseHeaders"]
    let cspind = headers.findIndex(header => header.name == "Content-Security-Policy")
    // if it's found
    if (cspind > -1) {
        
        // Split the csp header up so we can manage it individually.
        let csparr = headers[cspind]["value"].split("; ")
        console.log(headers[cspind]["value"])
        
        // Turbo agressive, definitely not secure
        let i = 0;
        for (i = 0; i < csparr.length; i++) {
            if (csparr[i] == "sandbox") {
                csparr.splice(i,1)
            }
            if (csparr[i].indexOf("style-src") != -1) {
                if(csparr[i].indexOf("'self'") != -1) {
                    csparr[i].replace("'self'","'unsafe-inline'")
                } else {
                    csparr[i].concat(" 'unsafe-inline'")
                }
            } else if (csparr[i].indexOf("style-src") > -1) {
                csparr.splice(i,1, "style-src 'unsafe-inline'")
            }
        }

        console.log(csparr)
        headers[cspind]["value"] = csparr.join("; ")
        console.log(headers[cspind]["value"])

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

browser.webRequest.onHeadersReceived.addListener(addurltocsp,{urls:["<all_urls>"], types:["main_frame"]},["blocking","responseHeaders"])
// csp tends to be in method GET and type "main_frame"
