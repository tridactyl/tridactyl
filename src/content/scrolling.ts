import * as config from "@src/lib/config"

type scrollingDirection = "scrollLeft" | "scrollTop"

const opts = { smooth: null, duration: null }
async function getSmooth() {
    if (opts.smooth === null)
        opts.smooth = await config.getAsync("smoothscroll")
    return opts.smooth
}
async function getDuration() {
    if (opts.duration === null)
        opts.duration = await config.getAsync("scrollduration")
    return opts.duration
}

config.addChangeListener("smoothscroll", (prev, cur) => (opts.smooth = cur))
config.addChangeListener("scrollduration", (prev, cur) => (opts.duration = cur))

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
        private elem: Node,
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
        const elapsed = performance.now() - this.startTime

        // If the animation should be done, return the position the element should have
        if (elapsed >= this.duration || this.elem[this.pos] === this.endPos)
            return this.endPos

        let result = this.startPos + (((this.endPos - this.startPos) * elapsed) / this.duration)
        if (this.startPos < this.endPos) {
            // We need to ceil() because only highdpi screens have a decimal this.elem[this.pos]
            result = Math.ceil(result)
            // We *have* to make progress, otherwise we'll think the element can't be scrolled
            if (result == this.elem[this.pos])
                result += 1
        } else {
            result = Math.floor(result)
            if (result == this.elem[this.pos])
                result -= 1
        }
        return result
    }

    /** Updates the position of this.elem, returns true if the element has been scrolled, false otherwise. */
    scrollStep() {
        const val = this.elem[this.pos]
        this.elem[this.pos] = this.getStep()
        return val !== this.elem[this.pos]
    }

    /** Calls this.scrollStep() until the element has been completely scrolled
     * or the scrolling animation is complete */
    scheduleStep() {
        // If scrollStep() scrolled the element, reschedule a step
        // Otherwise, register that the element stopped scrolling
        window.requestAnimationFrame(() =>
            this.scrollStep() ? this.scheduleStep() : (this.scrolling = false),
        )
    }

    scroll(distance: number, duration: number) {
        this.duration = duration
        this.startTime = performance.now()
        this.startPos = this.elem[this.pos]
        // If we're already scrolling, update the endPos based off the current endPos
        if (this.scrolling) {
            this.endPos = this.endPos + distance
            return true
        }
        this.endPos = this.startPos + distance
        if ("style" in this.elem)
            (this.elem as any).style.scrollBehavior = "unset"
        this.scrolling = this.scrollStep()
        if (this.scrolling)
            // If the element can be scrolled, scroll until animation completion
            this.scheduleStep()
        return this.scrolling
    }
}

// Stores elements that are currently being horizontally scrolled
const horizontallyScrolling = new Map<Node, ScrollingData>()
// Stores elements that are currently being vertically scrolled
const verticallyScrolling = new Map<Node, ScrollingData>()

/** Tries to scroll e by x and y pixel, make the smooth scrolling animation
 *  last duration milliseconds
 */
export async function scroll(
    x: number = 0,
    y: number = 0,
    e: Node,
    duration?: number,
) {
    const smooth = await getSmooth()
    if (smooth === "false") duration = 0
    else if (duration === undefined) duration = await getDuration()

    let result = false
    if (x !== 0) {
        // Don't create a new ScrollingData object if the element is already
        // being scrolled
        let scrollData = horizontallyScrolling.get(e)
        if (!scrollData) {
            scrollData = new ScrollingData(e, "scrollLeft")
            horizontallyScrolling.set(e, scrollData)
        }
        result = result || scrollData.scroll(x, duration)
    }
    if (y !== 0) {
        let scrollData = verticallyScrolling.get(e)
        if (!scrollData) {
            scrollData = new ScrollingData(e, "scrollTop")
            verticallyScrolling.set(e, scrollData)
        }
        result = result || scrollData.scroll(y, duration)
    }
    return result
}

let lastRecursiveScrolled = null
let lastX = 0
let lastY = 0
/** Tries to find a node which can be scrolled either x pixels to the right or
 *  y pixels down among the Elements in {nodes} and children of these Elements.
 *
 *  This function used to be recursive but isn't anymore due to various
 *  attempts at optimizing the function in order to reduce GC pressure.
 */
export async function recursiveScroll(
    x: number,
    y: number,
    node?: Element,
    stopAt?: Element,
) {
    let startingFromCached = false
    if (!node) {
        const sameSignX = x < 0 === lastX < 0
        const sameSignY = y < 0 === lastY < 0
        if (lastRecursiveScrolled && sameSignX && sameSignY) {
            // We're scrolling in the same direction as the previous time so
            // let's try to pick up from where we left
            startingFromCached = true
            node = lastRecursiveScrolled
        } else {
            node = document.documentElement
        }
    }
    let treeWalker = document.createTreeWalker(node, NodeFilter.SHOW_ELEMENT)
    do {
        // If node is undefined or if we managed to scroll it
        if (
            (await scroll(x, y, treeWalker.currentNode)) ||
            ((treeWalker.currentNode as any).contentDocument &&
                !(treeWalker.currentNode as any).src.startsWith("moz-extension://") &&
                (await recursiveScroll(
                    x,
                    y,
                    (treeWalker.currentNode as any).contentDocument.body,
                )))
        ) {
            // Cache the node for next time and stop trying to scroll
            lastRecursiveScrolled = treeWalker.currentNode
            lastX = x
            lastY = y
            return true
        }
    } while (treeWalker.nextNode())
    // If we started from a cached node, we could try the nodes before it
    if (startingFromCached) {
        treeWalker = document.createTreeWalker(node, NodeFilter.SHOW_ELEMENT)
        do {
            // If node is undefined or if we managed to scroll it
            if (await scroll(x, y, treeWalker.currentNode)) {
                // Cache the node for next time and stop trying to scroll
                lastRecursiveScrolled = treeWalker.currentNode
                lastX = x
                lastY = y
                return true
            }
        } while (treeWalker.previousNode())
    }
    lastRecursiveScrolled = null
    lastX = x
    lastY = y
    return false
}
