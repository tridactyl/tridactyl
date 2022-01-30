# Native Messenger

The native messenger is an external executable that you can install on your computer in order for Tridactyl to be able to run other programs. It enables Tridactyl to do quite a few things, among which:

- Use your favorite text editor to edit firefox inputs (see `:help editor` for more information).
- Read Tridactyl settings from a file on your disk (`:help source`).
- Restart Firefox from Tridactyl's command line (`:help restart`).
- Change the way Firefox looks (`:h guiset`).
- Load themes from your disk (`:h colors`).
- Open privileged pages (e.g. `about:preferences`) from Tridactyl's commandline (`:h nativeopen`).
- Copy things to your X selection buffer if you're on linux (`:h yankto`).
- Make Tridactyl work on `addons.mozilla.org` (`:h fixamo`).
- Set firefox preferences from Tridactyl's command line (`:h setpref`).
- Choose where to save files when using Tridactyl's `:saveas` command.
- Run arbitrary shell commands (`:h exclaim`).

If these seem like interesting features to you, you can run `:nativeinstall` and follow the instructions in order to install the native messenger. If everything went smoothly, running `:native` should tell you that the native messenger is correctly installed.

The <a href='./8-marks.html' rel='next'>next page</a> explains how to use marks to move to a previously recorded position. <a href='./6-containers.html' rel="prev"></a>
