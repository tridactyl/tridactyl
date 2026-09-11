export {}

function message(command: "getState" | "toggle") {
    return browser.runtime.sendMessage({
        type: "browser_action_background",
        command,
        args: [],
    })
}

const state = document.querySelector<HTMLElement>("#state")
const toggleButton = document.querySelector<HTMLButtonElement>("#toggle")
const reloadButton = document.querySelector<HTMLButtonElement>("#reload")

function showState(value) {
    const disabled = value === "true"
    state.textContent = disabled ? "Disabled globally" : "Enabled globally"
    toggleButton.textContent = disabled
        ? "Enable Tridactyl"
        : "Disable Tridactyl"
}

function showError(error) {
    state.textContent = `Error: ${error instanceof Error ? error.message : error}`
}

function setBusy(busy) {
    toggleButton.disabled = busy
    reloadButton.disabled = busy
}

async function run(action: () => Promise<void>) {
    setBusy(true)
    try {
        await action()
    } catch (error) {
        showError(error)
    } finally {
        setBusy(false)
    }
}

message("getState")
    .then(showState)
    .then(() => setBusy(false), showError)

toggleButton.addEventListener("click", () =>
    run(async () => {
        showState(await message("toggle"))
    }),
)

reloadButton.addEventListener("click", () =>
    run(async () => {
        const [tab] = await browser.tabs.query({
            active: true,
            currentWindow: true,
        })
        if (tab?.id === undefined) throw new Error("No active tab found")
        await browser.tabs.reload(tab.id)
        window.close()
    }),
)
