# A simple observable-like class

**This doesn't work.** Async functions (any function that contains the `await` keyword) return a promise immediately and do their work sometime in the future. I think the principle is still doable, without polling, but not like this.

This class guarantees that the subscriber is called once per push and that each call of the subscriber completes before the next call. This indirection is required because subscriber() may be paused by an `await` - if subscriber was called directly by e.g. onKeyEvent(subscriber), then more than one subscriber call can be threaded concurrently if subscriber ever pauses execution... Controlling flow like this must have been a real pain in the arse before `await`...

    class Sequential
        constructor: (subscriber) ->
            this._subscriber = subscriber
            this._is_consuming = false

        push: (v) ->
            this._queue.push(v)
            if not this._is_consuming
                this.consume()

        consume: ->
            this._is_consuming = true
            for v in this._queue
                this._subscriber(v)
            this._is_consuming = false

    sleep = (ms) ->
        new Promise((resolve) ->
            setTimeout(resolve, ms))

    class ParserController
        constructor: ->
            this._state = ""

        pushEvent: (ev) =>
            await sleep(1000)
            this._state += ev.key
            console.log(this._state)

    parserController = new ParserController()

    queue = new Sequential(parserController.pushEvent)
    document.addEventListener(queue.push)

## This time with generators: simpler and maybe more idiomatic

I was very confused about how the `await` shims could work, so I had TypeScript output me one: turns out they're built on generators! That's a much more natural mechanism for our original use case.

For now, we'll just keep parserController synchronous and use this generator syntax.

    ParserController = ->
        # Loop forever.
        loop
            # Receive keys until the mode parser tells us to handle an ex_str.
            loop
                keys = []
                ex_str = ""

                # Pause execution until someone calls parserController.next(<somevalue>)
                keys.push(yield)

                # Mode parsers can return an object with either a `keys` or an `ex_str` property.
                
                # If `.keys` exists it is a mapping of keys to continue to append to and resend (the mapping was not terminal, send me these keys again). `.keys` may differ from the passed value.
                # If `.ex_str`, the mapping was terminal: drop all the keys you have now and break to handle the ex_str.
                response = normal_mode_parser(keys)

                if response.keys != undefined
                    keys = response.keys
                else
                    ex_str = response.ex_str
                    break

            # Parse the ex_str into a function and command to run.
            [func, args] = ex_str_parser(ex_str)

            # Execute the ex_str.
            func(args...)
            
    # Create the generator object
    parserController = ParserController()

    # Run the parserController until the first yield.
    parserController.next()

    # parserController.next needs isn't bound to parserController, so needs to be made indirect:
    feeder = (ev) ->
        parserController.next(ev)

    # Feed the parserController events.
    document.addEventListener("keyDown", feeder)

Fun digression: I first encountered the generator/yield syntax in Python2 where it was not asynchronous and only allows data transfer from the yielder to the caller of next(). It took me an embarassingly long time to get my head around the new semantics when I saw it again in python3's async library and the data was moving in both directions.

Don't be like me: grok it now with these helpful links: [mdn](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/function*), [python wiki](https://wiki.python.org/moin/Generators)
