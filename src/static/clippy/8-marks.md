# Marks

Marks allow you to record your current position so that you can go back to it later. There are 2 types of marks:

-   local
    -   these work only on the page they were added on and are NOT persisted between browser restarts. They allow to you to save a position on a long, scrollable page. You can assign them to lowercase latin letters [a-z].
-   global
    -   these work anywhere and are persisted between browser restarts. You can assign them to uppercase latin letters [A-Z].

You can add a mark with `markadd [key]` or by using the default keybinding `m[key]`. To jump to a previously set mark, use `markjump [key]` or the default keybinding `` `[key] ``. You can also press ` `` ` to jump to the location before the last mark jump.

Try marking this position using `mA`. Switch to another tab and press `` `A `` to come back here. Press ` `` ` to go back to where you came from. You can also try setting a local mark using `ma` in the middle of a scrollable page, press `gg` to move to the top and then press `` `a `` to jump to the mark.

The [next](./8-1-i18n.md) of this tutorial is about comfortably using Tridactyl with keyboard layouts that are very different from QWERTY. <a href='./7-native_messenger.md' rel="prev"></a>
