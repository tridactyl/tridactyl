# Tridactyl tutorial

Hello.

Welcome to the Tridactyl tutorial. Here, you will learn how to get started with this extension.

It will not cover advanced topics. For those, [`:help`](../docs/modules/_excmds_.html) is always at hand.

---

## Basics

Tridactyl turns Firefox into a modal browser, meaning it has several different modes of operation. It can only ever be in one mode at a time, and each of these modes could have a wildly different operation. You can think of it a bit like a Transformer, if you like. There are four main modes you will want to be familiar with:

- Normal mode
    - This mode is used for navigating around single pages and starting other modes.
    - You are usually in this mode. You can enter normal mode from the other modes by pressing `Escape`.
- Hint mode
    - This mode highlights elements on the web page and performs actions on those elements.
    - This is most often used for following links, but it has many other submodes.
    - You can enter this mode with `f` and exit it with `Escape` or `Enter`.
- Command mode ("ex-mode")
    - This mode allows you to execute more complicated commands by typing them out manually.
    - It is commonly used for binding keys and accessing help.
    - You can enter this mode with `:` and exit it with `Escape` or `Enter`.
- Ignore mode
    - This mode passes all keypresses through to the web page. It is useful for websites that have their own keybinds, such as games and Gmail.
    - You can enter the mode with `I` and leave it with `Shift-Esc`.

Almost all of the modes are controlled by series of keypresses. In this tutorial, a sequence of keys such as `zz` should be entered by pressing the key `z`, letting go, and then pressing the key `z`. There is no need to hold both keys at once, if that were even possible. (`zz` resets the zoom level to the default, so it probably didn't seem to do anything).

---

## Normal mode

The tutorial for normal mode starts on the [next page](./normal_mode.html). You could try following the link by using hint mode: press `f` and then type the characters that appear above the link.
