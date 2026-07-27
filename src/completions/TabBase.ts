import * as Completions from "@src/completions"
import * as Messaging from "@src/lib/messaging"

export abstract class TabCompletionSource extends Completions.CompletionSourceFuse {
    private removeTabChangesListener: () => void
    private handlingTabChanges = false
    private tabChangesQueued = false
    private updateGeneration = 0

    public destroy() {
        this.updateGeneration++
        this.tabChangesQueued = false
        this.removeTabChangesListener()
    }

    protected listenForTabChanges() {
        this.removeTabChangesListener = Messaging.addListener(
            "tab_changes",
            () => this.reactToTabChanges(),
        )
    }

    protected beginUpdate() {
        return ++this.updateGeneration
    }

    protected isCurrentUpdate(generation: number) {
        return generation === this.updateGeneration
    }

    protected abstract refreshForTabChanges(): Promise<void>

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
            if (this.tabChangesQueued) void this.reactToTabChanges()
        }
        if (!this.node.isConnected || this.node.classList.contains("hidden"))
            return
        await Messaging.messageOwnTab("commandline_content", "show")
    }
}
