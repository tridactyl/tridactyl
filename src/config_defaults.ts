function o(object) {
    return Object.assign(Object.create(null), object)
}

const DEFAULTS = o({
    configversion: "0.0",
    nmaps: o({
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
        // Disabled while our find mode is bad
        /* "<c-f>": "scrollpage -1", */
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
        a: "current_url bmark",
        A: "bmark",
        zi: "zoom 0.1 true",
        zo: "zoom -0.1 true",
        zz: "zoom 1",
        ".": "repeat",
        "<SA-ArrowUp><SA-ArrowUp><SA-ArrowDown><SA-ArrowDown><SA-ArrowLeft><SA-ArrowRight><SA-ArrowLeft><SA-ArrowRight>ba":
            "open https://www.youtube.com/watch?v=M3iOROuTuMA",
    }),
    autocmds: o({
        DocStart: o({
            "addons.mozilla.org": "mode ignore",
        }),
    }),
    exaliases: o({
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
    }),
    followpagepatterns: o({
        next: "^(next|newer)\\b|»|>>|more",
        prev: "^(prev(ious)?|older)\\b|«|<<",
    }),
    searchengine: "google",
    searchurls: o({
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
    }),

    newtab: "",
    viewsource: "tridactyl", // "tridactyl" or "default"
    storageloc: "sync",
    homepages: [],
    hintchars: "hjklasdfgyuiopqwertnmzxcvb",
    hintfiltermode: "simple", // "simple", "vimperator", "vimperator-reflow"

    // Controls whether the page can focus elements for you via js
    // Remember to also change browser.autofocus (autofocusing elements via
    // HTML) in about:config
    // Maybe have a nice user-vicible message when the setting is changed?
    allowautofocus: "true",

    tabopenpos: "next",
    relatedopenpos: "related",
    ttsvoice: "default", // chosen from the listvoices list, or "default"
    ttsvolume: 1, // 0 to 1
    ttsrate: 1, // 0.1 to 10
    ttspitch: 1, // 0 to 2

    // either "nextinput" or "firefox"
    // If nextinput, <Tab> after gi brings selects the next input
    // If firefox, <Tab> selects the next selectable element, e.g. a link
    gimode: "nextinput", // either "nextinput" or "firefox"

    // either "beginning" or "end"
    // Decides where to place the cursor when selecting non-empty input fields
    cursorpos: "end",

    theme: "default", // currently available: "default", "dark"
    modeindicator: "true",

    // Default logging levels - 2 === WARNING
    logging: o({
        messaging: 2,
        cmdline: 2,
        controller: 2,
        hinting: 2,
        state: 2,
        excmd: 1,
    }),
    noiframeon: [],

    // Native messenger settings
    // This has to be a command that stays in the foreground for the whole editing session
    // "auto" will attempt to find a sane editor in your path.
    // Please send your requests to have your favourite terminal moved further up the list to /dev/null.
    //          (but we are probably happy to add your terminal to the list if it isn't already there).
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
})

export default DEFAULTS
