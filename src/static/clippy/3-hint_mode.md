# Hint mode

There are many different hint submodes. They all follow a similar pattern: hinting modes display characters above various elements on the screen, which you can type to perform actions using those elements. (Note: hint characters should be typed in lowercase.)

Here are some of the most useful hint modes:

-   `:hint -b` or `F`: open link in background
-   `:hint -y` or `;y`: copy link location to clipboard
-   `:hint -p` or `;p`: copy element text (such as a paragraph) to clipboard
-   `:hint -#` or `;#`: copy anchor location. Useful for linking someone to a specific part of a page.
-   `:hint -k` or `;k`: kill an element. Very satisfying.
-   `:hint -K` or `;K`: kill an element. Killed elements can be restored with :elementunhide

If there is ever only a single hint remaining (for example, because you have wittled them down, or there is only a single link visible on the page) the hint mode will follow it automatically.

Some hints have their tags (the labels which show which characters to press to activate them) in grey in the default theme. These correspond to elements which have JavaScript mouse events attached to them. If an element has a grey and a red hint tag next to it, pick the red one as this is almost always the correct tag.

The [next page](./3-1-visual_mode.html) will cover the visual mode. <a href='./2-normal_mode.html' rel="prev"></a>
