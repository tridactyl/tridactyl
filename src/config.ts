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
class default_config {
    /**
     * Internal version number Tridactyl uses to know whether it needs to update from old versions of the configuration.
     *
     * Changing this might do weird stuff.
     */
    configversion = "0.0"

    // Note to developers: When creating new <modifier-letter> maps, make sure to make the modifier uppercase (e.g. <C-a> instead of <c-a>) otherwise some commands might not be able to find them (e.g. `bind <c-a>`)

    /**
     * ignoremaps contain all of the bindings for "ignore mode".
     *
     * They consist of key sequences mapped to ex commands.
     */
    ignoremaps = {
        "<S-Insert>": "mode normal",
        "<CA-Escape>": "mode normal",
        "<CA-`>": "mode normal",
        "<S-Escape>": "mode normal",
        I: "mode normal",
    }

    /**
     * inputmaps contain all of the bindings for "input mode".
     *
     * They consist of key sequences mapped to ex commands.
     */
    inputmaps = {
        "<Escape>": "composite unfocus | mode normal",
        "<C-[>": "composite unfocus | mode normal",
        "<C-i>": "editor",
        "<Tab>": "focusinput -n",
        "<S-Tab>": "focusinput -N",
        "<CA-Escape>": "mode normal",
        "<CA-`>": "mode normal",
        "<C-^>": "buffer #",
    }

    /**
     * imaps contain all of the bindings for "insert mode".
     *
     * They consist of key sequences mapped to ex commands.
     */
    imaps = {
        "<Escape>": "composite unfocus | mode normal",
        "<C-[>": "composite unfocus | mode normal",
        "<C-i>": "editor",
        "<CA-Escape>": "mode normal",
        "<CA-`>": "mode normal",
        "<C-6>": "buffer #",
        "<C-^>": "buffer #",
        "<S-Escape>": "mode ignore",
    }

    /**
     * nmaps contain all of the bindings for "normal mode".
     *
     * They consist of key sequences mapped to ex commands.
     */
    nmaps = {
        "<A-p>": "pin",
        "<A-m>": "mute toggle",
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
        "<C-x>": "urlincrement -1",
        "<C-a>": "urlincrement 1",
        T: "current_url tabopen",
        yy: "clipboard yank",
        ys: "clipboard yankshort",
        yc: "clipboard yankcanon",
        ym: "clipboard yankmd",
        yt: "clipboard yanktitle",
        gh: "home",
        gH: "home true",
        p: "clipboard open",
        P: "clipboard tabopen",
        j: "scrollline 10",
        "<C-e>": "scrollline 10",
        k: "scrollline -10",
        "<C-y>": "scrollline -10",
        h: "scrollpx -50",
        l: "scrollpx 50",
        G: "scrollto 100",
        gg: "scrollto 0",
        "<C-u>": "scrollpage -0.5",
        "<C-d>": "scrollpage 0.5",
        "<C-f>": "scrollpage 1",
        "<C-b>": "scrollpage -1",
        $: "scrollto 100 x",
        // "0": "scrollto 0 x", // will get interpreted as a count
        "^": "scrollto 0 x",
        "<C-6>": "buffer #",
        "<C-^>": "buffer #",
        H: "back",
        L: "forward",
        "<C-o>": "jumpprev",
        "<C-i>": "jumpnext",
        d: "tabclose",
        D: "composite tabprev; sleep 100; tabclose #",
        gx0: "tabclosealltoleft",
        gx$: "tabclosealltoright",
        "<<": "tabmove -1",
        ">>": "tabmove +1",
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
        ":": "fillcmdline_notrail",
        s: "fillcmdline open search",
        S: "fillcmdline tabopen search",
        // find mode not suitable for general consumption yet.
        // "/": "find",
        // "?": "find -1",
        // "n": "findnext 1",
        // "N": "findnext -1",
        M: "gobble 1 quickmark",
        B: "fillcmdline bufferall",
        b: "fillcmdline buffer",
        ZZ: "qall",
        f: "hint",
        F: "hint -b",
        gF: "hint -br",
        ";i": "hint -i",
        ";b": "hint -b",
        ";o": "hint",
        ";I": "hint -I",
        ";k": "hint -k",
        ";y": "hint -y",
        ";p": "hint -p",
        ";P": "hint -P",
        ";r": "hint -r",
        ";s": "hint -s",
        ";S": "hint -S",
        ";a": "hint -a",
        ";A": "hint -A",
        ";;": "hint -;",
        ";#": "hint -#",
        ";v": "hint -W exclaim_quiet mpv",
        ";w": "hint -w",
        ";O": "hint -W fillcmdline_notrail open ",
        ";W": "hint -W fillcmdline_notrail winopen ",
        ";T": "hint -W fillcmdline_notrail tabopen ",
        ";gi": "hint -qi",
        ";gI": "hint -qI",
        ";gk": "hint -qk",
        ";gy": "hint -qy",
        ";gp": "hint -qp",
        ";gP": "hint -qP",
        ";gr": "hint -qr",
        ";gs": "hint -qs",
        ";gS": "hint -qS",
        ";ga": "hint -qa",
        ";gA": "hint -qA",
        ";g;": "hint -q;",
        ";g#": "hint -q#",
        ";gv": "hint -qW exclaim_quiet mpv",
        ";gw": "hint -qw",
        ";gb": "hint -qb",
        "<S-Insert>": "mode ignore",
        "<CA-Escape>": "mode ignore",
        "<CA-`>": "mode ignore",
        "<S-Escape>": "mode ignore",
        I: "mode ignore",
        "<Escape>": "composite mode normal ; hidecmdline",
        "<C-[>": "composite mode normal ; hidecmdline",
        a: "current_url bmark",
        A: "bmark",
        zi: "zoom 0.1 true",
        zo: "zoom -0.1 true",
        zz: "zoom 1",
        ".": "repeat",
        "<SA-ArrowUp><SA-ArrowUp><SA-ArrowDown><SA-ArrowDown><SA-ArrowLeft><SA-ArrowRight><SA-ArrowLeft><SA-ArrowRight>ba":
            "open https://www.youtube.com/watch?v=M3iOROuTuMA",
    }

