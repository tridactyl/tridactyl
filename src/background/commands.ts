import * as E from './excommand'
import * as P from './inputs'
import { List } from 'immutable'
import * as U from '../util'
import * as N from './native'

function makeListOption(
    name: string,
    short: string,
    long: string,
    list: string[]
): [string, string, E.InputSpec] {
    return [short, long, P.makeListInput(name, List(list))]
}

function makeCmdRes(x: any): E.Result {
    return { showResult: x }
}

// ================
// Tab manipulation
// ================

E.registerCommand('open', {
    specs: 'o[pen]',
    description: 'Navigate the current tab to the specified url',
    argumentsSpec: [P.HIST_BMARK],
    action: (cofx, url: string) => {
        U.unimplemented()
    }
})

E.registerCommand('tabopen', {
    specs: ['tabo[pen]', 'to[pen]'],
    description: 'Opens a tab',
    options: [
        ['P', 'private', P.BOOLEAN],
        ['c', 'container', P.CONTX_ID],
        ['b', 'background', P.BOOLEAN],
        makeListOption('Position', 'p', 'position', [
            'first',
            'last',
            'default',
        ]),
    ],
    argumentsSpec: [P.toRest(P.HIST_BMARK)],
    action: (cofx, url: string) => {
        const priv = (cofx.options.get('private') as boolean) || false
        const back = (cofx.options.get('background') as boolean) || false
        const cont = cofx.options.get('container')

        U.unimplemented()

        browser.tabs.create({
            active: true,
            pinned: false,
            url: url,
        })
    },
})

E.registerCommand('tabclose', {
    specs: ['tabc[lose]', 'tc[lose]'],
    description: 'Closes the specified tab. Uses active if not provided.',
    action: cofx => {
        throw `unimplemented`
    },
})

E.registerCommand('tabmove', {
    specs: ['tabm[ove]', 'tm[ove]'],
    description: 'Move the current tab',
    argumentsSpec: [P.NUMBER],
    action: (cofx, idx: number) => {
        throw 'unimplemented'
    },
})

E.registerCommand('tabsetactive', {
    specs: 'tabseta[ctive]',
    description: 'Set tab with the provided id as active',
    argumentsSpec: [P.TAB_ID],
    action: async (_, tid: number) => {
        browser.tabs.update(tid, { active: true })
    },
})

E.registerCommand('pin', {
    specs: ['pin', 'tabpin', 'pintab'],
    description: 'Pin the current tab',
    action: cofx => {
        throw 'unimplemented'
    },
})

E.registerCommand('reload', {
    specs: 'reload',
    description: 'Reload the current tab',
    options: [['h', 'hard', P.BOOLEAN]],
    action: cofx => {
        U.unimplemented()
    },
})

// =======
// History
// =======

E.registerCommand('forward', {
    specs: 'forw[ard]',
    description: 'Move forward in history by x',
    argumentsSpec: [P.toOptional(P.NUMBER)],
    action: (cofx, x?: number) => {
        const times = x || 1
        throw 'unimplemented'
    },
})

E.registerCommand('backward', {
    specs: 'back[ward]',
    description: 'Move backward in history by x',
    argumentsSpec: [P.toOptional(P.NUMBER)],
    action: (cofx, x?: number) => {
        const times = x || 1
        throw 'unimplemented'
    },
})

// ===============
// GUI interaction
// ===============

E.registerCommand('fillcmdline', {
    specs: ['fillcmdline'],
    description: 'Fill the command line with the provided string',
    argumentsSpec: [P.toRest(P.IDENTITY)],
    action: (cofx, ...a: string[]) => {
        throw 'unimplemented'
    },
})

// =======
// Hinting
// =======

E.registerCommand('hint', {
    specs: 'h[int]',
    description: 'Enter hint mode',
    options: [
        // Filters
        ['r', 'resource', P.BOOLEAN],
        ['i', 'image', P.BOOLEAN],
        ['t', 'text', P.BOOLEAN],
        ['#', 'anchor', P.BOOLEAN],
        ['c', 'selector', P.IDENTITY],

        // Modifiers
        ['b', 'background', P.BOOLEAN],
        ['y', 'yank', P.BOOLEAN],
        ['s', 'save', P.BOOLEAN],
        ['a', 'saveas', P.BOOLEAN],
        [';', 'focus', P.BOOLEAN],
        ['w', 'new-win', P.BOOLEAN],
        ['k', 'kill', P.BOOLEAN],
    ],
    action: cofx => {
        U.unimplemented()
    }
})

// ================
// Native messenger
// ================

E.registerCommand('getnativeversion', {
    specs: ['getnativever[sion]', 'nativever[sion]'],
    description: 'Get the version of the installed native messenger',
    action: async cofx => {
        const ver = N.getNativeMessengerVersion()
        return makeCmdRes(ver)
    },
})

E.registerCommand('getFsConfig', {
    specs: ['getFilesystemRc', 'getFilesystemConfig'],
    description: 'Get the RC file from the filesystem through the native app',
    action: async cofx => {
        const rc = N.getFilesystemUserConfig()
        return makeCmdRes(rc)
    },
})