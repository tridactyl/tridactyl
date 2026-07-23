# Containers

Firefox containers isolate cookies and site data. They can keep multiple accounts on the same website signed in simultaneously, and limit cookie-based tracking between websites.

Containers do not prevent every form of tracking, but sites in one container cannot read cookies stored in another.

## Opening tabs in containers

[`tabopen`](../docs/modules/_src_excmds_.html#tabopen) accepts `-c` followed by a container name. For example, `:tabopen -c work https://example.com` opens the URL in the `work` container. `:winopen -c work https://example.com` does the same in a new window.

Enable [`tabopencontaineraware`](../docs/classes/_src_lib_config_.default_config.html#tabopencontaineraware) with `:set tabopencontaineraware true` to make `:tabopen` inherit the current tab's container. You can then use `tabopen -c none` or `firefox-default` to force open a tab with no container.

## Choosing containers automatically

[`autocontain`](../docs/modules/_src_excmds_.html#autocontain) assigns matching URLs to containers. For example, `:autocontain -s example\.com work` assigns `example.com` and its subdomains to `work`.

The default [`autocontainmode`](../docs/classes/_src_lib_config_.default_config.html#autocontainmode), `strict`, reopens matching navigation in the configured container. `:set autocontainmode relaxed` instead applies rules only when Tridactyl opens a new tab. By default, [`auconcreatecontainer`](../docs/classes/_src_lib_config_.default_config.html#auconcreatecontainer) creates a rule's container if it does not exist.

## Managing containers

- `:containercreate [--or-update] name [colour] [icon]` creates a container.
- `:containerupdate name newname colour icon` updates a container.
- `:containerclose name` closes all tabs in a container.
- `:containerdelete name` closes its tabs and deletes the container.
- `:recontain name` reopens the current tab in another container; omit `name` to remove it from its container.
- `:viewcontainers` lists all containers.

When the mode indicator is enabled, [`containerindicator`](../docs/classes/_src_lib_config_.default_config.html#containerindicator) colours its border with the current container's colour.

Run `:apropos contain` for all related commands and settings, or `:help command-or-setting` for details.

The <a href='./7-native_messenger.md' rel='next'>next page</a> is about the native messenger. <a href='./5-settings.md' rel="prev"></a>
