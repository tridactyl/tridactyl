# Command mode

Command mode is used for accessing less frequently used commands, such as:

- `tabdetach` to detach the current tab into a new window
- `bind [key] [excommand]` to bind keys
- `viewsource` to view the current page's source
- `help [command]` to access help on a command
- `composite [command 1] | [command 2] | [command 3]...` lets execute commands sequentially, useful for binding.

We support a handful of keybinds in the console:

- `Ctrl-C` to exit to normal mode, or copy selected text.
- `Up`/`Down` to search in command history: e.g. `:tabopen` `Up` will show you the most recent tabopen command.
- `Tab`/`Shift-Tab` cycle completion, enter to select
- `Ctrl-F` to complete the command from command history
- `Space` to insert the URL of the highlighted completion into the command line

The [next page](./settings.html) will talk about the various settings available.
