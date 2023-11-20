# Tridactyl changelog

# Release 1.24.0 / Unreleased

-   New features

    -   A new `:reader` mode has been added which Tridactyl binds can run on. If you prefer the old mode, it is accessible with `:reader --old`. We've left `gr` bound to the old mode for now but you can update it with `:bind gr reader`
    -   With `:set tabsort mru`, tab IDs within Tridactyl are now determined by recency of use almost everywhere. This means, e.g. that you can use `2gt` to switch to the second most recently used tab (so identical to `<C-^>`), `3gt` to the third most recently used tab, etc. ([#4595](https://github.com/tridactyl/tridactyl/issues/4595))
    -   `yq` bind added to display current URL as a QR code, with `q` bind in visual mode. See `:text2qr` for details ([#4728](https://github.com/tridactyl/tridactyl/issues/4728))
    -   `:set keyboardlayoutforce true` will now force Tridactyl to use, by default, the US keyboard layout for keybinds, even if you're using a different layout. Useful if you use multiple layouts but don't want Tridactyl binds to move, or if you use a layout such as a Cyrillic one where the default binds are difficult to use. Change the forced layout with `:set keyboatlayoutbase` ([#4532](https://github.com/tridactyl/tridactyl/issues/4532))
    -   Experimental support for opening arbitrary pages in the sidebar has been added. See `:help sidebartoggle` and `:help sidebaropen` for more details
    -   `:autocmd` and related commands now have completions ([#4604](https://github.com/tridactyl/tridactyl/issues/4604))
    -   `:open` and related commands now have completions for searchurls and previous searches ([#4562](https://github.com/tridactyl/tridactyl/issues/4562))
    -   Quality of life improvements for tab groups ([#4539](https://github.com/tridactyl/tridactyl/issues/4539))
    -   `-x` flag added to `:hint` to exclude CSS selectors from hints ([#4453](https://github.com/tridactyl/tridactyl/issues/4453))
    -   With the command line open, `<C-o>t` opens a new tab in the background for the selected completion - especially useful with `:back` completions
    -   `:hint -C [selectors]` added for custom hint modes while including the default selectors ([#4781](https://github.com/tridactyl/tridactyl/issues/4781))
    -   `;gd` rapid hint mode with discarded tabs added ([#4694](https://github.com/tridactyl/tridactyl/issues/4694))
    -   `:undo` now has fuzzy matching ([#4344](https://github.com/tridactyl/tridactyl/issues/4344))

-   Bug fixes

    -   `:find` will now find start from the current viewport ([#4486](https://github.com/tridactyl/tridactyl/issues/4486))
    -   Comments now work in multiline commands in RC files ([#4555](https://github.com/tridactyl/tridactyl/issues/4555))
    -   `:editor` now works on Gradio apps (please spare me when AI takes over the world) ([#4643](https://github.com/tridactyl/tridactyl/issues/4643))
    -   `:winmerge` completions are more readable with many windows ([#4639](https://github.com/tridactyl/tridactyl/issues/4639))
    -   `:urlincrement` now operates on the decoded URI so e.g. `%20` doesn't become `%21` ([#4616](https://github.com/tridactyl/tridactyl/issues/4616))
    -   `;m` and `;M` for Google reverse-image search now work again ([#4591](https://github.com/tridactyl/tridactyl/issues/4591))
    -   The midnight theme no longer has a white background in FF102+ ([#4576](https://github.com/tridactyl/tridactyl/issues/4576))
    -   Container colours fixed for FF108+ ([#4546](https://github.com/tridactyl/tridactyl/issues/4546))
    -   `gi` no longer goes to the start of the search box on Google ([#4706](https://github.com/tridactyl/tridactyl/issues/4706))
    -   `modeindicator` border is now configurable ([#4751](https://github.com/tridactyl/tridactyl/issues/4751))
    -   Unbindable default binds should no longer be possible ([#1922](https://github.com/tridactyl/tridactyl/issues/1922))
    -   Config should no longer reset when interacting with help page ([#4670](https://github.com/tridactyl/tridactyl/issues/4670))

-   Miscellaneous

    -   `:jsua` command added to preserve "user action" intent when using browser binds, needed for triggering certain Web Extension APIs such as `browser.sidebarAction.open()`. See `:help jsua` for more information
    -   `tri.hinting_content.hintElements` function added for advanced usage in `:js` - see [the source](https://github.com/tridactyl/tridactyl/blob/82ac6064cc522b6dc79ed71c63bc3177897e0876/src/content/hinting.ts#L406) for documentation
    -   Groundwork for multi-browser support added ([#4768](https://github.com/tridactyl/tridactyl/issues/4768))
    -   All tests now run using GitHub actions ([#4769](https://github.com/tridactyl/tridactyl/issues/4769))
    -   Docs are now built and hosted [on our website](https://tridactyl.xyz/build/static/docs/modules/_src_excmds_.html) ([#4732](https://github.com/tridactyl/tridactyl/issues/4732))
    -   Native messenger now supports Arm-based Macs with `:native` version at least 0.4.0

Thanks to all of our contributors for this release: Oliver Blanthorn, dependabot[bot], R. David Dunphy, Denis Revunov, gholk, satyamk, Pascal Jufer, glacambre, treapster, Gold Holk, Tushar, Aditya Prakash Gupta, Dhruva Sambrani, Imran Khan, Michael Joseph Rosenthal, Raffaele Mancuso, Richard Mathieson, Satyam Kumar, Simon, frikdt, josh, monirzadeh, nfd (aka alex), pataquets, petoncle, themaherdev

Extra special thanks go to Aditya Prakash Gupta, frikdt, monirzadeh, nfd (aka alex), Pascal Jufer, pataquets, petoncle, Raffaele Mancuso, R. David Dunphy, Richard Mathieson, satyamk, Satyam Kumar, Simon, themaherdev, treapster and Tushar who all contributed for the first time.

Last, but not least - thank you to everyone who reported issues.

# Release 1.23.0 / 2022-11-28

-   New features

    -   `:back` and `:forward` tab completions with tree style history ([#242](https://github.com/tridactyl/tridactyl/issues/242))
    -   Local and global marks added. `m[a-zA-Z]` to add a mark, lowercase makes a local mark (unique to that page), uppercase makes a global mark. Global marks are preserved between browser restarts. Press backtick followed by a key to go to a mark. See the eighth page of the `:tutor` for more information ([#604](https://github.com/tridactyl/tridactyl/issues/604))
    -   `:tgroup*` functionality added for "tab groups" for showing/hiding groups of tabs and switching between them. See `:help tgroupcreate` and `:help tgroupswitch` for usage tips ([#2359](https://github.com/tridactyl/tridactyl/issues/2359))
    -   Proxy support added with `:proxyadd`, `:set proxy` and `:autocontain` support ([#4036](https://github.com/tridactyl/tridactyl/issues/4036))
    -   `:tab` completions now shows whether tabs are pinned (P), audible (A), muted (M), or discarded (D) and allows filtering by these characters. `:set statusstylepretty true` to display emojis instead (but always use the same characters for filtering)
    -   If bookmarking the current URL, `:bmark` will now use the tab's title if one is not provided, even if a folder path is provided ([#4457](https://github.com/tridactyl/tridactyl/issues/4457))
    -   `:gobble` mode now accepts key combinations as terminators rather than just counts of key presses to accept. This lays the groundwork for making Tridactyl friendlier to more keyboard layouts ([#4440](https://github.com/tridactyl/tridactyl/issues/4440))
    -   `:set jsurls.[keyword]` added which work like `searchurls` but provide js functions whose return value is called by `{,tab,win}open`. See `:help jsurls` for more information ([#4193](https://github.com/tridactyl/tridactyl/issues/4193))
    -   `searchurls` now support array slicing with `%s[n:m]` ([#4194](https://github.com/tridactyl/tridactyl/issues/4194))
    -   `:tabopen --focus-address-bar` added to open a new tab and give focus to the address bar ([#4259](https://github.com/tridactyl/tridactyl/issues/4259))
    -   `{search,js}url` now support aliases ([#4363](https://github.com/tridactyl/tridactyl/issues/4363))
    -   `:autocmd` now lets you modify requestHeaders and responseHeaders, for example if you want to change your User-Agent ([#4438](https://github.com/tridactyl/tridactyl/issues/4438))
    -   `ex.insert_space` command added to insert a space in the command line, bound to `<C-Space>` by default ([#4176](https://github.com/tridactyl/tridactyl/issues/4176))

-   Bug fixes

    -   `visual` mode will now exit erroneously less often ([#4339](https://github.com/tridactyl/tridactyl/issues/4339))
    -   Hint mode will now open more links in new tabs when requested, rather than falling back to opening things in the current tab ([#4430](https://github.com/tridactyl/tridactyl/issues/4430))
    -   `:open` should now work with bookmarklets ([#4188](https://github.com/tridactyl/tridactyl/issues/4188))
    -   `:find` now searches from view and gains some new arguments to control its behaviour ([#4378](https://github.com/tridactyl/tridactyl/issues/4378))
    -   `:issue` should now prefill its fields correctly ([#3927](https://github.com/tridactyl/tridactyl/issues/3927))
    -   You can no longer attempt to save files to illegal filenames ([#4126](https://github.com/tridactyl/tridactyl/issues/4126))
    -   Flickering when opening a new tab with dark mode enabled has been reduced ([#4414](https://github.com/tridactyl/tridactyl/issues/4414))
    -   `forced-color` CSS support improved ([#4283](https://github.com/tridactyl/tridactyl/issues/4283))
    -   `:mktridactylrc` doesn't make `:seturl`s into global settings ([#4289](https://github.com/tridactyl/tridactyl/issues/4289))
    -   `:set tabsort mru` now displays the current tab at the bottom ([#4169](https://github.com/tridactyl/tridactyl/issues/4169))

-   Miscellaneous
    -   More `:bind --mode=browser` bind slots added ([#4275](https://github.com/tridactyl/tridactyl/issues/4275))
    -   We've added the `arg` argument parsing library so excmd arguments might become more consistent one day :)
    -   Documentation of `:allowautofocus` and `:unfocus` improved
    -   Documentation of `:native` for containerised (Snap, Flatpak, etc) installations of Firefox improved ([#4406](https://github.com/tridactyl/tridactyl/issues/4406))
    -   Documentation for `:autocmd` improved ([#4320](https://github.com/tridactyl/tridactyl/issues/4320))
    -   `:bind [key]` now returns a valid `:bind` command that you can edit ([#4409](https://github.com/tridactyl/tridactyl/issues/4409))
    -   `:get [setting]` no longer returns an equals sign so it can be more easily changed into a `:set` ([#4410](https://github.com/tridactyl/tridactyl/issues/4410))
    -   `:tutor` is now viewable directly on GitHub ([#4381](https://github.com/tridactyl/tridactyl/issues/4381))

Thanks to all of our contributors for this release: Oliver Blanthorn, dependabot[bot], gholk, ivcz, pvs, Mariusz Kaczmarczyk, Michael Joseph Rosenthal, Denis Revunov, Gold Holk, Janek, Fox Kiester, Nicolas Ganz, Babil G. Sarwar, David Scotson, Eric, Eugene, Igor, Luka Markušić, Nicolas, Robin Ekman, badcold, fluem and mariuszdb.

Extra special thanks go to badcold, Denis Revunov, Eric, Fox Kiester, gholk, Gold Holk, Igor, Janek, Luka Markušić, mariuszdb, Michael Joseph Rosenthal, Nicolas, Nicolas Ganz and Robin Ekman who all contributed for the first time.

Last, but not least - thank you to everyone who reported issues.

# Release 1.22.1 / 2022-03-23

-   New features

    -   Tridactyl will prompt you if you try to leave a page while `:editor` is running ([#3915](https://github.com/tridactyl/tridactyl/issues/3915))
    -   Tridactyl pages will not flash white if your system theme is set to dark mode ([#2510](https://github.com/tridactyl/tridactyl/issues/2510))
    -   `:goto` added to jump to a heading on a page, see `:help gotoselector` for configuration ([#4116](https://github.com/tridactyl/tridactyl/issues/4116))
    -   `:wintitle` command added to add a prefix to the current window title ([#4049](https://github.com/tridactyl/tridactyl/issues/4049))

-   Bug fixes

    -   The mode indicator should no longer show up on printed pages ([#453](https://github.com/tridactyl/tridactyl/issues/453))
    -   The changelog is more readable on dark themes ([#4005](https://github.com/tridactyl/tridactyl/issues/4005))
    -   `:tabpush` will no longer show the current window ([#4114](https://github.com/tridactyl/tridactyl/issues/4114))
    -   nor will `:tabgrab` ([#3283](https://github.com/tridactyl/tridactyl/issues/3283))
    -   `:autocontain` will now pick the longest regex that matches a container if multiple filters match ([#3545](https://github.com/tridactyl/tridactyl/issues/3545))
    -   `:elementunhide` works again ([#4069](https://github.com/tridactyl/tridactyl/issues/4069))
    -   The mode indicator can reappear after leaving a mode in which it was disabled with `:set modeindicatormodes.[mode] false` ([#2690](https://github.com/tridactyl/tridactyl/issues/2690))
    -   The `:editor` icon should now be correctly removed when finished ([#3909](https://github.com/tridactyl/tridactyl/issues/3909))
    -   `:set newtab about:newtab` will no longer cause two tabs to be opened ([#3656](https://github.com/tridactyl/tridactyl/issues/3656))

-   Miscellaneous

    -   The hacker news comment toggler in the exemplar RC file has been fixed ([#4124](https://github.com/tridactyl/tridactyl/issues/4124))
    -   Warnings added to the new tab page about upcoming permission requests

Thanks to all of our contributors for this release: Oliver Blanthorn, dependabot[bot], pvs, David Scotson, Calvin T. Nesbitt, Colin Caine, Gerard Bosch, Icelk, Liam Hupfer, Mo, Mo Hijazi and glacambre

Extra special thanks go to Calvin T. Nesbitt, David Scotson, Gerard Bosch, Icelk, Liam Hupfer, Mo and Mo Hijazi who all contributed for the first time.

Last, but not least - thank you to everyone who reported issues.

# Release 1.22.0 / 2021-11-29

-   New features

    -   A `superignore` setting has been added which nearly totally disables Tridactyl, per page. Use it with `:seturl` only. If you break Tridactyl with it, remember that you can always use the `tri` keyword in the address bar to execute ex-commands ([#3497](https://github.com/tridactyl/tridactyl/issues/3497))
    -   `:drawing{start,stop,erasertoggle}` added to scribble on pages
    -   `:hint -V` hint mode added, bound to `;V`, which adds hints to all matching elements on the page, including ones outside the viewport ([#3534](https://github.com/tridactyl/tridactyl/issues/3534))
    -   `:set completionfuzziness [0-1]` added to control strictness of completion matches ([#3556](https://github.com/tridactyl/tridactyl/issues/3556))
    -   The cursor is no longer shown in no mouse mode ([#3891](https://github.com/tridactyl/tridactyl/issues/3891))
    -   For our own `:find` mode, there is now a `findhighlighttimeout` setting (in milliseconds) which allows you to control how long text stays highlighted after a search ([#3854](https://github.com/tridactyl/tridactyl/issues/3854))
    -   Tabs may now be renamed with `:tabrename` ([#3577](https://github.com/tridactyl/tridactyl/issues/3577))
    -   Hint mode now tidies up any previous hints when it is entered
    -   `:colours midnight` added - a dark theme based on shydactyl ([#3750](https://github.com/tridactyl/tridactyl/issues/3750))
    -   `:urlmodify` can now accept a URL as an argument ([#3748](https://github.com/tridactyl/tridactyl/issues/3748))
    -   `:tabpush` now pushes to the next most recently used window if no other argument is given
    -   `:colourscheme auto` theme added which follows your system's dark/light mode setting ([#3923](https://github.com/tridactyl/tridactyl/issues/3923))
    -   `:setmode [mode] allowautofocus [true|false]` added, currently only for the `allowautofocus` setting, to control the setting per-mode ([#3740](https://github.com/tridactyl/tridactyl/issues/3740))

-   Bug fixes

    -   The new tab page no longer has invisible links on it when set to `about:blank` ([#1743](https://github.com/tridactyl/tridactyl/issues/1743))
    -   `:viewconfig` might now work more reliably but we are not sure ([#3653](https://github.com/tridactyl/tridactyl/issues/3653))
        -   it also works from Tridactyl pages now, at least some of the time
    -   `:nmode` is now shown in the mode indicator
    -   `:open` will now always run in its own tab ([#3583](https://github.com/tridactyl/tridactyl/issues/3583))
    -   Hint modes now accept a much wider array of arguments ([#3534](https://github.com/tridactyl/tridactyl/issues/3534))
    -   `:source --url` now works on data URIs ([#3540](https://github.com/tridactyl/tridactyl/issues/3540))
    -   `:guiset` now gives a more useful error on reading a malformed userChrome.css ([#3541](https://github.com/tridactyl/tridactyl/issues/3541))
    -   `:mpvsafe` now leaves MPV running after Firefox exits on all platforms ([#3538](https://github.com/tridactyl/tridactyl/issues/3538))
    -   `:viewcontainers` uses `:jsonview` internally which should fix how it is displayed from Tridactyl pages ([#3539](https://github.com/tridactyl/tridactyl/issues/3539))

    -   `:containerdelete` no longer closes all normal tabs if an invalid container is given ([#3536](https://github.com/tridactyl/tridactyl/issues/3536))
    -   `:set auconcreatecontainer fales` is now respected ([#3537](https://github.com/tridactyl/tridactyl/issues/3537))
    -   GitHub and other SVG favicons should appear in the tab completions ([#3892](https://github.com/tridactyl/tridactyl/issues/3892))
    -   `:editor` now correctly returns a value ([#3800](https://github.com/tridactyl/tridactyl/issues/3800))

-   Miscellaneous

    -   We've switched from webpack to esbuild which has reduced dev-build times from 40 seconds to about 1 second ([#3645](https://github.com/tridactyl/tridactyl/issues/3645))
    -   Tridactyl can now be built from ~5MB of source, down from ~100MB ([#3632](https://github.com/tridactyl/tridactyl/issues/3632))
    -   We've switched from ramda to rambda which is a bit faster ([#3628](https://github.com/tridactyl/tridactyl/issues/3628))
    -   We've switched from web-ext-types to definitely typed types, which are a bit better maintained
    -   We update the DOM in place a bit less, which could speed up `:tab` completions
    -   Hint mode is a bit faster ([#3582](https://github.com/tridactyl/tridactyl/issues/3582))
    -   Dev builds of Tridactyl now open a new tab page when Tridactyl code is updated ([#3564](https://github.com/tridactyl/tridactyl/issues/3564))
    -   We're now using `firenvim`s web-editor library which means that CodeMirror, Monaco and other in-browser code editors now work with `:editor` ([#3851](https://github.com/tridactyl/tridactyl/issues/3851))
    -   Native messenger bumped to version 0.3.6 from 0.3.4; fixes .tridactylrc search paths on windows and saving files to directories without specifying a filename

Thanks to all of our contributors for this release: dependabot-preview[bot], Oliver Blanthorn, dependabot[bot], Vincent Tavernier, Rummskartoffel, Dhruva Sambrani, karizma, Jay Kamat, Aaron Rancsik, Simon H Moore, glacambre, ivcz, Caleb Maclennan, Eugene, Ivan Oleynikov, Søren Knudsen, meep, mozbug and slmb3.

Extra special thanks go to Aaron Rancsik, Eugene, Ivan Oleynikov, ivcz, karizma, meep, slmb3, Søren Knudsen and Vincent Tavernier who all contributed for the first time.

Last, but not least - thank you to everyone who reported issues.

# Release 1.21.1 / 2021-03-19

-   New features

    -   `:saveas` has new `--overwrite` and `--cleanup` flags ([#3362](https://github.com/tridactyl/tridactyl/issues/3362))
    -   `:mousemode` added to revert `:nomousemode` ([#3442](https://github.com/tridactyl/tridactyl/issues/3442))
    -   `:tabopen -w` added, which waits for the page to load before returning. Useful in `:composite` with e.g. `:composite tabopen -b -w news.bbc.co.uk ; tabnext` ([#3396](https://github.com/tridactyl/tridactyl/issues/3396))

-   Bug fixes

    -   `:nativeinstall` now correctly bypasses execution policy on Windows
    -   `gi` now supports "textbox" ARIA roles - i.e. it works on Twitter now ([#3459](https://github.com/tridactyl/tridactyl/issues/3459))
    -   `w` in visual mode now selects the first character of the next word ([#3455](https://github.com/tridactyl/tridactyl/issues/3455))
    -   Native messenger doesn't get stuck in an infinite loop on Windows for non-Firefox Firefox-derivate browsers (e.g. Waterfox) ([#3443](https://github.com/tridactyl/tridactyl/issues/3443))
    -   `:native` now behaves better when reading non-existent files ([#3418](https://github.com/tridactyl/tridactyl/issues/3418))
    -   `:nativeupdate` now works on Windows and elsewhere ([#3404](https://github.com/tridactyl/tridactyl/issues/3404))
        -   NB: the success/failure messages are no longer meaningful; improving these again is a work in progress.
    -   `text.backward_kill_word` command fixed on single characters ([#3405](https://github.com/tridactyl/tridactyl/issues/3405))

-   Miscellaneous
    -   CI linting now works ([#3477](https://github.com/tridactyl/tridactyl/issues/3477))

Thanks to all of our contributors for this release: dependabot-preview[bot], Oliver Blanthorn, Dhruva Sambrani, Rummskartoffel, Jez Cope, Babil G. Sarwar, Babil Golam Sarwar, Hosein Naghdbishi, Laura, William, WorldCodeCentral and fluem.

Extra special thanks go to Babil G. Sarwar, Dhruva Sambrani, Hosein Naghdbishi, Jez Cope, Laura and William who all contributed for the first time.

Last, but not least - thank you to everyone who reported issues.

# Release 1.21.0 / 2021-02-22

-   New features

    -   `:tabclose` now accepts `window_number.tab_number` arguments; this is particularly useful for use with `<S-Del>` to close `:taball` completions
    -   `:tab` completions now show which tabs are playing audio
    -   `:tabaudio` tab with `ga` default bind takes you to the window and tab which is currently playing audio ([#3184](https://github.com/tridactyl/tridactyl/issues/3184))
    -   Favicons are lazy loaded in `:tab` completions
    -   `:urlincrement` binds now accept numeric prefixes, e.g. `10<C-a>` increments the URL by 10 ([#3145](https://github.com/tridactyl/tridactyl/issues/3145))
    -   `:seturl` now checks that you have entered a valid RegEx ([#3134](https://github.com/tridactyl/tridactyl/issues/3134))
        -   previously, failing to do so broke Tridactyl
    -   `:colours` now accepts a `--url` option to load a theme from the internet with no need for `:native` ([#3148](https://github.com/tridactyl/tridactyl/issues/3148))
    -   `:colours` now has completions for default and installed themes (i.e. themes for which you have already run `:colours` once)
    -   `:colours` will fall back to loading custom themes from the Tridactyl storage if they cannot be found on disk
    -   `yo` bind added to yank URLs and titles in an Emacs-compatible org-mode format
    -   `:tab [string]` now switches to the first tab that matches that string ([#3263](https://github.com/tridactyl/tridactyl/issues/3263))
        -   predominantly for non-interactive use. If you wish to use it interactively run `:set completions.Tab.autoselect false` first.
    -   `:reloaddead` command added to force all tabs which Tridactyl is not running in to load. Useful for making tab switching more pleasurable ([#3260](https://github.com/tridactyl/tridactyl/issues/3260))
    -   `:mkt --clipboard` added to put a Tridactyl RC file in your clipboard. Use with e.g. GitHub Gist and `:source --url` to avoid needing `:native` installed
    -   Custom themes no longer require special classnames - see `:help colours` to see current requirements (there are essentially none) ([#3288](https://github.com/tridactyl/tridactyl/issues/3288))
    -   `:set hintautoselect [true|false]` added to determine whether hints are automatically followed if there is only one ([#3097](https://github.com/tridactyl/tridactyl/issues/3097))
    -   `:set logging.autocmds debug|info|warning|error` added to make debugging autocmds easier ([#3381](https://github.com/tridactyl/tridactyl/issues/3381))
    -   `:set tabclosepinned true|false` added to prevent `d` from closing pinned tabs ([#3363](https://github.com/tridactyl/tridactyl/issues/3363))
    -   `:tabsort` command added to sort tabs according to titles, URLs or container ([#3364](https://github.com/tridactyl/tridactyl/issues/3364))
    -   `:winopen -c [container]` added for opening containers in new windows ([#3326](https://github.com/tridactyl/tridactyl/issues/3326))
    -   `:set completions.TabAll.autoselect true|false` added to allow spaces to be used when filtering ([#1835](https://github.com/tridactyl/tridactyl/issues/1835))
    -   `:scrollpage` binds now accept counts ([#3319](https://github.com/tridactyl/tridactyl/issues/3319))

-   Bug fixes

    -   We now queue up commands that interact with completions alongside those completions ([#3196](https://github.com/tridactyl/tridactyl/issues/3196))
        -   this means in practice that, once the command line has loaded, you can type as quickly as you like and still get the results you expect
    -   Profile directory detection has been improved on Windows ([#3191](https://github.com/tridactyl/tridactyl/issues/3191))
    -   Speed of `:editor` selection on Windows has improved ([#3170](https://github.com/tridactyl/tridactyl/issues/3170))
    -   The command line no longer has a blue outline on OSX ([#3123](https://github.com/tridactyl/tridactyl/issues/3123))
    -   `:yankimage` now accepts more MIME types ([#3127](https://github.com/tridactyl/tridactyl/issues/3127))
    -   `:quickmarks` should now be a little more reliable ([#3299](https://github.com/tridactyl/tridactyl/issues/3299))
    -   `:mkt` now no longer breaks with custom themes ([#2535](https://github.com/tridactyl/tridactyl/issues/2535))
    -   `:firefoxsyncpush` no longer breaks with custom themes ([#3050](https://github.com/tridactyl/tridactyl/issues/3050))
    -   `:bmark` completions no longer interfere with flags ([#3274](https://github.com/tridactyl/tridactyl/issues/3274))
    -   `:zoom` works with negative relative increments ([#3031](https://github.com/tridactyl/tridactyl/issues/3031))
    -   `:undo` completions now show negative times more gracefully ([#3339](https://github.com/tridactyl/tridactyl/issues/3339))
    -   `:tabopen .thing` now searches for `.thing` ([#3398](https://github.com/tridactyl/tridactyl/issues/3398))
    -   `:winopen` no longer puts focus in the URL bar

-   Miscellaneous

    -   The native messenger is now written in `Nim` and is much faster (especially noticeable on `:editor`). You may need to run `:nativeupate` to update it - the latest `:native` version is `0.2.5`
        -   We have removed `pyeval` support from this version - you are very unlikely to have used this since it was an internal Tridactyl command. `:exclaim` is unaffected.
    -   `:taball` now internally uses `:tab` ([#3262](https://github.com/tridactyl/tridactyl/issues/3262))
    -   We no longer load all default themes into every tab ([#3288](https://github.com/tridactyl/tridactyl/issues/3288))
    -   `<C-c>` and `<C-a>` binds have been removed from the command line as they were widely disliked ([#3229](https://github.com/tridactyl/tridactyl/issues/3229))
    -   `:colours shydactyl` now uses more CSS variables ([#3390](https://github.com/tridactyl/tridactyl/issues/3390))
    -   Type checking has been tightened a little ([#3386](https://github.com/tridactyl/tridactyl/issues/3386))
    -   Privacy policy added (summary: we don't collect anything outside of IP logs on our servers) ([#3375](https://github.com/tridactyl/tridactyl/issues/3375))
    -   `:native` is now cached for a few milliseconds to speed up repeated version checks ([#3366](https://github.com/tridactyl/tridactyl/issues/3366))
    -   `no-throw-literal` eslint rule added to ensure Tridactyl errors get to the user usefully

Thanks to all of our contributors for this release: dependabot-preview[bot], Oliver Blanthorn, Rummskartoffel, fluem, Benoit de Chezelles, Bruno Garcia, Jay Kamat, Babil Golam Sarwar, Elliott Shugerman, Annie Zhang, Tiago Epifânio, glacambre and yellowmoneybank.

Extra special thanks go to Annie Zhang, Benoit de Chezelles, Bruno Garcia, Elliott Shugerman, Jay Kamat, Tiago Epifânio and yellowmoneybank who all contributed for the first time.

Last, but not least - thank you to everyone who reported issues.

# Release 1.20.4 / 2020-12-21

-   New features

    -   `;Y` image-to-clipboard hint mode ([#3085](https://github.com/tridactyl/tridactyl/issues/3085))
    -   `:viewconfig` can now accept a dot-delimited path like `:set`, e.g. `:viewconfig completions.Tab`
    -   `;x` and `;X` "emergency" hint modes added. They use `xdotool` and `:native` to move the mouse and click on the hinted element - if you don't have `xdotool` or `:native` installed they won't work. ([#3077](https://github.com/tridactyl/tridactyl/issues/3077))
    -   Duplicates are now skipped in command history ([#3042](https://github.com/tridactyl/tridactyl/issues/3042))

-   Bug fixes

    -   `:viewconfig` now gets completions and `:viewconfig --{user,default}` now accept a key to examine ([#3098](https://github.com/tridactyl/tridactyl/issues/3098))
    -   `#` comments are now skipped in RC files ([#3100](https://github.com/tridactyl/tridactyl/issues/3100))
    -   `:bind --mode=browser` now works with binds involving `Space` ([#3101](https://github.com/tridactyl/tridactyl/issues/3101))
    -   `<C-Enter>` on the command line no longer inserts a space before its invocation ([#3089](https://github.com/tridactyl/tridactyl/issues/3089))
    -   All "normal" clipboard operations now use the newer Clipboard API, fixing various bugs ([#3078](https://github.com/tridactyl/tridactyl/issues/3078))
    -   web.whatsapp.com now has a special default hint mode so that hints actually work ([#1567](https://github.com/tridactyl/tridactyl/issues/1567))
    -   `:nativeintall` can now run on POSIX-y systems without needing `bash` ([#3020](https://github.com/tridactyl/tridactyl/issues/3020))
    -   `;#` hint mode now throws no errors if no anchors are found ([#2964](https://github.com/tridactyl/tridactyl/issues/2964))

-   Miscellaneous

    -   Fix linter errors on src/excmds.ts by switching to `no-unused-vars-experimental` ([#3111](https://github.com/tridactyl/tridactyl/issues/3111))

Thanks to all of our contributors for this release: dependabot-preview[bot], Oliver Blanthorn, Rummskartoffel and Timothy Robert Bednarzyk.

Extra special thanks go to Timothy Robert Bednarzyk who contributed for the first time.

Last, but not least - thank you to everyone who reported issues.

# Release 1.20.3 / 2020-11-28

-   New features

    -   `g!` jumbles all text on the page, inspired by [this letter](https://www.newscientist.com/letter/mg16221887-600-reibadailty/) ([#2913](https://github.com/tridactyl/tridactyl/issues/2913))
    -   `:set modeindicatormodes.[mode] true|false` controls whether the mode indicator should show in a specific mode ([#2690](https://github.com/tridactyl/tridactyl/issues/2690))
    -   New theme, `quakelight`, essentially identical to the default theme but with the command line at the top of the page.
    -   Whether a completion autoselects the closest match is now configurable with `:set completions.[CompletionSource].autoselect true|false`. The completion sources are the ones Tridactyl uses internally - use `:get completions` to see the list ([#2901](https://github.com/tridactyl/tridactyl/issues/2901))
    -   `:bmarks` now autoselects its completion by default. `:set completions.Bmark.autoselect false` to disable ([#2863](https://github.com/tridactyl/tridactyl/issues/2863))
    -   `:undo tab_strict` only restores tabs in the current window ([#2883](https://github.com/tridactyl/tridactyl/issues/2883))
    -   `:js` now accepts a flag, `-d`, to specify an EOF character which allows space-separated arguments to be given to it, stored in the array `JS_ARGS` ([#2859](https://github.com/tridactyl/tridactyl/issues/2859))
        -   for example, `composite command only_second js -d% window.alert(JS_ARGS[1])%; only_second ignoreme SHOW_THIS! ignoreme ignoreme`
    -   `UriChange` event has been added for `:autocmd`, for use on modern web applications which update their URI without navigating to a new page ([#3003](https://github.com/tridactyl/tridactyl/issues/3003))
        -   this should only be used as a last resort as it uses a timer which can reduce battery life
    -   `;K` hint mode added to reversibly hide elements from the page; hidden elements can be restored with `:elementunhide` ([#2934](https://github.com/tridactyl/tridactyl/issues/2934))

-   Bug fixes

    -   `:undo` and `:rssexec` completions now autoselect the closest match, as was always intended ([#2901](https://github.com/tridactyl/tridactyl/issues/2901))
    -   `:credits` no longer disappears before showing all authors ([#665](https://github.com/tridactyl/tridactyl/issues/665))
    -   `:js -r` now works on Windows ([#3017](https://github.com/tridactyl/tridactyl/issues/3017))
    -   `:hint` now can operate on `HTMLDetailsElements` ([#2984](https://github.com/tridactyl/tridactyl/issues/2984))
    -   `:help` and `:tutor` now follow the Tridactyl theme ([#2895](https://github.com/tridactyl/tridactyl/issues/2895))

-   Miscellaneous

    -   Various improvements to docs from a few different contributors
    -   `nativeinstall` on Windows now installs the native messenger corresponding to your version of Tridactyl, meaning that we can finally make breaking changes to the native messenger! ([#3027](https://github.com/tridactyl/tridactyl/issues/3027))
    -   `git hooks` no longer prevent committing from Windows ([#3033](https://github.com/tridactyl/tridactyl/issues/3033))

Thanks to all of our contributors for this release: dependabot-preview[bot], Oliver Blanthorn, fluem, Rummskartoffel, R Primus, Morgan Connolly, Sayan, Espen Henriksen, Mariusz Kaczmarczyk, glacambre and trixxo.

Extra special thanks go to Espen Henriksen, fluem, Mariusz Kaczmarczyk, R Primus, Rummskartoffel, Sayan and trixxo who all contributed for the first time.

Last, but not least - thank you to everyone who reported issues.

# Release 1.20.2 / 2020-09-27

-   New features

    -   `:set escapehatchsidebarhack false` stops `<C-,>` from closing the sidebar (usually Tree Style Tab) at the expense of not being able to grab focus back from the address bar ([#2775](https://github.com/tridactyl/tridactyl/issues/2775))
    -   `:autocmd` now provides magic variables for many events (so, e.g. you can tell an ex command which tab it should close). See `:help autocmd` and scroll down to the `...excmd` parameter for more information ([#2814](https://github.com/tridactyl/tridactyl/issues/2814))
        -   `:zoom` now accepts a tab ID to tell it which tab to zoom ([#2809](https://github.com/tridactyl/tridactyl/issues/2809))

-   Bug fixes
    -   Normal mode now waits for user configuration to load before accepting any keypresses ([#2839](https://github.com/tridactyl/tridactyl/issues/2839))
    -   Browser-wide maps now show up in `:bind` completions

Thanks to all of our contributors for this release: dependabot-preview[bot], Oliver Blanthorn and Simon H Moore

Extra special thanks go to Simon H Moore who contributed for the first time.

Last, but not least - thank you to everyone who reported issues.

# Release 1.20.1 / 2020-08-17

-   Bug fixes
    -   Tridactyl should now display the right version number on the new tab page and elsewhere ([#2262](https://github.com/tridactyl/tridactyl/issues/2262))
    -   RC files will again be sourced at startup ([#2726](https://github.com/tridactyl/tridactyl/issues/2726))
    -   ex-command logs now use the right name: `excmd` ([#2727](https://github.com/tridactyl/tridactyl/issues/2727))
    -   the no-new-tab build no longer shows our new tab page with `:tabopen` ([#1571](https://github.com/tridactyl/tridactyl/issues/1571))
    -   `<C-[>` now takes you to normal mode in more modes ([#2723](https://github.com/tridactyl/tridactyl/issues/2723))

Thanks to all of our contributors for this release: dependabot-preview[bot], Oliver Blanthorn and xi.

Extra special thanks go to xi who contributed for the first time.

Last, but not least - thank you to everyone who reported issues.

# Release 1.20.0 / 2020-08-06

-   New features

    -   `<C-,>` browser-wide bind added to new ex-command, `:escapehatch` which returns focus to the page and returns you to a tab where Tridactyl can run.
    -   User-configurable browser-wide binds added with lots of caveats. See `:help bind` and `:bind --mode=browser` for more details.
        -   `<C-6>` and `<CS-6>` are now bound to `:tab #` browser-wide, except on Windows, where the previous behaviour remains, with a new `<A-6>` bind instead.
    -   Autocommands now support `WebRequest` events - see `:help autocmd` for more details. Particularly useful for e.g. redirecting sites.
    -   Callback hintmode on `hint -F` added for running arbitrary JS on an element you select. ([#2552](https://github.com/tridactyl/tridactyl/issues/2552))
    -   `:blacklistdelete` alias added as the inverse of `:blacklistadd`
    -   Hints on elements due to JavaScript `onclick` events now appear grey. If an element has a grey hint and a normal hint, the normal hint is probably the right one. ([#2259](https://github.com/tridactyl/tridactyl/issues/2259))
    -   Hints can no longer overlap. ([#2534](https://github.com/tridactyl/tridactyl/issues/2534))
    -   `:winmerge` ex-command added to merge windows ([#404](https://github.com/tridactyl/tridactyl/issues/404))
    -   `:tabgrab` and `tabpush` ex-commands added to move tabs between windows ([#2540](https://github.com/tridactyl/tridactyl/issues/2540))
    -   `:ex.copy_completion` ex-mode command added to copy the currently selected completion, bound to `<C-o>yy` while the command line is open
    -   `:tabopen` now never puts focus in the address bar ([#2490](https://github.com/tridactyl/tridactyl/issues/2490))
    -   The little pop-up telling you the address of a link you are hovering over is now hidden when the command line is opened ([#1896](https://github.com/tridactyl/tridactyl/issues/1896))
    -   `:tabopen -c firefox-default` opens a new tab in the default container (handy with `set tabopencontaineraware true`)
    -   `<S-Delete>` closes the tab corresponding to the highlighted completion in the commandline ([#2617](https://github.com/tridactyl/tridactyl/issues/2617))
    -   `<C-Enter>` executes the highlighted completion and keeps the window open (useful for, e.g. `:winopen` or `:tabopen -b`)
    -   `:set downloadsskiphistory true` prevents downloads via Tridactyl (e.g. `;s` hint mode) from being stored in your download history
        -   NB: Tridactyl must be allowed to run in private mode for this to work
    -   `:autocontain -s [url] [container]` added with a bug fix - `:autocontain` with no flags is deprecated ([#2629](https://github.com/tridactyl/tridactyl/issues/2629))

-   Removed features

    -   We no longer use Firefox sync automatically ([#2665](https://github.com/tridactyl/tridactyl/issues/2665))
        -   Use `:firefoxsync{push,pull}` to synchronise manually if you wish
    -   Broken setting `newtabfocus` removed ([#2632](https://github.com/tridactyl/tridactyl/issues/2632))

-   Bug fixes

    -   `:tabopen` works again in FF80+ ([#2695](https://github.com/tridactyl/tridactyl/issues/2695))
    -   Scrolling should now work on more pages ([#2583](https://github.com/tridactyl/tridactyl/issues/2583))
    -   Some errors should be more informative ([#2585](https://github.com/tridactyl/tridactyl/issues/2585))
    -   Ex-aliases now have correct help text in completions ([#2483](https://github.com/tridactyl/tridactyl/issues/2483))
    -   `:guiset` no longer claims to work if it has not ([#2210](https://github.com/tridactyl/tridactyl/issues/2210))
    -   Pressing `<Tab>` in completions is now a bit more reliable (but not much :))
    -   `:find` now works in private windows ([#2520](https://github.com/tridactyl/tridactyl/issues/2520))
    -   `:containerdelete` with no arguments is now a no-op ([#2239](https://github.com/tridactyl/tridactyl/issues/2239))
    -   `insert` mode now works better on some sites ([#2696](https://github.com/tridactyl/tridactyl/issues/2696))
    -   `text.` functions are now more readline compliant ([#2679](https://github.com/tridactyl/tridactyl/issues/2679))
    -   Form labels may now be clicked ([#2646](https://github.com/tridactyl/tridactyl/issues/2646))
    -   `yy` should no longer give spurious errors ([#1239](https://github.com/tridactyl/tridactyl/issues/1239))
    -   `:help` now takes you to the right page ([#2707](https://github.com/tridactyl/tridactyl/issues/2707))
    -   Tridactyl is now ~30% smaller ([#2710](https://github.com/tridactyl/tridactyl/issues/2710))

-   Miscellaneous

    -   We have switched from tslint to eslint ([#2477](https://github.com/tridactyl/tridactyl/issues/2477))
    -   Our E2E tests now actually work most of the time
    -   Unit tests for our excmds added ([#2449](https://github.com/tridactyl/tridactyl/issues/2449))
    -   There should be slightly less latency on keypresses ([#2440](https://github.com/tridactyl/tridactyl/issues/2440))
    -   Our settings tutorial is slightly more comprehensive ([#2465](https://github.com/tridactyl/tridactyl/issues/2465))
    -   Default settings can now be platform specific ([#2664](https://github.com/tridactyl/tridactyl/issues/2664))
    -   It is now easier to replicate CI tests locally ([#2591](https://github.com/tridactyl/tridactyl/issues/2591))

Thanks to all of our contributors for this release: Oliver Blanthorn, dependabot-preview[bot], Michael Kaufman, MatiasStorm, glacambre, Dranaxel, Christian Heinrich, Csaba Henk, Morgan Connolly, mozbug, Aurélien Ooms, David Ludovino, Imran Khan, Jakub Okoński, Josehkn, Luke Granger-Brown, Makkonan, and dependabot[bot].

Extra special thanks go to Aurélien Ooms, Christian Heinrich, Csaba Henk, David Ludovino, Imran Khan, Josehkn, Luke Granger-Brown, Makkonan, Michael Kaufman and Morgan Connolly who all contributed for the first time.

Last, but not least - thank you to everyone who reported issues.

## Release 1.19.1 / 29-05-2020

-   New features

    -   All of our scrolling commands (e.g. j/k) now scroll the focused element ([#2417](https://github.com/tridactyl/tridactyl/issues/2417))
    -   The bind focus hint mode, `;;`, now hints more selectors to make it easier to select an element to scroll
    -   `:recontain` command to change the container of the current tab added
        -   See `:help recontain` before use as it has potentially surprising privacy implications

-   Bug fixes

    -   The commandline history works again, but for real this time ([#2236](https://github.com/tridactyl/tridactyl/issues/2236))
    -   `g;` works again ([#2407](https://github.com/tridactyl/tridactyl/issues/2407))
    -   We no longer enter insert mode on readonly elements ([#2389](https://github.com/tridactyl/tridactyl/issues/2389))
    -   `mkt` now works even if you have used `setnull` or `unbind` ([#2415](https://github.com/tridactyl/tridactyl/issues/2415))
    -   We ensure nothing is written to local storage in private windows ([#2423](https://github.com/tridactyl/tridactyl/issues/2423))
        -   (very little was being written - namely the last ex string you executed and the tab ID of the last input you used; both of these would be overwritten regularly so the danger is low)
        -   this does mean that `repeat` will no longer function in private windows
    -   `winopen -private [url]` is no longer stored for `repeat` ([#2424](https://github.com/tridactyl/tridactyl/issues/2424))
    -   We now accurately attach hints to more elements ([#487](https://github.com/tridactyl/tridactyl/issues/487))

-   Miscellaneous

    -   Our config updater no longer uses a while loop which could spin forever in certain circumstances ([#2349](https://github.com/tridactyl/tridactyl/issues/2349))
    -   Our E2E tests fail less often (by retrying a few times) ([#2387](https://github.com/tridactyl/tridactyl/issues/2387))
    -   There is now less duplication between lib/state and content/state_content ([#2422](https://github.com/tridactyl/tridactyl/issues/2422))
    -   Our scrolling code is now a little easier to read ([#2384](https://github.com/tridactyl/tridactyl/issues/2384))

Thanks to all of our contributors for this release: Oliver Blanthorn, dependabot-preview[bot], Matias Ammentorp Storm, MatiasStorm, Dranaxel, glacambre, Alexandre, Robert Günzler and Tanath.

Extra special thanks go to Alexandre, Dranaxel, Matias Ammentorp Storm, MatiasStorm and Tanath who all contributed for the first time.

Last, but not least - thank you to everyone who reported issues.

## Release 1.19.0 / 10-05-2020

-   New features

    -   "passthrough" mode has been added - press `<C-v>` in normal mode to send the next key combination to the page ([#57](https://github.com/tridactyl/tridactyl/issues/57))

        -   similarly, `<C-o>` in ignore mode will execute a single key sequence in normal mode
        -   this is accomplished with a new mode called `nmode` which executes a number of key sequences in a specified mode and then executes an ex-command. See `:help nmode` for more details.

    -   `o` in visual mode moves the (invisible) cursor to the other end of the selection

    -   `:tabqueue` allows you to open a series of tabs, opening the next one in the background every time one is viewed. See `:help tabqueue` for suggested usage.

    -   `:set hintshift true` (which only works with non-vimperator hint modes) tries to predict which links you are pressing in rapid hint modes and allows you to repeatedly press the same key to open the next link once it has worked it out. See `:help -s hintshift` for more details.

-   Bug fixes

    -   Tridactyl now uses less energy ([#2329](https://github.com/tridactyl/tridactyl/issues/2329))
    -   Commandline history is more reliable, but for real this time ([#2236](https://github.com/tridactyl/tridactyl/issues/2236))
    -   `:mkt` now works even if no `tridactylrc` exists ([#2124](https://github.com/tridactyl/tridactyl/issues/2124))
    -   Nested subconfigs with unbinds no longer annihilate ([#2338](https://github.com/tridactyl/tridactyl/issues/2338))
    -   `:get` now displays the correct value according to subconfigs ([#2352](https://github.com/tridactyl/tridactyl/issues/2352))

-   Miscellaneous

    -   Our locks library has been removed since it was causing so many issues
    -   The commandline completions now call `config.get` much less often ([#2353](https://github.com/tridactyl/tridactyl/issues/2353))

Thanks to all of our contributors for this release: Oliver Blanthorn, Torsten Schmits, dependabot-preview[bot], glacambre and Simon Lydell.

Extra special thanks go to Simon Lydell and Torsten Schmits who were both first-time contributors.

Last, but not least - thank you to everyone who reported issues.

## Release 1.18.1 / 26-04-2020

-   Bug fixes

    -   Configuration was occasionally broken by `null`s appearing in unexpected places: ([#2324](https://github.com/tridactyl/tridactyl/issues/2324))

## Release 1.18.0 / 23-04-2020

-   New features

    -   Rudimentary visual mode!
        -   Enter it by selecting text: e.g. with the mouse, with text-selection `;h` hint mode, by searching with `/`, or by using Firefox's "caret" mode on `F7`.
        -   Yank selected text with `y`
        -   Search for selected text with `s` and `S`
    -   Select text hint mode added, bound to `;h` by default
    -   `apropos` command which searches through help text - very handy for finding settings or commands you didn't know about ([#1980](https://github.com/tridactyl/tridactyl/issues/1980))
        -   Known issue: on some machines, this command doesn't work.
    -   RC files can have escaped newlines with backslashes ([#2003](https://github.com/tridactyl/tridactyl/issues/2003))
    -   `:setnull` ex-cmd added to delete a default setting, e.g. `setnull searchurls.github` to remove the `github` searchurl
    -   Tab completions now list all tabs starting with a numeric filter ([#2010](https://github.com/tridactyl/tridactyl/issues/2010))
    -   The default `editorcmd` is now more resilient to user mappings and starts with the correct column ([#2237](https://github.com/tridactyl/tridactyl/issues/2237))
    -   Vimperator-style hinting can now be overridden with a custom filtering function ([#2212](https://github.com/tridactyl/tridactyl/issues/2212))
    -   `set historyresults [n]` now shows you `n` results in tabopen ([#2159](https://github.com/tridactyl/tridactyl/issues/2159))

-   Bug fixes

    -   Smooth scroll is now much smoother ([#2016](https://github.com/tridactyl/tridactyl/issues/2016))
    -   Counts work with scrollline ([#1984](https://github.com/tridactyl/tridactyl/issues/1984))
    -   Reading RC files might now be a bit more reliable ([#1983](https://github.com/tridactyl/tridactyl/issues/1983))
    -   `containerupdate` was broken ([#2294](https://github.com/tridactyl/tridactyl/issues/2294))
    -   Performance improvement to `config`: we no longer save the `config` every time we load it ([#2272](https://github.com/tridactyl/tridactyl/issues/2272))
    -   The mode indicator now displays "insert" mode more reliably ([#2232](https://github.com/tridactyl/tridactyl/issues/2232))
    -   Key events are now reset on mode change ([#1769](https://github.com/tridactyl/tridactyl/issues/1769))
    -   `hint -qpipe` now actually works ([#2224](https://github.com/tridactyl/tridactyl/issues/2224))
    -   Commandline history is more reliable ([#2236](https://github.com/tridactyl/tridactyl/issues/2236))
    -   Hinting is now a bit faster ([#2215](https://github.com/tridactyl/tridactyl/issues/2215))
    -   `mktridactylrc` now works for nested keys ([#2211](https://github.com/tridactyl/tridactyl/issues/2211))
    -   `repeat` now works more reliably ([#1538](https://github.com/tridactyl/tridactyl/issues/1538))

-   Miscellaneous

    -   Our internal `urlutils` object is now attached to the `tri` object and accessible through `js`
    -   We no longer add a `namespace` to userChrome in `guiset`
    -   Our messaging system now has type checking
    -   We have a `locks` library which we are using to synchronise some state between the content and background scripts. We'd like to move `config` to using this approach but have some bugs to iron out first ([#2137](https://github.com/tridactyl/tridactyl/issues/2137))
    -   Our pre-commit hook is finally fixed! ([#2231](https://github.com/tridactyl/tridactyl/issues/2231))

Thanks to all of our contributors for this release: Oliver Blanthorn, dependabot-preview[bot], mozbug, Jakub Okoński, Saul Reynolds-Haertle, glacambre, Ingo Karkat, Caleb Maclennan, Colin Caine, Spindlyskit, josh, user753 and yuri.

Extra special thanks go to Caleb Maclennan, Ingo Karkat, josh, mozbug, Spindlyskit, user753 and yuri who were all first time contributors. I think we can afford to thank mozbug, aka mozbugbox, in particular for opening a whopping _fourteen_ pull requests, earning a well-deserved 9th place on `:credits`.

Last, but not least - thank you to everyone who reported issues.

## Release 1.17.1 / 2019-11-06

-   Reversions requested by Mozilla reviewers

    -   Automatically revert any changes made which could have been made by `fixamo` to the `restricedDomains` and `block_mozAddonManager` settings in `user.js` ([#1800](https://github.com/tridactyl/tridactyl/issues/1800))

-   New features

    -   `hint -qy` now merges yanked hints ([#1945](https://github.com/tridactyl/tridactyl/issues/1945))
        -   Known issues: it ignores all other flags
    -   `set autocontainmode strict|relaxed` controls whether links opened in the current tab are forced to enter the "correct" container in a new tab ([#1902](https://github.com/tridactyl/tridactyl/issues/1902))
    -   `autocontain -u` added, allowing you to match on an entire URL ([#1901](https://github.com/tridactyl/tridactyl/issues/1901))
    -   `prefremove` ex-mode command added to remove a setting from user.js if you have the native messenger installed

-   Bug fixes

    -   Some default binds which couldn't be unbound can now be unbound ([#1923](https://github.com/tridactyl/tridactyl/issues/1923))
    -   `<C-i>` and `<C-o>` fixed and more performant ([#1816](https://github.com/tridactyl/tridactyl/issues/1816))
    -   `source` should have fewer race conditions ([#1764](https://github.com/tridactyl/tridactyl/issues/1764))
        -   this was quite a big change to the way we handle configuration so please keep an eye out for bugs and report them
    -   New quickmarks with multiple URLs no longer have `[object Object]` appended to them. If any of your quickmarks are currently affected, re-adding them with `:quickmark [key] [url1] [url2] [url3] ...` should fix them.

-   Miscellaneous

    -   Readme now has sections for different installation steps ([#1947](https://github.com/tridactyl/tridactyl/issues/1947))

-   Under the bonnet

    -   `browserBg` is now properly typed ([#1949](https://github.com/tridactyl/tridactyl/issues/1949))
    -   We have switched to `ts-loader` ([#1914](https://github.com/tridactyl/tridactyl/issues/1914))
    -   TypeScript is now a bit stricter ([#1915](https://github.com/tridactyl/tridactyl/issues/1915))
    -   Tests which run in `node` now use node types ([#1913](https://github.com/tridactyl/tridactyl/issues/1913))

Thanks to all of our contributors for this release: Oliver Blanthorn, dependabot-preview[bot], arcnmx, Jakub Okoński, notJerl, Dylan Lloyd, Kelly Stannard and SRGOM.

Extra special thanks go to Dylan Lloyd, Kelly Stannard and SRGOM who contributed for the first time.

Last, but not least - thank you to everyone who reported issues.

## Release 1.17.0 / 2019-10-03

-   Reversions requested by Mozilla reviewers

    -   The `csp` setting is now inactive
    -   Automatically revert any changes made by `fixamo` to the `restricedDomains` setting in `user.js`

-   New features

    -   Source RC from an arbitrary URL ([#1866](https://github.com/tridactyl/tridactyl/issues/1866))
    -   `extoption` excmd to open the options page of other addons ([#1660](https://github.com/tridactyl/tridactyl/issues/1660)) ([#1851](https://github.com/tridactyl/tridactyl/issues/1851))
    -   Hint fancy webcomponents ([#1853](https://github.com/tridactyl/tridactyl/issues/1853))
    -   Add `;g{f,F}` default binds for `hint -q` and `hint -qb`

-   Bug fixes

    -   Pasting a url with `p` or `P` now trims whitespace to avoid searching for the URL ([#1865](https://github.com/tridactyl/tridactyl/issues/1865))
    -   Fix OS detection for windows in `loadtheme` ([#1862](https://github.com/tridactyl/tridactyl/issues/1862))
    -   Fix ([#1041](https://github.com/tridactyl/tridactyl/issues/1041)): ;p now preserves newlines

Thanks to all of our contributors for this release: Oliver Blanthorn, dependabot-preview[bot], rektrex, Colin Caine, glacambre, ELLIOTTCABLE, avalonv, pvs, Chris, Daniel Schmid

Extra special thanks go to avalonv, Chris, Daniel Schmid, ELLIOTTCABLE, pvs, rektrex who have contributed for the first time.

Last, but not least - thank you to everyone who reported issues.

## Release 1.16.3 / 2019-08-14

-   New features

    -   Bookmarks are now listed in `*open` completions. `set bmarkweight` to change how prominently they are listed. ([#214](https://github.com/tridactyl/tridactyl/issues/214))

-   Bug fixes

    -   Completions are now deselected if the string is shortened ([#1696](https://github.com/tridactyl/tridactyl/issues/1696))
    -   Fix :bmarks -t -c <container> behavior ([#1772](https://github.com/tridactyl/tridactyl/issues/1772))
    -   perf.ts: remove illegal string which was causing spurious errors
    -   Duplicate bookmarks are no longer listed in `bmark` completions

-   Miscellaneous

    -   Remove `fixamo` at request of Firefox Security team ([#1773](https://github.com/tridactyl/tridactyl/issues/1773))
    -   Add missing ignore mode shortcut to tutorial
    -   Disable guiset navbar none as it had stopped working ([#1728](https://github.com/tridactyl/tridactyl/issues/1728))

Thanks to all of our contributors for this release: Oliver Blanthorn, dependabot-preview[bot], Colin Caine, GiulioCentorame, Jakub Okoński and glacambre.

Extra special thanks go to GiulioCentorame and Jakub Okoński who both contributed for the first time.

Last, but not least - thank you to everyone who reported issues.

## Release 1.16.2 / 2019-07-11

-   New features

    -   New setting `urlparenttrailingslash` which allows you to choose whether `urlparent` adds a trailing slash or not ([#1565](https://github.com/tridactyl/tridactyl/issues/1565))

-   Bug fixes

    -   Encoding errors with the RC file and `:editor` should be fixed ([#1698](https://github.com/tridactyl/tridactyl/issues/1698))
    -   End-to-end tests should work on Windows now ([#1700](https://github.com/tridactyl/tridactyl/issues/1700))

-   Miscellaneous

    -   Link to `text` functions added to `:bind` help

Thanks to all of our contributors for this release: Oliver Blanthorn, dependabot-preview[bot], Joao Sa, Robert Boyd III, and Guillermo R. Palavecino.

Extra special thanks go to Guillermo R. Palavecino and Robert Boyd III who both contributed for the first time.

Last, but not least - thank you to everyone who reported issues.

## Release 1.16.1 / 2019-06-15

-   New features

    -   `;v` now escapes the hrefs you choose (see `get exaliases.mpvsafe` to see how it does it)

-   Bug fixes

    -   `shellescape` will now actually properly escape stuff on Windows

## Release 1.16.0 / 2019-06-14

-   New features

    -   `keyfeed` command for feeding fake keys to Tridactyl (not the web page) added
        -   mostly a precursor to `map` but `keyfeed g?g?g?g?g?g?g?g?g?g?g?g?g?` now for a good time
    -   User-definable modes added: just do `bind --mode=[newmode] ...` and then `mode [newmode]`
    -   Added `tabm` and `tabo` ex-aliases (hat-tip to [this blog](https://magai.hateblo.jp/entry/2018/09/25/142348) for pointing out that they were missing)
    -   `guiset` now uses `setpref` to flip the preference which will soon be needed to read userChrome ([#1572](https://github.com/tridactyl/tridactyl/issues/1572))
    -   `shellescape` command added for use with `composite` ([#1485](https://github.com/tridactyl/tridactyl/issues/1485))
    -   Hint mode now has user-configurable binds (e.g. `bind --mode=hint <C-[> hint.reset`) ([#304](https://github.com/tridactyl/tridactyl/issues/304))
    -   Error notifications will no longer steal focus
    -   `no_mouse_mode` is now more sober; original mode renamed to `neo_mouse_mode` ([#1303](https://github.com/tridactyl/tridactyl/issues/1303))
    -   `hint -f [text]` prefilters hints with the provided text ([#1580](https://github.com/tridactyl/tridactyl/issues/1580))
        -   ditto for `hint -fr [regex]`
    -   `blacklistkeys` setting to specify which keys to prevent pages from ever stealing from Firefox ([#1185](https://github.com/tridactyl/tridactyl/issues/1185))
        -   e.g. `set blacklistkeys ["/","'"]`
    -   `bmark` with no arguments will now use the current page title as the bookmark name
    -   Beta builds now have versions that look more like the filenames served by our build bot and the version shown on `about:addons` ([#930](https://github.com/tridactyl/tridactyl/issues/930))
    -   `preventautofocusjackhammer` setting added for use with `seturl` for sites that steal autofocus even after `set allowautofocus false`
        -   use sparingly as it will use 2-3pp of CPU per tab it is activated in
    -   `urlmodify -s` adds a query to a URL ([#1584](https://github.com/tridactyl/tridactyl/issues/1584))
    -   `ebg13` shapgvbanyvgl nqqrq:
        -   bound to `g?` by default
    -   `viewconfig --{user,default}` will show you your changes to the config or the default config
    -   `mktridactylrc` will make an RC file with your current settings. Use `mktridactylrc!` to overwrite an existing file.

-   Bug fixes

    -   Websites can no longer feed Tridactyl fake key events (see the [security advisory](https://github.com/tridactyl/tridactyl/security/advisories/GHSA-7qr7-93pf-hr8f))
    -   Persist history completion selection if it is still valid on source update
    -   Make `;v` safer
    -   `bmark` is less fussy about URLs now ([#1600](https://github.com/tridactyl/tridactyl/issues/1600))
    -   Smooth scrolling made a bit less bad (but it's still quite bad)
    -   `autocontain` should now co-exist with other addons more peacefully ([#953](https://github.com/tridactyl/tridactyl/issues/953))
    -   Our `find` mode is pretty useable now - see `help find` to see how to bind it ([#1608](https://github.com/tridactyl/tridactyl/issues/1608))
    -   `repeat` should work a bit better but it's still quite broken ([#1609](https://github.com/tridactyl/tridactyl/issues/1609))
    -   `followpage` now works on Google via a site-specifc override
    -   `taball` should now always move to the right tab
    -   'new features' highlight on the changelog is now never shown in private windows ([#749](https://github.com/tridactyl/tridactyl/issues/749))
    -   Scrolling should no longer cause infinite loops ([#1247](https://github.com/tridactyl/tridactyl/issues/1247))
    -   Profile-finding should be more resilient ([#1585](https://github.com/tridactyl/tridactyl/issues/1585))
    -   Fixed some bugs with numeric prefixes ([#1606](https://github.com/tridactyl/tridactyl/issues/1606))
    -   `set findcase smart` should actually work now (hat-tip to burntsushi for pointing this out in his RC file)
    -   It should be much harder for the command line to swap the order of keys pressed, especially `<Space>` ([#1655](https://github.com/tridactyl/tridactyl/issues/1655))

-   Under the bonnet

    -   Compile-time inheritance to inputmaps from imaps added
        -   ideally we'd like runtime inheritance but that's trickier
    -   Support for TypeScript 3.5
    -   `get_current_url` is now an ex-alias
    -   `config.get` is now typed, meaning that it's harder for us to add undocumented settings
    -   `config.getURL` now merges site-specific defaults
    -   webpack now exits with non-zero exit code on build errors ([#869](https://github.com/tridactyl/tridactyl/issues/869))
    -   We're no longer using a deprecated API for determining our own extension page URLs ([#1593](https://github.com/tridactyl/tridactyl/issues/1593))
    -   We've switched from `npm` to `yarn` as we got fed up with `npm` fighting with itself over package-lock.json. Hopefully this will make development a little less painful.
    -   `:native{install,update}` will now install the version of the native messenger that existed at the same time as your version of Tridactyl
    -   Added Mithril (currently unused) to make redevelopment of the commandline frame easier

Thanks to all of our contributors for this release: Oliver Blanthorn, Colin Caine, glacambre, Anton Vilhelm Ásgeirsson, dependabot-preview[bot], Vladimír Marek, Saul Reynolds-Haertle, Vince Au, Russell Cheung, WorldCodeCentral, reversebreak

Extra special thanks go to dependabot-preview[bot], reversebreak, Russell Cheung, Vince Au, Vladimír Marek

Last, but not least - thank you to everyone who reported issues.

## Release 1.15.0 / 2019-05-23

-   New features

    -   Numeric prefixes to binds are now appended to the end of the command, e.g. `1gt` goes to the first tab.
        -   This isn't strictly a new feature as we had it about 18 months ago, but it fell down a plot hole.
    -   We now have special builds that don't have the new tab page - see the new tab page for how to install them.
    -   The internal `getclip` function has now been exposed as an ex-command by popular demand, for use with, e.g. `bind --mode=insert <C-v> composite getclip | text.insert_text`.
    -   You can now select hints using the arrow keys if you are so inclined
    -   You can now execute ex-commands from the "awesome bar" (i.e. Firefox's URL bar) by prefixing them with `tri`

-   Bug fixes

    -   A few weird bugs fixed on NetBSD ([#1562](https://github.com/tridactyl/tridactyl/issues/1562))
    -   `gi` should now work on our help pages
    -   `repeat` now waits for the execution of each command to finish before starting another one
    -   `set hintnames uniform` won't give you a spurious error any more

-   Under the bonnet
    -   Added end-to-end testing for a few functions using Selenium and CircleCI
    -   Calls to the internal getProfile() used for a variety of native messaging functions are now cached to improve performance

Thanks to all of our contributors for this release: Oliver Blanthorn, glacambre, dependabot[bot], Marvin Ewald, Saul Reynolds-Haertle, Colin Caine, PHO, Evgeny Kurnevsky, and Jan Hruban.

Extra special thanks go to Evgeny Kurnevsky, Jan Hruban, Marvin Ewald, and PHO who all contributed for the first time.

Last, but not least - thank you to everyone who reported issues.

## Release 1.14.10 / 2019-05-04

-   New features

    -   `:editor` now listens to the exit code of your editor so, e.g. `:cq` in Vim should prevent the text field from being changed; it also can provide line and column information - see `:help editor` for more details
    -   A new `:issue` excmd opens a new issue on our GitHub page with your system information pre-filled

-   Bug fixes

    -   `DocStart` `autocmds` in the exemplar .tridactylrc will no longer run under `:viewconfig`
    -   `updatecheck` should actually run now as it has been added to the new-tab page
        -   its relevant settings may now be found under the `update.*` namespace
    -   Private windows opened with the native messenger now work, e.g. `winopen -private about:addons`
    -   `:saveas` completions fixed

-   Under the bonnet
    -   Added `tslint` and `shellcheck` checks to Travis CI for GitHub PRs and changed source to conform to their standards
    -   Swapped `prettier` for `tslint` for most cases
    -   excmds are now run from the content scripts which should hopefully reduce the number of round trips and generally improve responsiveness
    -   Minor changes to codebase made as suggested by sonarcloud and lgtm
    -   We've merged ([#953](https://github.com/tridactyl/tridactyl/issues/953)) which will eventually allow Tridactyl's `autocontain` and Mozilla's "Multi Account Containers" to co-exist peacefully once we enable a permission. We don't do that until the `updatecheck` has been out in the wild for a month or so first - see ([#708](https://github.com/tridactyl/tridactyl/issues/708)).
    -   Fixed `wine-pyinstaller.sh` on some systems

Thanks to all of our contributors for this release: Oliver Blanthorn, glacambre, dependabot, Saul Reynolds-Haertle, and Shahzeb Imran.

Extra special thanks go to dependabot and Shahzeb Imran who both contributed for the first time. (dependabot is a bot, but that does not make his contributions any the less valued).

Last, but not least - thank you to everyone who reported issues.

## Release 1.14.9 / 2019-03-21

-   New features

    -   We now support Firefox's built-in `OpenSearch` search engines

        -   This is distinct from the "keyword" search engines - see [this page](https://support.mozilla.org/en-US/kb/add-or-remove-search-engine-firefox)

    -   Hint modes changes:

        -   Scroll to hinted element with `;z` ([#1372](https://github.com/tridactyl/tridactyl/issues/1372))

        -   Open hint in new foreground tab with `;t` ([#1381](https://github.com/tridactyl/tridactyl/issues/1381))

        -   You can add `-J` to any hint mode to disable JavaScript event hints

        -   Reverse-image search with `;m` and `;M`

            -   Known issue: `;m<Esc>` will still send you to Google

    -   `guiset` now has completions

    -   `help` now accepts the following flags: `help -{a,b,e,s}` to specify whether you are looking for an alias, a binding, an ex-command, or a setting.

    -   You will now be warned when adding a binding that is shadowed by other bind ([#1309](https://github.com/tridactyl/tridactyl/issues/1309))

        -   i.e, since `x` is bound to `stop`, you will now be warned when you bind something to `xx`

    -   The new tab page now begs for donations to fund our coding-retreat ([#1373](https://github.com/tridactyl/tridactyl/issues/1373))

    -   `ex.deselect_completion` ex-mode command added ([#1393](https://github.com/tridactyl/tridactyl/issues/1393))

    -   `winopen -popup` added to open a URL in the "pop-up" style without the address bar etc showing.

-   Bug fixes

    -   Completions no longer get stuck showing you the command you just typed ([#1295](https://github.com/tridactyl/tridactyl/issues/1295))

    -   `findnext` no longer highlights invisible elements ([#1340](https://github.com/tridactyl/tridactyl/issues/1340))

    -   Command history search works again ([#1329](https://github.com/tridactyl/tridactyl/issues/1329))

    -   `nativeopen` now automatically detects which profile you're using and can open URLs with spaces in ([#1355](https://github.com/tridactyl/tridactyl/issues/1355))

    -   `leavegithubalone` is now a documented setting

    -   `keyup` events are no longer sent to the page for keys which are bound in Tridactyl ([#234](https://github.com/tridactyl/tridactyl/issues/234))

    -   `terminator` will now work as a terminal for `editorcmd`

    -   The native install command will now tell you if it didn't manage to install the native messenger ([#1099](https://github.com/tridactyl/tridactyl/issues/1099))

    -   `help` completions will now be deselected properly ([#1344](https://github.com/tridactyl/tridactyl/issues/1344))

    -   `viewsource` now works on the `help` page

-   Miscellaneous

    -   Various documentation improvements

-   Under the bonnet

    -   `D` no longer has a sleep in it

    -   Build process should be more portable now

    -   Build should be a bit more robust, too

    -   Removed `native_background.ts` - the editor is now all done in content scripts

    -   Removed commandline_background

    -   `contributing.md` has been improved with more documentation of our architecture

Thanks to all of our contributors for this release: Oliver Blanthorn, glacambre, Tadeas Uhlir, Nuno Santos, Anton Vilhelm Ásgeirsson, Colin Caine, Manny Schneck, Maximilian Roos, Robert Günzler, Rodrigo, Vik Ramanujam, heshamsafi, and pinusc.

Extra special thanks go to heshamsafi, Manny Schneck, Maximilian Roos, Nuno Santos, pinusc, Robert Günzler, Rodrigo, Tadeas Uhlir, and Vik Ramanujam who all contributed for the first time.

Last, but not least - thank you to everyone who reported issues.

## Release 1.14.8 / 2019-01-31

-   New features

    -   `winclose` now accepts arguments and completions

-   Bug fixes

    -   We've explained the ramifications of adding return values to lots of ex-commands in 1.14.7 for composite on the new tab page

    -   All URLs pointing to the repository should now point to the new repository, tridactyl/tridactyl.

## Release 1.14.7 / 2019-01-30

-   New features

    -   Find mode is back, but still doesn't support incsearch. See `help find` for details on how to bind it if you value muscle-memory over stability :)

    -   `rssexec` added with completions to help you find RSS feeds that exist on the current page. By default, it executes `yank`, but this can be changed with `rsscmd` to interface with your favourite feed reader, e.g, `set rsscmd ! echo %u >> ~/.newsbeuter/urls`.

    -   `set` will now let you set complex objects such as `set searchurls {"google":"https://www.bing.com"}` ([#1289](https://github.com/tridactyl/tridactyl/issues/1289))

    -   `undo` now comes with completions so you can pick an older tab or window to restore ([#1286](https://github.com/tridactyl/tridactyl/issues/1286))

    -   `no_mouse_mode` added to help users force themselves to use hints by preventing mouse clicks from reaching the page.

        -   What, we have 1337 stars on GitHub? I hadn't noticed ; )
        -   `snow_mouse_mode` also added to help people get into the Christmas spirit

    -   The exceptionally well-hidden settings page now has a very well-hidden "reset your configuration button" at the very bottom of the page ([#1271](https://github.com/tridactyl/tridactyl/issues/1271)).

    -   The horrendously named `modeindicatorshowkeys` setting now allows you to see which fragments of valid key sequences you have typed.

-   Bug fixes

    -   Hints are now slightly chubbier in solidarity with people who use bad fonts ([#1280](https://github.com/tridactyl/tridactyl/issues/1280))

    -   Favicons are back on `:tab` completions! ([#986](https://github.com/tridactyl/tridactyl/issues/986))

    -   `nativeopen` now checks for the presence of the native messenger rather than `tabopen`.

    -   `tridactylrc` should now execute more reliably ([#1197](https://github.com/tridactyl/tridactyl/issues/1197))

    -   `set` now refuses to let you set objects such as `searchurls` to simple strings ([#1288](https://github.com/tridactyl/tridactyl/issues/1288))

    -   Completions should show slightly faster ([#1259](https://github.com/tridactyl/tridactyl/issues/1259))

    -   Minor documentation fixes.

    -   The Tridactyl logo is now not placed on text boxes if we fail to find your editor.

    -   Ctrl-6 is now bound to `buffer #` in all the modes it claims to be bound in.

    -   `guiset` no longer fiddles with `titlebar` as this breaks quite a lot of Firefox. You might need to delete / fix your own userChrome.css manually.

-   Under the hood

    -   The native messenger should now give more useful errors ([#1287](https://github.com/tridactyl/tridactyl/issues/1287))

    -   We do slightly fewer mad things with promises ([#1262](https://github.com/tridactyl/tridactyl/issues/1262))

    -   We remember to use our nice little vanity wrappers on ugly messaging more often ([#1257](https://github.com/tridactyl/tridactyl/issues/1257))

    -   Try to prevent more race conditions in the background code ([#1248](https://github.com/tridactyl/tridactyl/issues/1248))

    -   Prevent multiple commandlines from being inserted in to pages ([#1245](https://github.com/tridactyl/tridactyl/issues/1245)) ([#1243](https://github.com/tridactyl/tridactyl/issues/1243))

Thanks to all of our contributors for this release: Oliver Blanthorn, glacambre, Milan Vancura, and Martin André.

Extra special thanks go to Martin André and Milan Vancura who both contributed for the first time.

Last, but not least - thank you to everyone who reported issues.

## Release 1.14.6 / 2018-12-14

-   Bug fixes

    -   `updatenag` now checks the right date (code I was using for testing made it into a stable release...)
    -   `winopen -private` is now documented

We're aware of a few issues introduced by 1.14.4+ and/or Firefox 64. Hopefully we'll get them fixed soon. In the meantime, please report any weirdness on our GitHub page as usual.

## Release 1.14.5 / 2018-12-13

-   Bug fixes

    -   `hintfiltermode simple` should no longer give you a useless error every time you click something
    -   Rebinding `<Space>` should actually work now
        -   If you're having typing sentences into the command line and find spaces appear in the middle of words, you might want to `unbind --mode=ex <Space>`.

-   Under the bonnet

    -   We now have our own configuration listeners. See #1192 for more details.

This release was rushed out because I didn't test 1.14.4 well enough, so only glacambre and bovine3dom got to contribute to it. It feels more weird than usual to thank myself for coding when I'm 50% of the contributors, especially when the release was so speedy because I wasn't paying enough attention to the previous one, so I'll just pat glacambre instead. _bovine3dom tapote glacambre_.

## Release 1.14.4 / 2018-12-12

-   New features

    -   You can now cycle the selected hint in hint mode by pressing `<Tab>` or `<S-Tab>`
    -   The native messenger now appends ".txt" to files it edits, hopefully making the experience better out of the box for most people
        -   You might need to run `:nativeupdate` to get this feature
    -   Tridactyl will check for a new stable version at launch and notify you once once a new version has been released and it is a week old
        -   You can change this behaviour with `set updatenag false` and `set updatenagewait [days to wait before nagging]`
        -   Hopefully this will make it easier for users to notice when a new update has been blocked because it needs more permissions
    -   `noiframeon` has been turned into a normal setting for use with `seturl [url] noiframe true`

-   Bug fixes

    -   `alias tab buffer` no longer breaks completions
    -   `hint -c [selectors]` can now accept selectors with spaces
    -   `a` tags now have higher priority than (often spurious) elements JavaScript events attached. This makes hinting on YouTube usable :)
    -   Themes are now properly applied to tabs opened in the background
    -   Editor functions (`text.*`) should now work in email inputs, and others if you're lucky.

Thanks to all of our contributors for this release: Oliver Blanthorn, glacambre, Fabian Furger, and arcnmx.

Extra special thanks go to arcnmx who contributed for the first time.

Last, but not least - thank you to everyone who reported issues.

## Release 1.14.3 / 2018-12-03

-   Bug fixes

    -   `tabnext/prev` now only cycles through visible tabs ([#1084](https://github.com/tridactyl/tridactyl/issues/1084)), for real this time ([#1207](https://github.com/tridactyl/tridactyl/issues/1207))
    -   `clipboard xselpaste` now works in the commandline ([#1206](https://github.com/tridactyl/tridactyl/issues/1206))

Thanks to all of our contributors for this release: Oliver Blanthorn, glacambre, and scde.

Extra special thanks go to scde who contributed for the first time.

Last, but not least - thank you to everyone who reported issues.

## Release 1.14.2 / 2018-12-02

-   New features

    -   New theme: `colours halloween`
    -   New command `clipboard xselpaste` pastes from primary selection into focused input field
    -   New editors added to `editor` ([#1162](https://github.com/tridactyl/tridactyl/issues/1162))
    -   You can now rebind key sequences in the commandline: `viewconfig exmaps` and `bind --mode=ex`
    -   `text.*` commands have been added for insert mode operations

-   Bug fixes

    -   getURL now merges site-specific config objects (e.g, "example" and "example.org")
    -   Tridactyl now scrolls on non-html pages ([#1165](https://github.com/tridactyl/tridactyl/issues/1165))
    -   Various broken links fixed
    -   Fewer errors when using the command line ([#1168](https://github.com/tridactyl/tridactyl/issues/1168))
    -   `set` gives more helpful error messages ([#1166](https://github.com/tridactyl/tridactyl/issues/1166))
    -   `tabnext/prev` now only cycles through visible tabs ([#1084](https://github.com/tridactyl/tridactyl/issues/1084))
    -   Commands requiring the native messenger now give more helpful error messages if there is a problem
    -   Internal commands are no longer shown in completions ([#1154](https://github.com/tridactyl/tridactyl/issues/1154))
    -   It is now possible to insert spaces in the middle of words in the commandline ([#1147](https://github.com/tridactyl/tridactyl/issues/1147))
    -   scrolling.ts: Fix sticky scrolling
    -   tabprev/tabnext is more robust ([#1148](https://github.com/tridactyl/tridactyl/issues/1148))

-   Miscellaneous

    -   Documentation improvements
    -   Various tutorial improvements

-   Under the bonnet
    -   Fewer bashisms in build process
    -   Rename buffers to tabs
    -   Tridactyl uses approximately 0.03MB less RAM per tab ([#1187](https://github.com/tridactyl/tridactyl/issues/1187))
    -   `tab{first,last}` are now simple aliases
    -   Numerical config settings are now numbers rather than strings

Thanks to all of our contributors for this release: Oliver Blanthorn, glacambre, Anton Vilhelm Ásgeirsson, Abraham White, Nathan Collins, Colin Caine, Keegan Carruthers-Smith, and pale3.

Extra special thanks go to Abraham White, Keegan Carruthers-Smith, Nathan Collins, and pale3 who all contributed for the first time.

Last, but not least - thank you to everyone who reported issues.

## Release 1.14.1 / 2018-10-28

-   New features

    -   URL-specific settings:
        -   `bindurl`,`seturl`,`unseturl`,`unbindurl`, and `reseturl` allow you to change settings per site. See `help bindurl` for more details.
    -   New tab page now steals focus from the address bar (but not on Windows):
        -   if you want the old behaviour back, `set newtabfocus urlbar`
    -   `set editorcmd` now has `%f` as a magic argument to specify the filename
    -   You can now load themes from disk. See `help colourscheme`
    -   Insert-mode readline style commands added but left unbound. See `im_*` on the help page.
    -   `saveas` added: you can provide a filename to specify where the document will be saved if you have the native messenger installed
    -   New `stop` command bound to x by default
    -   `<C-6>` is now bound to `buffer #` in ignore mode
    -   `set searchurls` now supports multiple `%s` and numbered `%1`, `%2` etc. magic arguments for the search query
    -   `tabnew` alias added for `tabopen`
    -   `stop` command bound to `x`
    -   `:help config_option` now works, with completions
    -   A few more `z*` binds have been added for zooming. See the help page for more details.
    -   Inputs now get the Tridactyl logo on them while you edit them in an external editor
    -   `bmarks` is now a proper excmd and allows you to open bookmarks in tabs if you give it a `-t` flag
    -   New `setpref` command allows you to write to `user.js` for changing settings in `about:config`
    -   `saveas` now allows you to specify file save location if you have the native messenger
    -   Filesystem completion for `source` and `saveas`
    -   `googlelucky` is now a valid search engine
    -   `guiset tabs count` and `guiset tabs nocount`
    -   `reloadallbut` command reloads everything but the active tab
    -   `I` is unbound again. Bind it back with `bind I mode ignore` and `bind --mode=ignore I mode normal`

-   Bug fixes

    -   Command line is much less likely to secretly steal focus from the page - i.e, Tridactyl is less janky now.
    -   Scrolling fixes:
        -   Scrolling left or right can no longer send you to the top of the page
        -   Scrolling beyond the top or bottom of a page no longer makes you get stuck there
        -   Some people report that smooth scrolling has improved.
    -   `viewconfig` now shows you default and user-specified config rather than just user-specified in some circumstances
    -   `set noiframeon` fixed
    -   `tabmove +1` no longer requires a leading space when typed interactively
    -   `setclip`/`getclip` now provide error messages
    -   `guiset` should be a bit better at finding profiles now
    -   The mode indicator should now always have the correct colour at startup
    -   `set historyresults 0` now works
    -   `exclaim` should give more helpful errors if the native messenger is not installed
    -   `#` in `buffer #` and others will now refer to the current tab if you only have a single tab open

-   Under the bonnet

    -   Completions are now more asynchronous - hopefully this will help performance on slow computers.
    -   Performance monitoring now possible if you turn it on: see `help perfdump`
        -   No data is sent back to us.
    -   `editor` now returns a `filepath, content` tuple
    -   Update a bunch of dependencies
    -   Build steps now work OK if you have spaces in your directory names

-   Miscellaneous
    -   Documentation improvements

Thanks to all of our contributors for this release: Oliver Blanthorn, glacambre, Saul Reynolds-Haertle, Anton Vilhelm Ásgeirsson, Joao Sa, notJerl, Colin Caine, WorldCodeCentral, Alex Griffin, FrankEular, Ivan Solyankin, Lorenz Leutgeb, and Shou Ya.

Extra special thanks go to Alex Griffin, FrankEular, Ivan Solyankin, Joao Sa, Lorenz Leutgeb, notJerl, and Shou Ya who all contributed for the first time.

Last, but not least - thank you to everyone who reported issues.

## Release 1.14.0 / 2018-09-05

-   New features:

    -   Mode is now per-tab

        -   Having two windows with one in ignore mode is now bearable
        -   This opens the door to proper per-tab settings, e.g, per site binds
        -   This is a big change so please report any bugs on GitHub

    -   Configuration now has a help page

        -   Accessible from the link to the binds on the normal help page
        -   We'll add a better way of accessing it soon

    -   Configuration completions now show their permitted values and set checks for these

    -   You can now map keys to keys for Tridactyl modes with `keymap key1 key2`. The purpose of this is for our international users who switch keyboard layouts.

-   Bug fixes:

    -   Fixed the wrong invocation of urlmodify in the tridactylrc example
    -   Fix #948: set newtab about:home kinda works subject to usual caveats
    -   Respect `profiledir` in more places ([#946](https://github.com/tridactyl/tridactyl/issues/946))
    -   Pass `/` through to websites in abnormal modes ([#954](https://github.com/tridactyl/tridactyl/issues/954))
    -   Fix `installnative` on some gourmet distributions

Thanks to all of our contributors for this release: Oliver Blanthorn, Saul Reynolds-Haertle, glacambre, Colin Caine, William G Hatch, Noah Birnel, Roman Bogorodskiy, and quinoa42.

Extra special thanks go to Noah Birnel, quinoa42, Roman Bogorodskiy, and William G Hatch who all contributed for the first time.

Last, but not least - thank you to everyone who reported issues.

## Release 1.13.3 / 2018-08-21

-   New features:

    -   Our command line now has more completions:

        -   Ex commands and ex aliases with a little bit of help for each command.
        -   Settings, showing their current value (currently does not support options within options)

    -   Rapid hint mode improvements:
        -   Less jank (particularly if you hold a key down)
        -   Most hint modes now have a rapid mode with `hint -q[flag]` and bound to `;g[key]`
            -   The divergence from Pentadactyl is because we already have `g;` bound to "switch to tab containing last used input field and focus it", which is my pet favourite command.
    -   `tab` is now an alias for `buffer` (I meant to add this months ago)

-   Old features:

    -   More hint modes from Pentadactyl that no-one missed added:
        -   `;O`, `;W`, and `;T` pre-fill the command line with the hinted URL and open/tabopen/winopen.
    -   Added I, Shift-Escape ignore binds back
        -   You can unbind them with `unbind --mode=... [key]`

-   Bug fixes:

    -   Yank element text hint mode was broken (`;p`) and we fixed it by accident
    -   You can now unbind keys which were bound to `Esc` by default ([#921](https://github.com/tridactyl/tridactyl/issues/921))
    -   Less console spam: fixed "1.1" error if config was at latest version
    -   Our command line now plays nicely with left scrollbars ([#909](https://github.com/tridactyl/tridactyl/issues/909))
    -   `guiset gui none` now pads maximised windows to fix a bug on Windows where the top of the page is cut off

-   Boring internal changes:

    -   All hint modes now use a newfangled method with less message passing
    -   We're now using Typescript 3
    -   We now generate a bunch of metadata about Tridactyl for use with introspection
        -   As an added bonus, build times are now a bit slower.

Thanks to all of our contributors for this release: Oliver Blanthorn, glacambre, Anton Vilhelm Ásgeirsson, and Henré Botha.

Extra special thanks go to Henré Botha, who contributed for the first time.

Last, but not least - thank you to everyone who reported issues.

## Release 1.13.2 / 2018-08-15

-   New features:

    -   Rapid hinting bound to `gF`. One of our most requested features.

    -   Add `DocLoad` autocmd which triggers after all HTML is downloaded (it fires on DOMContentLoaded).

    -   All clipboard commands on Linux now support X-selection if you have the native messenger installed. Simply set `yankto` and `putfrom` to `selection`.

    -   Add private window indicator to `bufferall`; add container icons to `buffer{,all}`.

    -   Add `fillcmdline_tmp`, useful for temporary messages. A few commands now use this (e.g, `yy`).

    -   `tabmove` bound to `<<` and `>>` à la Vimium.

        -   `tabmove` now wraps tabs around if you reach the beginning or end.

    -   Add `mute` to mute tabs. Bound to `<A-m>` by default.

    -   Add `<A-p>` bind for `pin`.

    -   Add `{fixamo,guiset}_quiet` for non-interactive use; normal `{fixamo,guiset}` now inform you that you must restart.

    -   Add `url2args` ex-command to retrieve search terms from Tridactyl search engines, for use with `O`. `help url2args` for more information.

    -   Add `autocmddelete` to delete an autocmd.

    -   Add `hintdelay` setting (measured in milliseconds) to add a short pause before hint mode is left after choosing a link ([#386](https://github.com/tridactyl/tridactyl/issues/386)) with the `hintfiltermode vimperator*` hint modes so that one has time to stop typing before Tridactyl returns to normal mode.

    -   Add binds for yankmd and yanktitle to `yt` and `ym` irrespectively.

    -   Our GitHub has a new troublehooting guide and issue template ([#522](https://github.com/tridactyl/tridactyl/issues/522)).

    -   Websites can no longer steal `/` from Firefox. If you are unhappy with this state of affairs, try `set leavegithubalone true`.

-   Bug fixes:

    -   Fix race condition in state.mode synchronization ([#613](https://github.com/tridactyl/tridactyl/issues/613)).

    -   `set newtab about:blank` should work once again ([#678](https://github.com/tridactyl/tridactyl/issues/678)).

    -   Make `tabprev` synchronous: it now works better in `composite` commands (i.e, `D` is less janky).

    -   Fix `guiset hoverlink *` in Firefox 61 ([#763](https://github.com/tridactyl/tridactyl/issues/763)).

    -   Make `source` ignore visually empty lines.

    -   Completions will now be properly deselected upon typing ([#833](https://github.com/tridactyl/tridactyl/issues/833)).

    -   `guiset` now gives helpful errors if given the wrong arguments ([#844](https://github.com/tridactyl/tridactyl/issues/844)).

    -   History completion insertion with space no longer inserts an extra space ([#838](https://github.com/tridactyl/tridactyl/issues/838)).

    -   Ctrl-y actually scrolls up now

    -   Arguments now ignored on history completions (`-private, -c, -b` etc.).

    -   Native messenger:

        -   Windows install script now complains if you do not have the requisite PowerShell version.

        -   Windows install script should now work if you have a non-ASCII username/directory

        -   Windows install script no longer rage-quits if Python is not found.
            -   This means that the compiled executable will actually be used. It's much slower than the normal Python script, so we strongly recommend that you use that instead by installing Python 3, making sure it is on your PATH, and running `installnative` again.

    -   Fix focus hijacking again ([#768](https://github.com/tridactyl/tridactyl/issues/768)).

    -   Fix scrolling on bugzilla.mozilla.org ([#762](https://github.com/tridactyl/tridactyl/issues/762)).

    -   Fix race condition in :sanitise ([#724](https://github.com/tridactyl/tridactyl/issues/724)).

    -   Make sure bind/unbind use the same binding format: previously, modifiers on binds were case-sensitive for some commands.

    -   Container commands are now more case-insensitive.

    -   Fix jumplist not being correctly restored on reloads ([#680](https://github.com/tridactyl/tridactyl/issues/680)).

    -   Update 1.13.1 release date in time for 1.13.2

-   Boring internal stuff

    -   Move most of hinting to content script (this may have broken some stuff - please report it if it has).

Thanks to all of our contributors for this release: Oliver Blanthorn, glacambre, Anton Vilhelm Ásgeirsson, Babil Golam Sarwar, Colin Caine, Jeff King, Bzly, WorldCodeCentral, Mohammad AlSaleh, Vladimir Macko, André Klausnitzer, Bodo Graumann, Chris Pickard, Lucian Poston, Matt Friedman, Susexe, and jcrowgey.

Extra special thanks go to André Klausnitzer, Chris Pickard, Lucian Poston, Matt Friedman, Susexe, Vladimir Macko, and WorldCodeCentral, all of whom were first time contributors.

Last, but not least - thank you to everyone who reported issues.

## Release 1.13.1 / 2018-06-20

-   New features

    -   `bufferall` bound to `B` by default shows you tabs in all windows.
    -   Container management with `container{create,close,update,delete}`, `viewcontainers` and `tabopen -c [container name] URL`
        -   see `help containercreate` for more information
        -   Mode indicator's border now uses the current container colour
    -   `set hintnames numeric` for sequential numeric hints. Best used with `set hintfiltermode vimperator-reflow`.
    -   Changelog now tells you when there's a new changelog that you haven't read.
    -   `guiset navbar none` removes the navbar totally. Not for the faint-of-heart: you could potentially get trapped if Tridactyl stops working.

-   Bug fixes

    -   `nativeopen` now puts tabs in the same place that `tabopen` would
    -   `santise tridactyllocal tridactylsync` now works in RC files
    -   Missing ;w hint winopen bind added
    -   Fixed minor error with themes not being properly applied on some sites
    -   Fixed reload bug on :help when there's no hash
    -   `<C-i>` editor will now always update the field you started in, not just the one you currently have focused.
    -   "email" input elements can now be focused without errors.
    -   `urlincrement` no longer throws errors if a link cannot be found.

## Release 1.13.0 / 2018-06-08

-   **Potentially breaking changes**

    -   Pipes in `composite` now send return values to the following ex command. Use semi-colons if you want the old behaviour back (see `bind D`).
    -   The `DocStart` autocommand now uses `String.prototype.search` for matching, so you can use regular expressions such as `/www\.amazon\.co.*/`.

-   `editor` now includes the hostname of the site you are on in the temporary filename.

    -   this is mostly so that you can set up syntax highlighting in Vim, e.g, `au BufReadPost *github.com* set syntax=pandoc`

-   `native` support for Windows: just do what `installnative` tells you to.

    -   You'll probably want to make sure `gvim` is on your path.

-   New autocommand events:

    -   TriStart: Triggered when you start firefox.
    -   TabEnter/TabLeft: Triggered when you enter and leave a tab.

-   New commands:

    -   `:js` and `:jsb` let you execute arbitrary javascript.
    -   `:restart` will restart Firefox if you have installed Tridactyl's native executable.
    -   `:fixamo` will make Tridactyl work on addons.mozilla.org. Requires a `:restart`.

-   Hint improvements:

    -   You can select title/alt text of elements using `:hint -P`.
    -   `hint -;` now accepts selectors.
    -   Uppercase hints are now supported.

-   Multiple improvements for the mode indicator. It will:

    -   Disappear when you hover your mouse over it.
    -   Go purple in private windows.
    -   Be invisible on printed pages.

-   There is now a jumplist:

    -   `<C-o>` or `:jumpprev` will go to your previous location.
    -   `<C-i>` or `:jumpnext` will go to the next location in your jumplist.

-   Themes:

    -   `shydactyl`, `greenmat`, `quake` were added.
    -   The dark theme has been updated.
    -   themes apply to {newtab, mode indicator, tutor}.

-   Add new internal structure for themes - check out contributing.md on the repository if you want to add your own

    -   Adding themes at runtime is planned but some way off.

-   The long awaited blacklist to automatically enter ignore mode on some websites is now available! See `:h blacklistadd`.

-   Ignore mode can now also be toggled with <CA-`>.

-   A colon is shown at the beginning of the command line.

-   `:set setting` will now display the setting's value.

-   The command line should work again on image documents.

-   Urlmodify doesn't add the websites you're leaving to your history anymore.

-   An experimental `smoothscroll` setting has been added. You can turn it on by using `:set smoothscroll true`. Be warned, this can make scrolling slower on some websites.

-   `credits` added to show off all the wonderful contributors we have.

-   `help` now displays relevant aliases and key bindings, and `help [key sequence / alias]` will take you to the relevant help.

## Release 1.12.0 / 2018-05-13

-   Add container support
    -   `hint` will now open links in the current container
    -   there is a new setting, `set tabopencontaineraware [false|true]`, which will make `tabopen` open new tabs in the current container
-   Add extra `<CA-Esc>` bind to toggle ignore mode by popular demand
-   Fix errors related to missing native messenger on Firefox launch

## Release 1.11.2 / 2018-05-11

-   Hotfix to prevent "config undefined" errors on browser start if no rc file was found
    -   It was mysteriously only reproducible sometimes...
-   Make newtab changelog a bit wider

## Release 1.11.1 / 2018-05-11

-   **Add "tridactylrc" support**

    -   Stick a bunch of commands you want to run at startup in one of:
        -   `$XDG_CONFIG_DIR/tridactyl/tridactylrc`
        -   `~/.config/tridactyl/tridactylrc`
        -   `~/.tridactylrc`
    -   [Example file available here](https://github.com/tridactyl/tridactyl/blob/master/.tridactylrc)
    -   You can run any file you want with `source [absolute path to file]`. Bonus points if you can think of something sensible to do with `source` in an `autocmd`.
    -   If you want vim-style configuration where nothing persists except that which is in the rc file, simply add `sanitise tridactyllocal tridactylsync` to the top of your rc file.
    -   Only whole-line comments are supported at the moment, in the VimL style where lines start with a quote mark: "

-   Native messenger updated to 0.1.3

    -   Add rc file reader
    -   Add ability to read environment variables
    -   Make read understand ~ and environment variables (used in `source`)

-   Readme updated

    -   Add statistics page and `guiset`

-   Bug fixes

    -   `guiset` can now cope with multiple Firefox instances running simultaneously provided they are started with profiles explicitly via the command line.

-   Deprecations
    -   Remove buffers,tabs as promised
    -   Inform people pressing `I` of the new bind

## Release 1.11.0 / 2018-05-09

-   You can now edit the Firefox GUI from Tridactyl with `guiset`. You must restart Firefox after using `guiset` to see the effects.

    -   e.g, `guiset gui none` or `guiset gui full`.
    -   see all the options with `help guiset` and following the links.
    -   **Only minimally tested. Back up your precious userChrome.css if you care about it!**

-   You can now choose to bypass [CSP](https://en.wikipedia.org/wiki/Content_Security_Policy) on all sites with `set csp clobber`. If you change your mind, just `unset csp`, and restart your browser.

    -   This, for example, allows Tridactyl to run on pages such as https://raw.githubusercontent.com/cmcaine/tridactyl/master/CHANGELOG.md, but it could also allow other scripts to run on pages, making the Internet as dangerous as it was about 2 or 3 years ago before CSP was introduced.
    -   Once this [bug](https://bugzilla.mozilla.org/show_bug.cgi?id=1267027) in Firefox is fixed, you won't have to clobber CSP.

-   Tridactyl will no longer update while the browser is running in an attempt to fix issues where the add-on would be unresponsive after an update; instead, it will only update on browser launch.

    -   This includes manual updates via `about:addons`. You'll need to restart the browser after clicking "Check for updates".

-   `set newtab news.bbc.co.uk` etc. now looks much less janky

-   Minor new features

    -   Add !s alias for silent exclaim
    -   `termite` and `terminator` support with `set editorcmd auto`
    -   Allow binding <Esc> (not recommended...)
    -   AMO explains why we need each new permission
    -   Native messenger documentation improved, making it clear that we haven't reimplemented IRC in the browser.

-   Minor bug fixes
    -   Remove pixel gap under command bar ([#442](https://github.com/tridactyl/tridactyl/issues/442))
    -   Native installer no longer requires pip and supports Debian's `which`
    -   Help page links are more legible on rubbish screens
    -   Turn 'q' and 'qall' into aliases
    -   Fix typo regarding binding of special keys on help page
    -   `focusinput` is now better at finding elements to focus

## Release 1.10.1 / 2018-05-04

-   Add tabcloseallto{right,left} bound to `gx0` and `gx$`
-   Update tab page and other documentation to reflect new ignore mode binding
-   Fix #474: you can open a handful of about:\* pages without the native messenger again
-   Improve feedback when native messenger is not correctly installed

## Release 1.10.0 / 2018-05-03

-   Native messenger (for OSX/Linux only, for now)! On Linux/OSXRun `:installnative` to install, then:

    -   `<Ctrl-I>` in a text field will open Vim, probably. Set it with `set editorcmd` but make sure that the command stays in the foreground till the programme is exited.
    -   Not all text fields work yet (esp CodeMirror), so make sure you test it before writing war and peace.
    -   `:! [shell command]` or `:exclaim [shell command]` will run the command and give you STDOUT/STDERR back in the command line.
        -   You can't use composite and shell pipes together yet.
        -   Anything that works in `/bin/sh` should work
            -   If you want to use a different shell, just make your own alias:
                -   `command ! exclaim fish -c` (but be aware that some shells require quotes around arguments given to -c)
    -   Requires a new permission to use the native messenger (and to use Tridactyl at all, unfortunately)
    -   `nativeopen` will try to open a new tab or window using the native messenger. It is used in `{,win,tab}open` automatically when you try to open about:_ or file:_ URIs.

-   Add `hint -W [exstr]` to execute exstr on hint's href

    -   `hint -W exclaim_quiet mpv` works particularly well.

-   **Breaking change**: change ignore mode binds to be symmetric and resolve Jupyter conflict

    -   Ignore mode is now bound to `<S-Insert>` to enter and leave it.
    -   Previous binds of `I` and `<S-Esc>` are unbound

-   More scrolling fixes

    -   `G`/`gg` will now work on more sites

-   Completion improvements

    -   History completion performance improved
        -   If you find you are getting worse results than usual, increase `set historyresults` to, e.g, 500.
    -   Fix #446: you can now edit completions you select with space
    -   Completions will now pan to show you what you have selected

-   Mode indicator is now print friendly ([#453](https://github.com/tridactyl/tridactyl/issues/453))!

-   Fiddled with `help` theme

    -   We've tried to make it look a bit more like the old Vimperator help pages and have hidden some useless or misleading bits that TypeDoc produced, such as the return values.

-   `viewsource` improved

    -   Now bound to `gf` by default
    -   Fix viewsource elem not always covering the whole page
    -   Remove viewsource elem on spa history changes

-   Bind help to F1

-   Changelog changelog:

    -   Change changelog date format
    -   Changelog: use standard case: changelog.md -> CHANGELOG.md
    -   Changelog: move to the standard location
    -   Changelog: add dates

-   Misc fixes
    -   Fix :open <empty string>. Fixes #421
    -   Filter AltGraph keys. Fixes #430
    -   Explain that the hint tags are typed in lowercase even though they are displayed in uppercase

## Release 1.9.8 / 2018-04-26

-   Make error reporting to command line less fussy
-   Fix error reporting loop with `noiframeon`

## Release 1.9.7 / 2018-04-25

-   Load iframe more lazily to stop breakage on some sites
-   Add setting `noiframeon` for websites that are still broken by our iframe ("ServiceNow", for example: #279)
    -   Simply `set noiframeon [space separated URLs]` to blacklist URLs
-   This will hopefully be our final release before the native messenger for OSX and Linux is merged.
    -   If you'd like to help test it out, download our latest betas from [here](https://tridactyl.cmcaine.co.uk/betas) and run `:installnative` once you are in.

## Release 1.9.6 / 2018-04-25

-   Scrolling improvements
    -   Faster ([#395](https://github.com/tridactyl/tridactyl/issues/395))
    -   `G`/`gg` work on more pages ([#382](https://github.com/tridactyl/tridactyl/issues/382))
-   Mode indicator improvements
    -   Can be disabled with `set modeindicator false`
    -   Text is not selectable to improve the lives of people who "Select All" a lot
-   Internal error messages are now displayed in the command line
-   New default alias `:h` for `:help`
-   Bug fixes
    -   Fix #418: keyseq is better at realising when a key combination is invalid

## Release 1.9.5 / 2018-04-22

-   Add mode indicator
-   Fix #337: Make `composite` and ex-parser more sequential
    -   Add `D` binding: close current tab and `tabprev`
-   Bug fixes
    -   Fix `tab` in inputmode
    -   Catch CSP exception when hijacking

## Release 1.9.4 / 2018-04-20

-   Add jumplist for inputs bound to `g;`
    -   Editor's impartial note: this is pretty cool
-   Add `hint -W [exstr]` to execute exstr on hint's href
-   Update new tab page:
    -   Add changelog
    -   Remove welcome to new users as we have `tutor` for that now
    -   Fix newtab redirection on `set newtab [url]`
        -   `set newtab about:blank` now works thanks to a Mozilla bug fix!
    -   Warn users about native messenger update
-   Bug fixes
    -   input-mode now correctly exits to normal mode on focus loss
    -   Stop treating "std::map" or "Error: foo" as URIs: searching for them will now work.

## Release 1.9.3 / 2018-04-19

-   Fix unbind issues
-   Add more default binds from Vimperator
-   Change the `^` bind to `<c-6>` (matches vim)
-   :bmark now supports folders

## Release 1.9.2 / 2018-04-16

-   Fix #392 (bug with keyseq)

## Release 1.9.1 / 2018-04-15

-   Fix buffer switch bind

## Release 1.9.0 / 2018-04-15

-   Allow binds with modifiers (e.g. `<C-u>`) and binds of special keys (e.g. `<F1>`) and both together (e.g. `<SA-Escape>`)
-   Normal mode now only hides keypresses that you've told it to listen to from the web page
-   Improve documentation
    -   Update readme
    -   Improve help on excmds.ts
    -   Update AMO text (includes explanation of why various permissions are demanded)
    -   Add tutorial on `tutor`
        -   Shown on first install of Tridactyl
    -   Add `viewconfig` command to open the current configuration in Firefox's native JSON viewer (which Tridactyl doesn't work in)
-   [Move betas to our own site](https://tridactyl.cmcaine.co.uk/betas) as addons.mozilla.org stopped supporting them ([#307](https://github.com/tridactyl/tridactyl/issues/307))
    -   Add automatic updates for betas
        -   If you downloaded a beta before pre778, you will need to update manually to a later beta.
-   Small new features
    -   Fix #370: add `clipboard yanktitle|yankmd`
    -   Add `fullscreen` command (not quite #376)
    -   Add `viewsource` command
    -   `set allowautofocus false` to stop pages stealing focus on load (#266, #369)
    -   `^` now switches to last used tab by default
    -   In command mode, `Space` now puts the URL from the selected completion into the command line ([#224](https://github.com/tridactyl/tridactyl/issues/224))
    -   Add find mode, left unbound by default
        -   Not ready for widespread usage: slow and probably buggy.
    -   `hint -wp` to open hint in a private window ([#317](https://github.com/tridactyl/tridactyl/issues/317))
    -   Configuration can now upgrade itself to allow us to rename settings
    -   Add dark theme: `set theme dark` ([#230](https://github.com/tridactyl/tridactyl/issues/230))
    -   Tab opening settings for `tabopen` ([#342](https://github.com/tridactyl/tridactyl/issues/342))
        -   `set {related,tab}openpos next|last`
-   Stuff only collaborators will care about
    -   Code is now run through the prettier formatter before each commit
-   Moderately large bug fixes
    -   Fix scrolling on sites that use frames (#372, #63, #107, #273, #218)
    -   Fix hinting on sites with frames ([#67](https://github.com/tridactyl/tridactyl/issues/67))
    -   Hijack event listeners to put hints on more JavaScript links (#204, #163, #215)
-   Small bug fixes
    -   Fix #276: ]] on Hacker News
    -   Support #/% index for tabs everywhere internally
        -   Fix #341: `tabclose #` now works
    -   Reduce logging
    -   Rename some config:
        -   Rename vimium-gi to gimode, default to firefox, version to configversion
    -   Fix hinting following JavaScript links because they look the same
-   Introduce new bugs
    -   Show useless hints on some sites ([#225](https://github.com/tridactyl/tridactyl/issues/225))
    -   and more!

## Release 1.8.2 / 2018-03-07

-   Improve config API
    -   `set key.subkey.subsubkey value` now works
    -   Add user feedback to `bind` and `get`
-   Add save link/img hint submode (;s, ;S, ;a, ;A) ([#148](https://github.com/tridactyl/tridactyl/issues/148))
-   Add `autocmd [event] [filter] [ex command]`
    -   Currently, only supports the event `DocStart`
    -   Most useful for entering ignore mode on certain websites: `autocmd DocStart mail.google.com mode ignore`
-   Add exmode aliases with `command [alias] [ex_command]`. Many aliases have been ported from Pentadactyl. ([#236](https://github.com/tridactyl/tridactyl/issues/236))
-   Add urlmodify command (#286, #298)
-   Support Emacs-style C-(a|e|k|u) in cmdline ([#277](https://github.com/tridactyl/tridactyl/issues/277))
-   Support changing followpage pattern used in `]]` and `[[` to allow use with foreign languages
-   Add logging levels and make logging less verbose by default ([#206](https://github.com/tridactyl/tridactyl/issues/206))
-   Support %s magic string for search providers ([#253](https://github.com/tridactyl/tridactyl/issues/253))
-   Add hintfiltermode config and new "vimperator, vimperator-reflow" hinting modes
    -   Make hintPage follow link if there's only 1 option
-   Fix high resource usage when typing under some circumstances ([#311](https://github.com/tridactyl/tridactyl/issues/311))
-   `set newtab foo.bar` now changes all new tab pages ([#235](https://github.com/tridactyl/tridactyl/issues/235))
-   Fix hints on some sites via cleanslate.css ([#220](https://github.com/tridactyl/tridactyl/issues/220))
-   Fix new config system ([#321](https://github.com/tridactyl/tridactyl/issues/321))
-   followpage now falls back to urlincrement
-   `tabopen` now opens tabs to the right of the current tab
-   Fix floating commandline iframe on some sites ([#289](https://github.com/tridactyl/tridactyl/issues/289))
-   Enter insert mode on drop down menus ([#281](https://github.com/tridactyl/tridactyl/issues/281))
-   Support hinting on some dodgy old websites ([#287](https://github.com/tridactyl/tridactyl/issues/287))
-   Make :reloadall only refresh current window tabs ([#288](https://github.com/tridactyl/tridactyl/issues/288))
-   Remove `xx` binding ([#262](https://github.com/tridactyl/tridactyl/issues/262))
-   Fix gu in directories ([#256](https://github.com/tridactyl/tridactyl/issues/256))
-   Fix various typos (#247, #228)
-   Add FAQ and other updates to readme.md ([#232](https://github.com/tridactyl/tridactyl/issues/232))

## Release 1.7.3 / 2017-12-21

-   Hint tags are much better:
    -   Hint tags are now as short as possible
    -   Remove now disused `hintorder` setting
-   Add `.` to repeat last action
-   Add inputmode: `gi` and then `Tab` will cycle you between all input fields on a page
-   Add hint kill submode `;k` for removing elements of a webpage such as dickbars
-   Add relative zoom and `z{i,z,o}` binds
-   Add `sanitize` excmd for deleting browsing/Tridactyl data
-   Search engines:
    -   Add `searchsetkeyword [keyword] [url]`: define your own search engines ([#194](https://github.com/tridactyl/tridactyl/issues/194))
    -   Add Qwant and update startpage URL ([#198](https://github.com/tridactyl/tridactyl/issues/198))
    -   Add Google Scholar search engine
-   Fix problems where ignore mode would revert to normal mode on some websites with iframes ([#176](https://github.com/tridactyl/tridactyl/issues/176))
-   Add ^ and \$ in normal mode for navigation to 0% or 100% in x-direction
-   Buffer completion fixes
    -   Use tab ID even if buffer has a trailing space ([#223](https://github.com/tridactyl/tridactyl/issues/223))
    -   completions: passthrough # in buffercompletion
-   Support multiple URLs for quickmarks
-   Blacklist default newtab url from history completions
-   Fix `set newtab` failing to set newtab
-   Add `q`, `qa`, and `quit` synonyms
-   Fix `unset` failing to take effect without reloading page
-   Minor improvements to `help` preface
-   Add <summary> tags to standard hinting
-   Log an error to browser console if no TTS voices are found

## Release 1.7.0 / 2017-12-01

-   History completion is massively improved: much faster, more relevant results, and less janky as you type.
-   User configuration
    -   set [setting] without a value will inform you of the current value
    -   Add configuration options for hinting: `hintchars` and `hintorder`
    -   Add unset for resetting a bind to default
    -   You can now change default search engine with e.g, `set searchengine bing` ([#60](https://github.com/tridactyl/tridactyl/issues/60))
    -   The default new tab page can be replaced with any URL via `set newtab [url]` ([#59](https://github.com/tridactyl/tridactyl/issues/59))
    -   Add `gh` and `gH` and "homepages" setting ([#96](https://github.com/tridactyl/tridactyl/issues/96))
-   Shift-tab and tab now will cycle around completions correctly
-   `ys` now works on some older pages
-   Add bmarks command for searching through bookmarks ([#167](https://github.com/tridactyl/tridactyl/issues/167))
-   Add `hint -c [selector]`: add hints that match CSS selector
-   Add text-to-speech hint mode on `;r`
-   Allow `;p` to yank any element which contains text
-   Add `;#` hint yank anchor mode
-   Improve hint CSS by adding a border and making background semi-transparent
-   Add `tabonly` command
-   Fix hinting mysteriously not working on some pages ([#168](https://github.com/tridactyl/tridactyl/issues/168))
-   Fix issue where command line would invisibly cover up part of the screen ([#170](https://github.com/tridactyl/tridactyl/issues/170))
-   Bookmarks can now have spaces in their titles
-   Fix some hints on sites such as pcgamer.co.uk
-   Long page titles will no longer appear after URLs in completions
