## Standalone route

Some small browsers exist that use webkit/webengine for the heavy lifting. Two notable examples even have vim-like interfaces: qutebrowser and jumanji.

Extending them _might_ be easy, depending on the quality of the existing code base. We also need to evaluate these projects for maintainability: they're obviously going to have much less development power.

If it's comparable to this project done in webextensions, then we might want to just build our own/fork/contribute.

But what do we lose? What do the non-gecko bits of firefox do? What's left in the chrome repo if you remove webengine? I don't really know.

*   Kerning/font presentation code? (text in qutebrowser looks bad on Windows, don't know why)
*   Cross-platform OS shit
*   Firefox sync is neat and would be missed.
*   safebrowsing?
*   how much security stuff in engine/vs browser?
*   webm, webgl and similar? Presumably handled either by the engine or externally, but maybe picking and maintaining link to external thing is expensive.
*   flash handling?
*   What UI stuff are we not replacing?
*   developer tools (neat, but no reason for us to re-implement).

We also lose access to the existing addon/extension repos. Maybe if we implemented webextension support in our own browser we'd get them back? Don't know how difficult that is.

### A life without the addon store:

What addons do I use and would I miss them?

Should be part of the browser anyway:

*   stylish --> :style, or maybe .vimperator/styles/ (with magic comments?)
*   greasemonkey --> builtin/extensions/autocmds
*   site blocker --> /etc/hosts

Maybe not:

*   element hiding rules (ublock) not supported
*   tree tabs --> better :buffer?
*   lazarus form recovery is brilliant...
*   noscript is shit anyway
*   hide fedora is neat, but maybe just an element hiding list? Maybe it does have to parse differently.
    *   example of neat addon that a smaller browser wouldn't have available, anyway.
*   ref control is neat, but the UI is pants. Would be easy to build an ex-mode interface.
*   pwgen is trivial
*   https everywhere --> builtin?
