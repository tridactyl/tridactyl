If you're opening this issue for a feature request, feel free to delete all of this and to just tell us what you need (although it'd be nice if you could make sure that there isn't an issue already open about this!).

If you're opening this issue to report a bug, please read the "Settings that can fix websites" paragraph of the (troubleshooting steps)[https://github.com/cmcaine/tridactyl/tree/master/doc/troubleshooting.md] first.

- Tridactyl version (`:version`):
- Firefox version (Top right menu > Help > About Firefox):
- URL of the website the bug happens on:
- Config (run `:viewconfig`, copy the url and paste it somewhere like gist.github.com): 

If your bug is about Tridactyl's native executable, please add the following information:
- Operating System:
- Result of running `printf '%c\0\0\0{"cmd": "run", "command": "echo $PATH"}' 39 | ~/.local/share/tridactyl/native_main.py` in a terminal:
- Result of running `:! echo $PATH` in tridactyl:
