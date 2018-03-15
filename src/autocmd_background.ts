import * as Config from './config'
import * as Messaging from './messaging'
import * as Util from './utils'
import * as CmdlineBg from './commandline_background'

// Register listeners to trigger the autocommands
browser.tabs.onActivated.addListener(arg => runTabSwitchAcmds(arg.tabId))

async function runTabSwitchAcmds(tid: number): Promise<void> {
    console.log(`Running TabSwitch autocmds`)

    const tab = await browser.tabs.get(tid)
    const acmds = await Config.getAsync('autocmds', 'TabSwitch')
    if(!acmds) return
    // Again, the lazy way, but it'll get changed. I swear.
    const sites = Object.keys(acmds)
    const firstMatch = sites.find(e => tab.url.includes(e))

    if(firstMatch) {
        const cmd = acmds[firstMatch]
        console.log(`Running aucmd for '${firstMatch}': ${cmd}`)
        CmdlineBg.recvExStr(cmd)
    }
}
