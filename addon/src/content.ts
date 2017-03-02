interface Message {
    command: string
    string: string
    number: number
}

function historyHandler(message: Message) {
    window.history.go(message.number)
}

function scrollHandler(message: Message) {
    window.scrollBy(0, message.number)
}

function evalHandler(message: Message) {
    eval(message.string)
}

function messageHandler(message: Message) {
    switch(message.command) {
        case "history":
            historyHandler(message)
            break
        case "scroll":
            scrollHandler(message)
            break
        case "eval":
            evalHandler(message)
            break
    }
}

function sleep(ms: Number) {
    return new Promise(function (resolve) {
        setTimeout(resolve, ms)
    })
}

class AsyncQueue {

    private _queue: Array<Event>

    constructor() {
        this._queue = []
    }
            
    push(v: Event) {
        this._queue.push(v)
    }

    pop() {
        let _queue = this._queue
        new Promise(async (resolve) => {
            while (true) {
                let value = _queue.pop()
                if (value != undefined) {
                    resolve(value)
                    break
                }
                else {
                    await sleep(10)
                }
            }
        })
    }
}

let parserController = async function () {
    while (true) {
        let someevent = await queue.pop()
        await sleep(15)
        console.log(someevent)
    }
}

function keyHandler(ev: KeyboardEvent) {
    queue.push(ev)
}

let queue = new AsyncQueue()
document.addEventListener("keydown", keyHandler)
parserController()

console.log("Tridactyl content script loaded, boss!")
