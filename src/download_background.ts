/**
 * Background download-related functions
 */

import {getDownloadFilenameForUrl} from "./url_util"

/** Construct an object URL string from a given data URL
 *
 * This is needed because feeding a data URL directly to downloads.download()
 * causes "Error: Access denied for URL"
 *
 * @param dataUrl   the URL to make an object URL from
 * @return          object URL that can be fed to the downloads API
 *
 */
function objectUrlFromDataUrl(dataUrl: URL): string {

    const b64 = dataUrl.pathname.split(",", 2)[1]

    const binaryF = atob(b64)

    const dataArray = new Uint8Array(binaryF.length);

    for(let i = 0, len = binaryF.length; i < len; ++i ) {
        dataArray[i] = binaryF.charCodeAt(i);
    }

    return URL.createObjectURL(new Blob([dataArray]))
}

/** Download a given URL to disk
 *
 * Normal URLs are downloaded normally. Data URLs are handled more carefully
 * as it's not allowed in WebExt land to just call downloads.download() on
 * them
 *
 * @param url       the URL to download
 * @param saveAs    prompt user for a filename
 */
export async function downloadUrl(url: string, saveAs: boolean) {

    const urlToSave = new URL(url)

    let urlToDownload

    if (urlToSave.protocol === "data:") {
        urlToDownload = objectUrlFromDataUrl(urlToSave)
    } else {
        urlToDownload = urlToSave.href
    }

    let fileName = getDownloadFilenameForUrl(urlToSave)

    // Save location limitations:
    //  - download() can't save outside the downloads dir without popping
    //    the Save As dialog
    //  - Even if the dialog is popped, it doesn't seem to be possible to
    //    feed in the dirctory for next time, and FF doesn't remember it
    //    itself (like it does if you right-click-save something)

    let downloadPromise = browser.downloads.download({
        url: urlToDownload,
        filename: fileName,
        saveAs: saveAs
    })

    // TODO: at this point, could give feeback using the promise returned
    // by downloads.download(), needs status bar to show it (#90)
    // By awaiting the promise, we ensure that if it errors, the error will be
    // thrown by this function too.
    await downloadPromise
}

import * as Messaging from "./messaging"

// Get messages from content
Messaging.addListener('download_background', Messaging.attributeCaller({
    downloadUrl,
}))
