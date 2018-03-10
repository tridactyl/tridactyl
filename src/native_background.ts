/** 
 * Background functions for the native messenger interface
 */

/**
 * THe native messenger port that communicates with the native app
 * over stdio
 */
let NM_PORT = null
    
export function connectNM() {

    // if connected, bail and reuse the old port
    if (NM_PORT) {
        console.log("port ok")
        return
    }

    NM_PORT = browser.runtime.connectNative("tridactyl");

    console.log("connected", NM_PORT)

    NM_PORT.onMessage.addListener(handleNMResponse);

    NM_PORT.onDisconnect.addListener((p) => {
        console.log("Disconnected")
        if (p.error) {
            console.log(`Disconnected due to an error: ${p.error.message}`);
        }

        NM_PORT = null
    });
}

function handleNMResponse(response) {
    console.log("Received: " + response);

    switch (response.cmd)
    {
        case "version":
            console.log("Version", response.version)
            break
        case "getconfig":

            if (response.content && !response.error) {
                console.log("Config:", response.content)
            } else {
                console.log("Config error:", response.error)
            }
            break
        case "error":
            console.log("Error in native messenger:", response.error)
            break
        default:
            console.log("Unrecognised reponsed from native messenger")
    }
}


/*
On a click on the browser action, send the app a message.
*/
export function pingNM() {
  console.log("Sending:  ping");
    NM_PORT.postMessage({"cmd": "version"});
}

export function getUserConfig() {
    console.log("Sending user config request")
    NM_PORT.postMessage({"cmd": "getconfig"})
}
