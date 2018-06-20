# Normal mode tutorial

Normal mode is where you will spend most of your time.

You can scroll up and down pages using `k` and `j`, and left and right with `h` and `l`; `gg` takes you to the top of the page and `G` to the bottom.

`H` and `L` navigate backwards and forwards in history.

Use `.` to repeat the last action.

Many keypresses in normal mode take you into another mode. `t`, for example, puts you into command mode prefilled with the command for opening a new tab; `F` puts you into hinting mode to open a link in a background tab; `gi` focuses the first text box on the page and allows you to press `Tab` to switch between text boxes.

## Useful normal mode keybinds

*   `b` brings up a list of your current tabs. Press `Tab`/`Shift-Tab` to cycle through them and enter to select. You can also type to filter down the tabs based on their titles and URLs
*   Opening web pages:
    *   `w` opens URLs in new windows
    *   `o` in the current tab
    *   `t` in a new tab
    *   Using a capital letter in place of any of the previous commands opens the command with the current URL pasted into it, i.e, `W`,`O`,`T`
    *   `s` lets you search easily
    *   in general, you can search many search engines straight from these prompts by simply starting your query with the search engine, such as `bing` `duckduckgo` or `scholar`
*   Navigate history with `H` and `L`
*   `yy` copies the current URL to your clipboard
*   `p` opens the clipboard contents as a web page, or searches for it, in the current tab. `P` opens it in a new tab
    *   Protip: quickly search for the source of a quote by using `;p` to copy a paragraph, and `P` to search the internet for it
*   `zi`,`zo`,`zz` zoom in, out and return to the default zoom

All the keys in normal mode are bound to commands; for example, `j` is bound to `scrolline 10`. If you are ever curious as to what a key sequence does in normal mode, you can simply use `:bind [keys]` and the command line will tell you to which command they are bound.

The [next page](./hint_mode.html) will explain how to use some of the various hint modes. This time try `]]` (guess the next page) to follow the link.

<a href='./tutor.html' rel="prev"></a>
