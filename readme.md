[gitter-badge]: https://badges.gitter.im/Join%20Chat.svg
[gitter-link]: https://gitter.im/tridactyl/Lobby

# Tridactyl [![Build Status](https://travis-ci.org/cmcaine/tridactyl.svg?branch=master)](https://travis-ci.org/cmcaine/tridactyl) [![Gitter Chat][gitter-badge]][gitter-link]

Replace ff's default control mechanism with one modelled on the one true editor, Vim.

## Contributing

### Building and installing

```
git clone https://github.com/cmcaine/tridactyl.git
cd tridactyl
npm install
npm run build # or add the `npm bin` to your path and just run webpack directly
```

Addon is built in tridactyl/build. Load it as a temporary addon in firefox with `about:debugging` or see [Development loop](#Development-loop). The addon may work in older versions of Firefox, but it's targetting Firefox 57+.

If you're updating from the older buildsystem, run this as well:

```
npm run update-buildsystem
```

### Development loop

```
npm run watch &
web-ext run -s build --firefox path/to/nightly/firefox
```

This will compile and deploy your files each time you save them.

### Committing

A pre-commit hook is added by `npm install` that simply runs `npm test`. If you know that your commit doesn't break the tests you can commit with `git commit -n` to ignore the hooks. If you're making a PR, travis will check your build anyway.

### Documentation

Ask in `#tridactyl` on [matrix.org](https://riot.im/app/#/room/#tridactyl:matrix.org), freenode, or [gitter][gitter-link]

Development notes are in the doc directory, but they're somewhat out of date. Code is quite short and not *too* badly commented, though.

## Principles and objectives

Principles:

* Keyboard > mouse
* default keybinds should be Vim-like
* actions should be composable and repeatable
* ex mode should expose all the browser functionality anyone might want
* Arguable: most (all?) actions should have an ex mode version (departure from Vim?)
* users can map and define their own actions and commands

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
* qutebrowser/jumanji - see [standalone.md](doc/standalone.md).

## WebExtensions

What we learnt from these notes has been condensed in [bug-message.md](doc/bug-message.md).

### Evaluating prior art

cVim and vimium implement some kind of vim experience using webextensions. Neither allow you to modify the browser UI.

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

### Surfing keys

TODO: Look into this
https://github.com/brookhong/Surfingkeys

### Required WebExtension APIs

Don't exist:

* See [bug-message.md](doc/bug-message.md).

Do exist:

* storage (.vimperatorrc)
* tabs
* history (for auto completion of open, etc)
* bookmarks (auto completion, obvious)
* windows (buffers)
* webNavigation (autocmds) - maybe content script would just do this for us.

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

*This is an early draft and may be entirely replaced.*

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
