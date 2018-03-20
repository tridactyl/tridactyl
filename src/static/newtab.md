![Tridactyl logo](logo/Tridactyl_100px.png)

# Tridactyl REPLACE_ME_WITH_THE_VERSION_USING_SED

Wondering, why you don't see your usual *new tab* page here? Have a look at the
bottom of this page. If you are happy to get some early help, just follow the
lines!

- You can view the main help page by typing [`:help`][help].

- You can contact the developers, other users and contributors for support or
  whatever on [Matrix][matrix-link], [Gitter][gitter-link], or
  [IRC][freenode-link].

- Or you can simply get going directly by having a look at the ...

## Highlighted features:

- `f`/`F` — enter the "hint mode" to select a link to follow. `F` to open it in
  a background tab.
- `I` — ignore all the features. And `Shift` + `Escape` to return back to the
  highly productive normal mode.
- `H`/`L` — go back/forward in the history.
- `o`/`O` — open a URL in this tab (`O` to pre-load current URL).
- `t`/`T` — open a URL in a new tab (`T` to pre-load current URL).
- `gt`/`gT` — go to the next/previous tab.
- `d` — close the current tab.
- `/` — open the find search box.
- `A` — bookmark the current page
- `b` — bring up a list of open tabs in the current window.
- `s` — if you want to search for something that looks like a domain name or
  URL.
- `gi` — scroll to and focus the last-used input on the page.
- `gr` — open Firefox reader mode (note: Tridactyl will not work in this mode).
- Bind your own commands with, e.g., `:bind J tabprev`. Type `:help bind` to
  see help on custom binds.
- `yy` — copy the current page URL to your clipboard.
- `[[`/`]]` — navigate forward/backward though paginated pages.
- `ZZ` — close all tabs and windows, but it will only "save" them if your
  about:preferences are set to "show your tabs and windows from last time".
- [`:help hint`][help-hint] to see all the other useful hint modes (this is the
  `f` magic. :).

## Pay attention to the following:

- Do not try to navigate to any about:\* pages using `:open` as it will fail
  silently.
- Firefox will not load Tridactyl on addons.mozilla.org, about:\*, some file:\*
  URIs, view-source:\*, or data:\*. On these pages Ctrl-L (or F6), Ctrl-Tab and
  Ctrl-W are your escape hatches.
- Tridactyl does not currently support changing/hiding the Firefox GUI, but you
  can do it yourself by changing your userChrome. There is an example file
  available on our repository [[2]].

## Why do I see this here?

Tridactyl overrides your newtab page because it cannot insert its content
script on the default about:newtab. Without the content script, our shortcuts
won't work, even if you're just passing through the page. We're working with
Firefox on improvements to the WebExtension APIs that will remove this
restriction.

## FAQ?

You have more questions? Have a look at our [FAQ][faq-link]!

[1]: https://github.com/cmcaine/tridactyl/issues
[2]: https://github.com/cmcaine/tridactyl/blob/master/src/static/userChrome-minimal.css
[3]: https://www.mozilla.org/en-US/firefox/organizations/

<div class="align-left">
\[1]: https://github.com/cmcaine/tridactyl/issues<br />
\[2]: https://github.com/cmcaine/tridactyl/blob/master/src/static/userChrome-minimal.css<br />
\[3]: https://www.mozilla.org/en-US/firefox/organizations/<br />
</div>

[faq-link]: https://github.com/cmcaine/tridactyl#frequently-asked-questions
[help]: /static/docs/modules/_excmds_.html
[help-hint]: /static/docs/modules/_excmds_.html#hint
[gitter-badge]: /static/badges/gitter-badge.svg
[gitter-link]: https://gitter.im/tridactyl/Lobby
[freenode-badge]: /static/badges/freenode-badge.svg
[freenode-link]: ircs://chat.freenode.net/tridactyl
[matrix-badge]: https://matrix.to/img/matrix-badge.svg
[matrix-link]: https://riot.im/app/#/room/#tridactyl:matrix.org
