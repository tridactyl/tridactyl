import * as E from './excommand'
import * as G from './globalState'
import * as C from './completion'

const COMMAND_NAME: E.InputSpec = {
    name: 'Commands',
    completer: async (state: G.GlobalState, query: string) => {
        const matching = state.commands.filter(c =>
            c.allNames.some(n => n.startsWith(query))
        )
        const mapped = matching.map(E.commandToCompletion)
        return mapped
    },
}

const HISTORY: E.InputSpec = {
    name: 'History',
    completer: async (state: G.GlobalState, query: string) => {
        const match = await browser.history.search({
            text: query,
            maxResults: 15,
        })
        return match.filter(m => m.title && m.url).map(h => ({
            // One day TS will be smart enough to know that the filter above
            // ensures that both title and url are non-null
            name: h.title as string,
            description: h.url as string,
            expansion: h.url as string,
        }))
    },
}

const BOOKMARKS: E.InputSpec = {
    name: 'Bookmarks',
    completer: async (state: G.GlobalState, query: string) => {
        const match = await browser.bookmarks.search(query)
        return match.filter(m => m.url).map(m => ({
            name: m.title,
            description: m.url as string,
            expansion: m.url as string,
        }))
    }
}

const TABS_CUR_WIN: E.InputSpec = {
    name: 'Tabs (Current Window)',
    completer: async (state: G.GlobalState, query: string) => {
        const match = await browser.tabs.query({
            currentWindow: true,
        })
        // Only tabs from devtools have no tabid
        return match.filter(m => m.title && m.url && m.id).map(m => ({
            // Format: '<index>: <title>'
            name: m.index + ': ' + m.title as string,
            description: m.url as string,
            expansion: (m.id as number).toString(10),
            // TODO: implement flags
        }))
    },
    parser: async (expansion: string) => {
        const id = parseInt(expansion, 10)
        if(!id) throw `Error while parsing: ${expansion} is not a number.`
        const tab = await browser.tabs.get(id)
        return tab
    }
}