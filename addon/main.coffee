# "this" adds it to the global scope
this.handleBrowserAction = () ->
    browser.tabs.query({active: true}).then(console.log)
    # console.log logs the name of the function

browser.browserAction.onClicked.addListener(handleBrowserAction)

console.log("Loaded Tridactyl") # get a "cannot access dead object" error from somewhere,
                                # this doesn't turn up in the console / might flash
