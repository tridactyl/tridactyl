<!--

Thanks for taking the time to file an issue. If you're short on time, please just delete all of this and file your issue. Otherwise, read on : )

# Making a feature request

Please search our `:help` page and through the other issues on this repository; then, delete all of this text and describe your feature.

# Reporting a bug / getting help

If you're opening this issue to report a bug with a specific site, please read and follow the "Settings that can fix websites" paragraph of the (troubleshooting steps)[https://github.com/tridactyl/tridactyl/tree/master/doc/troubleshooting.md] first.

If that does not solve your problem, please fill in the following template and then delete all the lines above it, and any other lines which you do not feel are applicable:

-->

-   Brief description of the problem:

-   Steps to reproduce:

    1.  2.  3.  4.  5.

-   Tridactyl version (`:version`):

-   Firefox version (Top right menu > Help > About Firefox):

-   URL of the website the bug happens on:

-   Config (in a new tab, run `:viewconfig --user`, copy the url and paste it somewhere like gist.github.com):

-   Contents of ~/.tridactylrc or ~/.config/tridactyl/tridactylrc (if they exist):

```
Insert tridactylrc contents between the backticks
```

<!-- If your bug is about Tridactyl's native executable, please add the following information: -->

-   Operating system:
-   Result of running `:! echo $PATH`, or `! echo %PATH%` on Windows, in Tridactyl:
-   Unix-like only:
    -   `:native` less than 0.2.0: result of running `printf '%c\0\0\0{"cmd": "run", "command": "echo $PATH"}' 39 | ~/.local/share/tridactyl/native_main.py` in a terminal:
    -   `:native` at least version 0.2.0: result of running `printf '%c\0\0\0{"cmd": "run", "command": "echo $PATH"}' 39 | ~/.local/share/tridactyl/native_main` in a terminal:
