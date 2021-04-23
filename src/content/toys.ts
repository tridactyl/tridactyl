/**
 * Copyright (c) 2018 by Ebram Marzouk (https://codepen.io/P3R0/pen/MwgoKv)
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

let erasor = false;
export function toggle_pen() {
    erasor = !erasor
}

export function drawable() {
    make_drawable(makeBlock())
}
export function jack_in() {
    // chinese characters - taken from the unicode charset
    const chinese = "田由甲申甴电甶男甸甹町画甼甽甾甿畀畁畂畃畄畅畆畇畈畉畊畋界畍畎畏畐畑".split("")
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
    overlaydiv.style.height = String(window.innerHeight)
    overlaydiv.style.top = "0"
    overlaydiv.style.left = "0"
    overlaydiv.style.right = "0"
    overlaydiv.style.bottom = "0"
    overlaydiv.style.zIndex = "1000"
    overlaydiv.style.opacity = "0.5"
    document.body.appendChild(overlaydiv)
    return overlaydiv
}

function make_drawable(overlaydiv){
    const c = document.createElement("canvas")
    overlaydiv.appendChild(c)

    // making the canvas full screen
    c.height = window.innerHeight
    c.width = window.innerWidth

    const state = {
        mousedown: false,
        context: c.getContext("2d"),
        x: 0,
        y: 0}
    c.addEventListener("mousedown", () => state.mousedown = true)
    c.addEventListener("mouseup", () => state.mousedown = false)
    c.addEventListener("mousemove", e => {
        state.x = e.clientX
        state.y = e.clientY
    })
    function draw() {
        window.requestAnimationFrame(() => {
            if(erasor){
                state.context.globalCompositeOperation = "destination-out";
            } else {
                state.context.fillStyle = "black"
            }
            if (state.mousedown) {
                state.context.fillRect(state.x, state.y, 3, 3)
            }
            draw()
        })
    }
    draw()
}

export function removeBlock() {
    Array.from(document.getElementsByClassName("_tridactyl_no_mouse_")).map((el: Element & { intid?: number | null}) => {
        if(typeof el.intid === "number") {
            clearInterval(el.intid)
        }
        el.remove()
    })
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
