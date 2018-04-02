import { List, Map, Record } from 'immutable'
import * as M from './messages'

interface _GlState {
    aliases: Map<string, string>
    autoCommands: Map<string, Map<string, string>>
    cmdHistory: List<string>
    defaultSearchEngine: string
    mappings: Map<string, string>
    messages: List<M.Message>
    searchKeywords: Map<string, string>
    theme: 'light' | 'dark'
    hintCharacters: string
    hintFilterMode: 'simple' | 'vimperator' | 'vimperator-reflow'
}

const defaultState: _GlState = {
    aliases: Map({
        alias: 'command',
        au: 'autocmd',
        b: 'buffer',
        bN: 'tabprev',
        bd: 'tabclose',
        bdelete: 'tabclose',
        bfirst: 'tabfirst',
        blast: 'tablast',
        bn: 'tabnext_gt',
        bnext: 'tabnext_gt',
        bp: 'tabprev',
        bprev: 'tabprev',
        o: 'open',
        q: 'tabclose',
        qa: 'qall',
        quit: 'tabclose',
        t: 'tabopen',
        tN: 'tabprev',
        tfirst: 'tabfirst',
        tlast: 'tablast',
        tn: 'tabnext_gt',
        tnext: 'tabnext_gt',
        to: 'tabopen',
        tp: 'tabprev',
        tprev: 'tabprev',
        w: 'winopen',
    }),
    autoCommands: Map(),
    cmdHistory: List(),
    defaultSearchEngine: 'google',
    hintCharacters: 'hjklasdfgyuiopqwertnmzxcvb',
    hintFilterMode: 'simple',
    mappings: Map({
        o: 'fillcmdline open',
        O: 'current_url open',
        w: 'fillcmdline winopen',
        W: 'current_url winopen',
        t: 'fillcmdline tabopen',
        ']]': 'followpage next',
        '[[': 'followpage prev',
        '[c': 'urlincrement -1',
        ']c': 'urlincrement 1',
        T: 'current_url tabopen',
        yy: 'clipboard yank',
        ys: 'clipboard yankshort',
        yc: 'clipboard yankcanon',
        gh: 'home',
        gH: 'home true',
        p: 'clipboard open',
        P: 'clipboard tabopen',
        j: 'scrollline 10',
        k: 'scrollline -10',
        h: 'scrollpx -50',
        l: 'scrollpx 50',
        G: 'scrollto 100',
        gg: 'scrollto 0',
        $: 'scrollto 100 x',
        '^': 'scrollto 0 x',
        H: 'back',
        L: 'forward',
        d: 'tabclose',
        u: 'undo',
        r: 'reload',
        R: 'reloadhard',
        gi: 'focusinput -l',
        gt: 'tabnext_gt',
        gT: 'tabprev',
        'g^': 'tabfirst',
        g$: 'tablast',
        gr: 'reader',
        gu: 'urlparent',
        gU: 'urlroot',
        ':': 'fillcmdline',
        s: 'fillcmdline open search',
        S: 'fillcmdline tabopen search',
        M: 'gobble 1 quickmark',
        // "B": "fillcmdline bufferall",
        b: 'fillcmdline buffer',
        ZZ: 'qall',
        f: 'hint',
        F: 'hint -b',
        ';i': 'hint -i',
        ';I': 'hint -I',
        ';k': 'hint -k',
        ';y': 'hint -y',
        ';p': 'hint -p',
        ';r': 'hint -r',
        ';s': 'hint -s',
        ';S': 'hint -S',
        ';a': 'hint -a',
        ';A': 'hint -A',
        ';;': 'hint -;',
        ';#': 'hint -#',
        I: 'mode ignore',
        a: 'current_url bmark',
        A: 'bmark',
        zi: 'zoom 0.1 true',
        zo: 'zoom -0.1 true',
        zz: 'zoom 1',
        '.': 'repeat',
    }),
    messages: List(),
    searchKeywords: Map({
        google: 'https://www.google.com/search?q=',
        scholar: 'https://scholar.google.com/scholar?q=',
        googleuk: 'https://www.google.co.uk/search?q=',
        bing: 'https://www.bing.com/search?q=',
        duckduckgo: 'https://duckduckgo.com/?q=',
        yahoo: 'https://search.yahoo.com/search?p=',
        twitter: 'https://twitter.com/search?q=',
        wikipedia: 'https://en.wikipedia.org/wiki/Special:Search/',
        youtube: 'https://www.youtube.com/results?search_query=',
        amazon:
            'https://www.amazon.com/s/ref=nb_sb_noss?url=search-alias%3Daps&field-keywords=',
        amazonuk:
            'https://www.amazon.co.uk/s/ref=nb_sb_noss?url=search-alias%3Daps&field-keywords=',
        startpage:
            'https://startpage.com/do/search?language=english&cat=web&query=',
        github: 'https://github.com/search?utf8=✓&q=',
        searx: 'https://searx.me/?category_general=on&q=',
        cnrtl: 'http://www.cnrtl.fr/lexicographie/',
        osm: 'https://www.openstreetmap.org/search?query=',
        mdn: 'https://developer.mozilla.org/en-US/search?q=',
        gentoo_wiki:
            'https://wiki.gentoo.org/index.php?title=Special%3ASearch&profile=default&fulltext=Search&search=',
        qwant: 'https://www.qwant.com/?q=',
    }),
    theme: 'light',
}

interface _LocalState {
    mode: 'normal' | 'op-pending' | 'command' | 'hint' | 'find'
}

const defaultLocalState: _LocalState = {
    mode: 'normal',
}

export type GlobalState = Record<_GlState> & Readonly<_GlState>
export type LocalState = Record<_LocalState> & Readonly<_LocalState>
export const GlobalState = Record(defaultState, 'GlobalState')
export const LocalState = Record(defaultLocalState, 'LocalState')
