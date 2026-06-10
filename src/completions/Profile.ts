import * as Completions from "@src/completions"
import * as Profiles from "@src/lib/profiles"
import "@src/lib/DANGEROUS-html-tagged-template"
import Logger from "@src/lib/logging"

const logger = new Logger("profiles-completion")

class ProfileCompletionOption
    extends Completions.CompletionOptionHTML
    implements Completions.CompletionOptionFuse {
    public fuseKeys = []

    constructor(profile: Profiles.ProfileInfo) {
        super()
        this.value = profile.name

        let status = ""
        if (profile.isDefault && profile.inUse) {
            status = "Current"
        } else if (profile.inUse) {
            status = "Running"
        } else if (profile.isDefault) {
            status = "Default"
        }

        this.fuseKeys.push(profile.name, status, profile.path)

        this.html = html`<tr class="ProfileCompletionOption option">
            <td class="title">${profile.name}</td>
            <td class="status">${status}</td>
            <td class="path">${profile.path}</td>
        </tr>`
    }
}

export class ProfileCompletionSource extends Completions.CompletionSourceFuse {
    public options: ProfileCompletionOption[]

    constructor(private _parent: any) {
        super(
            ["profilelaunch", "profilerename"],
            "ProfileCompletionSource",
            "Firefox Profiles",
        )

        this.updateOptions()
        this._parent.appendChild(this.node)
    }

    async onInput(exstr: string): Promise<void> {
        await this.updateOptions(exstr)
    }

    private async updateOptions(exstr = "") {
        this.lastExstr = exstr
        const [prefix] = this.splitOnPrefix(exstr)

        // Hide self and stop if prefixes don't match
        if (prefix) {
            // Show self if prefix and currently hidden
            if (this.state === "hidden") {
                this.state = "normal"
            }
        } else {
            this.state = "hidden"
            return
        }

        try {
            const profiles = await Profiles.listProfiles()
            this.options = profiles.map(profile => {
                const option = new ProfileCompletionOption(profile)
                option.state = "normal"
                return option
            })
        } catch (e) {
            logger.warning("Failed to load profiles for completion:", e)
            this.options = []
        }

        this.completion = undefined
        return this.updateChain()
    }
}
