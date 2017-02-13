# Quick and dirty prototyping.
#
# Functions declared here can be called in the debug window in ff.

handleBrowserAction = () ->
    # .then takes a function that consumes at least one argument.  this is an
    # example of a named function, but anonymous functions are fine, too.
    browser.tabs.query({active: true}).then(console.log)

# Example of a listener. Presumably we wouldn't use the browserAction button in
# the real thing.
browser.browserAction.onClicked.addListener(handleBrowserAction)

nextTab = () ->
    browser.tabs.query({active:true}).then((tabs) ->
        id = tabs[0].id
        index = tabs[0].index
        desIndex = index + 1
        browser.tabs.query({}).then((tabs) ->
            desId = tab for tab in tabs when tab.index == desIndex
            setTab(desId.id)
        )
    )

setTab = (id) ->
    browser.tabs.update(id,{active:true})

tabByIndex = (index) ->
    browser.tabs.query({}).then((tabs) ->
            desiredTab = tab for tab in tabs when tab.index == desIndex
    )


console.log("Loaded Tridactyl")
