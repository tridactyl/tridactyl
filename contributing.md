# Contributing

Tridactyl is very lucky to have a wide base of contributors, 30 at the time of writing, with contributions ranging from a single line to thousands. The purpose of this guide is to help you contribute to Tridactyl according to how much time and experience you have.

## Communicating

### Quick tasks (~10 minutes)

*   Leave a review on [addons.mozilla.org][amoreviews] (very few people do this :( )
*   Tell your friends about us :)
*   Read through [readme.md][readme], our [newtab.md][newtab] or our page on [addons.mozilla.org][amo] and see if anything looks out of date. If it does, file an issue or fork the repository (button in top right), fix it yourself (you can edit it using the pencil icon), and make a pull request.

### Quick tasks (~30 minutes)

*   Run through `:tutor` and [tell us what you think][tutor] or make changes directly.

## Programming (1 hour+)

*   Take a look through the [open issues][issues] and then check with [pull requests][prs] to make sure that someone isn't already working on it. Please post in an issue to say that you're working on it.
    *   If you don't have much experience with JavaScript or WebExtensions, we purposefully leave some particularly simple issues open so that people can get started, and give them the tag [good first issue][easyissues]. Feel free to ask us any questions about the build process on [Matrix][matrix].
    *   If you have experience with JavaScript or WebExtensions, please look through the issues tagged [help wanted][helpus] as we're really stuck on them.
*   You could work on some feature that you really want to see in Tridactyl that we haven't even thought of yet.
*   Our build process is a bit convoluted, but [excmds.ts][excmds] is probably where you want to start. Most of the business happens there.
*   We use TypeDoc to produce the `:help` page. Look at the other functions in [excmds.ts][excmds] to get an idea of how to use it; if your function is not supposed to called from the command line, then please add `/** @hidden */` above it to prevent it being shown on the help page.
*   Our pre-commit hook runs prettier to format your code. Please don't circumvent it.

If you are making a substantial or potentially controversial change, your first port of call should be to stop by and chat to us on [Matrix][matrix] or file an issue to discuss what you would like to change. We really don't want you to waste time on a pull request (GitHub jargon for a contribution) that has no chance of being merged; that said, we are probably happy to gate even the most controversial changes behind an option.

# Add another theme (30 minutes+)

Take a look in src/static/themes to get an idea of what to do. There is a reasonable amount of magic going on:

*   All of your styles must be prefixed with `:root.TridactylTheme[Name]`. If your theme is called `bobstheme`, the selector mentioned must be `:root.TridactylThemeBobstheme` (note the capitalisation).
    *   All of your CSS will be injected into all pages, so it is important that is fenced off in this manner.
*   `default.css` has loads of variables that you can use to make it easier for you to style things, and for your theme to apply to new elements that did not exist when you wrote your theme. It is advised that you make as much use of these as possible.

# Code of conduct

[Queensberry rules](https://en.oxforddictionaries.com/definition/queensberry_rules).

[matrix]: https://riot.im/app/#/room/#tridactyl:matrix.org
[issues]: https://github.com/cmcaine/tridactyl/issues?utf8=%E2%9C%93&q=is%3Aissue+is%3Aopen+
[easyissues]: https://github.com/cmcaine/tridactyl/issues?q=is%3Aissue+is%3Aopen+label%3A%22good+first+issue%22
[helpus]: https://github.com/cmcaine/tridactyl/issues?q=is%3Aissue+is%3Aopen+label%3A%22help+wanted%22
[prs]: https://github.com/cmcaine/tridactyl/pulls
[readme]: https://github.com/cmcaine/tridactyl/blob/master/readme.md
[amo]: https://addons.mozilla.org/en-US/firefox/addon/tridactyl-vim/
[amoreviews]: https://addons.mozilla.org/en-US/firefox/addon/tridactyl-vim/reviews/
[newtab]: https://github.com/cmcaine/tridactyl/blob/master/src/static/newtab.md
[tutor]: https://github.com/cmcaine/tridactyl/issues/380
[excmds]: https://github.com/cmcaine/tridactyl/blob/master/src/excmds.ts
