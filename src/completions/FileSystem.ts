import * as Completions from "@src/completions"
import * as Native from "@src/lib/native"

class FileSystemCompletionOption
    extends Completions.CompletionOptionHTML
    implements Completions.CompletionOptionFuse {
    public fuseKeys = []

    constructor(public value: string) {
        super()
        this.fuseKeys = [value]
        this.html = html`<tr class="FileSystemCompletionOption option">
            <td class="value">${value}</td>
        </tr>`
    }
}

export class FileSystemCompletionSource extends Completions.CompletionSourceFuse {
    public options: FileSystemCompletionOption[]

    constructor(private _parent) {
        super(
            ["saveas", "source", "js -s", "jsb -s"],
            "FileSystemCompletionSource",
            "FileSystem",
        )

        this._parent.appendChild(this.node)
    }

    // override it cause the default implementation shows all options
    // which would undo our filtering
    protected updateChain() {
        this.updateDisplay()
    }
    /* override*/ protected async updateOptions(cmd, path) {
        if (!path) path = "."
        else path = path.trim()

        if (!["/", "$", "~", "."].find(s => path.startsWith(s))) {
            // If the path doesn't start with a special character, it is relative to the native messenger, thus use "." as starting point
            // Does this work on windows?
            path = "./" + path
        }

        // Update lastExstr because we modified the path and scoreOptions uses that in order to assign scores
        this.lastExstr = [cmd, path].join(" ")

        let req
        try {
            req = await Native.listDir(path)
        } catch (e) {
            // Failing silently because we can't nativegate (the user is typing stuff in the commandline)
            this.state = "hidden"
            return
        }
        let dir = path
        if (path.isDir) {
            if (!path.endsWith(req.sep)) dir = path + req.sep
        } else {
            dir = path.substring(0, dir.lastIndexOf(req.sep) + 1)
        }

        this.options = req.files.map(
            p => new FileSystemCompletionOption(dir + p),
        )
        this.state = "normal"
        this.setStateFromScore(this.scoredOptions(path))
    }
}
