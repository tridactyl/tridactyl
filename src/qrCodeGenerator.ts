import QRCode from "../vendor/qrcode"
import * as Logging from "@src/lib/logging"

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
    const anchorElem: HTMLAnchorElement =
        document.querySelector("div#qr-buttons a")
    const downloadButton: HTMLButtonElement = document.querySelector(
        "div#qr-buttons button",
    )

    const url = new URL(window.location.href)
    let data = url.searchParams.get("data")
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
            anchorElem.href = url
        }
    })

    downloadButton.addEventListener("click", function () {
        anchorElem.click()
    })
}

window.addEventListener("load", setUpPage)
