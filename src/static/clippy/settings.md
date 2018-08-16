# Settings

The Tridactyl settings are currently undergoing change; there will eventually be an `options` page where you can change and view these settings. For now, you can use `viewconfig [option]`. There's currently a small bug where we only show you your changed settings and not the rest of the defaults unless you specify the option exactly.

Currently, you can view settings on `help` next to the commands that they affect, or with `get [setting]`. You can set a setting with `set`, and reset it to default with `unset` (the command `reset` is only for resetting keybinds because it seemed like a good idea at the time). `bind [key] [command]` is a helper command that sets settings within nmaps.

Here we will briefly summarise some of the main settings:

*   nmaps
    *   these are all of the keybinds in normal mode
*   searchengine
    *   the default search engine to use. You can choose any from the searchurls setting, or add your own.
*   hintfiltermode
    *   the style of hint mode to use. Set it to "vimperator" to filter links by typing in the text they display
    *   You will also want to change the hintchars setting to something that allows you to type in most text, e.g, 5432167890.
*   theme
    *   dark or default
*   excmds
    *   aliases for command mode: the things on the left actually run the commands on the right. The most interesting one of these is `current_url`, which is how the binds for O, W and T (`bind T`) work.

The [next page](./containers.html) will talk about how to operate firefox containers with tridactyl. <a href='./command_mode.html' rel="prev"></a>
