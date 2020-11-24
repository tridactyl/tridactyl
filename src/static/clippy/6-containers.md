# Containers

Containers are a Firefox feature that allow you to have multiple areas for storing the cookies. Websites use these to identify you for tracking you across websites for advertising and for keeping you logged in to accounts. Containers can therefore be used for the following:

-   **Privacy:** adverts and cookies cannot follow users from one container to the next.
-   **Account management:** you can stay logged in to multiple accounts at the same time by using a different container for each account.
-   **Organisation:** for heavy tab users, containers add a layer of visual organisation to the Firefox interface.

The benefits of this feature are described in detail by the Firefox Test Pilot [blog](https://medium.com/firefox-test-pilot/firefox-containers-are-go-ed2e3533b6e3).

Tridactyl has a fair number of commands related to the management of containers; the purpose of this tutorial is to get you to grips with the main ones. As always, `:apropos contain` is the best way of finding an exhaustive list of related commands and settings.

### Container related commands

-   `containercreate name [color] [icon]` Creates a new container. Supplying `name` only will create a container called `name`, a random color and the fingerprint icon.
-   `containerupdate name newname color icon` Updates the container.
-   `containerclose name` Closes all tabs in a specified container.
-   `containerdelete name` Deletes a container, calls `containerclose` before deletion

<!-- Stuff to cover

autocontainers
    auconcreatecontainer
    autocontain
    autocontainmode

containerindicator

recontain

tabopen -c

tabopencontaineraware

viewcontainers

-->

The <a href='./7-native_messenger.html' rel='next'>next page</a> is about the native messenger. <a href='./5-settings.html' rel="prev"></a>
