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

/** # Tridactyl Configuration
 *
 * We very strongly recommend that you pretty much ignore this page and instead follow the link below DEFAULTS that will take you to our own source code which is formatted in a marginally more sane fashion.
 *
 */

/** @hidden */
const CONFIGNAME = "userconfig"
/** @hidden */
const WAITERS = []
/** @hidden */
let INITIALISED = false

/** @hidden */
// make a naked object
function o(object) {
    return Object.assign(Object.create(null), object)
}

/** @hidden */
// "Import" is a reserved word so this will have to do
function schlepp(settings) {
    Object.assign(USERCONFIG, settings)
}

/** @hidden */
let USERCONFIG = o({})

/**
 * This is the default configuration that Tridactyl comes with.
 *
 * You can change anything here using `set key1.key2.key3 value` or specific things any of the various helper commands such as `bind` or `command`.
 *
 */
const default_config = {
    configversion: "0.0",

    /**
     * nmaps contain all of the bindings for "normal mode".
     *
     * They consist of key sequences mapped to ex commands.
     */
    nmaps: {
        "<F1>": "help",
        o: "fillcmdline open",
        O: "current_url open",
        w: "fillcmdline winopen",
        W: "current_url winopen",
        t: "fillcmdline tabopen",
        "]]": "followpage next",
        "[[": "followpage prev",
        "[c": "urlincrement -1",
        "]c": "urlincrement 1",
        "<c-x>": "urlincrement -1",
        "<c-a>": "urlincrement 1",
        T: "current_url tabopen",
        yy: "clipboard yank",
        ys: "clipboard yankshort",
        yc: "clipboard yankcanon",
        gh: "home",
        gH: "home true",
        p: "clipboard open",
        P: "clipboard tabopen",
        j: "scrollline 10",
        "<c-e>": "scrollline 10",
        k: "scrollline -10",
        "<c-y>": "scrollline 10",
        h: "scrollpx -50",
        l: "scrollpx 50",
        G: "scrollto 100",
        gg: "scrollto 0",
        "<c-u>": "scrollpage -0.5",
        "<c-d>": "scrollpage 0.5",
        // "<c-b>": "scrollpage -1",
        $: "scrollto 100 x",
        // "0": "scrollto 0 x", // will get interpreted as a count
        "^": "scrollto 0 x",
        "<c-6>": "buffer #",
        H: "back",
        L: "forward",
        "<c-o>": "back",
        "<c-i>": "forward",
        d: "tabclose",
        D: "composite tabprev | sleep 100 | tabclose #",
        gx0: "tabclosealltoleft",
        gx$: "tabclosealltoright",
        u: "undo",
        r: "reload",
        R: "reloadhard",
        gi: "focusinput -l",
        "g;": "changelistjump -1",
        gt: "tabnext_gt",
        gT: "tabprev",
        // "<c-n>": "tabnext_gt", // c-n is reserved for new window
        // "<c-p>": "tabprev",
        "g^": "tabfirst",
        g0: "tabfirst",
        g$: "tablast",
        gr: "reader",
        gu: "urlparent",
        gU: "urlroot",
        gf: "viewsource",
        ":": "fillcmdline",
        s: "fillcmdline open search",
        S: "fillcmdline tabopen search",
        // find mode not suitable for general consumption yet.
        // "/": "find",
        // "?": "find -1",
        // "n": "findnext 1",
        // "N": "findnext -1",
        M: "gobble 1 quickmark",
        // "B": "fillcmdline bufferall",
        b: "fillcmdline buffer",
        ZZ: "qall",
        f: "hint",
        F: "hint -b",
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
        ";v": "hint -W exclaim_quiet mpv",
        "<S-Insert>": "mode ignore",
        I: "fillcmdline Ignore mode is now toggled by pressing <S-Insert>",
        a: "current_url bmark",
        A: "bmark",
        zi: "zoom 0.1 true",
        zo: "zoom -0.1 true",
        zz: "zoom 1",
        ".": "repeat",
        "<SA-ArrowUp><SA-ArrowUp><SA-ArrowDown><SA-ArrowDown><SA-ArrowLeft><SA-ArrowRight><SA-ArrowLeft><SA-ArrowRight>ba":
            "open https://www.youtube.com/watch?v=M3iOROuTuMA",
    },
    /**
     * Autocommands that run when certain events happen, and other conditions are met.
     *
     * Related ex command: `autocmd`.
     */
    autocmds: {
        /**
         * Commands that will be run when pages are loaded.
         *
         * Each key corresponds to a URL fragment which, if contained within the page URL, will run the corresponding command.
         */
        DocStart: {
            "addons.mozilla.org": "mode ignore",
        },
    },

    /**
     * Aliases for use in the command line. The key is replaced with the value.
     *
     * Related ex command: `command`
     */
    exaliases: {
        alias: "command",
        au: "autocmd",
        b: "buffer",
        o: "open",
        w: "winopen",
        t: "tabopen",
        tn: "tabnext_gt",
        bn: "tabnext_gt",
        tnext: "tabnext_gt",
        bnext: "tabnext_gt",
        tp: "tabprev",
        tN: "tabprev",
        bp: "tabprev",
        bN: "tabprev",
        tprev: "tabprev",
        bprev: "tabprev",
        bfirst: "tabfirst",
        blast: "tablast",
        tfirst: "tabfirst",
        tlast: "tablast",
        bd: "tabclose",
        bdelete: "tabclose",
        quit: "tabclose",
        q: "tabclose",
        sanitize: "sanitise",
        tutorial: "tutor",
        h: "help",
        openwith: "hint -W",
        "!": "exclaim",
        "!s": "exclaim_quiet",
    },

    /**
     * Used by `]]` and `[[` to look for links containing these words.
     *
     * Edit these if you want to add, e.g. other language support.
     */
    followpagepatterns: {
        next: "^(next|newer\\b|»|>>|more",
        prev: "^(prev(ious?|older\\b|«|<<",
    },
    /**
     * The default search engine used by `open search`
     */
    searchengine: "google",
    /**
     * Definitions of search engines for use via `open [keyword]`.
     */
    searchurls: {
        google: "https://www.google.com/search?q=",
        scholar: "https://scholar.google.com/scholar?q=",
        googleuk: "https://www.google.co.uk/search?q=",
        bing: "https://www.bing.com/search?q=",
        duckduckgo: "https://duckduckgo.com/?q=",
        yahoo: "https://search.yahoo.com/search?p=",
        twitter: "https://twitter.com/search?q=",
        wikipedia: "https://en.wikipedia.org/wiki/Special:Search/",
        youtube: "https://www.youtube.com/results?search_query=",
        amazon:
            "https://www.amazon.com/s/ref=nb_sb_noss?url=search-alias%3Daps&field-keywords=",
        amazonuk:
            "https://www.amazon.co.uk/s/ref=nb_sb_noss?url=search-alias%3Daps&field-keywords=",
        startpage:
            "https://startpage.com/do/search?language=english&cat=web&query=",
        github: "https://github.com/search?utf8=✓&q=",
        searx: "https://searx.me/?category_general=on&q=",
        cnrtl: "http://www.cnrtl.fr/lexicographie/",
        osm: "https://www.openstreetmap.org/search?query=",
        mdn: "https://developer.mozilla.org/en-US/search?q=",
        gentoo_wiki:
            "https://wiki.gentoo.org/index.php?title=Special%3ASearch&profile=default&fulltext=Search&search=",
        qwant: "https://www.qwant.com/?q=",
    },

    /**
     * URL the newtab will redirect to.
     *
     * All usual rules about things you can open with `open` apply, with the caveat that you'll get interesting results if you try to use something that needs `nativeopen`: so don't try `about:newtab`.
     */
    newtab: "",
    /**
     * Whether `:viewsource` will use our own page that you can use Tridactyl binds on, or Firefox's default viewer, which you cannot use Tridactyl on.
     *
     * Permitted values: `tridactyl` or `default`.
     */
    viewsource: "tridactyl", // "tridactyl" or "default"
    /**
     * Which storage to use. Sync storage will synchronise your settings via your Firefox Account.
     *
     * Permitted values: `sync` or `local`
     */
    storageloc: "sync",
    homepages: [],
    /**
     * Characters to use in hint mode.
     *
     * They are used preferentially from left to right.
     */
    hintchars: "hjklasdfgyuiopqwertnmzxcvb",

    /**
     * The type of hinting to use. `vimperator` will allow you to filter links based on their names by typing non-hint chars. It is recommended that you use this in conjuction with the [[hintchars]] setting, which you should probably set to e.g, `5432167890`.
     *
     * Permitted values: `simple`, `vimperator`, or `vimperator-reflow`.
     */
    hintfiltermode: "simple", // "simple", "vimperator", "vimperator-reflow"

    /**
     * Controls whether the page can focus elements for you via js
     *
     * Best used in conjuciton with browser.autofocus in `about:config`
     *
     * Permitted values: `true`, or `false`.
     */
    allowautofocus: "true",

    tabopenpos: "next",
    relatedopenpos: "related",
    ttsvoice: "default", // chosen from the listvoices list, or "default"
    ttsvolume: 1, // 0 to 1
    ttsrate: 1, // 0.1 to 10
    ttspitch: 1, // 0 to 2

    /**
     * If nextinput, <Tab> after gi brings selects the next input
     *
     * If firefox, <Tab> selects the next selectable element, e.g. a link
     *
     * Permitted values: "nextinput" or "firefox"
     */
    gimode: "nextinput", // either "nextinput" or "firefox"

    // either "beginning" or "end"
    // Decides where to place the cursor when selecting non-empty input fields
    cursorpos: "end",

    theme: "default", // currently available: "default", "dark"
    modeindicator: "true",

    // Default logging levels - 2 === WARNING
    logging: {
        messaging: 2,
        cmdline: 2,
        controller: 2,
        hinting: 2,
        state: 2,
        excmd: 1,
    },
    noiframeon: [],

    // Native messenger settings
    // This has to be a command that stays in the foreground for the whole editing session
    // "auto" will attempt to find a sane editor in your path.
    // Please send your requests to have your favourite terminal moved further up the list to /dev/null.
    //          (but we are probably happy to add your terminal to the list if it isn't already there.
    editorcmd: "auto",
    browser: "firefox",
    nativeinstallcmd:
        "curl -fsSl https://raw.githubusercontent.com/cmcaine/tridactyl/master/native/install.sh | bash",
    profiledir: "auto",

    // Performance related settings

    // number of most recent results to ask Firefox for. We display the top 20 or so most frequently visited ones.
    historyresults: "50",

    // Security settings

    csp: "untouched", // change this to "clobber" to ruin the CSP of all sites and make Tridactyl run a bit better on some of them, e.g. raw.github*
}

