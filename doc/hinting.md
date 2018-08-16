## Components

*   Iterable of visible links on page

*   Algorithm for choosing hint characters for each link

*   Mode for controller and excmd to refine and select hints:
    *   I imagine `:hint` to start
    *   `:hint j` to refine to only hints starting with j
    *   `:hint jk` to refine to hints starting with jk
    *   To make maps easier we can have `:hintaddchar j` and have the state of the current hintstr stored content-side.

## Improvements

Hinting modes should be flexible on both

1.  What is hinted (links, anchorpoints, frames, input elements, etc)
2.  What is done with the selected link (follow, yank, focus)

## Vimperator hint modes:

`:help` hinttags

```
string(default: //input[not(@type='hidden' or @disabled)] | //xhtml:input[not(@type='hidden')] | //a | //xhtml:a | //area | //xhtml:area | //iframe | //xhtml:iframe | //textarea | //xhtml:textarea | //button | //xhtml:button | //select | //xhtml:select | //\*[@onclick or @onmouseover or @onmousedown or @onmouseup or @oncommand or @role='link'or @role='button' or @role='checkbox' or @role='combobox' or @role='listbox' or @role='listitem' or @role='menuitem' or @role='menuitemcheckbox' or @role='menuitemradio' or @role='option' or @role='radio' or @role='scrollbar' or @role='slider' or @role='spinbutton' or @role='tab' or @role='textbox' or @role='treeitem' or @tabindex])

XPath string of hintable elements activated by f and F
```

Extended hint modes:

```
;  Focus hint
?  Show information for hint
s  Save link
S  Save object
a  Save link with prompt
A  Save object with prompt
f  Focus frame
o  Follow hint
t  Follow hint in a new tab
b  Follow hint in a background tab
w  Follow hint in a new window
F  Open multiple hints in tabs
O  Generate an ':open URL' using hint
T  Generate a ':tabopen URL' using hint
W  Generate a ':winopen URL' using hint
v  View hint source
V  View hint source in external editor
y  Yank hint location
Y  Yank hint description
#  Yank hint anchor URL
c  Open context menu
i  Show media object
I  Show media object in a new tab
x  Show hint's title or alt text
```
