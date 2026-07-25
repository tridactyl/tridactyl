import * as config from "@src/lib/config"

const ready = config.getAsync()
const superignore = () =>
    config.USERCONFIG.superignore ?? config.DEFAULTS.superignore

function updateButton(value) {
    const disabled = value === "true"
    return Promise.all([
        browser.browserAction.setBadgeText({ text: disabled ? "OFF" : "" }),
        browser.browserAction.setTitle({
            title: disabled ? "Tridactyl disabled" : "Tridactyl enabled",
        }),
    ])
}

export async function getState() {
    await ready
    return superignore()
}

let toggleQueue: Promise<unknown> = Promise.resolve()
export function toggle() {
    const pending = toggleQueue
        .catch(() => undefined)
        .then(async () => {
            const previous = config.USERCONFIG.superignore
            const value = (await getState()) === "true" ? "false" : "true"
            try {
                await config.set("superignore", value)
            } catch (error) {
                if (previous === undefined) delete config.USERCONFIG.superignore
                else config.USERCONFIG.superignore = previous
                throw error
            }
            updateButton(value).catch(console.error)
            return value
        })
    toggleQueue = pending
    return pending
}

export function init() {
    config.addChangeListener("superignore", (_, value) =>
        updateButton(value).catch(console.error),
    )
    getState().then(updateButton).catch(console.error)
}