/** @hidden */
const DEFAULTS = o(default_config)

/** Given an object and a target, extract the target if it exists, else return undefined

    @param target path of properties as an array
    @hidden
*/
function getDeepProperty(obj, target) {
    if (obj !== undefined && target.length) {
        return getDeepProperty(obj[target[0]], target.slice(1))
    } else {
        return obj
    }
}

/** Create the key path target if it doesn't exist and set the final property to value.

    If the path is an empty array, replace the obj.

    @param target path of properties as an array
    @hidden
*/
function setDeepProperty(obj, value, target) {
    if (target.length > 1) {
        // If necessary antecedent objects don't exist, create them.
        if (obj[target[0]] === undefined) {
            obj[target[0]] = o({})
        }
        return setDeepProperty(obj[target[0]], value, target.slice(1))
    } else {
        obj[target[0]] = value
    }
}

/** Get the value of the key target.

    If the user has not specified a key, use the corresponding key from
    defaults, if one exists, else undefined.
    @hidden
*/
export function get(...target) {
    const user = getDeepProperty(USERCONFIG, target)
    const defult = getDeepProperty(DEFAULTS, target)

    // Merge results if there's a default value and it's not an Array or primitive.
    if (defult && (!Array.isArray(defult) && typeof defult === "object")) {
        return Object.assign(o({}), defult, user)
    } else {
        if (user !== undefined) {
            return user
        } else {
            return defult
        }
    }
}

