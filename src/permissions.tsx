import { Component, render } from "inferno"

class Permission extends Component<any, any> {
    constructor(props) {
        super(props)
        this.props.reason =
            this.props.reason || "Tridactyl doesn't use this for now."
    }

    check() {
        if (!this.props.disabled) {
            this.props.checked = !this.props.checked
            this.forceUpdate()
        }
    }

    render() {
        return (
            <tr>
                <td>
                    <input
                        onclick={this.check.bind(this)}
                        checked={this.props.checked}
                        disabled={this.props.disabled}
                        type="checkbox"
                        name={this.props.name}
                        id={this.props.name}
                    />
                </td>
                <td>
                    <label htmlFor={this.props.name}>
                        <h3>{this.props.name}</h3>
                    </label>
                    <p>{this.props.reason}</p>
                </td>
            </tr>
        )
    }
}

const allPermissions = [
    // Optional Permissions
    <Permission
        name="bookmarks"
        reason="With this, Tridactyl will be able to offer bookmark completions (e.g. `:bmarks`) and add or remove bookmarks (`:bmark`)."
    />,
    <Permission name="browserSettings" />,
    <Permission
        name="clipboardRead"
        reason="Lets you navigate to URLs from your clipboard with `:clipboard tabopen`."
    />,
    <Permission
        name="clipboardWrite"
        reason="Lets you put things in your clipboard with `:clipboard yank`."
    />,
    <Permission
        name="cookies"
        reason="Required to interact with containers (FIXME: make sure it's true)."
    />,
    <Permission
        name="downloads"
        reason="`:hint -s/-S/-a/-A` will let you download things."
    />,
    <Permission name="downloads.open" />,
    <Permission name="find" />,
    <Permission name="geolocation" />,
    <Permission
        name="history"
        reason="Tridactyl needs this in order to provide history completion in the command line."
    />,
    <Permission name="idle" />,
    <Permission name="notifications" />,
    <Permission
        name="tabs"
        reason="This enables getting the list of tabs for tabs/buffer completion."
    />,
    <Permission
        name="topSites"
        reason="Tridactyl uses this API to suggest URLs when using `tabopen` without an argument."
    />,
    <Permission
        name="webNavigation"
        reason="This is needed in order to go back to normal mode when navigating to another page."
    />,
    <Permission
        name="webRequest"
        reason="This is only needed if you set you use `:set csp clobber`."
    />,
    <Permission
        name="webRequestBlocking"
        reason="Also needed in order to use `:set csp clobber`."
    />,
    // Non-optional permissions
    <Permission
        name="activeTab"
        reason="Required to inject CSS into tabs and access tab information."
    />,
    <Permission
        name="browsingData"
        reason="Required in order to implement the `:sanitise` command."
    />,
    <Permission
        name="contextualIdentities"
        reason="Necessary to interact with containers."
    />,
    <Permission name="contextMenus" />,
    <Permission
        name="sessions"
        reason="Used for restoring tabs/windows after they were closed."
    />,
    <Permission
        name="storage"
        reason="Necessary to store your config in Tridactyl."
    />,
    <Permission
        name="nativeMessaging"
        reason="Required in order to interact with your OS (start vim, read tridactylrc...) and open about:* pages."
    />,
]

function updatePermissions(browserPermissions) {
    let permMap = allPermissions.reduce((map, perm: any) => {
        map.set(perm.props.name, perm)
        return map
    }, new Map<string, any>())
    browserPermissions.permissions.forEach(name => {
        let perm = permMap.get(name)
        if (perm) {
            Object.assign(perm.props, { checked: true, disabled: true })
        }
    })
}

function onAfterRequest(granted) {
    if (granted) {
        browser.permissions.getAll().then(updatePermissions)
        if (
            document.location.protocol == "moz-extension:" &&
            document.location.pathname == "/static/permissions.html"
        ) {
            render(
                <table class="permissions">{allPermissions}</table>,
                document.getElementById("tridactyl-optional-permissions"),
            )
        }
    }
}

function requestPermissions() {
    browser.permissions
        .request({
            permissions: allPermissions
                .filter(p => p.props.checked && !p.props.disabled)
                .map(p => p.props.name),
        })
        .then(onAfterRequest)
}

export function requestAllPermissions() {
    browser.permissions
        .request({
            permissions: allPermissions
                .filter(p => !p.props.disabled)
                .map(p => p.props.name),
        })
        .then(onAfterRequest)
}

browser.permissions.getAll().then(browserPermissions => {
    updatePermissions(browserPermissions)
    if (
        document.location.protocol == "moz-extension:" &&
        document.location.pathname == "/static/permissions.html"
    ) {
        render(
            <table class="permissions">{allPermissions}</table>,
            document.getElementById("tridactyl-optional-permissions"),
        )
        document
            .getElementById("save-permissions")
            .addEventListener("click", requestPermissions)
    }
})
