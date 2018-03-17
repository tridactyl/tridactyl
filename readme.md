![Tridactyl logo](src/static/logo/Tridactyl_200px.png)

# Tridactyl [![Build Status](https://travis-ci.org/cmcaine/tridactyl.svg?branch=master)](https://travis-ci.org/cmcaine/tridactyl) [![Matrix Chat][matrix-badge]][matrix-link] [![Gitter Chat][gitter-badge]][gitter-link]

Replace Firefox's default control mechanism with one modelled on the one true editor, Vim.

## Installing

[Get our "beta" builds!][amo-betas] These are updated on AMO with each commit to master on this repo; your browser will automatically update from there once a day. If you want more frequent updates, you can change `extensions.update.interval` in `about:config` to whatever time you want, say, 15 minutes (900 seconds). Changelogs for the stable versions on the AMO can be found [here](https://github.com/cmcaine/tridactyl/blob/master/doc/changelog.md).

Type `:help` for online help once you're in :)

Remember that tridactyl cannot run on any page on addons.mozilla.org, about:\*, data:\*, view-source:\* and file:\*. We're sorry about that and we're working with Firefox to improve this situation by removing restrictions on existing APIs and developing a new API.

## Highlighted features

Like Vim, Tridactyl is modal, with the default mode being "normal mode". In
"normal mode", many functions are available using keybindings. In "command
mode" (when the command line is shown), you can execute more complex commands,
known as "ex-commands". All Tridactyl functionality can be accessed by 
ex-commands. You can bind any ex-command to a normal-mode shortcut.

### Default normal-mode bindings

This is a (non-exhaustive) list of the most command normal-mode bindings. Type
`:help` to open the online help for more details.

- `:` — activate the command line
- `I` — enter ignore mode. `Shift-Escape` to return to normal mode
- `ZZ` — close all tabs and windows, but only "save" them if your
  about:preferences are set to "show your tabs and windows from last time"
- `.` — repeat the last command

#### Navigating with the current page

- `j`/`k` — scroll down/up
- `h`/`l` — scroll left/right
- `^`/`$` — scroll to left/right margin
- `gg`/`G` — scroll to start/end of page
- `f`/`F` — enter "hint mode" to select a link to follow. `F` to open in a
  background tab
- `gi` — scroll to and focus the last-used input on the page
- `r`/`R` — reload page or hard reload page
- `yy` — copy the current page URL to the clipboard
- `[[`/`]]` — navigate forward/backward though paginated pages, for example
  comics, multi-part articles, search result pages, etc.
- `]c`/`[c` — increment/decrement the current URL by 1
- `gu` — go to the parent of the current URL
- `gU` — go to the root domain of the current URL
- `gr` — open Firefox reader mode (note: Tridactyl will not work in this mode)
- `zi`/`zo`/`zz` — zoom in/out/reset zoom

#### Find mode

Find mode is still incomplete and uses the built-in Firefox search. This will
be improved eventually.

- `/` — open the find search box
- `C-g`/`C-G` — find the next/previous instance of the last find operation
  (note: these are the standard Firefox shortcuts)

#### Bookmarks and quickmarks

- `A` — bookmark the current page
- `a` — bookmark the current page, but allow the URL to be modified first
- `M<key>` — bind a quickmark to the given key
- `go<key>`/`gn<key>`/`gw<key>` — open a given quickmark in current tab/new tab/new window

#### Navigating to new pages:

- `o`/`O` — open a URL (or default search) in this tab (`O` to pre-load current URL)
- `t`/`T` — open a URL (or default search) in a new tab (`T` to pre-load current URL)
- `w`/`W` — open a URL (or default search) in a new window (`W` to pre-load current URL)
- `p`/`P` — open the clipboard contents in the current/new tab
- `s`/`S` — force a search using the default Tridactyl search engine, opening
  in the current/new tab. This is useful when searching for something that
  would otherwise be treated as a URL by `o` or `t`
- `H`/`L` — go back/forward in the tab history
- `gh`/`gH` — go to the home page (in a new tab)

#### Handling tabs

- `d` — close the current tab
- `u` — undo the last tab/window closure
- `gt`/`gT` — go to the next/previous tab
- `g^`/`g$` — go to the first/last tab
- `b` — bring up a list of open tabs in the current window; you can type the 
  tab ID or part of the title or URL to choose a tab

#### Extended hint mode

Extended hint modes allow you to perform actions on page items:

- `;i`/`;I` — open an image (in current/new tab)
- `;s`/`;a` — save/save-as the linked resource
- `;S`/`;A` — save/save-as the selected image
- `;p` — copy an element's text to the clipboard
- `;y` — copy an element's link URL to the clipboard
- `;#` — copy an element's anchor URL to the clipboard
- `;r` — read the element's text with text-to-speech
- `;k` — delete an element from the page
- `;;` — focus an element

Additionally, you can bind to a custom CSS selector with `:hint -c [selector]`
which is useful for site-specific versions of the standard `f` hint mode.

### Binding custom commands

You can bind your own shortcuts in normal mode with the `:bind` command.
For example `:bind J tabprev` to bind `J` to switch to the previous tab.
See `:help bind` for details about this command.

NOTE: key modifiers (eg: control, alt) are not supported yet. See the FAQ below.

## WebExtension-related issues

- Do not try to navigate to any about:\* pages using `:open` as it will fail silently.
- Firefox will not load Tridactyl on addons.mozilla.org, about:\*, some file:\* URIs, view-source:\*, or data:\*. On these pages Ctrl-L (or F6), Ctrl-Tab and Ctrl-W are your escape hatches.
- Tridactyl does not currently support changing/hiding the Firefox GUI, but you can do it yourself by changing your userChrome. We've developed [quite a good one](src/static/userChrome-minimal.css) that makes windowed Firefox behave more like full-screen mode, but it's well commented, so you can make your own.

## Frequently asked questions


- How can I change the search engine?

    `set searchengine duckduckgo`

- How can I add a search engine?

    `searchsetkeyword esa http://www.esa.int/esasearch?q=`

- Can I import/export settings, and does Tridactyl use an external configuration file just like Vimperator?

    Sort of: if you do `set storageloc local`, a JSON file will appear at `<your firefox profile>\browser-extension-data\tridactyl.vim@cmcaine.co.uk\storage.js`. You can find you profile folder by going to `about:support`. 

    You can edit this file to your heart's content. A more traditional rc file is planned but will require a native messenger. For more information, see [issue #79](https://github.com/cmcaine/tridactyl/issues/79).

- I hate the light, can I get a dark theme/dark mode?

    Yes! `set theme dark`. Thanks to @fugerf.

- How can I bind keys using the control/alt key modifiers (eg: `ctrl+^`)?

    You can't, yet. See [issue #41](https://github.com/cmcaine/tridactyl/issues/41).

- How can I tab complete from bookmarks?

    `bmarks `. Bookmarks are not currently supported on `*open`: see [issue #214](https://github.com/cmcaine/tridactyl/issues/214).

- When I type 'f', can I type link names (like Vimperator) in order to narrow down the number of highlighted links?

    Not yet. See [issue #28](https://github.com/cmcaine/tridactyl/issues/28).

- How to remap keybindings in both normal mode and ex mode?

    You cannot. We only support normal mode bindings for now, with `bind [key] [excmd]`

- Where can I find a changelog for the different versions (to see what is new in the latest version)?

    [Here.](https://github.com/cmcaine/tridactyl/blob/master/doc/changelog.md)

- Why can't I use my bookmark keywords?

    Mozilla doesn't give us access to them. See [issue #73](https://github.com/cmcaine/tridactyl/issues/73).

- Why doesn't Tridactyl work on websites with frames?

    It should work on some frames now. See [#122](https://github.com/cmcaine/tridactyl/issues/122).

- Can I change proxy via commands?

    No, this is a limitation of WebExtensions.

- How do I disable Tridactyl on certain sites?

    You can't yet, see [#158](https://github.com/cmcaine/tridactyl/issues/158).

- How can I list the current bindings?

    There is no easy way. See [#98](https://github.com/cmcaine/tridactyl/issues/98).

- Why doesn't Tridactyl work on some pages?

    One possible reason is that the site has a strict content security policy. We can rewrite these to make Tridactyl work, but we do not want to worsen the security of sensitive pages, so it is taking us a little while. See [#112](https://github.com/cmcaine/tridactyl/issues/112).

- How can I know which mode I'm in/have a status line?

    Press `j` and see if you scroll down :) There's no status line yet: see [#210](https://github.com/cmcaine/tridactyl/issues/210).



## Contributing

### Building and installing

Onboarding:

```
git clone https://github.com/cmcaine/tridactyl.git
cd tridactyl
npm install
npm run build
```

Each time package.json or package-lock.json change after you checkout or pull, you should run `npm install` again.

Addon is built in tridactyl/build. Load it as a temporary addon in firefox with `about:debugging` or see [Development loop](#Development-loop). The addon should work in Firefox 52+, but we're only deliberately supporting >=57.

If you want to install a local copy of the add-on into your developer or nightly build of firefox then you can enable installing unsigned add-ons and then build it like so:

```
# Build tridactyl if you haven't done that yet
npm run build
# Package for a browser
$(npm bin)/web-ext build -s build
```

If you want to build a signed copy (e.g. for the non-developer release), you can do that with `web-ext sign`. You'll need some keys for AMO and to edit the application id in `src/manifest.json`. There's a helper script in `scripts/sign` that's used by our build bot and for manual releases.

### Development loop

```
npm run watch &
$(npm bin)/web-ext run -s build
```

This will compile and deploy your files each time you save them.

### Committing

A pre-commit hook is added by `npm install` that simply runs `npm test`. If you know that your commit doesn't break the tests you can commit with `git commit -n` to ignore the hooks. If you're making a PR, travis will check your build anyway.

### Documentation

Ask in `#tridactyl` on [matrix.org][matrix-link], freenode, or [gitter][gitter-link]. We're friendly!

Default keybindings are currently best discovered by reading the [default config](./src/config.ts).

Development notes are in the doc directory, but they're mostly out of date now. Code is quite short and not *too* badly commented, though.

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
* cVim/vimium/saka-key
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

## Logo acknowledgement

The logo was designed by Jake Beazley using free vector art by <a target="_blank" href="https://www.Vecteezy.com">www.Vecteezy.com</a> 

[gitter-badge]: https://badges.gitter.im/Join%20Chat.svg
[gitter-link]: https://gitter.im/tridactyl/Lobby
[matrix-badge]: https://matrix.to/img/matrix-badge.svg
[matrix-link]: https://riot.im/app/#/room/#tridactyl:matrix.org
[amo-betas]: https://addons.mozilla.org/en-US/firefox/addon/tridactyl-vim/versions/beta
