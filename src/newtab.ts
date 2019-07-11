// This file is only included in newtab.html, after content.js has been loaded

import * as Messaging from "@src/lib/messaging"
import * as config from "@src/lib/config"

// Periodically nag people about updates.
window.addEventListener("load", _ => {
    if (config.get("update", "nag") === true) {
        Messaging.message("controller_background", "acceptExCmd", ["updatecheck auto_polite"])
    }
})
