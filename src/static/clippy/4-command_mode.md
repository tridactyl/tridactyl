# Command mode

Command mode, i.e, "the console", is used for accessing less frequently used commands, such as:

*   `tabdetach` to detach the current tab into a new window
*   `bind [key] [excommand]` to bind keys
*   `viewsource` to view the current page's source
*   `viewconfig nmaps` to view the current normal mode bindings
*   `help [command]` to access help on a command
*   `help [key]` to access help on an existing binding
*   `composite [command 1]; [command 2]; [command 3]...` lets you execute commands sequentially, useful for binding. If you want the results of each command to be piped to the other, use pipes `|` instead of semi-colons.

We support a handful of keybinds in the console:

*   `Up`/`Down` to search in command history: e.g. `:tabopen` `Up` will show you the most recent tabopen command.
*   `Tab`/`Shift-Tab` cycle completion, enter to select
*   `Ctrl-F` to complete the command from command history
*   `Space` to insert the URL of the highlighted completion into the command line

The [next page](./5-settings.html) will talk about the various settings available. <a href='./3-1-visual_mode.html' rel="prev"></a>
