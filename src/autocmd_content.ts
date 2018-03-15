import * as Config from './config'
import * as Messaging from './messaging'
import * as Util from './utils'

loadDocstartAucmds()

async function loadDocstartAucmds(): Promise<void> {
    console.log(`Running DocStart autocmds`)

    const docstartCmds = await Config.getAsync('autocmds', 'DocStart')
    const ausites = Object.keys(docstartCmds)
    // This is the lazy way; switch to matching later
    const matching = ausites.find(e => document.location.href.includes(e))

    if(matching) {
        const cmd = docstartCmds[matching]
        console.log(`Running aucmd for '${matching}': ${cmd}`)
        Messaging.message('commandline_background', 'recvExStr', [cmd])
    }
}