    /**
     * Autocommands that run when certain events happen, and other conditions are met.
     *
     * Related ex command: `autocmd`.
     */
    autocmds = {
        /**
         * Commands that will be run as soon as Tridactyl loads into a page.
         *
         * Each key corresponds to a URL fragment which, if contained within the page URL, will run the corresponding command.
         */
        DocStart: {
            // "addons.mozilla.org": "mode ignore",
        },

        /**
         * Commands that will be run when pages are loaded.
         *
         * Each key corresponds to a URL fragment which, if contained within the page URL, will run the corresponding command.
         */
        DocLoad: {},

        /**
         * Commands that will be run when pages are unloaded.
         *
         * Each key corresponds to a URL fragment which, if contained within the page URL, will run the corresponding command.
         */
        DocEnd: {
            // "emacs.org": "sanitise history",
        },

        /**
         * Commands that will be run when Tridactyl first runs each time you start your browser.
         *
         * Each key corresponds to a URL fragment which, if contained within the page URL, will run the corresponding command.
         */
        TriStart: {
            ".*": "source_quiet",
        },

        /**
         * Commands that will be run when you enter a tab.
         *
         * Each key corresponds to a URL fragment which, if contained within the page URL, will run the corresponding command.
         */
        TabEnter: {
            // "gmail.com": "mode ignore",
        },

        /**
         * Commands that will be run when you leave a tab.
         *
         * Each key corresponds to a URL fragment which, if contained within the page URL, will run the corresponding command.
         */
        TabLeft: {
            // Actually, this doesn't work because tabclose closes the current tab
            // Too bad :/
            // "emacs.org": "tabclose",
        },
    }

    /**
     * Map for translating keys directly into other keys in normal-ish modes. For example, if you have an entry in this config option mapping `п` to `g`, then you could type `пп` instead of `gg` or `пi` instead of `gi` or `;п` instead of `;g`. This is primarily useful for international users who don't want to deal with rebuilding their bindings every time tridactyl ships a new default keybind. It's not as good as shipping properly internationalized sets of default bindings, but it's probably as close as we're going to get on a small open-source project like this.
     *
     * Note that the current implementation does not allow you to "chain" keys, for example, "a"=>"b" and "b"=>"c" for "a"=>"c". You can, however, swap or rotate keys, so "a"=>"b" and "b"=>"a" will work the way you'd expect, as will "a"=>"b" and "b"=>"c" and "c"=>"a".
     */
    keytranslatemap = {
        // Examples (I think >_>):
        // "д": "l", // Russian language
        // "é" : "w", // BÉPO
        // "h": "j", // Dvorak
        // "n": "j", // Colemak
        // etc
    }

    /**
     * Whether to use the keytranslatemap in various maps.
     */
    keytranslatemodes = {
        nmaps: "true",
        imaps: "false",
        inputmaps: "false",
        ignoremaps: "false",
    }

    /**
     * Automatically place these sites in the named container.
     *
     * Each key corresponds to a URL fragment which, if contained within the page URL, the site will be opened in a container tab instead.
     */
    autocontain = o({
        //"github.com": "microsoft",
        //"youtube.com": "google",
    })

