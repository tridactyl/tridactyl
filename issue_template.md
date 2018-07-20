<!--

Thanks for taking the time to file an issue! Tridactyl doesn't have any analytics built into it, so issues are our only way of finding out about problems!

Reading and following the information on this page would probably save us some time, but if you personally are short on time, please just delete everything and file an issue anyway - we would much rather have a few duplicate issues than miss out on a new issue.


# Making a feature request

If you're opening this issue to request a new feature, please delete everything here after you've searched through the `:help` page in Tridactyl and the issues in this repository first.


# Reporting a bug / getting help

If you're opening this issue to report a bug with a specific site, please read and follow the "Settings that can fix websites" paragraph of the (troubleshooting steps)[https://github.com/cmcaine/tridactyl/tree/master/doc/troubleshooting.md] first.

If that does not solve your problem, please fill in the following template and then delete all the lines above it, and any other lines which you do not feel are applicable:

-->

*   Brief description of the problem:

-   Steps to reproduce:

    1.  2.  3.  4.  5.

-   Tridactyl version (`:version`):

*   Firefox version (Top right menu > Help > About Firefox):

-   URL of the website the bug happens on:

*   Config (in a new tab, run `:viewconfig`, copy the url and paste it somewhere like gist.github.com):

-   Contents of ~/.tridactylrc or ~/.config/tridactyl/tridactylrc:

```
Insert tridactylrc contents between the backticks
```

If your bug is about Tridactyl's native executable, please add the following information:

*   Operating system:
*   Result of running `:! echo $PATH` in tridactyl:
*   Unix-like only: result of running `printf '%c\0\0\0{"cmd": "run", "command": "echo $PATH"}' 39 | ~/.local/share/tridactyl/native_main.py` in a terminal:
