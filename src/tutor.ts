function permissionButton() {
    document
        .getElementById("tridactyl-tutor-grant-all-permissions")
        .addEventListener(
            "click",
            (window as any).tri.permissions.requestAllPermissions,
        )
}

const tutorPages = {
    "command_mode.html": [],
    "containers.html": [],
    "help.html": [],
    "hint_mode.html": [],
    "normal_mode.html": [],
    "settings.html": [],
    "tutor.html": [permissionButton],
}

document.addEventListener("DOMContentLoaded", () => {
    // Make sure we're on a tutorial page
    let path = document.location.pathname.split("/")
    if (
        document.location.protocol != "moz-extension:" ||
        path.length < 4 ||
        path[1] != "static" ||
        path[2] != "clippy"
    ) {
        console.error("Tutor script included in non-tutorial page!")
        return
    }
    if (!(window as any).tri) {
        console.error("Tutor script doesn't have access to tri object")
        return
    }
    // Call relevant functions if needed
    if (tutorPages[path[3]]) {
        try {
            tutorPages[path[3]].forEach(f => f())
        } catch (e) {}
    }
})
