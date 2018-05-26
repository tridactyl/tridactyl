import * as Native from "./native_background"

type scrollingDirection = "scrollLeft" | "scrollTop"

// Stores elements that are currently being horizontally scrolled
let horizontallyScrolling = new Map()
// Stores elements that are currently being vertically scrolled
let verticallyScrolling = new Map()

async function getSmooth() {
    return await Native.getConfElsePrefElseDefault(
        "smoothscroll",
        "general.smoothScroll",
        "false",
    )
}
async function getDuration() {
    return await Native.getConfElsePrefElseDefault(
        "scrollduration",
        "general.smoothScroll.lines.durationMinMs",
        250,
    )
}

class ScrollingData {
    // time at which the scrolling animation started
    startTime: number
    // Starting position of the element. This shouldn't ever change.
    startPos: number
    // Where the element should end up. This can change if .scroll() is called
    // while a scrolling animation is already running
    endPos: number
    // Whether the element is being scrolled
    scrolling = false
    // Duration of the scrolling animation
    duration = 0

    /** elem: The element that should be scrolled
     *  pos: "scrollLeft" if the element should be scrolled on the horizontal axis, "scrollTop" otherwise
     */
    constructor(
        private elem: HTMLElement,
        private pos: scrollingDirection = "scrollTop",
    ) {}

    /** Computes where the element should be.
     *  This changes depending on how long ago the first scrolling attempt was
     *  made.
     *  It might be useful to make this function more configurable by making it
     *  accept an argument instead of using performance.now()
     */
    getStep() {
        if (this.startTime === undefined) {
            this.startTime = performance.now()
        }
        let elapsed = performance.now() - this.startTime

        // If the animation should be done, return the position the element should have
        if (elapsed > this.duration || this.elem[this.pos] == this.endPos)
            return this.endPos

        let result = (this.endPos - this.startPos) * elapsed / this.duration
        if (result >= 1 || result <= -1) return this.startPos + result
        return this.elem[this.pos] + (this.startPos < this.endPos ? 1 : -1)
    }

    /** Updates the position of this.elem */
    scrollStep() {
        let val = this.elem[this.pos]
        this.elem[this.pos] = this.getStep()
        return val != this.elem[this.pos]
    }

    /** Calls this.scrollStep() until the element has been completely scrolled
     * or the scrolling animation is complete */
    scheduleStep() {
        // If scrollStep() scrolled the element, reschedule a step
        // Otherwise, register that the element stopped scrolling
        window.requestAnimationFrame(
            () =>
                this.scrollStep()
                    ? this.scheduleStep()
                    : (this.scrolling = false),
        )
    }

    scroll(distance: number, duration: number) {
        this.startTime = performance.now()
        this.startPos = this.elem[this.pos]
        this.endPos = this.elem[this.pos] + distance
        this.duration = duration
        // If we're already scrolling we don't need to try to scroll
        if (this.scrolling) return true
        this.scrolling = this.scrollStep()
        if (this.scrolling)
            // If the element can be scrolled, scroll until animation completion
            this.scheduleStep()
        return this.scrolling
    }
}

/** Tries to scroll e by x and y pixel, make the smooth scrolling animation
 *  last duration milliseconds
 */
export async function scroll(
    x: number,
    y: number,
    e: HTMLElement,
    duration: number = undefined,
) {
    let smooth = await getSmooth()
    if (smooth == "false") duration = 0
    else if (duration === undefined) duration = await getDuration()

    let result = false
    if (x != 0) {
        // Don't create a new ScrollingData object if the element is already
        // being scrolled
        let scrollData = horizontallyScrolling.get(e)
        if (!scrollData || !scrollData.scrolling)
            scrollData = new ScrollingData(e, "scrollLeft")
        horizontallyScrolling.set(e, scrollData)
        result = result || scrollData.scroll(x, duration)
    }
    if (y != 0) {
        let scrollData = verticallyScrolling.get(e)
        if (!scrollData || !scrollData.scrolling)
            scrollData = new ScrollingData(e, "scrollTop")
        verticallyScrolling.set(e, scrollData)
        result = result || scrollData.scroll(y, duration)
    }
    return result
}

/** Tries to find a node which can be scrolled either x pixels to the right or
 *  y pixels down among the Elements in {nodes} and children of these Elements.
 *
 *  This function used to be recursive but isn't anymore due to various
 *  attempts at optimizing the function in order to reduce GC pressure.
 */
export async function recursiveScroll(
    x: number,
    y: number,
    nodes: Element[],
    duration: number = undefined,
) {
    // Determine whether to smoothscroll or not
    let smooth = await getSmooth()
    if (smooth == "false") duration = 0
    else if (duration === undefined) duration = await getDuration()

    let index = 0
    let now = performance.now()
    do {
        let node = nodes[index++] as any
        // Save the node's position
        if (await scroll(x, y, node, duration)) return
        // Otherwise, add its children to the nodes that could be scrolled
        nodes = nodes.concat(Array.from(node.children))
        if (node.contentDocument) nodes.push(node.contentDocument.body)
    } while (index < nodes.length)
}
