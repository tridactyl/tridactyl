# Containers

Containers are a Firefox feature that lets the user separate their browsing into different isolated contexts based on the user's preference.
The perceived benefits of this feature are as described by the Firefox Test Pilot [blog](https://medium.com/firefox-test-pilot/firefox-containers-are-go-ed2e3533b6e3):

* **Online Privacy:** Online ads and cookies cannot follow users from one Container to the next.
* **Account Management:** Multi-account users can stay logged in to multiple account instances at the same time.
* **Organization:** For heavy tab users, Containers add a layer of visual organization to the Firefox interface.

### Container related commands
* `containercreate name [color] [icon]` Takes 3 arguments with the first one being mandatory. Executing it having only supplied `name` will create a container with that name, a random color and the fingerprint icon.
* `containerupdate`
* `containerdelete name` Deletes a container, calls `containerclose` before doing so.
* `containerclose name` Closes all tabs in a specified container.
* `autocontain domain containername` Opens all requests for `domain` in the specified `containername`

### Auto containers

Auto containers are directives that live in your `tridactylrc` or your live config and function very much like autocommands.

Example: `autocontain emacs.org shameful-secrets` will make sure that all tabs visiting `emacs.org` are safely stowed away in the `shameful-secrets` container.
The `auconcreatecontainer` setting aims to make configuration of auto containers easier by allowing autocontain directives to create the containers they point to if they do not exist.

The <a href='./help.html' rel='next'>final page</a> describes how you can get further help. <a href='./settings.html' rel="prev"></a>