/** Get the value of the key target, but wait for config to be loaded from the
    database first if it has not been at least once before.

    This is useful if you are a content script and you've just been loaded.
    @hidden
*/
export async function getAsync(...target) {
    if (INITIALISED) {
        return get(...target)
    } else {
        return new Promise(resolve =>
            WAITERS.push(() => resolve(get(...target))),
        )
    }
}

/** Full target specification, then value

    e.g.
        set("nmaps", "o", "open")
        set("search", "default", "google")
        set("aucmd", "BufRead", "memrise.com", "open memrise.com")

    @hidden
*/
export function set(...args) {
    if (args.length < 2) {
        throw "You must provide at least two arguments!"
    }

    const target = args.slice(0, args.length - 1)
    const value = args[args.length - 1]

    setDeepProperty(USERCONFIG, value, target)
    save()
}

/** Delete the key at target if it exists
 * @hidden */
export function unset(...target) {
    const parent = getDeepProperty(USERCONFIG, target.slice(0, -1))
    if (parent !== undefined) delete parent[target[target.length - 1]]
    save()
}

/** Save the config back to storage API.

    Config is not synchronised between different instances of this module until
    sometime after this happens.

    @hidden
*/
export async function save(storage: "local" | "sync" = get("storageloc")) {
    // let storageobj = storage == "local" ? browser.storage.local : browser.storage.sync
    // storageobj.set({CONFIGNAME: USERCONFIG})
    let settingsobj = o({})
    settingsobj[CONFIGNAME] = USERCONFIG
    if (storage == "local") browser.storage.local.set(settingsobj)
    else browser.storage.sync.set(settingsobj)
}

