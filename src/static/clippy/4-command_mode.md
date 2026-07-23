# Command mode

Command mode, i.e, "the console", also known as ex-mode, is used for accessing less frequently used commands, such as:

-   `tabdetach` to detach the current tab into a new window
-   `bind [key] [excommand]` to bind keys
-   `viewsource` to view the current page's source
-   `viewconfig nmaps` to view the current normal mode bindings
-   `help [command]` to access help on a command
-   `help [key]` to access help on an existing binding
-   `composite [command 1]; [command 2]; [command 3]...` lets you execute commands sequentially, useful for binding. If you want the results of each command to be piped to the other, use pipes `|` instead of semi-colons.

We support a handful of keybinds in the console:

-   `Up`/`Down` to search in command history: e.g. `:tabopen` `Up` will show you the most recent tabopen command.
-   `Tab`/`Shift-Tab` cycle completion, enter to select
-   `Ctrl-F` to complete the command from command history
-   `Space` to insert the URL of the highlighted completion into the command line
-   `Shift-Delete` to close the highlighted completion on `:tab` and `:taball` completions
-   `Ctrl-Enter` to execute the highlighted completion and keep the command line open
-   `<C-o>yy` to copy the highlighted completion to your clipboard

# Ex-script version 2

A new, experimental parser for ex-mode is available after `:set exversion 2`. It replaces composite and is designed to make common operations in Tridactyl easier to automate while remaining unintrusive and lightweight. Ex syntax must always be surrounded by spaces.

```
# comments must start on a new line
:set exversion 2

# colons are optional
echo hello
::::echo hello

# commands are terminated by a semicolon or a newline
:echo hello; echo world

# pipes can chain commands
:echo hello | fillcmdline

# underscore expressions are evaluated against pipeline input
# map and filter declare that they accept the same expressions as callbacks
# i.e. _.a > 1 is equivalent to javascript x -> (x.a > 1)
:js [{a: 1},{a: 2},{a: 3}] | filter _.a > 1 | fillcmdline

# _ is identity, dot is member access, and array slices are supported
# expressions in ordinary command arguments explicitly place their values
:js [1, 2, 3] | fillcmdline _[0:-2]
:js [1, 2, 3] | fillcmdline _

# .| maps the next command, expression, or block over an array
# bare expressions are allowed in pipes
:js [{hello: "world"}, {mellow: "yellow"}, {hello: "universe"}] .| _.hello | filter | fillcmdline

# { } form blocks
:bind ;Y {
    hint -eJc img |
    _.src |
    yankimage
}

# heredocs are supported for making javascript more pleasant
:js <<JS
    const a = "hello"
    const b = "world"
    console.log(a + b)
JS
```

Feedback on this new parser is welcome in [issue 5457](https://github.com/tridactyl/tridactyl/issues/5457).

The [next page](./5-settings.md) will talk about the various settings available. <a href='./3-1-visual_mode.md' rel="prev"></a>
