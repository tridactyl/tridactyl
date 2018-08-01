# Containers

Containers are a Firefox feature that lets the user separate their browsing into different isolated contexts based on the user's preference.
The perceived benefits of this feature are as described by the Firefox Test Pilot [blog](https://medium.com/firefox-test-pilot/firefox-containers-are-go-ed2e3533b6e3):

* **Online Privacy:** Online ads and cookies cannot follow users from one Container to the next.
* **Account Management:** Multi-account users can stay logged in to multiple account instances at the same time.
* **Organization:** For heavy tab users, Containers add a layer of visual organization to the Firefox interface.

### Container related commands
* `containercreate name [color] [icon]` Creates a new container. Supplying `name` only will create a container called `name`, a random color and the fingerprint icon.
* `containerupdate name newname color icon` Updates the container. 
* `containerclose name` Closes all tabs in a specified container.
* `containerdelete name` Deletes a container, calls `containerclose` before deletion

The <a href='./help.html' rel='next'>final page</a> describes how you can get further help. <a href='./settings.html' rel="prev"></a>
