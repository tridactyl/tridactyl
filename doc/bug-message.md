(Note to self: make this block https://bugzilla.mozilla.org/show_bug.cgi?id=1215059 )

See also [content-scripts-bug.md](content-scripts-bug.md).

Vimperator and pentadactyl are addons that replace most of the Firefox UX with a keyboard-focused interface inspired by Vim. They enjoy moderate popularity and are particularly highlighted as "interesting add-ons" for porting on the Mozilla wiki[0].

From now on I'll just say "Vimperator" instead of "Vimperator and pentadactyl" or similar.

# How vimperator-like addons work in Google Chrome

Best examples of vimperator-like addons in Google Chrome are cVim[1] and vrome[2].

They inject a content script into all pages. The content script draws a statusline/commandline and listens for keyboard events in the tab's context. Communication with a background script is required to make each content script aware of configuration changes, call required web-exts and to share state (command history, last search term, etc).

The main drawback of this approach is that the content scripts aren't injected into some pages, so the addons just don't work at all on some pages. This is especially annoying if you navigate onto one of these pages, then can't get out without using the original chrome keybinds. Even if you can get out, you weren't able to use any of the tools you're used to (like hint mode, scrolling with vim keybinds) while you were there.

# Problems with vimperator-like addons in Google Chrome and with Firefox's current WebExtension APIs

Users of Vimperator-like addons cannot:

1.  Use vimperator at all on some URLs (about:\*, addons.mozilla.org)
    1.  Show and control the command line
    2.  Use any keyboard shortcuts
    3.  Use any commands or shortcuts that need to access the page's DOM.
        *   Includes: history control, scrolling, searching, hint mode, etc.
2.  Hide UI elements
    *   Vimperator aims to replace the entire UI, so the old Firefox UI is not used at all. This frees up valuable real estate on small screens, such as laptops.
3.  Escape from browser UI elements (especially the location bar)
4.  Suppress/shadow all browser keybinds
5.  Configure vimperator from the kind of config files they expect from other unix programs (and especially vim)
    *   In particular users expect to have something like ~/.vimperatorrc for their config and to be able to install additional plugins to something like ~/.vimperator/plugins; something like ~/.config/vimperator/ would also be acceptable.

In Firefox there is a new, sixth problem:

6.  Vimperator cannot open certain restricted URLs

The issues are in rough importance order, apart from 6, which should be higher.

# How vimperator could work in Firefox

Issue 1 is the trickiest and most important issue and is addressed in "Problems with restricted pages".

Issue 2 might be fixed by a theming API?

Issues 3 and 4 would be solved by the keyboard API proposed by lydell for vimfx, but those APIs have been abandoned.

Issue 5 would be solved by a filesystem API, the current storage API would require editing the config and plugins either in Firefox or in their favoured editor and then copy/pasting. A filesystem API that allows access to only a sandboxed dir in .mozilla/Firefox/[random profile string] would be less bad, but still a bit problematic: common user behaviour like storing their config files in a git repo are made rather more complicated.

Issue 6 could be solved by a new permission to allow a WebExtension to navigate to URI_DANGEROUS_TO_LOAD pages.

## Problems with restricted pages

### A plea for a new permission allowing content scripts on restricted pages

**Firefox devs seem dead against this, but we won't know for sure until we get a proper answer on bugzilla or the mailing lists (haven't asked yet, want to cut the question down).**

**This section needs revision after my chat with andym.**

If content scripts are permitted to run in all pages, if some suitably scary permission is accepted, issue 1, the most problematic issue, is dealt with entirely and simply, with, I argue, no significant loss of security for the user.

Leechblock is another addon that has a legitimate reason to access a restricted page (it hides itself to prevent its uninstallation when activated). {{MORE EXAMPLES}}

My understanding is that Firefox developers do not want to permit content scripts to run on restricted pages because of the possibility of privilege escalation. This is normally bad for two reasons:

1.  Security of the user
2.  Stability of the browser: addons using exposed APIs they shouldn't will break more on updates, etc.

