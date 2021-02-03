# Contributing

Tridactyl is very lucky to have a wide base of contributors, 30 at the time of writing, with contributions ranging from a single line to thousands. The purpose of this guide is to help you contribute to Tridactyl according to how much time and experience you have.

## Communicating

### Quick tasks (~10 minutes)

-   Leave a review on [addons.mozilla.org][amoreviews] (very few people do this :( )
-   Tell your friends about us :)
-   Read through [readme.md][readme], our [newtab.md][newtab] or our page on [addons.mozilla.org][amo] and see if anything looks out of date. If it does, file an issue or fork the repository (button in top right), fix it yourself (you can edit it using the pencil icon), and make a pull request.

### Quick tasks (~30 minutes)

-   Run through `:tutor` and [tell us what you think][tutor] or make changes directly.

## Programming (1 hour+)

-   Take a look through the [open issues][issues] and then check with [pull requests][prs] to make sure that someone isn't already working on it. Please post in an issue to say that you're working on it.
    -   If you don't have much experience with JavaScript or WebExtensions, we purposefully leave some particularly simple issues open so that people can get started, and give them the tag [good first issue][easyissues]. Feel free to ask us any questions about the build process on [Matrix][matrix].
    -   If you have experience with JavaScript or WebExtensions, please look through the issues tagged [help wanted][helpus] as we're really stuck on them.
-   You could work on some feature that you really want to see in Tridactyl that we haven't even thought of yet.
-   Our build process is a bit convoluted, but [excmds.ts][excmds] is probably where you want to start. Most of the business happens there.
-   We use TypeDoc to produce the `:help` page. Look at the other functions in [excmds.ts][excmds] to get an idea of how to use it; if your function is not supposed to called from the command line, then please add `/** @hidden */` above it to prevent it being shown on the help page.
-   Our pre-commit hook runs prettier to format your code. Please don't circumvent it.

If you are making a substantial or potentially controversial change, your first port of call should be to stop by and chat to us on [Matrix][matrix] or file an issue to discuss what you would like to change. We really don't want you to waste time on a pull request (GitHub jargon for a contribution) that has no chance of being merged; that said, we are probably happy to gate even the most controversial changes behind an option.

# Add another theme (30 minutes+)

Take a look in src/static/themes to get an idea of what to do. There is a reasonable amount of magic going on:

-   All of your styles must be prefixed with `:root.TridactylTheme[Name]`. If your theme is called `bobstheme`, the selector mentioned must be `:root.TridactylThemeBobstheme` (note the capitalisation).
    -   All of your CSS will be injected into all pages, so it is important that is fenced off in this manner.
-   `default.css` has loads of variables that you can use to make it easier for you to style things, and for your theme to apply to new elements that did not exist when you wrote your theme. It is advised that you make as much use of these as possible.

# Architecture of the project

WebExtensions have multiple kinds of [processes](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Anatomy_of_a_WebExtension) (or scripts). There's a background process, which is attached to the main Firefox process. There's also the content process, with at least one per tab (sometimes more, as content processes can live in frames too). There are other kinds of processes, but Tridactyl doesn't use them.

As of January 2019, Tridactyl uses 2n+1 processes: a background process and two content processes per tab (one for the page and one for the command line frame). These processes do not have the same privileges or access to APIs, they instead need to cooperate by sending messages to each other. Mozilla's API for sending messages is [browser.runtime.sendMessage](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/runtime/sendMessage). You will probably not need to use it directly: Tridactyl has its own [message](https://github.com/tridactyl/tridactyl/blob/bdaa65d216678776b0406f5be99800ef5dd8d50f/src/lib/messaging.ts#L67), [messageActiveTab](https://github.com/tridactyl/tridactyl/blob/bdaa65d216678776b0406f5be99800ef5dd8d50f/src/lib/messaging.ts#L73) and [messageOwnTab](https://github.com/tridactyl/tridactyl/blob/master/src/lib/messaging.ts) functions, which are themselves used by higher-level abstractions such as [browserBg](https://github.com/tridactyl/tridactyl/blob/bdaa65d216678776b0406f5be99800ef5dd8d50f/src/lib/browser_proxy.ts#L3), the [macro preprocessor](https://github.com/tridactyl/tridactyl/blob/master/scripts/excmds_macros.py) and the [ex-mode dispatcher](https://github.com/tridactyl/tridactyl/blob/bdaa65d216678776b0406f5be99800ef5dd8d50f/src/excmds.ts#L2603).

