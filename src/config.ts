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

// TODO: have list of possibilities for settings, e.g. hintmode: reverse | normal
let USERCONFIG = o({})
const DEFAULTS = o({
    "nmaps": o({
        "o": "fillcmdline open",
        "O": "current_url open",
        "w": "fillcmdline winopen",
        "W": "current_url winopen",
        "t": "fillcmdline tabopen",
        "]]": "followpage next",
        "[[": "followpage prev",
        "[c": "urlincrement -1",
        "]c": "urlincrement 1",
        "T": "current_url tabopen",
        "yy": "clipboard yank",
        "ys": "clipboard yankshort",
        "yc": "clipboard yankcanon",
        "gh": "home",
        "gH": "home true",
        "p": "clipboard open",
        "P": "clipboard tabopen",
        "j": "scrollline 10",
        "k": "scrollline -10",
        "h": "scrollpx -50",
        "l": "scrollpx 50",
        "G": "scrollto 100",
        "gg": "scrollto 0",
        "$": "scrollto 100 x",
        // "0": "scrollto 0 x", // will get interpreted as a count
        "^": "scrollto 0 x",
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
        // "B": "fillcmdline bufferall",
        "b": "fillcmdline buffer",
        "ZZ": "qall",
        "f": "hint",
        "F": "hint -b",
        ";i": "hint -i",
        ";I": "hint -I",
        ";k": "hint -k",
        ";y": "hint -y",
        ";p": "hint -p",
        ";r": "hint -r",
        ";s": "hint -s",
        ";S": "hint -S",
        ";a": "hint -a",
        ";A": "hint -A",
        ";;": "hint -;",
        ";#": "hint -#",
        "I": "mode ignore",
        "a": "current_url bmark",
        "A": "bmark",
        "zi": "zoom 0.1 true",
        "zo": "zoom -0.1 true",
        "zz": "zoom 1",
        ".": "repeat",
    }),
    "searchengine": "google",
    "searchurls": o({
        "google":"https://www.google.com/search?q=",
        "scholar":"https://scholar.google.com/scholar?q=",
        "googleuk":"https://www.google.co.uk/search?q=",
        "bing":"https://www.bing.com/search?q=",
        "duckduckgo":"https://duckduckgo.com/?q=",
        "yahoo":"https://search.yahoo.com/search?p=",
        "twitter":"https://twitter.com/search?q=",
        "wikipedia":"https://en.wikipedia.org/wiki/Special:Search/",
        "youtube":"https://www.youtube.com/results?search_query=",
        "amazon":"https://www.amazon.com/s/ref=nb_sb_noss?url=search-alias%3Daps&field-keywords=",
        "amazonuk":"https://www.amazon.co.uk/s/ref=nb_sb_noss?url=search-alias%3Daps&field-keywords=",
        "startpage":"https://startpage.com/do/search?language=english&cat=web&query=",
        "github":"https://github.com/search?utf8=✓&q=",
        "searx":"https://searx.me/?category_general=on&q=",
        "cnrtl":"http://www.cnrtl.fr/lexicographie/",
        "osm":"https://www.openstreetmap.org/search?query=",
        "mdn":"https://developer.mozilla.org/en-US/search?q=",
        "gentoo_wiki":"https://wiki.gentoo.org/index.php?title=Special%3ASearch&profile=default&fulltext=Search&search=",
        "qwant":"https://www.qwant.com/?q=",

    }),
    "newtab": "",
    "storageloc": "sync",
    "homepages": [],
    "hintchars": "hjklasdfgyuiopqwertnmzxcvb",

    "ttsvoice": "default",  // chosen from the listvoices list, or "default"
    "ttsvolume": 1,         // 0 to 1
    "ttsrate": 1,           // 0.1 to 10
    "ttspitch": 1,          // 0 to 2
    "vimium-gi": true,

    // Default logging levels - 2 === WARNING
    "logging": o({
        "messaging": 2,
        "cmdline": 2,
        "controller": 2,
        "hinting": 2,
        "state": 2,
        "excmd": 1,
    }),
})

// currently only supports 2D or 1D storage
export function get(target, property?){
    if (property !== undefined){
        if (USERCONFIG[target] !== undefined){
            return USERCONFIG[target][property] || DEFAULTS[target][property]
        }
        else return DEFAULTS[target][property]
    }
    // only merge "proper" objects, not arrays
    if (Array.isArray(DEFAULTS[target])) return USERCONFIG[target] || DEFAULTS[target]
    if (typeof DEFAULTS[target] === "object") return Object.assign(o({}),DEFAULTS[target],USERCONFIG[target])
    else return USERCONFIG[target] || DEFAULTS[target]
}

// if you don't specify a property and you should, this will wipe everything
export function set(target, value, property?){
    if (property !== undefined){
        if (USERCONFIG[target] === undefined) USERCONFIG[target] = o({})
        USERCONFIG[target][property] = value
    } else USERCONFIG[target] = value
    // Always save
    save(get("storageloc"))
}

export function unset(target, property?){
    if (property !== undefined){
        delete USERCONFIG[target][property]
    } else delete USERCONFIG[target]
    save(get("storageloc"))
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
// Legacy config gets loaded first
let legacy_nmaps = {}
browser.storage.sync.get("nmaps").then(nmaps => {
    legacy_nmaps = nmaps["nmaps"]
    browser.storage.sync.get(CONFIGNAME).then(settings => {
        schlepp(settings[CONFIGNAME])
        // Local storage overrides sync
        browser.storage.local.get(CONFIGNAME).then(settings => {
            schlepp(settings[CONFIGNAME])
            USERCONFIG["nmaps"] = Object.assign(legacy_nmaps, USERCONFIG["nmaps"])
        })
    })
})

function schlepp(settings){
    // "Import" is a reserved word so this will have to do
    Object.assign(USERCONFIG,settings)
}

browser.storage.onChanged.addListener(
    (changes, areaname) => {
        if (CONFIGNAME in changes) {
            USERCONFIG = changes[CONFIGNAME].newValue
        }
    }
)
