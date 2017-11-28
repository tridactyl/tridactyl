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
}


/*
On a click on the browser action, send the app a message.
*/
export function pingNM() {
  console.log("Sending:  ping");
  NM_PORT.postMessage("ping");
}