/** Updates the config to the latest version.
    Proposed semantic for config versionning:
     - x.y -> x+1.0 : major architectural changes
     - x.y -> x.y+1 : renaming settings/changing their types
    There's no need for an updater if you're only adding a new setting/changing
    a default setting

    When adding updaters, don't forget to set("configversion", newversionnumber)!
    @hidden
*/
export async function update() {
    let updaters = {
        "0.0": async () => {
            try {
                // Before we had a config system, we had nmaps, and we put them in the
                // root namespace because we were young and bold.
                let legacy_nmaps = await browser.storage.sync.get("nmaps")
                if (Object.keys(legacy_nmaps).length > 0) {
                    USERCONFIG["nmaps"] = Object.assign(
                        legacy_nmaps["nmaps"],
                        USERCONFIG["nmaps"],
                    )
                }
            } finally {
                set("configversion", "1.0")
            }
        },
        "1.0": () => {
            let vimiumgi = getDeepProperty(USERCONFIG, "vimium-gi")
            if (vimiumgi === true || vimiumgi === "true")
                set("gimode", "nextinput")
            else if (vimiumgi === false || vimiumgi === "false")
                set("gimode", "firefox")
            unset("vimium-gi")
            set("configversion", "1.1")
        },
    }
    if (!get("configversion")) set("configversion", "0.0")
    while (updaters[get("configversion")] instanceof Function) {
        await updaters[get("configversion")]()
    }
}

/** Read all user configuration from storage API then notify any waiting asynchronous calls

    asynchronous calls generated by getAsync.
    @hidden
*/
async function init() {
    let syncConfig = await browser.storage.sync.get(CONFIGNAME)
    schlepp(syncConfig[CONFIGNAME])
    // Local storage overrides sync
    let localConfig = await browser.storage.local.get(CONFIGNAME)
    schlepp(localConfig[CONFIGNAME])
    await update()
    INITIALISED = true
    for (let waiter of WAITERS) {
        waiter()
    }
}

// Listen for changes to the storage and update the USERCONFIG if appropriate.
// TODO: BUG! Sync and local storage are merged at startup, but not by this thing.
browser.storage.onChanged.addListener((changes, areaname) => {
    if (CONFIGNAME in changes) {
        USERCONFIG = changes[CONFIGNAME].newValue
    }
})

init()
