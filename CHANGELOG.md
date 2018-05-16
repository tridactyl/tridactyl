# Tridactyl changelog

## Release 1.13.0 / Unreleased

- `editor` now includes the hostname of the site you are on in the temporary filename
    - this is mostly so that you can set up syntax highlighting in Vim, e.g,
    - `au BufReadPost *github.com* set syntax=pandoc`

- **Potentially breaking change**: pipes in `composite` now send return values to the following ex command. Use semi-colons if you want the old behaviour back (see `bind D`).

## Release 1.12.0 / 2018-05-13

- Add container support
    - `hint` will now open links in the current container
    - there is a new setting, `set tabopencontaineraware [false|true]`, which will make `tabopen` open new tabs in the current container
- Add extra `<CA-Esc>` bind to toggle ignore mode by popular demand
- Fix errors related to missing native messenger on Firefox launch

## Release 1.11.2 / 2018-05-11

- Hotfix to prevent "config undefined" errors on browser start if no rc file was found
    - It was mysteriously only reproducible sometimes...
- Make newtab changelog a bit wider

## Release 1.11.1 / 2018-05-11

- **Add "tridactylrc" support**
    - Stick a bunch of commands you want to run at startup in one of:
        - `$XDG_CONFIG_DIR/tridactyl/tridactylrc`
        - `~/.config/tridactyl/tridactylrc`
        - `~/.tridactylrc`
    - [Example file available here](https://github.com/cmcaine/tridactyl/blob/master/.tridactylrc)
    - You can run any file you want with `source [absolute path to file]`. Bonus points if you can think of something sensible to do with `source` in an `autocmd`.
    - If you want vim-style configuration where nothing persists except that which is in the rc file, simply add `sanitise tridactyllocal tridactylsync` to the top of your rc file.
    - Only whole-line comments are supported at the moment, in the VimL style where lines start with a quote mark: "

- Native messenger updated to 0.1.3
    - Add rc file reader
    - Add ability to read environment variables
    - Make read understand ~ and environment variables (used in `source`)

- Readme updated
    - Add statistics page and `guiset`

- Bug fixes
    - `guiset` can now cope with multiple Firefox instances running simultaneously provided they are started with profiles explicitly via the command line.

- Deprecations
    - Remove buffers,tabs as promised
    - Inform people pressing `I` of the new bind

## Release 1.11.0 / 2018-05-09

- You can now edit the Firefox GUI from Tridactyl with `guiset`. You must restart Firefox after using `guiset` to see the effects.
    - e.g, `guiset gui none` or `guiset gui full`.
    - see all the options with `help guiset` and following the links.
    - **Only minimally tested. Back up your precious userChrome.css if you care about it!**

- You can now choose to bypass [CSP](https://en.wikipedia.org/wiki/Content_Security_Policy) on all sites with `set csp clobber`. If you change your mind, just `unset csp`, and restart your browser.
    - This, for example, allows Tridactyl to run on pages such as https://raw.githubusercontent.com/cmcaine/tridactyl/master/CHANGELOG.md, but it could also allow other scripts to run on pages, making the Internet as dangerous as it was about 2 or 3 years ago before CSP was introduced.
    - Once this [bug](https://bugzilla.mozilla.org/show_bug.cgi?id=1267027) in Firefox is fixed, you won't have to clobber CSP.

- Tridactyl will no longer update while the browser is running in an attempt to fix issues where the add-on would be unresponsive after an update; instead, it will only update on browser launch.
    - This includes manual updates via `about:addons`. You'll need to restart the browser after clicking "Check for updates".

- `set newtab news.bbc.co.uk` etc. now looks much less janky

- Minor new features
    - Add !s alias for silent exclaim
    - `termite` and `terminator` support with `set editorcmd auto`
    - Allow binding <Esc> (not recommended...)
    - AMO explains why we need each new permission
    - Native messenger documentation improved, making it clear that we haven't reimplemented IRC in the browser.

- Minor bug fixes
    - Remove pixel gap under command bar (#442)
    - Native installer no longer requires pip and supports Debian's `which`
    - Help page links are more legible on rubbish screens
    - Turn 'q' and 'qall' into aliases
    - Fix typo regarding binding of special keys on help page
    - `focusinput` is now better at finding elements to focus

## Release 1.10.1 / 2018-05-04

- Add tabcloseallto{right,left} bound to `gx0` and `gx$`
- Update tab page and other documentation to reflect new ignore mode binding
- Fix #474: you can open a handful of about:* pages without the native messenger again
- Improve feedback when native messenger is not correctly installed   

## Release 1.10.0 / 2018-05-03

- Native messenger (for OSX/Linux only, for now)! On Linux/OSXRun `:installnative` to install, then:
    - `<Ctrl-I>` in a text field will open Vim, probably. Set it with `set editorcmd` but make sure that the command stays in the foreground till the programme is exited.
    - Not all text fields work yet (esp CodeMirror), so make sure you test it before writing war and peace.
    - `:! [shell command]` or `:exclaim [shell command]` will run the command and give you STDOUT/STDERR back in the command line.
        - You can't use composite and shell pipes together yet.
        - Anything that works in `/bin/sh` should work
            - If you want to use a different shell, just make your own alias:
                -  `command ! exclaim fish -c` (but be aware that some shells require quotes around arguments given to -c)
    - Requires a new permission to use the native messenger (and to use Tridactyl at all, unfortunately)
    - `nativeopen` will try to open a new tab or window using the native messenger. It is used in `{,win,tab}open` automatically when you try to open about:* or file:* URIs.

- Add `hint -W [exstr]` to execute exstr on hint's href
    - `hint -W exclaim_quiet mpv` works particularly well.

- **Breaking change**: change ignore mode binds to be symmetric and resolve Jupyter conflict
    - Ignore mode is now bound to `<S-Insert>` to enter and leave it.
    - Previous binds of `I` and `<S-Esc>` are unbound

- More scrolling fixes
    - `G`/`gg` will now work on more sites

- Completion improvements
    - History completion performance improved
        - If you find you are getting worse results than usual, increase `set historyresults` to, e.g, 500.
    - Fix #446: you can now edit completions you select with space
    - Completions will now pan to show you what you have selected

- Mode indicator is now print friendly (#453)!

- Fiddled with `help` theme
    - We've tried to make it look a bit more like the old Vimperator help pages and have hidden some useless or misleading bits that TypeDoc produced, such as the return values.

- `viewsource` improved
    - Now bound to `gf` by default
    - Fix viewsource elem not always covering the whole page
    - Remove viewsource elem on spa history changes

- Bind help to F1

- Changelog changelog:
    - Change changelog date format
    - Changelog: use standard case: changelog.md -> CHANGELOG.md
    - Changelog: move to the standard location
    - Changelog: add dates

- Misc fixes
    - Fix :open <empty string>. Fixes #421
    - Filter AltGraph keys. Fixes #430
    - Explain that the hint tags are typed in lowercase even though they are displayed in uppercase


## Release 1.9.8 / 2018-04-26

- Make error reporting to command line less fussy
- Fix error reporting loop with `noiframeon`

## Release 1.9.7 / 2018-04-25

- Load iframe more lazily to stop breakage on some sites
- Add setting `noiframeon` for websites that are still broken by our iframe ("ServiceNow", for example: #279)
    - Simply `set noiframeon [space separated URLs]` to blacklist URLs
- This will hopefully be our final release before the native messenger for OSX and Linux is merged.
    - If you'd like to help test it out, download our latest betas from [here](https://tridactyl.cmcaine.co.uk/betas) and run `:installnative` once you are in.

## Release 1.9.6 / 2018-04-25

- Scrolling improvements
    - Faster (#395)
    - `G`/`gg` work on more pages (#382)
- Mode indicator improvements
    - Can be disabled with `set modeindicator false`
    - Text is not selectable to improve the lives of people who "Select All" a lot
- Internal error messages are now displayed in the command line
- New default alias `:h` for `:help`
- Bug fixes
    - Fix #418: keyseq is better at realising when a key combination is invalid

## Release 1.9.5 / 2018-04-22

- Add mode indicator
- Fix #337: Make `composite` and ex-parser more sequential
    - Add `D` binding: close current tab and `tabprev`
- Bug fixes
    - Fix `tab` in inputmode
    - Catch CSP exception when hijacking

## Release 1.9.4 / 2018-04-20

- Add jumplist for inputs bound to `g;`
    - Editor's impartial note: this is pretty cool
- Add `hint -W [exstr]` to execute exstr on hint's href
- Update new tab page:
    - Add changelog
    - Remove welcome to new users as we have `tutor` for that now
    - Fix newtab redirection on `set newtab [url]`
        - `set newtab about:blank` now works thanks to a Mozilla bug fix!
    - Warn users about native messenger update
- Bug fixes
    - input-mode now correctly exits to normal mode on focus loss
    - Stop treating "std::map" or "Error: foo" as URIs: searching for them will now work.

## Release 1.9.3 / 2018-04-19

- Fix unbind issues
- Add more default binds from Vimperator
- Change the `^` bind to `<c-6>` (matches vim)
- :bmark now supports folders

## Release 1.9.2 / 2018-04-16

- Fix #392 (bug with keyseq)

## Release 1.9.1 / 2018-04-15

- Fix buffer switch bind

## Release 1.9.0 / 2018-04-15

- Allow binds with modifiers (e.g. `<C-u>`) and binds of special keys (e.g. `<F1>`) and both together (e.g. `<SA-Escape>`)
- Normal mode now only hides keypresses that you've told it to listen to from the web page
- Improve documentation
    - Update readme
    - Improve help on excmds.ts
    - Update AMO text (includes explanation of why various permissions are demanded)
    - Add tutorial on `tutor`
        - Shown on first install of Tridactyl
    - Add `viewconfig` command to open the current configuration in Firefox's native JSON viewer (which Tridactyl doesn't work in)
- [Move betas to our own site](https://tridactyl.cmcaine.co.uk/betas) as addons.mozilla.org stopped supporting them (#307)
    - Add automatic updates for betas
        - If you downloaded a beta before pre778, you will need to update manually to a later beta.
- Small new features
    - Fix #370: add `clipboard yanktitle|yankmd`
    - Add `fullscreen` command (not quite #376)
    - Add `viewsource` command
    - `set allowautofocus false` to stop pages stealing focus on load (#266, #369)
    - `^` now switches to last used tab by default
    - In command mode, `Space` now puts the URL from the selected completion into the command line (#224)
    - Add find mode, left unbound by default
        - Not ready for widespread usage: slow and probably buggy.
    - `hint -wp` to open hint in a private window (#317)
    - Configuration can now upgrade itself to allow us to rename settings
    - Add dark theme: `set theme dark` (#230)
    - Tab opening settings for `tabopen` (#342)
        - `set {related,tab}openpos next|last`
- Stuff only collaborators will care about
    - Code is now run through the prettier formatter before each commit
- Moderately large bug fixes
    - Fix scrolling on sites that use frames (#372, #63, #107, #273, #218)
    - Fix hinting on sites with frames (#67)
    - Hijack event listeners to put hints on more JavaScript links (#204, #163, #215)
- Small bug fixes
    - Fix #276: ]] on Hacker News
    - Support #/% index for tabs everywhere internally
        - Fix #341: `tabclose #` now works
    - Reduce logging
    - Rename some config:
        - Rename vimium-gi to gimode, default to firefox, version to configversion
    - Fix hinting following JavaScript links because they look the same
- Introduce new bugs
    - Show useless hints on some sites (#225)
    - and more!

## Release 1.8.2 / 2018-03-07

- Improve config API
    - `set key.subkey.subsubkey value` now works
    - Add user feedback to `bind` and `get`
- Add save link/img hint submode (;s, ;S, ;a, ;A) (#148)
- Add `autocmd [event] [filter] [ex command]`
    - Currently, only supports the event `DocStart`
    - Most useful for entering ignore mode on certain websites: `autocmd DocStart mail.google.com mode ignore`
- Add exmode aliases with `command [alias] [ex_command]`. Many aliases have been ported from Pentadactyl. (#236)
- Add urlmodify command (#286, #298)
- Support Emacs-style C-(a|e|k|u) in cmdline (#277)
- Support changing followpage pattern used in `]]` and `[[` to allow use with foreign languages
- Add logging levels and make logging less verbose by default (#206)
- Support %s magic string for search providers (#253)
- Add hintfiltermode config and new "vimperator, vimperator-reflow" hinting modes
    - Make hintPage follow link if there's only 1 option
- Fix high resource usage when typing under some circumstances (#311)
- `set newtab foo.bar` now changes all new tab pages (#235)
- Fix hints on some sites via cleanslate.css (#220)
- Fix new config system (#321)
- followpage now falls back to urlincrement
- `tabopen` now opens tabs to the right of the curent tab
- Fix floating commandline iframe on some sites (#289)
- Enter insert mode on drop down menus (#281)
- Support hinting on some dodgy old websites (#287)
- Make :reloadall only refresh current window tabs (#288)
- Remove `xx` binding (#262)
- Fix gu in directories (#256)
- Fix various typos (#247, #228)
- Add FAQ and other updates to readme.md (#232)

## Release 1.7.3 / 2017-12-21

- Hint tags are much better:
    - Hint tags are now as short as possible
    - Remove now disused `hintorder` setting
- Add `.` to repeat last action
- Add inputmode: `gi` and then `Tab` will cycle you between all input fields on a page
- Add hint kill submode `;k` for removing elements of a webpage such as dickbars
- Add relative zoom and `z{i,z,o}` binds
- Add `sanitize` excmd for deleting browsing/Tridactyl data
- Search engines:
    - Add `searchsetkeyword [keyword] [url]`: define your own search engines (#194)
    - Add Qwant and update startpage URL (#198)
    - Add Google Scholar search engine
- Fix problems where ignore mode would revert to normal mode on some websites with iframes (#176)
- Add ^ and $ in normal mode for navigation to 0% or 100% in x-direction
- Buffer completion fixes
    - Use tab ID even if buffer has a trailing space (#223)
    - completions: passthrough # in buffercompletion
- Support multiple URLs for quickmarks
- Blacklist default newtab url from history completions
- Fix `set newtab` failing to set newtab
- Add `q`, `qa`, and `quit` synonyms
- Fix `unset` failing to take effect without reloading page
- Minor improvements to `help` preface
- Add <summary> tags to standard hinting
- Log an error to browser console if no TTS voices are found

## Release 1.7.0 / 2017-12-01

 - History completion is massively improved: much faster, more relevant results, and less janky as you type.
 - User configuration
     - set [setting] without a value will inform you of the current value
     - Add configuration options for hinting: `hintchars` and `hintorder`
     - Add unset for resetting a bind to default
     - You can now change default search engine with e.g, `set searchengine bing` (#60)
     - The default new tab page can be replaced with any URL via `set newtab [url]` (#59)
     - Add `gh` and `gH` and "homepages" setting (#96)
 - Shift-tab and tab now will cycle around completions correctly
 - `ys` now works on some older pages
 - Add bmarks command for searching through bookmarks (#167)
 - Add `hint -c [selector]`: add hints that match CSS selector
 - Add text-to-speech hint mode on `;r`
 - Allow `;p` to yank any element which contains text
 - Add `;#` hint yank anchor mode
 - Improve hint CSS by adding a border and making background semi-transparent
 - Add `tabonly` command
 - Fix hinting mysteriously not working on some pages (#168)
 - Fix issue where command line would invisibly cover up part of the screen (#170)
 - Bookmarks can now have spaces in their titles
 - Fix some hints on sites such as pcgamer.co.uk
 - Long page titles will no longer appear after URLs in completions
