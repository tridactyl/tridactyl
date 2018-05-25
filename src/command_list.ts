import { registerNewCommand } from "./command_background"
import * as CB from "./command_background"

const OPT_NEWTAB = { short: "t", long: "newtab", type: CB.BOOLEAN_INPUT }
const OPT_NEWWIN = { short: "w", long: "newwindow", type: CB.BOOLEAN_INPUT }

const autocmd = registerNewCommand("autocmd", {
    nameSpecs: ["aucmd", "autocmd"],
    description: "Set autocmds to run when certain events happen.",
    argumentTypes: [CB.AUCMD_EVENTS_INPUT, CB.STRING_INPUT],
    optionTypes: [],
    action: (ctx, ev: string, cmd: string) => {},
})

const open = registerNewCommand("open", {
    nameSpecs: "o[pen]",
    description: "Open a url",
    documentation: "",
    argumentTypes: [CB.HISTORY_INPUT],
    optionTypes: [OPT_NEWTAB, OPT_NEWWIN],
    action: (ctx, url: string) => {},
})

const search = registerNewCommand("search", {
    nameSpecs: "s[earch]",
    description: "Search the internet",
    argumentTypes: [CB.SEARCH_ENGINE_INPUT, CB.STRING_INPUT],
    optionTypes: [OPT_NEWTAB, OPT_NEWWIN],
    action: (ctx, s: string) => {},
})
