# A simple observable-like class

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

    parserController = (ev) ->
        # Do something with event, have to store state somewhere else.
        console.log(ev)

    queue = new Sequential(parserController)
    document.addEventListener(queue.push)

## This time with generators: simpler and maybe more idiomatic

I was very confused about how the `await` shims could work, so I had TypeScript output me one: turns out they're built on generators! That's a much more natural mechanism for our use case:

    ParserController = ->
        loop
            # Pause execution until someone calls parserController.next(<somevalue>)
            ev = yield
            # Do something with the received event.
            
    # Create the generator object
    parserController = ParserController()

    # Run the parserController until the first yield.
    parserController.next()

    # Feed the parserController events.
    document.addEventListener(parserController.next)

Generators exist in several languages, and permit asynchronously returning a value *to* a caller and asynchronously *receiving* values from a caller. 

Fun digression: I first encountered the generator/yield syntax in Python2 where it is not asynchronous and only allows data transfer from the yielder to the caller of next(). It took me an embarassingly long time to get my head around the new semantics when I saw it again in python3's async library and the data was moving in both directions.

Don't be like me: grok it now with these helpful links: [mdn](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/function*), [python wiki](https://wiki.python.org/moin/Generators)
