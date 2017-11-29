// Sketch
//
// Need an easy way of getting and setting settings
// If a setting is not set, the default should probably be returned.
// That probably means that binds etc. should be per-key?
//
// We should probably store all settings in memory, and only load from storage on startup and when we set it
//
// Really, we'd like a way of just letting things use the variables
//
const CONFIGNAME = "userconfig"

type StorageMap = browser.storage.StorageMap

// make a naked object
function o(object){
    return Object.assign(Object.create(null),object)
}

let USERCONFIG = o({})
const DEFAULTS = o({
    "nmaps": o({
        "o": "fillcmdline open",
        "O": "current_url open",
        "w": "fillcmdline winopen",
        "W": "current_url winopen",
        "t": "fillcmdline tabopen",
        //["t": "fillcmdline tabopen", // for now, use mozilla completion
        "]]": "followpage next",
        "[[": "followpage prev",
        "[c": "urlincrement -1",
        "]c": "urlincrement 1",
        "T": "current_url tabopen",
        "yy": "clipboard yank",
        "ys": "clipboard yankshort",
        "yc": "clipboard yankcanon",
        "p": "clipboard open",
        "P": "clipboard tabopen",
        "j": "scrollline 10",
        "k": "scrollline -10",
        "h": "scrollpx -50",
        "l": "scrollpx 50",
        "G": "scrollto 100",
        "gg": "scrollto 0",
        "H": "back",
        "L": "forward",
        "d": "tabclose",
        "u": "undo",
        "r": "reload",
        "R": "reloadhard",
        "gi": "focusinput -l",
        "gt": "tabnext_gt",
        "gT": "tabprev",
        "g^": "tabfirst",
        "g$": "tablast",
        "gr": "reader",
        "gu": "urlparent",
        "gU": "urlroot",
        ":": "fillcmdline",
        "s": "fillcmdline open search",
        "S": "fillcmdline tabopen search",
        "M": "gobble 1 quickmark",
        "xx": "something",
        // "B": "fillcmdline bufferall",
        "b": "fillcmdline buffer",
        "ZZ": "qall",
        "f": "hint",
        "F": "hint -b",
        ";i": "hint -i",
        ";I": "hint -I",
        ";y": "hint -y",
        ";p": "hint -p",
        ";;": "hint -;",
        ";#": "hint -#",
        "I": "mode ignore",
        "a": "current_url bmark",
        "A": "bmark",
    }),
    "search_engine": "google",
    "storage_location": "sync",
})

// currently only supports 2D or 1D storage
export function get(target, property?){
    console.log(DEFAULTS)
    if (property !== undefined){
        if (USERCONFIG[target] !== undefined){
            return USERCONFIG[target][property] || DEFAULTS[target][property]
        }
        else return DEFAULTS[target][property]
    }
    if (typeof DEFAULTS[target] === "object") return Object.assign(o({}),DEFAULTS[target],USERCONFIG[target])
    else return USERCONFIG[target] || DEFAULTS[target]
}

// if you don't specify a property and you should, this will wipe everything
export function set(target, value, property?){
    if (property !== undefined){
        if (USERCONFIG[target] === undefined) USERCONFIG[target] = o({})
        return USERCONFIG[target][property] = value
    }
    USERCONFIG[target] = value
}

export function unset(target, property?){
    if (property !== undefined){
        delete USERCONFIG[target][property]
    } else delete USERCONFIG[target]
}

export async function save(storage: "local" | "sync" = "sync"){
    // let storageobj = storage == "local" ? browser.storage.local : browser.storage.sync
    // storageobj.set({CONFIGNAME: USERCONFIG})
    let settingsobj = o({})
    settingsobj[CONFIGNAME] = USERCONFIG
    if (storage == "local") browser.storage.local.set(settingsobj)
    else browser.storage.sync.set(settingsobj)
}

// Read all user configuration on start
// Local storage overrides sync
browser.storage.sync.get(CONFIGNAME).then(settings => {
    schlepp(settings)
    browser.storage.local.get(CONFIGNAME).then(schlepp)
})

function schlepp(settings){
    // "Import" is a reserved word so this will have to do
    Object.assign(USERCONFIG,settings[CONFIGNAME])
}
