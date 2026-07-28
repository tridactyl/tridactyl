import * as Completions from "@src/completions"
import * as Messaging from "@src/lib/messaging"

export abstract class TabCompletionSource extends Completions.CompletionSourceFuse {
    private removeTabChangesListener: () => void
    private handlingTabChanges = false
    private tabChangesQueued = false
    private tabChangesTimer: ReturnType<typeof setTimeout>
    private trailingTabChanges = false
    private updateGeneration = 0

    public destroy() {
        this.updateGeneration++
        this.tabChangesQueued = false
        clearTimeout(this.tabChangesTimer)
        this.tabChangesTimer = undefined
        this.removeTabChangesListener()
    }

    protected listenForTabChanges() {
        this.removeTabChangesListener = Messaging.addListener(
            "tab_changes",
            message => this.queueTabChanges(message),
        )
    }

    protected beginUpdate() {
        return ++this.updateGeneration
    }

    protected isCurrentUpdate(generation: number) {
        return generation === this.updateGeneration
    }

    protected abstract refreshForTabChanges(): Promise<void>

    private queueTabChanges(message: Messaging.Message) {
        if (this.state === "hidden") return
        const priority = (message.args?.[0] || []).some(([command]) =>
            /^tab_(?:close|created|moved|activated|attached|detached)$/u.test(
                command,
            ),
        )
        if (this.tabChangesTimer === undefined || priority) {
            this.trailingTabChanges = priority
            void this.reactToTabChanges()
        } else {
            this.trailingTabChanges = true
        }
        this.resetTabChangesTimer()
    }

    private resetTabChangesTimer() {
        clearTimeout(this.tabChangesTimer)
        this.tabChangesTimer = setTimeout(() => {
            if (this.handlingTabChanges) return
            this.tabChangesTimer = undefined
            if (!this.trailingTabChanges) return
            this.trailingTabChanges = false
            void this.reactToTabChanges()
        }, 250)
    }

    private async reactToTabChanges(): Promise<void> {
        if (this.state === "hidden") return
        this.tabChangesQueued = true
        if (this.handlingTabChanges) return
        this.handlingTabChanges = true
        try {
            do {
                this.tabChangesQueued = false
                await this.refreshForTabChanges()
            } while (this.tabChangesQueued)
        } finally {
            this.handlingTabChanges = false
            if (this.tabChangesTimer !== undefined) this.resetTabChangesTimer()
            if (this.tabChangesQueued) void this.reactToTabChanges()
        }
        if (!this.node.isConnected || this.node.classList.contains("hidden"))
            return
        await Messaging.messageOwnTab("commandline_content", "show")
    }
}
