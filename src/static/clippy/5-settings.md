# Settings

You can view description of settings with `help [setting]`, and find their current value with `get [setting]`. You can set a setting with `set`, and reset it to default with `unset` (the command `reset` is only for resetting keybinds because it seemed like a good idea at the time). `bind [key] [command]` is a helper command that sets settings within nmaps. You can also use `viewconfig` to view all settings at once (but Tridactyl cannot run on the page that it opens).

Here we will briefly summarise some of the main settings:

-   nmaps
    -   these are all of the keybinds in normal mode
-   searchengine
    -   the default search engine to use. You can choose any from the searchurls setting, or add your own.
-   hintfiltermode
    -   the style of hint mode to use. Set it to "vimperator" to filter links by typing in the text they display
    -   You will also want to change the hintchars setting to something that allows you to type in most text, e.g, 5432167890.
-   theme
    -   e.g. dark or default, but it's more convenient to use the `:colours` command to change it
-   exaliases
    -   aliases for command mode: the things on the left actually run the commands on the right. The most interesting one of these is `current_url`, which is how the binds for O, W and T (`bind T`) work.

There are many other commands related to settings:

-   `:seturl [url pattern] [key] [values...]` sets a setting for URLs which match it
-   `:bind [--mode=mode?] [key sequence] [ex-command...]` binds a key sequence to an ex-command in the mode specified
-   `:bindurl [url pattern] [--mode=mode?] [key sequence] [ex-command...]` binds a key sequence to an ex-command in the url and mode specified
-   `:unbind` unbinds a key sequence
-   `:setnull` deletes a setting (overwriting the default with an "empty" setting - useful for deleting searchurls, for example)

## RC files

An RC ("run commands") file uses command-mode syntax, with commands separated by newlines; a trailing `\` continues a command on the next line. A line whose first non-whitespace character is `"` or `#` is a comment; inline comments are not supported.

By default, Tridactyl runs `:source` at browser startup. With no path, it loads only the first RC file selected by the native messenger, which prefers the platform config directory (usually `$XDG_CONFIG_HOME/tridactyl/tridactylrc` or `~/.config/tridactyl/tridactylrc`) over `~/.tridactylrc`. Run `:findrc` to see which path a bare `:source` would currently use, and `:source` again after editing. Local files require the native messenger; URL and clipboard sourcing can work without it.

Settings already persist in Firefox storage. `:source` runs commands from an RC file but does not keep it synchronised with browser changes; `:mkt` exports the current user settings. Use `:mkt -f` to overwrite an existing file. Clipboard sourcing and `:mkt --clipboard` do not require the native messenger with the default clipboard settings.

Use `:viewconfig --user` to inspect the resulting settings. To trace progress through an RC file, put `fillcmdline_tmp 3000 reached this line` on a line of its own while on a page Tridactyl can access.

The [next page](./6-containers.md) will talk about how to operate firefox containers with tridactyl. <a href='./4-command_mode.md' rel="prev"></a>