    /**
     * Aliases for the commandline.
     *
     * You can make a new one with `command alias ex-command`.
     */
    exaliases = {
        alias: "command",
        au: "autocmd",
        aucon: "autocontain",
        audel: "autocmddelete",
        audelete: "autocmddelete",
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
        tab: "buffer",
        bd: "tabclose",
        bdelete: "tabclose",
        quit: "tabclose",
        q: "tabclose",
        qa: "qall",
        sanitize: "sanitise",
        tutorial: "tutor",
        h: "help",
        unmute: "mute unmute",
        authors: "credits",
        openwith: "hint -W",
        "!": "exclaim",
        "!s": "exclaim_quiet",
        containerremove: "containerdelete",
        colourscheme: "set theme",
        colours: "colourscheme",
        colorscheme: "colourscheme",
        colors: "colourscheme",
        man: "help",
        "!js": "fillcmdline_tmp 3000 !js is deprecated. Please use js instead",
        "!jsb":
            "fillcmdline_tmp 3000 !jsb is deprecated. Please use jsb instead",
        current_url: "composite get_current_url | fillcmdline_notrail ",
    }

    /**
     * Used by `]]` and `[[` to look for links containing these words.
     *
     * Edit these if you want to add, e.g. other language support.
     */
    followpagepatterns = {
        next: "^(next|newer)\\b|»|>>|more",
        prev: "^(prev(ious)?|older)\\b|«|<<",
    }

    /**
     * The default search engine used by `open search`
     */
    searchengine = "google"

    /**
     * Definitions of search engines for use via `open [keyword]`.
     */
    searchurls = {
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
    }

    /**
     * URL the newtab will redirect to.
     *
     * All usual rules about things you can open with `open` apply, with the caveat that you'll get interesting results if you try to use something that needs `nativeopen`: so don't try `about:newtab`.
     */
    newtab = ""

    /**
     * Whether `:viewsource` will use our own page that you can use Tridactyl binds on, or Firefox's default viewer, which you cannot use Tridactyl on.
     */
    viewsource: "tridactyl" | "default" = "tridactyl"

    /**
     * Which storage to use. Sync storage will synchronise your settings via your Firefox Account.
     */
    storageloc: "sync" | "local" = "sync"

    /**
     * Pages opened with `gH`.
     */
    homepages = []

    /**
     * Characters to use in hint mode.
     *
     * They are used preferentially from left to right.
     */
    hintchars = "hjklasdfgyuiopqwertnmzxcvb"

    /**
     * The type of hinting to use. `vimperator` will allow you to filter links based on their names by typing non-hint chars. It is recommended that you use this in conjuction with the [[hintchars]] setting, which you should probably set to e.g, `5432167890`.
     */
    hintfiltermode: "simple" | "vimperator" | "vimperator-reflow" = "simple"

    /**
     * Whether to optimise for the shortest possible names for each hint, or to use a simple numerical ordering. If set to `numeric`, overrides `hintchars` setting.
     */
    hintnames: "short" | "numeric" = "short"

    /**
     * Whether to display the names for hints in uppercase.
     */
    hintuppercase: "true" | "false" = "true"

    /**
     * The delay in milliseconds in `vimperator` style hint modes after selecting a hint before you are returned to normal mode.
     *
     * The point of this is to prevent accidental execution of normal mode binds due to people typing more than is necessary to choose a hint.
     */
    hintdelay = "300"

    /**
     * Controls whether the page can focus elements for you via js
     *
     * Best used in conjunction with browser.autofocus in `about:config`
     */
    allowautofocus: "true" | "false" = "true"

    /**
     * Whether to use Tridactyl's (bad) smooth scrolling.
     */
    smoothscroll: "true" | "false" = "false"

    /**
     * How viscous you want smooth scrolling to feel.
     */
    scrollduration = "100"

    /**
     * Where to open tabs opened with `tabopen` - to the right of the current tab, or at the end of the tabs.
     */
    tabopenpos: "next" | "last" = "next"

    /**
     * Where to open tabs opened with hinting - as if it had been middle clicked, to the right of the current tab, or at the end of the tabs.
     */
    relatedopenpos: "related" | "next" | "last" = "related"
    /**
     * The name of the voice to use for text-to-speech. You can get the list of installed voices by running the following snippet: `js alert(window.speechSynthesis.getVoices().reduce((a, b) => a + " " + b.name))`
     */
    ttsvoice = "default" // chosen from the listvoices list or "default"
    /**
     * Controls text-to-speech volume. Has to be a number between 0 and 1.
     */
    ttsvolume = "1"
    /**
     * Controls text-to-speech speed. Has to be a number between 0.1 and 10.
     */
    ttsrate = "1"
    /**
     * Controls text-to-speech pitch. Has to be between 0 and 2.
     */
    ttspitch = "1"

