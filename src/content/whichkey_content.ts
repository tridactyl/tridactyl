import Logger from "@src/lib/logging"
import * as config from "@src/lib/config"
import * as keyseq from "@src/lib/keyseq"
import type { MinimalKey } from "@src/lib/keyseq"
import { splitNumericPrefix } from "@src/lib/keyseq"
import * as Messaging from "@src/lib/messaging"
import { mode2maps } from "@src/lib/binding"

const logger = new Logger("whichkey")

let wk_iframe: HTMLIFrameElement
let showTimer: ReturnType<typeof setTimeout> | null = null
let showGeneration = 0
let lastShownPrefixStr: string | null = null
let lastMultiColumn = false // Tracks whether last show() was multi-column for resize() to restore position
let lastShownMode: string | null = null
let lastShownPrefix: MinimalKey[] = []

function makeIframe() {
    wk_iframe = window.document.createElementNS(
        "http://www.w3.org/1999/xhtml",
        "iframe",
    ) as HTMLIFrameElement
    wk_iframe.className = "cleanslate"
    wk_iframe.setAttribute(
        "src",
        browser.runtime.getURL("static/whichkey.html"),
    )
    wk_iframe.setAttribute("id", "whichkey_iframe")
    wk_iframe.setAttribute("loading", "lazy")
}
makeIframe()

function ensureIframeExists() {
    if (!wk_iframe.isConnected) {
        document.documentElement.appendChild(wk_iframe)
    }
}

function applyPosition(multiColumn = false): string {
    const loc = (config.get("whichkeylocation") as string) ?? "left"
    const offset = (config.get("whichkeyoffset") as string) ?? "8px"
    let width: string
    let left: string
    let bottom: string

    if (multiColumn || loc === "center") {
        width = "100%"
        left = "0"
        bottom = "0"
    } else {
        // left (default)
        width = (config.get("whichkeywidth") as string) ?? "35vw"
        left = offset
        bottom = offset
    }

    wk_iframe.style.cssText = [
        `width: ${width} !important`,
        `left: ${left} !important`,
        `right: auto !important`,
        `bottom: ${bottom} !important`,
    ].join("; ")
    const isCenter = multiColumn || loc === "center"
    wk_iframe.classList.toggle("wk-center", isCenter)
    return isCenter ? "center" : loc
}

// Approximate row height in px
const APPROX_ROW_HEIGHT_PX = 20
const APPROX_HEADER_HEIGHT_PX = 23
const MAX_HEIGHT_FRACTION = 0.7
const MIN_COLUMN_WIDTH_PX = 200

function columnsFor(rowCount: number): number {
    const maxHeightPx = window.innerHeight * MAX_HEIGHT_FRACTION
    const naturalHeight = rowCount * APPROX_ROW_HEIGHT_PX
    if (naturalHeight <= maxHeightPx) return 1
    const rowsPerCol = Math.floor(maxHeightPx / APPROX_ROW_HEIGHT_PX)
    const columnCount = Math.ceil(rowCount / Math.max(1, rowsPerCol))
    const maxColumns = Math.max(
        1,
        Math.floor(window.innerWidth / MIN_COLUMN_WIDTH_PX),
    )
    return Math.min(columnCount, maxColumns)
}

