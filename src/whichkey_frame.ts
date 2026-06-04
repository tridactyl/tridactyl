import * as SELF from "@src/whichkey_frame"
import Logger from "@src/lib/logging"
import * as Messaging from "@src/lib/messaging"
import * as Metadata from "@src/.metadata.generated"

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

const excmdsFile = Metadata.everything.getFile("src/excmds.ts")

function commandAcceptsCount(exstr: string): boolean {
    const cmdWord = exstr.trim().split(/\s+/)[0]
    if (!cmdWord) return false
    const sym = excmdsFile?.getFunction(cmdWord)
    if (!sym) return false
    const ft = sym.type as any
    if (ft.kind !== "function" || !Array.isArray(ft.args)) return false
    return ft.args.some(
        (a: any) => a.kind === "number" && a.isQuestion === true,
    )
}

function buildColumn(
    matches: [string, string][],
    prefixLen: number,
): HTMLDivElement {
    const col = document.createElement("div")
    col.className = "wk-column"
    for (const [keyStr, exstr] of matches) {
        const row = document.createElement("div")
        row.className = "wk-row"

        const keySpan = document.createElement("span")
        keySpan.className = "wk-key"

        // Only show the part after the pressed prefix; prefix is in the header.
        const [, remaining] = splitAtPrefix(keyStr, prefixLen)
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
        const cmdWord = exstr.trim().split(/\s+/)[0]
        const doc = cmdWord ? excmdsFile?.getFunction(cmdWord)?.doc : undefined
        if (doc) exstrSpan.title = doc
        exstrSpan.addEventListener("click", () => {
            Messaging.messageOwnTab("whichkey_content", "openHelp", [exstr])
        })

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
    prefixStr = "",
    hasCountPrefix = false,
) {
    if (!bindsEl) {
        logger.error("whichkey_frame: DOM elements not found")
        return
    }
    document.body.dataset.location = location

    if (hasCountPrefix)
        matches = matches.filter(([, exstr]) => commandAcceptsCount(exstr))

    while (bindsEl.firstChild) bindsEl.removeChild(bindsEl.firstChild)

    let headerEl: HTMLElement | null = null
    if (prefixStr) {
        headerEl = document.createElement("div")
        headerEl.className = "wk-header"
        headerEl.textContent = prefixStr
        bindsEl.appendChild(headerEl)
    }

    const columnsEl = document.createElement("div")
    columnsEl.className = "wk-columns"

    const cols = Math.max(1, columnCount)
    const rowsPerCol = Math.ceil(matches.length / cols)
    for (let i = 0; i < cols; i++) {
        const slice = matches.slice(i * rowsPerCol, (i + 1) * rowsPerCol)
        if (slice.length > 0)
            columnsEl.appendChild(buildColumn(slice, prefixLen))
    }
    bindsEl.appendChild(columnsEl)

    requestAnimationFrame(() => {
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
        const headerHeightPx = headerEl ? headerEl.offsetHeight : 0
        const naturalHeight = Math.ceil(
            rowsPerCol * rowHeightPx +
                bindsBorderPx +
                colPaddingPx +
                headerHeightPx,
        )
        // Canvas measureText is layout-independent; unaffected by iframe width constraint.
        // 24 = outer-border(2+2) + margin(6+6) + cushion(8)
        let headerMinWidthPx = 0
        if (headerEl) {
            const cs = getComputedStyle(headerEl)
            const canvas = document.createElement("canvas")
            const ctx = canvas.getContext("2d")
            if (ctx) {
                ctx.font = `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`
                headerMinWidthPx = Math.ceil(
                    24 + ctx.measureText(headerEl.textContent ?? "").width,
                )
            }
        }
        Messaging.messageOwnTab("whichkey_content", "resize", [
            naturalHeight,
            generation,
            headerMinWidthPx,
        ])
    })
}

Messaging.addListener("whichkey_frame", Messaging.attributeCaller(SELF))
