# main.litcoffee

## Introduction 

We're writing everything in CoffeeScript v2: http://coffeescript.org/v2/
You can install it with `npm install --global coffeescript@next`. You need Firefox version 52+ to use the `await` command we are using here.

Functions declared here can be called in the debug window in ff. This is the main
background script that can access all of the WebExtension APIs.

## TODO: 
This is a todolist
 - get web-ext to run FF dev (~/bin/firefox)
 - stop coffeescript vim thing from making newline # in markdown
 - update vim-coffeescript to highlight await keywords, etc.

    handleBrowserAction = () ->
        # .then takes a function that consumes at least one argument.  this is an
        # example of a named function, but anonymous functions are fine, too.
        x = await browser.tabs.query({active: true}).then(console.log)


# Example of a listener. Presumably we wouldn't use the browserAction button in
# the real thing.

    browser.browserAction.onClicked.addListener(handleBrowserAction)

    incTab = (inc) ->
        try
            window = await browser.windows.getCurrent()
            tabs = await browser.tabs.query({windowId:window.id})
            activeTab = (tab for tab in tabs when tab.active)[0]
            desiredIndex = (activeTab.index + inc).mod(tabs.length)
            desiredTab = (tab for tab in tabs when tab.index == desiredIndex)[0]
            setTab(desiredTab.id)
        catch error
            console.log(error)

    setTab = (id) ->
        browser.tabs.update(id,{active:true})

    tabByIndex = (index) ->
        browser.tabs.query({}).then((tabs) ->
                desiredTab = tab for tab in tabs when tab.index == desIndex
        )

# modulus that always returns a non-negative number, as mathematicians expect.
#
# In mathematics, mod usually returns the remainder of euclidean division of
# two numbers and the remainder is always positive.
#
# In most programming languages, mod can return a negative number and the
# return value of mod always matches the sign of one or the other of the
# arguments. In JS the built-in % operator's returned value always has the same
# sign as the dividend, in python, the divisor.

    Number.prototype.mod = (n) ->
        Math.abs(this % n)

##
#
#       First attempt at message parsing wrapper to avoid duplication of code
#
##

# The following functions all talk to the content.js script

    goHistory = (n) ->
        sendMessageToActiveTab({command:"history", number:n})

    goScroll = (n) ->
        sendMessageToActiveTab({command:"scroll",number:n})

    sendMessageToActiveTab = (message) ->
        sendMessageToFilteredTabs({active:true},message)

    sendMessageToFilteredTabs = (filter,message) ->
        filtTabs = await browser.tabs.query(filter)
        browser.tabs.sendMessage(tab.id,message) for tab in filtTabs

    doArbitraryCodeInWindow = (object, args) ->
        sendMessageToActiveTab({command:"arbitrary",object,args})
        # example: doArbitraryCodeInWindow("scrollBy",[0,100])


    console.log("Loaded Tridactyl")
