# Settings that can fix websites

If changing one of these settings fixes your bug, please visit the corresponding Github issue and let us know you encountered the bug.

*   `:set noiframeon $URL_OF_THE_WEBSITE` and then reload the page. This disables the Tridactyl commandline on a specific url. [CREATE CORRESPONDING ISSUE]
*   `:set allowautofocus true` and then reload the page. This allows website to use the javascript `focus()` function. [#550](https://github.com/cmcaine/tridactyl/issues/550)
*   `:set modeindicator false` and then reload the page. This disables the mode indicator. [#821](https://github.com/cmcaine/tridactyl/issues/821)
*   `:get csp`. If the value returned is "untouched", try `:set csp clobber`. If the value is "clobber", try `:set csp untouched`. In both cases, please reload the page. This disables (or prevents disabling) some security settings of the page. [#109](https://github.com/cmcaine/tridactyl/issues/109)

# Native Editor/Messenger issues

If you're having trouble running your editor on OSX, you might be having $PATH issues: [#684](https://github.com/cmcaine/tridactyl/issues/684). The solution is to specify the absolute path to your editor, like this: `:set editorcmd /usr/local/bin/vimr`.

If you're encountering problems on windows, you might want to try some of the workarounds mentioned here: [#797](https://github.com/cmcaine/tridactyl/issues/797).

# Getting logging information

Tridactyl can selectively display logs for certain components. These components are the following:

*   messaging
*   cmdline
*   controller
*   containers
*   hinting
*   state
*   styling
*   excmds

In order to activate logging for a component, you can use the following command: `:set logging.$COMPONENT DEBUG`. Then, to get the log, you can open a new tab, navigate to about:debugging, enable the "enable add-on debugging" checkbox at the top if it isn't enabled and then find Tridactyl in the addon list and click on "Debug".

This will open a console where Tridactyl's messages are logged. You can then go back to the tab where you encountered the bug, click on the little bin icon in the console in order to remove previous messages and try to re-trigger the bug.

Once you have finished troubleshooting, we recommend that you run `unset logging` as the logs can slow Tridactyl down a bit.
