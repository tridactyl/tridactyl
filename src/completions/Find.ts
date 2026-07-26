import * as Completions from "../completions"
import * as Messaging from "@src/lib/messaging"
import { ownTabId } from "@src/lib/webext"

export class FindCompletionSource extends Completions.CompletionSourceFuse {
    public options = []
    private session = Math.random()
    private tabId = ownTabId()
    private active = false

    constructor(_parent?) {
        super(["find"], "FindCompletionSource")
    }

    filter(exstr: string) {
        const [, argstr] = this.splitOnPrefix(exstr)
        if (argstr === undefined) return this.cancel()
        this.active = true
        void this.send(
            { session: this.session },
            ...argstr.trim().split(/\s+/),
        ).catch(() => undefined)
        return Promise.resolve()
    }

    destroy() {
        return this.cancel()
    }

    private cancel() {
        if (!this.active) return Promise.resolve()
        this.active = false
        return this.send({ session: this.session, cancel: true }).catch(
            () => undefined,
        )
    }

    private send(preview, ...args: string[]) {
        return this.tabId.then(tabId =>
            Messaging.messageTab(tabId, "excmd_content", "find", [
                preview,
                ...args,
            ]),
        )
    }
}
