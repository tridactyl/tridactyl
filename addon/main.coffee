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

console.log("Loaded Tridactyl")
