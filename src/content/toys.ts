/**
 * Copyright (c) 2018 by Ebram Marzouk (https://codepen.io/P3R0/pen/MwgoKv)
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

export function jack_in() {
    // chinese characters - taken from the unicode charset
    const chinese =
        "田由甲申甴电甶男甸甹町画甼甽甾甿畀畁畂畃畄畅畆畇畈畉畊畋界畍畎畏畐畑".split(
            "",
        )
    const colour = "#0F0" // green text
    rain(makeBlock(), chinese, colour)
}

export function music() {
    // music characters - taken from the unicode charset
    const music = "𝄞𝄟𝄰𝅘𝅥𝅮𝅘𝅥𝅯𝅘𝅥𝅰𝄽".split("")
    const colour = "#ead115"
    rain(makeBlock(), music, colour)
}

export function no_mouse() {
    makeBlock()
}

function makeBlock() {
    const overlaydiv = document.createElement("div")
    overlaydiv.className = "_tridactyl_no_mouse_"
    overlaydiv.style.position = "fixed"
    overlaydiv.style.display = "block"
    overlaydiv.style.width = String(window.innerWidth)
    overlaydiv.style.height = String(document.documentElement.scrollHeight)
    overlaydiv.style.top = "0px"
    overlaydiv.style.bottom = "0px"
    overlaydiv.style.left = "0px"
    overlaydiv.style.right = "0px"
    overlaydiv.style.zIndex = "1000"
    overlaydiv.style.opacity = "0.5"
    overlaydiv.style.cursor = "none"
    document.body.appendChild(overlaydiv)
    return overlaydiv
}

export function drawable() {
    eraser = false
    make_drawable(makeBlock())
}

const clickX = []
const clickY = []
const clickDrag = []
let ink

let eraser = false
export function eraser_toggle() {
    eraser = !eraser
}

function addClick(x, y, dragging) {
    clickX.push(x)
    clickY.push(y)
    clickDrag.push(dragging)
}

function redraw(context) {
    if (eraser) {
        context.globalCompositeOperation = "destination-out"
        context.lineWidth = 18
    } else {
        context.globalCompositeOperation = "source-over"
        context.lineWidth = 3
    }
    context.strokeStyle = "#000000"
    context.lineJoin = "miter"
    for (let i = 0; i < clickX.length; i++) {
        context.beginPath()
        if (clickDrag[i] && i) {
            context.moveTo(clickX[i - 1], clickY[i - 1])
        } else {
            context.moveTo(clickX[i] - 1, clickY[i])
        }
        context.lineTo(clickX[i], clickY[i])
        context.closePath()
        context.stroke()
    }
}
function handleDown(e, context) {
    ink = true
    addClick(e.pageX, e.pageY, false)
    redraw(context)
    e.preventDefault()
    e.stopPropagation()
}
function handleUp(e) {
    ink = false
    clickX.length = 0
    clickY.length = 0
    clickDrag.length = 0
    e.stopPropagation()
    e.preventDefault()
}
function handleMove(e, context) {
    if (ink) {
        addClick(e.pageX, e.pageY, true)
        redraw(context)
    }
    e.preventDefault()
    e.stopPropagation()
}
function make_drawable(overlaydiv) {
    overlaydiv.style.position = "absolute"
    overlaydiv.style.opacity = "0.8"
    const c = document.createElement("canvas")
    overlaydiv.appendChild(c)
    const context = c.getContext("2d")
    // making the canvas full screen
    c.height = document.documentElement.scrollHeight
    c.width = window.innerWidth * 0.98 // workaround to fix canvas overflow
    c.style.touchAction = "none" // for pen tablet to work
    c.addEventListener("pointerdown", e => handleDown(e, context))
    c.addEventListener("pointerup", handleUp)
    c.addEventListener("pointermove", e => handleMove(e, context))
}

export function removeBlock() {
    Array.from(document.getElementsByClassName("_tridactyl_no_mouse_")).forEach(
        (el: Element & { intid?: number | null }) => {
            if (typeof el.intid === "number") {
                clearInterval(el.intid)
            }
            el.remove()
        },
    )
}

export const snow = () => rain(makeBlock(), ["❄"], "#FFF", 0.15)

function rain(overlaydiv, characters: string[], colour, darkening = 0.05) {
    const c = document.createElement("canvas")
    overlaydiv.appendChild(c)
    const ctx = c.getContext("2d")

    // making the canvas full screen
    c.height = window.innerHeight
    c.width = window.innerWidth

    // converting the string into an array of single characters

    const font_size = 10
    const columns = c.width / font_size // number of columns for the rain
    // an array of drops - one per column
    const drops = []
    // x below is the x coordinate
    // 1 = y co-ordinate of the drop(same for every drop initially)
    for (let x = 0; x < columns; x++) drops[x] = 1

    // drawing the characters
    function draw() {
        // Black BG for the canvas
        // translucent BG to show trail
        ctx.fillStyle = "rgba(0, 0, 0, " + darkening + ")"
        ctx.fillRect(0, 0, c.width, c.height)

        ctx.fillStyle = colour
        ctx.font = font_size + "px arial"
        // looping over drops
        for (let i = 0; i < drops.length; i++) {
            // a random chinese character to print
            const text =
                characters[Math.floor(Math.random() * characters.length)]
            // x = i*font_size, y = value of drops[i]*font_size
            ctx.fillText(text, i * font_size, drops[i] * font_size)

            // sending the drop back to the top randomly after it has crossed the screen
            // adding a randomness to the reset to make the drops scattered on the Y axis
            if (drops[i] * font_size > c.height && Math.random() > 0.975)
                drops[i] = 0

            // incrementing Y coordinate
            drops[i]++
        }
    }
    overlaydiv.intid = setInterval(draw, 33)
}
