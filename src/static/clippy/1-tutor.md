# Tridactyl tutorial

Hello. If you've just installed Tridactyl for the first time, welcome! Tridactyl has something of a learning cliff. If you haven't used an add-on like it before, such as Pentadactyl or Vimperator, we strongly recommend you spend the 10-15 minutes it will take you to read through this tutorial. If you're already familiar with add-ons like this, we still suggest you skim through everything as there are a few things we do differently. Without further ado:

Welcome to the Tridactyl tutorial. Here, you will learn how to get started with this extension. If you ever want to get back to this page, just type `:tutor`.

It will not cover advanced topics. For those, [`:help`](../docs/modules/_src_excmds_.html) is always at hand. You might also find the [unofficial Tridactyl Memrise course](https://app.memrise.com/community/course/5995499/tridactyls-main-shortcuts/) (requires login) useful for memorising binds.

---

## Basics

The idea behind Tridactyl is to allow you to navigate the web more efficiently with just the keyboard. Tridactyl turns Firefox into a modal browser, meaning it has several different modes of operation, like Vim. Each tab can only ever be in one mode at a time and each of these modes could have a wildly different operation. You can think of it a bit like a Transformer, if you like. There are five main modes you will want to be familiar with:

-   Normal mode
    -   This mode is used for navigating around single pages and starting other modes.
    -   Tabs are usually in this mode. You can enter normal mode from the other modes by pressing `Escape`.
-   Hint mode
    -   This mode highlights elements on the web page and performs actions on those elements.
    -   This is most often used for following links, but it has many other submodes.
    -   You can enter this mode with `f` and exit it with `Escape` or `Ctrl-[`.
    -   Hint characters are displayed as uppercase letters, but you should type the lowercase letter.
-   Visual mode (experimental)
    -   This mode allows you to select text on the web page and copy it to the clipboard or search for it using `s` and `S`.
    -   You can enter this mode with `v`, by selecting text with the mouse, `;h` hint mode, `/` searching or by using Firefox's "caret" mode on `F7` and exit it with `Escape` or `Ctrl-[`.
-   Command mode ("ex-mode")
    -   This mode allows you to execute more complicated commands by typing them out manually.
    -   It is commonly used for binding keys and accessing help.
    -   You can enter this mode with `:` and exit it with `Escape` or `Enter`.
-   Ignore mode
    -   This mode passes all keypresses through to the web page. It is useful for websites that have their own keybinds, such as games and Gmail.
    -   You can toggle the mode with `Shift-Insert`, `Ctrl-Alt-Escape`, `Ctrl-Alt-Backtick`, or `Shift-Esc`.
    -   While in ignore mode, you can execute a single normal mode binding by pressing `<C-o>` followed by the keys for the binding.
    -   While in normal mode, you can enter ignore mode for one keypress / key combination by pressing `<C-v>`.
    -   Tridactyl can be configured to enter ignore mode for specified URLs. Run `:blacklistadd [url]` to put Tridactyl in ignore mode on the provided URL. Use the command `:blacklistremove [url]` to remove the URL from the blacklist.

Almost all of the modes are controlled by series of keypresses. In this tutorial, a sequence of keys such as `zz` should be entered by pressing the key `z`, letting go, and then pressing the key `z`. There is no need to hold both keys at once, if that were even possible. (`zz` resets the zoom level to the default, so it probably didn't seem to do anything). Sometimes `help` refers to a command that must be entered in command mode; it should hopefully always be clear from context which we mean.

### Note for users of other Vim-style browser tools

Tridactyl defaults to using `J` to switch to the previous tab and `K` to switch to the next tab, which may be different from what you're used to if you're coming from Vimperator/Pentadactyl, qutebrowser, or similar projects. You can run `:bind J tabnext` and `:bind K tabprev` to switch the two around if you prefer.

---

## Normal mode

The tutorial for normal mode starts on the [next page](./2-normal_mode.md). You could try following the link by using hint mode: press `f` (if there is only a single link on the screen, it will be followed; otherwise type the characters that appear above the desired link, in lower case. They are only displayed in upper case for ease of reading).
