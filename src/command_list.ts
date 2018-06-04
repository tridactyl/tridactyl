import { registerNewCommand } from "./command_background"
import * as CB from "./command_background"
import {
    IP_BOOLEAN,
    IP_STRING,
    IP_AUCMD_EVENTS,
    IP_HISTORY,
    IP_SEARCH_ENGINE,
} from "./command_inputs"

const OPT_NEWTAB = { short: "t", long: "newtab", type: IP_BOOLEAN }
const OPT_NEWWIN = { short: "w", long: "newwindow", type: IP_BOOLEAN }

const autocmd = registerNewCommand("autocmd", {
    nameSpecs: ["aucmd", "autocmd"],
    description: "Set autocmds to run when certain events happen.",
    argumentTypes: [IP_AUCMD_EVENTS, IP_STRING],
    optionTypes: [],
    action: (ctx, ev: string, cmd: string) => {},
})

const open = registerNewCommand("open", {
    nameSpecs: "o[pen]",
    description: "Open a url",
    documentation: "",
    argumentTypes: [IP_HISTORY],
    optionTypes: [OPT_NEWTAB, OPT_NEWWIN],
    action: (ctx, url: string) => {},
})

const search = registerNewCommand("search", {
    nameSpecs: "s[earch]",
    description: "Search the internet",
    argumentTypes: [IP_SEARCH_ENGINE, IP_STRING],
    optionTypes: [OPT_NEWTAB, OPT_NEWWIN],
    action: (ctx, s: string) => {},
})
