// Background script experiments.

function handleBrowserAction() {
  browser.tabs.query({active: true}).then(console.log);
}

browser.browserAction.onClicked.addListener(handleBrowserAction);

console.log("Loaded Tridactyl");
