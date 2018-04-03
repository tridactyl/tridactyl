// Script used by the settings page.

import * as Config from './config'
import * as RC from './config_rc'
import * as Messaging from './messaging'

const rctextarea = <HTMLTextAreaElement>document.querySelector('#rc-textarea')
const isAutoloadCheckbox = <HTMLInputElement>document.querySelector(
    '#toggle-fs-rc'
)

// Start by showing current settings
activateTab('#current-settings')
fillCurrentConfig()
fillRc()

// Switch tab on click
document.querySelectorAll('.nav-link').forEach(link =>
    link.addEventListener('click', event => {
        // Prevent default behaviour of scrolling to the node
        event.preventDefault()
        const tabref = link.getAttribute('href')
        activateTab(tabref)
    })
)

// Register settings toggle
isAutoloadCheckbox.addEventListener('click', _ =>
    RC.setAutoload(isAutoloadCheckbox.checked)
)
document
    .querySelector('#btn-save-rc')
    .addEventListener('click', _ => RC.setBrowserRc(getTextboxValue()))
document.querySelector('#btn-load-fs-rc').addEventListener('click', async _ => {
    const rc = await Messaging.message('config_rc', 'getFilesystemRc')
    if (!rc) return
    rctextarea.value = rc
})
document.querySelector('#btn-load-rc').addEventListener('click', async _ => {
    const rc = await RC.getBrowserRc()
    rctextarea.value = rc
})
document.querySelector('#btn-run-rc').addEventListener('click', _ => {
    Messaging.message('config_rc', 'runRc', [getTextboxValue()])
})

function getTextboxValue(): string {
    return rctextarea.value
}

async function fillCurrentConfig(): Promise<void> {
    const config = await Config.getAllConfig()
    const cfgStr = JSON.stringify(config, null, 2)
    document.querySelector('#current-settings').textContent = cfgStr

    const isAutoload = await RC.getAutoload()
    isAutoloadCheckbox.checked = isAutoload
}

async function fillRc(): Promise<void> {
    const rc = await RC.getBrowserRc()
    rctextarea.value = rc
}

function activateTab(id: string): void {
    // Switch container active state
    const tabpanes = document.querySelector('#tab-container').children
    Array.from(tabpanes).forEach(tab => tab.classList.remove('active'))
    document.querySelector(id).classList.add('active')

    // Switch navbar active state
    const navtabs = document.querySelector('#tabbar').children
    Array.from(navtabs).forEach(nt => nt.classList.remove('active'))
    document
        .querySelector(`a[href="${id}"]`)
        .parentElement.classList.add('active')
}
