Tridactyl collects almost no data from its users. You may wish to note that:

-   Tridactyl has [safeguards](https://github.com/tridactyl/tridactyl/blob/970a49bfb5eed00894d57fae4878c8adc7595ef8/src/state.ts#L80) to minimise the risk of inadvertently storing data locally from private browsing sessions.

-   if you are using a "beta" build directly from GitHub or `tridactyl.cmcaine.co.uk`, Firefox will contact our `tridactyl.cmcaine.co.uk` server every few days to check for updates. We log the timestamps and IP addresses of all requests to this server to make debugging easier. Logs are retained for 90 days or until they reach 100MiB, whichever happens sooner.

-   by default, Tridactyl makes a request to GitHub once a day so it can inform you of Tridactyl updates that you may have missed. You can disable this by setting `:set update.nag false`.

-   if you have the native messenger installed, each time Tridactyl updates it will make a request to GitHub to check for updates to the native messenger. You can disable this by running `:set nativeinstallcmd echo`.

-   if you donate via [GitHub sponsors](https://github.com/users/bovine3dom/sponsors), [Patreon](https://www.patreon.com/tridactyl) or [PayPal](https://www.paypal.com/cgi-bin/webscr?cmd=_s-xclick&hosted_button_id=7JQHV4N2YZCTY), your email address will be shared with us. We will never share your email addresses with third-parties.
