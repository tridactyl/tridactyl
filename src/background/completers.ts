import * as E from './excommand'
import * as C from './completion'
import * as S from './globalState'
import * as I from 'immutable'

const COMMAND_COMPLETER: C.Completer = (query: string) => {
    const commands = null as I.List<E.Command>
    const processed = commands
        // The command matches if any of the names contains the query
        .filter(c => c.allNames.some(name => name.includes(query)))
        .map(c => E.commandToCompletion(c))

    // TODO: add sorting

    return Promise.resolve({
        name: 'Command',
        selectable: true,
        completions: processed,
    })
}

const HISTORY_COMPLETER: C.Completer = async (query: string) => {
    const hist = await browser.history.search({ text: query, maxResults: 15 })
    const comps = hist
        .filter(h => h.title && h.url)
        .map(h => ({
            // title and url exists since we filtered it above
            name: h.title as string,
            description: h.url as string,
            expansion: h.url as string,
        }))
    const group = {
        name: 'History',
        selectable: true,
        completions: I.List(comps)
    }
    return group
}

function getListCompleter(
    name: string,
    selectable: boolean,
    spec: [string, string][]
): C.Completer {
    return (query: string) => Promise.resolve({
        name: name,
        selectable: selectable,
        completions: I.List(spec
            .filter(s => s.every(e => e.includes(query)))
            .map(s => ({ name: s[0], description: s[1] }))),
    })
}