I don't think either of these issues matter for an addon like vimperator. Vimperator is expected and essentially required to be able to read every keystroke the user makes on every page, control network access, control ui (including display of URLs and https status), etc. Let's say running a content script in about:addons might let us privilege escalate to control the whole browser. The only new warning we need to give users is that this addon can potentially run arbitrary code as your user on the host system, which vimperator could do anyway in a slightly roundabout fashion by redirecting any executable or source code the user downloads to some malware.

I think the user should be free to make the choice to trust an addon not to do something bad or malicious, even if it has essentially unlimited permissions. Developers, the main audience for vimperator, are used to making this choice.

Regarding stability, the risk of exposing APIs that shouldn't be used only really matters if you think our code will inadvertently call them or if you're worried we'll deliberately use the privilege escalation for something or other. I think this should be solvable, especially given the limited operations we want to be able to do.

### Workaround if we can't have content scripts

If the Firefox developers are adamant that no addon be permitted to access the DOM of restricted pages, then we have to work around that limitation with new APIs. This is the best I can come up with, but it relies again on lydell's abandoned keyboard API:

1.  The command line/statusline moves into a toolbar. Toolbar must be permitted to expand or overlay page content to show autocompletion and to talk to content and background scripts.
2.  The proposed keyboard API allows vimperator to capture keypresses within restricted pages, so we can still call most vimperator functions, but any that need to access the DOM of the restricted page won't work.
3.  The keyboardshortcuts API also proposed by the vimFx developer ("simple functions to trigger standard Firefox keyboard shortcuts programmatically") will allow some of the simple features we otherwise need DOM access for to work, examples: scrolling, history navigation, stop loading, etc. More advanced features such as hint mode, marks, insert, visual and caret mode and searching will not work.

These three fix the main problem in the chrome addons of getting stuck and having to use a different UI on some pages is mostly removed (remember, the whole point of vimperator is to replace the default UI/UX). It is important to highlight, however, that users losing hint mode on about: pages is a real UX hit because hint mode is the main way that users select and follow links in vimperator.

I can't think of an easy way of allowing hinting without DOM access. A built-in hinting API is probably the only sensible way; but seems like a high maintenance burden on Firefox (unless you want to enable hinting mode in normal Firefox, which would be cool). A less sensible proposal would be to tell us where and what the anchor tags are and let us overlay the page with just the labels in a new, mostly transparent window.

# Appendix

## List of new required WebExtension APIs

*   keyboard incl. function to escape browser location bar
    *   https://bugzilla.mozilla.org/show_bug.cgi?id=1215061
*   theming or some other API must support completely hiding most UI elements.
*   permission to programmatically navigate to restricted URLs
    *   https://bugzilla.mozilla.org/show_bug.cgi?id=1261289
    *   https://bugzilla.mozilla.org/show_bug.cgi?id=1298215
*   filesystem
    *   https://bugzilla.mozilla.org/show_bug.cgi?id=1246236
*   either:
    *   a permission allowing content scripts to run on restricted pages.
    *   or...
        *   keyboardshortcuts
        *   toolbar/custom html+css+js ui element with ability to expand or (preferably) overlay the tab window.
            *   https://bugzilla.mozilla.org/show_bug.cgi?id=1215064
        *   And for more functionality:
            *   hinting

## What's this hint mode thing, anyway?

Hint mode finds all clickable links visible in the viewport and draws a number next to each one. The user can type the number or part of the title of the link to narrow their selection. Once the selection is unique or the user presses enter, we navigate to the new page. Typically we do this by finding all the anchors in the viewport and adding a new bright yellow element with the appropriate number absolutely positioned on each one. We then need to update or remove these elements quickly as the user types to show labels only on the matching anchors.

Details vary slightly between different addons.

[0]: https://wiki.mozilla.org/WebExtensions/Future
[1]: https://github.com/1995eaton/chromium-vim
[2]: https://github.com/jinzhu/vrome
