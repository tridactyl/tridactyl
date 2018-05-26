# Escalating privilege

Useful workarounds and methods to get the power we want in the brave new world of webextensions.

*   Function in newtab
    *   [chrome_url_overrides](https://developer.mozilla.org/en-US/Add-ons/WebExtensions/manifest.json/chrome_url_overrides)
*   Function in home page
    *   [chrome_settings_overrides](https://developer.mozilla.org/en-US/Add-ons/WebExtensions/manifest.json/chrome_settings_overrides)
*   (Downside for both is that we need to reimplement a useful home and newtab page)

*   Shell and write access to filesystem
    *   [Native_messaging](https://developer.mozilla.org/en-US/Add-ons/WebExtensions/Native_messaging)
*   Hiding firefox chrome

    *   API proposal for hiding tabstrip (but not nav bar): [Bug 1332447](https://api-dev.bugzilla.mozilla.org/show_bug.cgi?id=1332447)
        *   :Gijs discusses why nav bar can't be hidden, but I still don't get why whatever happens in fullscreen can't just also happen in windowed mode.
    *   Hiding with userChrome.css
        *   http://kb.mozillazine.org/Chrome_element_names_and_IDs
        *   e.g. "#tabbrowser-tabs { visibility: collapse !important; }"
        *   requires restart, probably

*   Commandline thru toolbar API
    *   [Bug 1215064](https://bugzilla.mozilla.org/show_bug.cgi?id=1215064)
    *   As currently envisioned, size is fixed, I think
*   Commandline thru HTML injection into webcontent
    *   Dangerous, see [Bug 1287590](https://bugzilla.mozilla.org/show_bug.cgi?id=1287590)
    *   Shadow DOM would probably be simpler than iframe, but not implemented yet [Bug 1205323](https://bugzilla.mozilla.org/show_bug.cgi?id=1205323)
*   Commandline thru search suggestions on the omnibar (this is a bit mad)

    *   [chrome_settings_overrides](https://developer.mozilla.org/en-US/Add-ons/WebExtensions/manifest.json/chrome_settings_overrides)

*   [Find API](https://bug1332144.bmoattachments.org/attachment.cgi?id=8905651)

    *   [Bug 1332144](https://bugzilla.mozilla.org/show_bug.cgi?id=1332144)
    *   [Demo](https://github.com/Allasso/Find_API_demo_WE_advanced)
    *   How to replicate find links? Do we care?
    *   Can this be used to exfiltrate info about about pages?

*   Can't navigate to restricted URLs
    *   [about:](https://bugzilla.mozilla.org/show_bug.cgi?id=1371793)
    *   [file:](https://bugzilla.mozilla.org/show_bug.cgi?id=1266960)
