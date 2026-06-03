import * as SELF from "@src/whichkey_frame"
import Logger from "@src/lib/logging"
import * as Messaging from "@src/lib/messaging"

const logger = new Logger("whichkey_frame")

const bindsEl = window.document.getElementById("whichkey-binds")

const TOKEN_RE = /^(<[^>]+>|.)(.*)/s

/** Split keyStr into [first n tokens, remainder] */
function splitAtPrefix(keyStr: string, n: number): [string, string] {
    let remaining = keyStr
    let pressed = ""
    for (let i = 0; i < n; i++) {
        const m = TOKEN_RE.exec(remaining)
        if (!m) return [pressed, remaining]
        pressed += m[1]
        remaining = m[2]
    }
    return [pressed, remaining]
}

function buildColumn(
    matches: [string, string][],
    prefixLen: number,
    forceEllipsis = false,
): HTMLDivElement {
    const col = document.createElement("div")
    col.className = "wk-column"
    for (const [keyStr, exstr] of matches) {
        const row = document.createElement("div")
        row.className = "wk-row"

        const keySpan = document.createElement("span")
        keySpan.className = "wk-key"

        const [pressed, remaining] = splitAtPrefix(keyStr, prefixLen)
        if (pressed) {
            const pressedSpan = document.createElement("span")
            pressedSpan.className = "wk-key-prefix"
            pressedSpan.textContent = forceEllipsis ? "…" : pressed
            keySpan.appendChild(pressedSpan)
        }
        if (remaining) {
            const nextSpan = document.createElement("span")
            nextSpan.className = "wk-key-next"
            nextSpan.textContent = remaining
            keySpan.appendChild(nextSpan)
        }

        const arrowSpan = document.createElement("span")
        arrowSpan.className = "wk-arrow"
        arrowSpan.textContent = "→"

        const exstrSpan = document.createElement("span")
        exstrSpan.className = "wk-exstr"
        exstrSpan.textContent = exstr

        row.appendChild(keySpan)
        row.appendChild(arrowSpan)
        row.appendChild(exstrSpan)
        col.appendChild(row)
    }
    return col
}

/** Render matches split across `columnCount` columns, then report actual height back to content */
export function update(
    matches: [string, string][],
    columnCount: number,
    generation: number,
    prefixLen: number,
    location = "left",
) {
    if (!bindsEl) {
        logger.error("whichkey_frame: DOM elements not found")
        return
    }
    document.body.dataset.location = location

    while (bindsEl.firstChild) bindsEl.removeChild(bindsEl.firstChild)

    const cols = Math.max(1, columnCount)
    const rowsPerCol = Math.ceil(matches.length / cols)
    for (let i = 0; i < cols; i++) {
        const slice = matches.slice(i * rowsPerCol, (i + 1) * rowsPerCol)
        if (slice.length > 0) bindsEl.appendChild(buildColumn(slice, prefixLen))
    }

    const measure = () => {
        const firstRow = bindsEl.querySelector<HTMLElement>(".wk-row")
        const rowHeightPx = firstRow
            ? parseFloat(getComputedStyle(firstRow).height)
            : 20
        const bindsStyle = getComputedStyle(bindsEl)
        const bindsBorderPx =
            (parseFloat(bindsStyle.borderTopWidth) || 0) +
            (parseFloat(bindsStyle.borderBottomWidth) || 0)
        const firstCol = bindsEl.querySelector<HTMLElement>(".wk-column")
        const colStyle = firstCol ? getComputedStyle(firstCol) : null
        const colPaddingPx = colStyle
            ? (parseFloat(colStyle.paddingTop) || 0) +
              (parseFloat(colStyle.paddingBottom) || 0)
            : 0
        const naturalHeight = Math.ceil(
            rowsPerCol * rowHeightPx + bindsBorderPx + colPaddingPx,
        )
        Messaging.messageOwnTab("whichkey_content", "resize", [
            naturalHeight,
            generation,
        ])
    }

    // After layout: if any key cell overflows its track, rebuild with forced … prefix
    // so the next step is always visible, then measure in a second rAF.
    requestAnimationFrame(() => {
        if (prefixLen > 0) {
            const overflowing = Array.from(
                bindsEl.querySelectorAll<HTMLElement>(".wk-key"),
            ).some(k => k.scrollWidth > k.offsetWidth)
            if (overflowing) {
                while (bindsEl.firstChild)
                    bindsEl.removeChild(bindsEl.firstChild)
                for (let i = 0; i < cols; i++) {
                    const slice = matches.slice(
                        i * rowsPerCol,
                        (i + 1) * rowsPerCol,
                    )
                    if (slice.length > 0)
                        bindsEl.appendChild(buildColumn(slice, prefixLen, true))
                }
                requestAnimationFrame(measure)
                return
            }
        }
        measure()
    })
}

Messaging.addListener("whichkey_frame", Messaging.attributeCaller(SELF))