    /**
     * If nextinput, <Tab> after gi brings selects the next input
     *
     * If firefox, <Tab> selects the next selectable element, e.g. a link
     */
    gimode: "nextinput" | "firefox" = "nextinput"

    /**
     * Decides where to place the cursor when selecting non-empty input fields
     */
    cursorpos: "beginning" | "end" = "end"

    /**
     * The theme to use.
     *
     * Permitted values: run `:composite js tri.styling.THEMES | fillcmdline` to find out.
     */
    theme = "default"

    /**
     * Whether to display the mode indicator or not.
     */
    modeindicator: "true" | "false" = "true"

    /**
     * Milliseconds before registering a scroll in the jumplist
     */
    jumpdelay = "3000"

    /**
     * Default logging levels - 2 === WARNING
     *
     * NB: these cannot be set directly with `set` - you must use magic words such as `WARNING` or `DEBUG`.
     */
    logging = {
        messaging: 2,
        cmdline: 2,
        controller: 2,
        containers: 2,
        hinting: 2,
        state: 2,
        excmd: 1,
        styling: 2,
    }
    noiframeon: string[] = []

    /**
     * Insert / input mode edit-in-$EDITOR command to run
     * This has to be a command that stays in the foreground for the whole editing session
     * "auto" will attempt to find a sane editor in your path.
     * Please send your requests to have your favourite terminal moved further up the list to /dev/null.
     *          (but we are probably happy to add your terminal to the list if it isn't already there.)
     */
    editorcmd = "auto"

    /**
     * The browser executable to look for in commands such as `restart`. Not as mad as it seems if you have multiple versions of Firefox...
     */
    browser = "firefox"

    /**
     * Which clipboard to store items in. Requires the native messenger to be installed.
     */
    yankto: "clipboard" | "selection" | "both" = "clipboard"

    /**
     * Which clipboard to retrieve items from. Requires the native messenger to be installed.
     *
     * Permitted values: `clipboard`, or `selection`.
     */
    putfrom: "clipboard" | "selection" = "clipboard"

    /**
     * Clipboard command to try to get the selection from (e.g. `xsel` or `xclip`)
     */
    externalclipboardcmd = "auto"

    /**
     * Set this to something weird if you want to have fun every time Tridactyl tries to update its native messenger.
     */
    nativeinstallcmd = "curl -fsSl https://raw.githubusercontent.com/tridactyl/tridactyl/master/native/install.sh | bash"

    /**
     * Set this to something weird if you want to have fun every time Tridactyl tries to update its native messenger.
     */
    win_nativeinstallcmd = `powershell -NoProfile -InputFormat None -Command "Invoke-Expression ((New-Object System.Net.WebClient).DownloadString('https://raw.githubusercontent.com/cmcaine/tridactyl/master/native/win_install.ps1'))"`

    /**
     * Profile directory to use with native messenger with e.g, `guiset`.
     */
    profiledir = "auto"

    // Container settings

    /**
     * If enabled, tabopen opens a new tab in the currently active tab's container.
     */
    tabopencontaineraware: "true" | "false" = "false"

    /**
     * If moodeindicator is enabled, containerindicator will color the border of the mode indicator with the container color.
     */
    containerindicator: "true" | "false" = "true"

    /**
     * Autocontain directives create a container if it doesn't exist already.
     */
    auconcreatecontainer: "true" | "false" = "true"

    /**
     * Number of most recent results to ask Firefox for. We display the top 20 or so most frequently visited ones.
     */
    historyresults = "50"

    /**
     * Change this to "clobber" to ruin the "Content Security Policy" of all sites a bit and make Tridactyl run a bit better on some of them, e.g. raw.github*
     */
    csp: "untouched" | "clobber" = "untouched"
}

/** @hidden */
const DEFAULTS = o(new default_config())

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
    const updatetest = v => {
        return updaters.hasOwnProperty(v) && updaters[v] instanceof Function
    }
    while (updatetest(get("configversion"))) {
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
browser.storage.onChanged.addListener(async (changes, areaname) => {
    if (CONFIGNAME in changes) {
        // newValue is undefined when calling browser.storage.AREANAME.clear()
        if (changes[CONFIGNAME].newValue !== undefined) {
            USERCONFIG = changes[CONFIGNAME].newValue
        } else if (areaname === (await get("storageloc"))) {
            // If newValue is undefined and AREANAME is the same value as STORAGELOC, the user wants to clean their config
            USERCONFIG = o({})
        }
    }
})

init()