## browserBg

The browserBg object is a simple proxy that enables calling any API available in the background process directly from the content script. For example, if you want to call the `browser.runtime.getPlatformInfo` function from the content script, just use `browserBg.runtime.getPlatformInfo()`. The one difference between `browser` and `browserBg` is that while `browser` has a few functions that do not return promises, `browserBg` will always return promises.

## The macros

The macro preprocessor's goal is to make content-script functions defined in [src/excmds.ts](https://github.com/tridactyl/tridactyl/blob/master/src/excmds.ts) available to the background script. It does so by reading `src/excmds.ts` and generating two files: `src/.excmds_background.generated.ts` and `src/.excmds_content.generated.ts`. While `src/.excmds_content.generated.ts` will only contain functions from `src/excmds.ts` marked with either `//#content` or `//#content_helper`, `src/.excmds_background.ts` will contain functions marked with `//#background` or `//#background_helper` and shims to automatically call `//#content` functions in the currently active tab.

Here's an example: you're writing the [`native()`](https://github.com/tridactyl/tridactyl/blob/bdaa65d216678776b0406f5be99800ef5dd8d50f/src/excmds.ts#L470) function in `excmds.ts` that checks whether the native messenger is installed. You need to use the native messaging API, which is only available in the background script, so you prepend your function declaration with the `//#background` macro. In order to let the user know whether the native messenger is installed or not, you will need to send a message to the content script of the currently activated tab in order to ask it to run the [`fillcmdline()`](https://github.com/tridactyl/tridactyl/blob/bdaa65d216678776b0406f5be99800ef5dd8d50f/src/excmds.ts#L2540) function. Since `fillcmdline` is marked with `//#content`, you can do this seamlessly just by calling `fillcmdline()` from the background script.

## Role of each file

### src/background/

-   config_rc.ts: Functions related to loading and executing the tridactylrc.
-   controller_background.ts: Parses and executes ex commands.
-   download_background.ts: Utility functions related to downloading that have to live in the background because downloading APIs aren't available to other processes.
-   hinting.ts: A simple proxy which just forwards ex command calls to the content script.

### src/content/

-   commandline_content.ts: Functions to interact with the command line frame from the page (e.g. setting the iframe's height).
-   controller_content.ts: Contains the logic for dispatching ex-commands on key presses and preventing pages from reading key events.
-   finding.ts: Code related to the `:find` and `:findnext` commands.
-   hinting.ts: Meat of the `:hint` ex command.
-   scrolling.ts: Scrolling logic.
-   state.ts: Functions to work with Tridactyl's per-tab state (e.g. mode).
-   styling.ts: Functions to apply styles to Tridactyl's elements and to the page.

### src/lib/

-   aliases.ts: Functions to resolve alias<->excmd mappings.
-   autocontainers.ts: Classes and interfaces for autocontainers (who would have thought?).
-   browser_proxy.ts: The implementation of the browserBg object.
-   config.ts: Defines Tridactyl's settings and functions to retrieve them.
-   containers.ts: Type definitions and wrappers around Firefox's container API.
-   convert.ts: Conversion functions used in controller_background.ts for ex command dispatch.
-   css_util.ts: CSS functions mostly used by :guiset.
-   dom.ts: Various utility functions that operate on the dom.
-   editor.ts: Implementation of readline functions available under the "text." namespace.
-   html-tagged-template.ts: Tagged template mostly used in completion sources.
-   itertools.ts: Function to work with JavaScript iterators (zip, map...).
-   keyseq.ts: Functions and classes to parse, create and interact with key sequences (e.g. `<C-e>a`).
-   logging.ts: Tridactyl's logging interfaces.
-   math.ts: Math stuff.
-   messaging.ts: Implementation of Tridactyl's messaging functions (attributeCaller, message, messageTab, messageOwnTab...).
-   native.ts: Wrappers around Firefox's native messaging API. Also has "higher-level" functions that interact with the native messenger (finding the user's favorite editor, reading/setting preferences...).
-   requests.ts: CSP-clobbering code. Not used anymore.
-   text_to_speech.ts: Various wrappers around Firefox's TTS APIs.
-   url_util.ts: Url incrementation, query-extraction, interpolation.
-   webext.ts: Wrappers around Firefox's APIs (activeTab(), ownTab()...).
-   nearley_utils.ts: Remnant of Tridactyl's previous architecture, where keys were handled in the background script.

### src/

-   background.ts: Entry point of Tridactyl's background script. Deals with various things that didn't deserve their own file when they were implemented: autocommands, autocontainers...
-   commandline_frame.ts: Entry point of the command line. Sets up various event listeners and updates completions when needed.
-   completions/\*.ts: All completion sources available to Tridactyl. Imported by commandline_frame.ts
-   completions.ts: Scaffolding used by completion sources in the "completions" folder.
-   content.ts: Entry point of the content script. Does various things that should happen when a new tab is created (hijacking event listeners, adding the modeindicator to the page...).
-   excmds.ts: All excmds, no matter whether they live in the content or background script. See the "The macros" section in order to learn a bit more about how they work.
-   grammars/bracketexpr.ne: Defines the key sequence (e.g. `<C-a>`) parser
-   help.ts: Script that is only included in help pages. Does things like embedding keybindings/settings values in the page.
-   manifest.json: The webextension manifest file that defines specifies Tridactyl's content and background scripts, permissions, icons and a few other things.
-   newtab.ts: Script that is only included in the newtab page. Currently only highlights the changelog when it changed since you last read it.
-   parsers/\*: Defines the parsers that turn key bindings into ex commands.
-   perf.ts: Performance-measuring tools.
-   state.ts: Defines Tridactyl's global state (list of inputs, command history...).
-   tridactyl.d.ts: Type definitions.

### src/static/

-   authors.html: Template for the `:authors` page.
-   badges/\*: Svg files embeded in the readme.
-   clippy/\*: Tutorial files accessed with `:tutor`.
-   commandline.html: Content of the comand line iframe.
-   css: Global css files that apply to elements no matter what the current theme is.
-   defaultFavicon.svg: The favicon tridactyl uses when it can't access the favicon of a tab.
-   logo/\*: Tridactyl's logo in various resolutions.
-   newtab.md: The content of Tridactyl's newtab page.
-   newtab.template.html: Tridactyl's newtab page, without its content.
-   themes/\*: Css files for each theme.
-   typedoc: Typedoc templates and css.

# Build Process

Building Tridactyl is done with `yarn run build`. This makes yarn run [scripts/build.sh](https://github.com/tridactyl/tridactyl/blob/master/scripts/build.sh), which performs the following steps:

-   Running the [macro preprocessor](https://github.com/tridactyl/tridactyl/blob/master/scripts/excmds_macros.py) to turn `src/excmds.ts` into `src/.excmds_background.ts` and `src/.excmds_content.ts` (see the "The macros" section for more info).
-   Running the [metadata-generation](https://github.com/tridactyl/tridactyl/blob/master/compiler/gen_metadata.ts) which just re-injects type information and comment strings into Tridactyl's code in order to make them available to Tridactyl at runtime. It also checks what themes are available at compile time and adds this information to the metadata.
-   Running webpack in order to compile Tridactyl down to one file per entry point.
-   Generating the newtab, author and tutorial pages with custom scripts and the documentation using typedoc.
-   Importing CSS files and embedding resources (other CSS files, base64 pictures) into them wherever they're needed

You can run Tridactyl easily in a temporary Firefox profile with `yarn run run`.

# Code of conduct

[Queensberry rules](https://en.oxforddictionaries.com/definition/queensberry_rules).

[matrix]: https://app.element.io/#/room/#tridactyl:matrix.org
[issues]: https://github.com/tridactyl/tridactyl/issues?utf8=%E2%9C%93&q=is%3Aissue+is%3Aopen+
[easyissues]: https://github.com/tridactyl/tridactyl/issues?q=is%3Aissue+is%3Aopen+label%3A%22good+first+issue%22
[helpus]: https://github.com/tridactyl/tridactyl/issues?q=is%3Aissue+is%3Aopen+label%3A%22help+wanted%22
[prs]: https://github.com/tridactyl/tridactyl/pulls
[readme]: https://github.com/tridactyl/tridactyl/blob/master/readme.md
[amo]: https://addons.mozilla.org/en-US/firefox/addon/tridactyl-vim/
[amoreviews]: https://addons.mozilla.org/en-US/firefox/addon/tridactyl-vim/reviews/
[newtab]: https://github.com/tridactyl/tridactyl/blob/master/src/static/newtab.md
[tutor]: https://github.com/tridactyl/tridactyl/issues/380
[excmds]: https://github.com/tridactyl/tridactyl/blob/master/src/excmds.ts