export function show(mode: string, prefix: MinimalKey[]) {
    if (config.get("whichkeyenabled") === "false") return
    if (!mode2maps.has(mode)) return

    const [countKeys, cmdKeys] =
        prefix.length > 0 ? splitNumericPrefix(prefix) : [[], prefix]
    const countStr = countKeys.map(k => k.key).join("")

    let matches: [string, string][]
    try {
        const conf = mode2maps.get(mode)
        if (conf === undefined) return
        const map = keyseq.keyMap(conf)

        // Use only the non-count part of the prefix for completions.
        matches = [...keyseq.completions(cmdKeys, map).entries()]
            .map(
                ([ks, exstr]) =>
                    [
                        ks.map(k => k.toMapstr()).join(""),
                        typeof exstr === "string" ? exstr : String(exstr),
                    ] as [string, string],
            )
            .sort(([a], [b]) => {
                const aSpec = a.startsWith("<")
                const bSpec = b.startsWith("<")
                if (aSpec !== bSpec) return aSpec ? 1 : -1
                return a.localeCompare(b)
            })
    } catch (e) {
        logger.error("whichkey_content show() failed to get completions:", e)
        return
    }

    if (matches.length === 0) {
        hide()
        return
    }

    // Header prefix: each key token separated by » (e.g. "12 » g").
    const prefixTokens = [
        ...(countStr ? [countStr] : []),
        ...cmdKeys.map(k => k.toMapstr()),
    ].filter(Boolean)
    const prefixStr = prefixTokens.join(" » ")

    // Modifier keydowns (e.g. Control before Escape) cause redundant show() calls with the same prefix, skip to avoid reset/resize cycle.
    if (
        wk_iframe &&
        !wk_iframe.classList.contains("hidden") &&
        prefixStr === lastShownPrefixStr
    )
        return

    const delay = parseInt(config.get("whichkeydelay") as string, 10) || 0
    if (showTimer !== null) clearTimeout(showTimer)

    const doShow = () => {
        showTimer = null
        const columnCount = columnsFor(matches.length)
        lastMultiColumn = columnCount > 1
        const gen = ++showGeneration
        lastShownPrefixStr = prefixStr
        lastShownMode = mode
        lastShownPrefix = prefix

        const loc = applyPosition(lastMultiColumn)
        ensureIframeExists()
        wk_iframe.classList.remove("hidden")
        wk_iframe.style.setProperty("opacity", "0", "important") // Keep invisible until resize()
        const rowsInTallestCol = Math.ceil(matches.length / columnCount)
        const estimatedHeight = Math.min(
            rowsInTallestCol * APPROX_ROW_HEIGHT_PX +
                (prefixStr ? APPROX_HEADER_HEIGHT_PX : 0),
            window.innerHeight * MAX_HEIGHT_FRACTION,
        )
        wk_iframe.style.setProperty(
            "height",
            estimatedHeight + "px",
            "important",
        )
        Messaging.messageOwnTab("whichkey_frame", "update", [
            matches,
            columnCount,
            gen,
            cmdKeys.length,
            loc,
            prefixStr,
            countKeys.length > 0,
        ])
    }

    if (delay > 0) {
        showTimer = setTimeout(doShow, delay)
    } else {
        doShow()
    }
}

/** Called by whichkey_frame after it measures its rendered content height */
export function resize(
    contentHeight: number,
    generation: number,
    headerMinWidthPx = 0,
) {
    if (!wk_iframe || wk_iframe.classList.contains("hidden")) return
    if (generation !== showGeneration) return
    const maxHeight = window.innerHeight * MAX_HEIGHT_FRACTION
    const finalHeight = Math.min(Math.max(contentHeight, 40), maxHeight)
    wk_iframe.style.setProperty("height", finalHeight + "px", "important")
    if (headerMinWidthPx > 0) {
        wk_iframe.style.setProperty(
            "min-width",
            headerMinWidthPx + "px",
            "important",
        )
    }
    wk_iframe.style.setProperty("opacity", "1", "important")
    wk_iframe.style.setProperty("pointer-events", "auto", "important")
}

export function hide(keepPrefix = false) {
    lastShownPrefixStr = null
    if (!keepPrefix) {
        lastShownMode = null
        lastShownPrefix = []
    }
    if (showTimer !== null) {
        clearTimeout(showTimer)
        showTimer = null
    }
    if (!wk_iframe) return
    wk_iframe.classList.add("hidden")
    wk_iframe.style.setProperty("height", "0px", "important")
    wk_iframe.style.setProperty("opacity", "0", "important")
    wk_iframe.style.setProperty("pointer-events", "none", "important")
}

async function init() {
    const noiframe = await config.getAsync("noiframe")
    const notridactyl = await config.getAsync("superignore")

    if (
        document.contentType !== "application/xhtml+xml" &&
        document.contentType.includes("xml")
    )
        return
    if (noiframe === "true" || notridactyl === "true") return

    hide()
    applyPosition()
    document.documentElement.appendChild(wk_iframe)
}

init().catch(() => {
    document.addEventListener("DOMContentLoaded", () =>
        setTimeout(() => {
            init().catch(e =>
                logger.error("Couldn't initialise whichkey_iframe!", e),
            )
        }, 0),
    )
})

document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
        hide(true)
    } else if (lastShownMode && lastShownPrefix.length > 0) {
        show(lastShownMode, lastShownPrefix)
    }
})

import * as SELF from "@src/content/whichkey_content"
Messaging.addListener("whichkey_content", Messaging.attributeCaller(SELF))
