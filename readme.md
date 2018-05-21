![Tridactyl logo](src/static/logo/Tridactyl_200px.png)

# Tridactyl [![Build Status](https://travis-ci.org/cmcaine/tridactyl.svg?branch=master)](https://travis-ci.org/cmcaine/tridactyl) [![Matrix Chat][matrix-badge]][matrix-link] [![Gitter Chat][gitter-badge]][gitter-link]

Replace Firefox's default control mechanism with one modelled on the one true editor, Vim.

![Gigantic GIF showing Tridactyl in action](doc/AMO_screenshots/trishowcase.gif)

## Installing

[Get our "beta" builds!][betas] These are updated with each commit to master on this repo. Your browser will automatically update from there once a day. If you want more frequent updates, you can change `extensions.update.interval` in `about:config` to whatever time you want, say, 15 minutes (900 seconds). Alternatively, you can get our "stable" builds straight from [Mozilla][amo]. The changelog for the stable versions can be found [here](https://github.com/cmcaine/tridactyl/blob/master/CHANGELOG.md).

Type `:help` or press `<F1>` for online help once you're in :)

Remember that Tridactyl cannot run on any page on about:\*, data:\*, view-source:\* and file:\*. We're sorry about that and we're working with Firefox to improve this situation by removing restrictions on existing APIs and developing a new API.

We can now run on addons.mozilla.org and a few other websites if you run `fixamo` once you've installed the native messenger. `help fixamo` tells you exactly what it does.

If you're enjoying Tridactyl, or not, please leave a review on the [AMO](https://addons.mozilla.org/en-US/firefox/addon/tridactyl-vim/reviews/).

## Highlighted features

Like Vim, Tridactyl is modal, with the default mode being "normal mode". In
"normal mode", many functions are available using keybindings. In "command
mode" (when the command line is shown), you can execute more complex commands,
known as "ex-commands". All Tridactyl functionality can be accessed by
ex-commands. You can bind any ex-command to a normal-mode shortcut. We also support a `.tridactylrc` file, of which there is an example in the root of this repository.

### Default normal-mode bindings

This is a (non-exhaustive) list of the most common normal-mode bindings. Type
`:help` to open the online help for more details.

- `:` — activate the command line
- `Shift` + `Insert` — enter "ignore mode". Press `Shift` + `Insert` again to
  return to "normal mode".
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
- `;P` — copy an element's title/alt text to the clipboard
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

## WebExtension-related issues

- Navigation to any about:\* pages using `:open` requires the native messenger.
- Firefox will not load Tridactyl on about:\*, some file:\* URIs, view-source:\*, or data:\*. On these pages Ctrl-L (or F6), Ctrl-Tab and Ctrl-W are your escape hatches.
    - addons.mozilla.org is now supported so long as you run `fixamo` first.
- Tridactyl now supports changing the Firefox GUI if you have the native messenger installed via `guiset`. There's quite a few options available, but `guiset gui none` is probably what you want, perhaps followed up with `guiset tabs always`.

## Frequently asked questions

- Why doesn't Tridactyl respect my search engine settings?

    It's a webextension limitation. Firefox doesn't allow reading user preferences.

- How can I change the search engine?

    `set searchengine duckduckgo`

- How can I add a search engine?

    `set searchurls.esa http://www.esa.int/esasearch?q=`

    You can also add `%s` to specify exactly where the search query should go, which is useful for more inventive uses, such as

    `set searchurls.phrasebook https://translate.google.co.uk/#en/%s/my%20hovercraft%20is%20full%20of%20eels`

    after which `open phrasebook [fr|de|la|es|hi|it...]` will work as expected.

- Can I import/export settings, and does Tridactyl use an external configuration file just like Vimperator?

    Yes, if you have `native` working, `$XDG_CONFIG_DIR/tridactyl/tridactylrc` or `~/.tridactylrc` will be read at startup via an `autocmd` and `source`. There is an [example file available on our repository](https://github.com/cmcaine/tridactyl/blob/master/.tridactylrc).

    If you can't use the native messenger for some reason, there is a workaround: if you do `set storageloc local`, a JSON file will appear at `<your firefox profile>\browser-extension-data\tridactyl.vim@cmcaine.co.uk\storage.js`. You can find your profile folder by going to `about:support`. You can edit this file to your heart's content. 

- I hate the light, can I get a dark theme/dark mode?

    Yes: `set theme dark` or `colors dark`. Thanks to @fugerf.

- How can I bind keys using the control/alt key modifiers (eg: `ctrl+^`)?

    `:bind <C-f> scrollpage 1`. Special keys can be bound too: `:bind <F3> set theme dark` and with modifiers: `:bind <S-F3> set theme default` and with multiple modifiers: `:bind <SA-F3> composite set hintchars 1234567890 | set hintfiltermode vimperator-reflow`

    The modifiers are case insensitive. Special key names are not. The names used are those reported by Javascript with a limited number of vim compatibility aliases (e.g. `CR == Enter`).

    If you want to bind <C-^> you'll find that you'll probably need to press Control+Shift+6 to trigger it. The default bind is <C-6> which does not require you to press shift.

- How can I tab complete from bookmarks?

    `bmarks `. Bookmarks are not currently supported on `*open`: see [issue #214](https://github.com/cmcaine/tridactyl/issues/214).

- When I type 'f', can I type link names (like Vimperator) in order to narrow down the number of highlighted links?

    You can, thanks to @saulrh. First `set hintfiltermode vimperator` and then `set hintchars 1234567890`.

- How to remap keybindings in both normal mode and ex mode?

    You cannot. We only support normal mode bindings for now, with `bind [key] [excmd]`

- Where can I find a changelog for the different versions (to see what is new in the latest version)?

    [Here.](https://github.com/cmcaine/tridactyl/blob/master/CHANGELOG.md)

- Why can't I use my bookmark keywords?

    Mozilla doesn't give us access to them. See [issue #73](https://github.com/cmcaine/tridactyl/issues/73).

- Why doesn't Tridactyl work on websites with frames?

    It should work on some frames now. See [#122](https://github.com/cmcaine/tridactyl/issues/122).

- Can I change proxy via commands?

    Not yet, but this feature will eventually be implemented.

- How do I disable Tridactyl on certain sites?

    You can't yet, see [#158](https://github.com/cmcaine/tridactyl/issues/158).

- How can I list the current bindings?

    `viewconfig nmaps` works OK, but Tridactyl commands won't work on the shown page for "security reasons". We'll eventually provide a better way. See [#98](https://github.com/cmcaine/tridactyl/issues/98).

- Why doesn't Tridactyl work on some pages?

    One possible reason is that the site has a strict content security policy. We can rewrite these to make Tridactyl work, but we do not want to worsen the security of sensitive pages, so it is taking us a little while. See [#112](https://github.com/cmcaine/tridactyl/issues/112).

- How can I know which mode I'm in/have a status line?

    Press `j` and see if you scroll down :) There's no status line yet: see [#210](https://github.com/cmcaine/tridactyl/issues/210).

- Does anyone actually use Tridactyl?

    In addition to the developers, some other people do. Mozilla keeps tabs on them [here](https://addons.mozilla.org/en-US/firefox/addon/tridactyl-vim/statistics/?last=30).


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

#### Building on Windows

  - Install [Git for Windows][win-git]

  - Install [NodeJS for Windows][win-nodejs]
      - Current 8.11.1 LTS seems to work fine

  - Launch the installation steps described above from MinTTY shell
      - Also known as "Git Bash"

[win-git]: https://git-scm.com/download/win
[win-nodejs]: https://nodejs.org/dist/v8.11.1/node-v8.11.1-x64.msi

### Development loop

```
npm run build & npm run run
```

<!-- This will compile and deploy your files each time you save them. -->
You'll need to run `npm run build` every time you edit the files, and press "r" in the `npm run run` window to make sure that the files are properly reloaded.

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
[betas]: https://tridactyl.cmcaine.co.uk/betas/?sort=time&order=desc
[amo]: https://addons.mozilla.org/en-US/firefox/addon/tridactyl-vim?src=external-github
