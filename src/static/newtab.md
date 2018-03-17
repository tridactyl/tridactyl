![Tridactyl logo](logo/Tridactyl_100px.png)

# Tridactyl REPLACE_ME_WITH_THE_VERSION_USING_SED

Tridactyl overrides your newtab page because it cannot insert its content script on the default about:newtab. Without the content script, our shortcuts won't work, even if you're just passing through the page.

We're working with Firefox on improvements to the WebExtension APIs that will remove this restriction.

In the meantime, here are some notes about Tridactyl:

- Tridactyl is in a pretty early stage of development. Please report any issues and make requests for missing features on the GitHub project page [[1]].

- You can view the main help page by typing [`:help`][help]

- You can contact the developers and other users and contributors for support, to discuss pull requests or whatever on [Matrix][matrix-link], [Gitter][gitter-link], or [IRC][freenode-link].

Highlighted features:

- Press `b` to bring up a list of open tabs in the current window; you can type the tab ID or part of the title or URL to choose a tab
- Press `I` to enter ignore mode. `Shift` + `Escape` to return to normal mode.
- Press `f` to start "hint mode", `F` to open in background
- Type [`:help hint`][help-hint] to see all the other useful hint modes
- Press `o` to `:open` a different page
- Press `s` if you want to search for something that looks like a domain name or URL
- Bind new commands with e.g. `:bind J tabprev`. Type `:help bind` to see help on custom binds.
- Type [`:help`][help] for online help
- Use `yy` to copy the current page URL to your clipboard
- `]]` and `[[` to navigate through the pages of comics, paginated articles, etc.
- Pressing `ZZ` will close all tabs and windows, but it will only "save" them if your about:preferences are set to "show your tabs and windows from last time"

There are some caveats common to all webextension vimperator-alikes:

- Do not try to navigate to any about:\* pages using `:open` as it will fail silently.
- Firefox will not load Tridactyl on addons.mozilla.org, about:\*, some file:\* URIs, view-source:\*, or data:\*. On these pages Ctrl-L (or F6), Ctrl-Tab and Ctrl-W are your escape hatches.
- Tridactyl does not currently support changing/hiding the Firefox GUI, but you can do it yourself by changing your userChrome. There is an example file available on our repository [[2]].

If you want a more fully-featured vimperator-alike, your best option is Firefox ESR [[3]] and Vimperator :)

[1]: https://github.com/cmcaine/tridactyl/issues
[2]: https://github.com/cmcaine/tridactyl/blob/master/src/static/userChrome-minimal.css
[3]: https://www.mozilla.org/en-US/firefox/organizations/

<div class="align-left">
\[1]: https://github.com/cmcaine/tridactyl/issues<br />
\[2]: https://github.com/cmcaine/tridactyl/blob/master/src/static/userChrome-minimal.css<br />
\[3]: https://www.mozilla.org/en-US/firefox/organizations/<br />
</div>

[help]: /static/docs/modules/_excmds_.html
[help-hint]: /static/docs/modules/_excmds_.html#hint
[gitter-badge]: /static/badges/gitter-badge.svg
[gitter-link]: https://gitter.im/tridactyl/Lobby
[freenode-badge]: /static/badges/freenode-badge.svg
[freenode-link]: ircs://chat.freenode.net/tridactyl
[matrix-badge]: https://matrix.to/img/matrix-badge.svg
[matrix-link]: https://riot.im/app/#/room/#tridactyl:matrix.org
