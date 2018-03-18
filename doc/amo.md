## Control your browser with your keyboard *only*.

Replace Firefox's control mechanism with one modelled on VIM.
Most common tasks you want your browser to perform are bind to a single key
press:

You want to open a new tab? Hit `t`.
You want to follow that link? Hit `f` and type the displayed label.
You want to go to the bottom of the page? Hit `G`. Or the top? `gg`.
You want to focus the text field on Wikipedia to search for another term? `gi`.
Switch to the next tab? `gt`.
Go back in time? `H`.
Notice that this tab is rubbish and you want to close it? `d`.
Regret that decision? `u` restores it.
Temporarily disable all that magic because you can't stand it? `I`.
But how do you use your browser now? `Shift-Esc` and we're back on.

The list could go on a bit here, but I guess you'll get the point. If you feel
lost sometimes `:help` might help you a lot.

**Highlighted features:**

 - follow any link on the site with just 2-3 key presses.
 - switch to any open tab by searching for its URL or title or entering its ID.
 - easy customizable search settings
 - bind any supported command or commands to the key (sequence) of your liking
 - great default bindings (if you're used to Pentadactyl or Vimperator)

This add-on is very usable, but is in an early stage of development. We intend
to implement the majority of Vimperator's features.

We recommend that you use the beta versions below.

**Permissions:**

Since Tridactyl aims to provide all the features Vimperator and Pentadactyl
had, it requires quite a few permissions. Here we describe the specific
permissions and why we need them.

 - Access your data for all websites:
   * This is Mozilla's way of saying that Tridactyl can read the content of web
     pages. This is necessary in order to find the links you can follow with
     the `:hint` command (bound to `f` by default).
 - Read and modify bookmarks:
   * Tridactyl's command line has a powerful autocompletion mechanism. In
     order to be able to autocomplete your bookmarks, Tridactyl needs to read
     them.
 - Clear recent browsing history, cookies, and related data:
   * Tridactyl implements the `:sanitize` command Vimperator and Pentadactyl
     had. It works a bit like the "Clear All History" dialog you can access by
     pressing `Ctrl+Shift+Del` on default Firefox.
 - Get data from the clipboard:
   * If your clipboard contains a URL, pressing `p` will make Tridactyl follow
     this URL in the current tab.
 - Input data to the clipboard:
   * Tridactyl lets you copy various elements to the clipboard such as a page's
     URL with `yy`, a link's URL with `;y` or the content of an HTML element
     with `;p`.
 - Dowload files and read and modify the browser's download history:
   * By pressing `;s`, `;S`, `;a` and `;A` you can save documents and pictures
     from a page to your download folder.
 - Access browsing history:
   * This is again due to Tridactyl's autocompletion mechanism. The URL of
     websites you've already visited can be suggested as argument for the
     `:open` or `:tabopen` commands.
 - Access recently closed tabs:
   * If you've accidentally closed a tab, Tridactyl will let you open it again
     with the `:undo` command which is bound to `u` by default.
 - Access browser tabs:
   * Thanks to its `:buffer` command, Tridactyl will let you select any open
     tab. This command has, of course, autocompletion.
 - Access browser activity during navigation:
   * This is needed for Tridactyl to be able to go back to normal mode every
     time you open a new page.
