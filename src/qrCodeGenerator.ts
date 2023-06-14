import QRCode from "../vendor/qrcode/qrcode"
import * as Logging from "@src/lib/logging"
import {browserBg, activeTab} from "./lib/webext"

const logger = new Logging.Logger("qrcode-display")

function displayError() {
    const errorDisplay: HTMLDivElement =
        document.querySelector("div#error-display")
    errorDisplay.classList.remove("hide")
    errorDisplay.innerHTML = "Unable to generate QR code for the given data"
}

function setUpPage() {
    const imgElem: HTMLImageElement =
        document.querySelector("div#qr-canvas img")

    const url = new URL(window.location.href)
    let data = url.searchParams.get("data")
    const timeout = parseInt(url.searchParams.get("timeout"), 10)
    data = decodeURIComponent(atob(data))
    const opts = {
        scale: 10,
    }

    QRCode.toDataURL(data, opts, (error: Error, url: string) => {
        if (error) {
            logger.error(error)
            displayError()
        } else {
            imgElem.src = url
        }
    })

    if (timeout && timeout > 0) {
        setTimeout(function() {
            activeTab().then((tabInfo) => {
                browserBg.tabs.remove(tabInfo.id)
            }).catch((error) => {
                logger.error("Unable to close tab" + error)
            })
        }, timeout * 1000)
    }
}

window.addEventListener("load", setUpPage)
