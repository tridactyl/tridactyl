# Tridactyl

Replace ff's default control mechanism with one modelled on the one true editor, Vim.

Principles:

* Keyboard > mouse
* default keybinds should be Vim-like
* actions should be composable and repeatable
* ex mode should expose all the browser functionality anyone might want
* Arguable: most (all?) actions should have an ex mode version (departure from Vim?)
* users can map actions and commands to other keys

Other objectives:

* be fast - the whole point of a keyboard interface is to be more efficient, don't compromise that with slow code
* don't crash - we're the new UI and we shouldn't crash
* be maintainable - code should be well documented, reasoned about and tested.

Non-objectives for v1:

* insert mode (embedded (n)vim would be good for future)
* caret or visual mode - I'm not good enough at vim to find these easier than selecting with the mouse, and they require text motions, which I would prefer to delegate to vim.

Prior art:

* pentadactyl/vimperator - dying with XUL
* cVim/vimium
* vimfx - transitioning to WebExtensions, but no ex commands
* qutebrowser/jumanji - see standalone route.

## Standalone route

Some small browsers exist that use webkit/webengine for the heavy lifting. Two notable examples even have vim-like interfaces: qutebrowser and jumanji.

Extending them *might* be easy, depending on the quality of the existing code base. We also need to evaluate these projects for maintainability: they're obviously going to have much less development power.

If it's comparable to this project done in webextensions, then we might want to just build our own/fork/contribute.

But what do we lose? What do the non-gecko bits of firefox do? What's left in the chrome repo if you remove webengine? I don't really know. 

