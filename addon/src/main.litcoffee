# main.litcoffee

## Introduction

We're writing everything in CoffeeScript v2: http://coffeescript.org/v2/
You can install it with `npm install --global coffeescript@next`. You need Firefox version 52+ to use the `await` command we are using here.

Functions declared here can be called in the debug window in ff. This is the main background script that can access all of the WebExtension APIs.

## TODO:
This is a todolist
 - get web-ext to run FF dev (~/bin/firefox)
 - adapt vim-coffeescript to work with litcoffee2
   - stop coffeescript vim thing from making newline # in markdown
   - update vim-coffeescript to highlight await keywords, etc.

The following is an attempt at namespacing in CoffeeScript. If we used TypeScript instead we could just use modules, but Olie is squeamish about the syntax (no list comprehensions and too much that can be implied, like `let` and all the damn braces). I sympathise, but the compile time errors are really useful. For now, we'll stick with Coffee.

    tridactyl = {}
    tridactyl.func ?= {}

    tridactyl.func.__init__ = ->

This allows us to use setTab in this file, but requires us to use the entire name outside.

        tridactyl.func.setTab = setTab = (id) ->
            browser.tabs.update(id,{active:true})

        tridactyl.func.tabByIndex = tabByIndex = (index) ->
            browser.tabs.query({}).then((tabs) ->
                desiredTab = (tab for tab in tabs when tab.index == desIndex)[0]
            )

        tridactyl.func.incTab = incTab = (inc) ->
            try
                window = await browser.windows.getCurrent()
                tabs = await browser.tabs.query({windowId:window.id})
                activeTab = (tab for tab in tabs when tab.active)[0]
                desiredIndex = (activeTab.index + inc).mod(tabs.length)
                desiredTab = (tab for tab in tabs when tab.index == desiredIndex)[0]
                setTab(desiredTab.id)
            catch error
                console.log(error)

## First attempt at message parsing wrapper to avoid duplication of code

The following functions all talk to the content.js script to perform functions that need to operate on, e.g., the `window.history` object.

        tridactyl.func.goHistory = goHistory = (n) ->
            sendMessageToActiveTab({command:"history", number:n})

        tridactyl.func.goScroll = goScroll = (n) ->
            sendMessageToActiveTab({command:"scroll",number:n})

        tridactyl.func.sendMessageToActiveTab = sendMessageToActiveTab = (message) ->
            sendMessageToFilteredTabs({active:true},message)

        tridactyl.func.sendMessageToFilteredTabs = sendMessageToFilteredTabs = (filter,message) ->
            filtTabs = await browser.tabs.query(filter)
            browser.tabs.sendMessage(tab.id,message) for tab in filtTabs

        tridactyl.func.doArbitraryCodeInWindow = doArbitraryCodeInWindow = (object, args) ->
            sendMessageToActiveTab({command:"arbitrary",object,args})
            # example: doArbitraryCodeInWindow("scrollBy",[0,100])

## Regex test

Adapted from http://www.dustindiaz.com/autocomplete-fuzzy-matching

        tridactyl.mystrings = mystrings = ["colin", "olie", "jake", "harri"]
        tridactyl.func.matchString = matchString = (input) ->
            search = new RegExp(input.split('').join('\\w*').replace(/\W/, ""), 'i')
            mystrings.filter((string) ->
                if string.match(search)
                    return string
            )

## Finish the Tridactyl namespace and initialise it

    tridactyl.func.__init__()

# Misc helper functions

## Modulus

Modulus that always returns a non-negative number, as mathematicians expect.

In mathematics, mod usually returns the remainder of euclidean division of
two numbers and the remainder is always positive.

In most programming languages, mod can return a negative number and the
return value of mod always matches the sign of one or the other of the
arguments. In JS the built-in % operator's returned value always has the same
sign as the dividend, in python, the divisor.

    Number.prototype.mod = (n) ->
        Math.abs(this % n)

Let the console know we got home safely.

    console.log("Loaded Tridactyl")
