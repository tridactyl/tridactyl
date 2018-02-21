// Script used by the settings page.

import * as config from './config'

// Start by showing current settings
activateTab('#current-settings')

// Switch tab when a its clicked on the tabbar
document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', event => {
        // Prevent default behaviour of scrolling to the node
        event.preventDefault()

        const tabref = link.getAttribute('href')
        activateTab(tabref)
    })
})

// Fill in current config
const cfgStr = JSON.stringify(config.getAllConfig(), null, 2)
document.querySelector('#current-settings').textContent = cfgStr

function activateTab(id: string) {
    // Switch container active state
    const tabpanes = document.querySelector('#tab-container').children
    Array.from(tabpanes).forEach(tab => tab.classList.remove('active'))
    document.querySelector(id).classList.add('active')

    // Switch navbar active state
    const navtabs = document.querySelector('#tabbar').children
    Array.from(navtabs).forEach(nt => nt.classList.remove('active'))
    document.querySelector(`a[href="${id}"]`).parentElement.classList.add('active')
}