* Kerning/font presentation code? (text in qutebrowser looks bad on Windows, don't know why)
* Cross-platform OS shit
* Firefox sync is neat and would be missed.
* safebrowsing?
* how much security stuff in engine/vs browser?
* webm, webgl and similar? Presumably handled either by the engine or externally, but maybe picking and maintaining link to external thing is expensive.
* flash handling?
* What UI stuff are we not replacing?
* developer tools (neat, but no reason for us to re-implement).

We also lose access to the existing addon/extension repos. Maybe if we implemented webextension support in our own browser we'd get them back? Don't know how difficult that is.

### A life without the addon store:

What addons do I use and would I miss them?

Should be part of the browser anyway:

* stylish --> :style, or maybe .vimperator/styles/ (with magic comments?)
* greasemonkey --> builtin/extensions/autocmds
* site blocker --> /etc/hosts

Maybe not:

* element hiding rules (ublock) not supported
* tree tabs --> better :buffer?
* lazarus form recovery is brilliant...
* noscript is shit anyway
* hide fedora is neat, but maybe just an element hiding list? Maybe it does have to parse differently.
    * example of neat addon that a smaller browser wouldn't have available, anyway.
* ref control is neat, but the UI is pants. Would be easy to build an ex-mode interface.
* pwgen is trivial
* https everywhere --> builtin?

## WebExtension option

Firefox, Chrome, Opera, and probably more support WebExtensions and there seems to be some interest in standardising. If we can get what we want with WebExtensions then we get a free ride on browser development and there's a bigger pool of developers who could contribute to the project.

### Evaluating prior art

cVim and vimium implement some kind of vim experience using webextensions, but (allegedly) this gives a poor experience. Definitely neither allow you to modify the browser UI. Possibly the statusline and keyboard input mechanism is a bit shonky because it has to run in the tab's context rather than the browser's.

TODO:

* Test cVim and vimium
* Look for UI WebExtension proposals
* Test if an HTML element added by a page script can be seen by a content-script.

#### Common issues

1. can't operate on some URLs (chrome store, chrome://, view-source://)
2. can't escape location bar
3. can't hide chrome UI
4. can't suppress all chrome keybinds
5. can't override some browser shortcuts
6. bad js kills the UI (but the same bad js locks up the whole of firefox, so y'know...)

In conclusion, a privileged keyboard webextension will help with #1,2,4,5; #3,#1 (for visual changes) and maybe #2 need a ui API. #1 might not be applicable to ff content scripts.

#### Vimium

https://github.com/philc/vimium

Very lightweight, but what is there is actually really nice. Easily fixable issues: no command mode for the features they do have; some odd default maps; mappings are done by function name rather than key ('map b Vomnibar.activateTabSelection' rather than 'map b T'). Possibly fixable issues: plugin support (source), arbitrary js eval for mappings, marks are per tab, jumplist.

Missing:

* command mode
* jumplist
* marks
* :js
* lots more.

Improvements over vimperator:

* regex search
* buffer switch between windows

#### vrome

https://github.com/jinzhu/vrome

Vim mode chromium plugin written at least partly in coffeescript. Source is not documented, but it's not so bad either (at least it's in coffeescript). Default maps are not to my liking, but that's hardly surprising. I don't see how to make new maps, tho. UI appearance is poor, appears to be influenced by context's css.

Missing:

* map!
* sensible default maps
* UI style
* documentation for users or developers
* plugin/eval support
* jumplist, etc

May be worth taking code from, could consider forking it, but would need to review code more carefully for quality issues.

#### cVim

https://github.com/1995eaton/chromium-vim

Written in uncommented javascript. But user experience is pretty good. Autocompletion in command mode is very good and it has a decent chunk of the vimperator features implemented.

Missing:

* decent documentation
* can't map some characters that vimium can
* jumplist

Improvements over vimperator:

* autocompletion is much faster
* allegedly lets you edit with vim

### Required WebExtension APIs

Don't exist:

* keyboard (not yet existent) (if content script isn't nice enough)
* ui (for hiding and for non-content-script statusline, tho not so important)

Do exist:

* storage (.vimperatorrc)
* tabs
* history (for auto completion of open, etc)
* bookmarks (auto completion, obvious)
* windows (buffers)
* webNavigation (autocmds) - maybe content script would just do this for us.

### Stuff we want to do that I know how to do:

* Show hints:
    * For each link in viewport (how to restrict to viewport?):
        * Add an element styled to appear on top of it
        * Listen for keystrokes.
    * Does vimperator just go for <a> tags? I think it probably knows about elements that can be clicked for other effects.
* Change tab
    * tabs.update(tabtodisplay, {active: true})
* Change window focus
    * windows.update(windowtofocus, {focused: true})

### Stuff I don't know how to do:

* Use promises properly.
* Use promises from a sane language (coffeescript, livescript, elm, etc).
* Find promises to cancel their chain.
* Communication between background and content scripts.

* Access a single tab's history
* scroll
* print
* zoom
* access OS clipboards

* redo/undo (in text boxes)

* ff elctrolysis framework (concurrency)
    * Do we automatically use it with we're using webextensions? Seems unlikely...
    * How to store state?
        * e.g. command history, marks, mappings, configuration, autocmd registry, 

## Vimperator features in sort of priority order for a MVP

### Normal mode

    j/k
    gt/gT
    H/L
    b
    /
    n
    N
    f
    y
    ]]
    rapid hint mode?

### Ex commands

    o
    t
    w
    nnoremap
    h
    source
    save
    autocmd

+autocomplete

### Hard mode

    :js
    :!

## Architecture

ex-commands as functions (typed and with helper functions in some other scope):

* open(url)
* scroll(x=+10)
* mark(<elem>)
* map(actions, keys)
* ...

helper functions for actions:

* scroll-x, scroll-y
* jumplist.get/getrelative/store
* undo-tab-deletion

Count and range:

* given as arguments?
* just repeat the call 'count' times?

for default actions, a mapping from key to helper function.

Generated parsers (command and normal mode):

* command mode pretty conventional. Include type checking.
* For auto-complete to work, need to be able to parse partial results sensibly.
* actions will be a slightly weirder grammar:
* More permissive
* Time sensitive

* In vim, actions compose as you write them (d takes a motion as an argument, for example), I can't think of any examples of this in vimperator: actions sometimes take a count or argument, but that argument is never an action.

* If actions did compose, we would have to give them types, as vim does for motions, and the parsing would be less trivial.

Autocomplete functions for commands:

* Split from implementation of command.
* Could perhaps be automatic from command's parameter types?

Some actions have their own interactive mini-mode:

* hints
* searching
