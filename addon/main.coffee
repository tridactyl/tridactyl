# Quick and dirty prototyping.
#
# Functions declared here can be called in the debug window in ff.

handleBrowserAction = () ->
    # .then takes a function that consumes at least one argument.  this is an
    # example of a named function, but anonymous functions are fine, too.
    browser.tabs.query({active: true}).then(console.log)

# Change to the next tab in window, wrapping back to the start, if req.
#
# Get an array of all tabs, find the active tab's index, and the tab id of
# the tab with the next index.
#
# TODO: limit to focused window.
nextTab1 = () ->
    browser.tabs.query({}).then(
        (tabs) ->
            # Doing my own list comprehensions means they're not done
            # asynchronously from each other, but they will be very fast and
            # this makes the code much simpler.
            active = (tab for tab in tabs when tab.active == true)[0]
            target_index = (active.index + 1) % tabs.length
            target = (tab for tab in tabs when tab.index == target_index)[0]
            displayTab(target.id)
        , console.error)

# Change to the next tab in window, wrapping back to the start, if req.
#
# Get an array of all tabs, find the active tab's index, and the tab id of
# the tab with the next index.
#
# TODO: limit to focused window.
nextTab2 = () ->
    # Alternative implementation without list comprehensions.
    #
    # If querying all tabs to get number of tabs is too slow (as if), could
    # query for index+1 and then test if result array.length == 0.
    browser.tabs.query({}).then(
        (tabs) ->
            browser.tabs.query({active: true}).then(
                (tabs2) ->
                    active = tabs2[0]
                    target_index = (active.index + 1) % tabs.length
                    browser.tabs.query({index: target_index}).then(
                        (tabs3) ->
                            displayTab(tabs3[0].id)
                    , console.error)
            , console.error)
    , console.error)

# Convenience: mark tab_id as active (active tabs are displayed in their window)
displayTab = (tab_id) ->
    browser.tabs.update(tab_id, {active: true}).then(null, console.error)

# Example of a listener. Presumably we wouldn't use the browserAction button in
# the real thing.
browser.browserAction.onClicked.addListener(handleBrowserAction)

incTab = (inc) ->
    browser.windows.getCurrent().then(
        (window) ->
            browser.tabs.query({windowId:window.id}).then(
                (tabs) ->
                    activeTab = (tab for tab in tabs when tab.active)[0]
                    desiredIndex = (activeTab.index + inc).mod(tabs.length)
                    desiredTab = (tab for tab in tabs when tab.index == desiredIndex)[0]
                    setTab(desiredTab.id)
            ).catch(console.error)
    ).catch(console.error)

setTab = (id) ->
    browser.tabs.update(id,{active:true})

tabByIndex = (index) ->
    browser.tabs.query({}).then((tabs) ->
            desiredTab = tab for tab in tabs when tab.index == desIndex
    )

Number.prototype.mod = (n) ->
    ((this%n)+n)%n
    # Javascript doens't understand maths
    # Lots of people use myFunc: ()-> \\ rather than \\ myFunc = () -> \\ do we care?

console.log("Loaded Tridactyl")
