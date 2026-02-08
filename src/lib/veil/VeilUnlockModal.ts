import { onAppEvent } from "../events"
import type { VeilId } from "./types"
import { getVeilManager } from "./VeilManager"

/**
 * Modal shown when veils 1-3 are randomly unlocked.
 * Offers "Pierce Now" (launch immediately) or "Not Yet" (defer to widget).
 */
export class VeilUnlockModal {
    private overlay: HTMLElement | null = null

    /** Text resolver for localization */
    public textResolver: ((key: string) => string) | null = null

    constructor() {
        onAppEvent("veil:unlocked", (detail) => {
            this.show(detail.veilId as VeilId)
        })
    }

    private show(veilId: VeilId): void {
        // Don't stack modals
        if (this.overlay) return

        const mgr = getVeilManager()
        // Don't show if already active (shouldn't happen, but guard)
        if (mgr.isActive()) return

        this.overlay = document.createElement("div")
        this.overlay.className = "veil-unlock-modal-overlay"

        const modal = document.createElement("div")
        modal.className = "veil-unlock-modal"

        const title = document.createElement("div")
        title.className = "veil-unlock-modal-title"
        title.textContent = this.resolveText("veil.modal.title")
        modal.appendChild(title)

        const subtitle = document.createElement("div")
        subtitle.className = "veil-unlock-modal-subtitle"
        subtitle.textContent = this.resolveText("veil.modal.subtitle")
        modal.appendChild(subtitle)

        const buttons = document.createElement("div")
        buttons.className = "veil-unlock-modal-buttons"

        const pierceBtn = document.createElement("button")
        pierceBtn.className = "veil-unlock-modal-btn veil-modal-btn-pierce"
        pierceBtn.textContent = this.resolveText("veil.modal.pierce_now")
        pierceBtn.addEventListener("click", () => {
            this.dismiss()
            mgr.launchVeil(veilId)
        })
        buttons.appendChild(pierceBtn)

        const laterBtn = document.createElement("button")
        laterBtn.className = "veil-unlock-modal-btn veil-modal-btn-later"
        laterBtn.textContent = this.resolveText("veil.modal.not_yet")
        laterBtn.addEventListener("click", () => {
            this.dismiss()
        })
        buttons.appendChild(laterBtn)

        modal.appendChild(buttons)
        this.overlay.appendChild(modal)
        document.body.appendChild(this.overlay)

        // Trigger entrance animation
        requestAnimationFrame(() => {
            this.overlay?.classList.add("veil-unlock-modal-active")
        })
    }

    private dismiss(): void {
        if (!this.overlay) return

        this.overlay.classList.add("veil-unlock-modal-exit")

        setTimeout(() => {
            this.overlay?.remove()
            this.overlay = null
        }, 400)
    }

    private resolveText(key: string): string {
        return this.textResolver?.(key) ?? key
    }
}
