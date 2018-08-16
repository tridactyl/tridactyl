First half submitted as https://bugzilla.mozilla.org/show_bug.cgi?id=1342379

Disallowing content scripts from running on certain pages is a big change from previous Firefox APIs. This will negatively affect some popular addons, such as Vimperator and Leechblock. We would like to understand the Firefox team's decision here and to offer our counterarguments.

## Risks as we understand them

1.  Privilege escalation from WebExtension to full control of the browser allows:
    1.  Malicious addons to do more to the host system and to Firefox internals
    2.  Malware to target privileged addons
    3.  Addon developers to reduce the stability of Firefox by deliberately or accidentally but not maliciously escaping the sandbox

## Additional risks as articulated on #WebExtensions

2.  The necessary severe warnings to the user are problematic for usability, security and other reasons.

Is this a fair characterisation of the risks?

## Our counterarguments

From a security perspective, we believe the user suffers very little from the privilege escalation (issues 1.1, 1.2). Let's examine what an addon with the content script permission for all-except-restricted pages can do, and then what more privilege escalation can do:

Without restricted pages:

1.  Inspect the value of all form fields
    1.  Steal all user credentials, typed or automatically entered.
2.  Rewrite download links
    1.  Fool users into installing malware.

With privilege escalation, all the above plus:

3.  Control addon installation
    1.  Install more addons as it pleases
    2.  Prevent uninstallation of addons
4.  Access Firefox sync data and logins/password database
5.  Run arbitrary code as the Firefox process

Now, 3, 4 and 5 are bad, but they're only slightly worse for the user than 1 and 2.

{{TODO: Firefox stability arguments.}}

## Our preferred solution

A new permission for WebExtensions that allow an addon to inject content scripts into any page.

A new user warning about how an addon with this permission is more likely to make Firefox unstable, can run arbitrary code on their computers and so on.

To discourage the use of this API by addons that don't really need it, a more thorough review process could be required before the addon is accepted onto addons.mozilla.org - perhaps requiring the developers to meet high enough code quality standards that the addon can be audited.

## Old intro

Vimperator is an addon that replaces most of Firefox's UI with a keyboard-focused interface inspired by vim. For this to work as our ~28,000 users expect, Vimperator needs to be able to capture all key events and to draw some UI elements on all pages. The most straightforward way to do this is to allow us to inject a content script onto every page, including on the restricted pages (about:\*, addons.mozilla.org).

There are some workarounds with accepted-in-principle but not actually developed APIs that would allow us to deliver a less-bad UX on restricted pages, but the intention of this bug is to explore whether a new permission might be granted to allow some addons to run content scripts everywhere, and, if not, what the reasoning of the Firefox developers is.
