import { onAppEvent } from "../../lib/events"
import { BOSS_VEIL, VEIL_IDS, type VeilId } from "../../lib/veil/types"
import { getVeilManager } from "../../lib/veil/VeilManager"
import { createWidgetFrame } from "./WidgetFrame"

const VEIL_NAMES: Record<number, string> = {
    0: "Signal",
    1: "Nerve",
    2: "Transmutation",
    3: "Revelation",
    4: "The Facility",
}

export class VeilWidget {
    private widget: HTMLElement
    private content: HTMLElement
    private visible: boolean = false

    constructor() {
        this.content = document.createElement("div")
        this.content.className = "widget-content veil-widget-content"

        this.widget = createWidgetFrame("VEIL", "veil-widget", {
            lazy: true,
            onFirstExpand: () => {
                this.render()
            },
        })
        this.widget.classList.add("veil-widget")
        this.widget.appendChild(this.content)

        // Start hidden — only show when player has encountered a veil
        this.widget.style.display = "none"

        // Check initial visibility
        if (getVeilManager().isWidgetVisible()) {
            this.show()
        }

        // Listen for events that affect visibility and content
        onAppEvent("veil:triggered", () => {
            this.show()
            this.render()
        })

        onAppEvent("veil:unlocked", () => {
            this.show()
            this.render()
        })

        onAppEvent("veil:completed", () => {
            this.render()
        })

        onAppEvent("veil:boss-defeated", () => {
            this.render()
        })
    }

    public getElement(): HTMLElement {
        return this.widget
    }

    private show(): void {
        if (this.visible) return
        this.visible = true
        this.widget.style.display = ""
    }

    private render(): void {
        const mgr = getVeilManager()
        const completed = mgr.getCompletedVeils()
        const unlocked = mgr.getUnlockedVeils()
        const nextLocked = mgr.getNextLockedVeil()

        let html = '<div class="veil-widget-list">'

        for (const id of VEIL_IDS) {
            const name = VEIL_NAMES[id] ?? `Veil ${id}`

            if (completed.includes(id)) {
                // Completed: checkmark + replay button
                html += `
                    <div class="veil-widget-item veil-item-completed">
                        <span class="veil-item-status">&#10003;</span>
                        <span class="veil-item-name">${name}</span>
                        <button class="veil-item-btn veil-btn-replay" data-veil-replay="${id}">&#9654;</button>
                    </div>
                `
            } else if (unlocked.includes(id)) {
                // Unlocked: glowing indicator + pierce button
                html += `
                    <div class="veil-widget-item veil-item-unlocked">
                        <span class="veil-item-status veil-item-glow">&#9679;</span>
                        <span class="veil-item-name">${name}</span>
                        <button class="veil-item-btn veil-btn-pierce" data-veil-launch="${id}">Pierce</button>
                    </div>
                `
            } else if (id === nextLocked) {
                // Next locked: greyed out with lock
                html += `
                    <div class="veil-widget-item veil-item-locked">
                        <span class="veil-item-status">&#128274;</span>
                        <span class="veil-item-name">${name}</span>
                    </div>
                `
            } else if (id === BOSS_VEIL) {
                // Boss veil: only show if all pre-boss done
                // (nextLocked handles this case, so skip otherwise)
                continue
            } else {
                // Future veils beyond next: hidden
                continue
            }
        }

        html += "</div>"
        this.content.innerHTML = html

        // Attach event listeners
        this.content.querySelectorAll("[data-veil-replay]").forEach((btn) => {
            btn.addEventListener("click", (e) => {
                e.stopPropagation()
                const veilId = Number(
                    (btn as HTMLElement).dataset.veilReplay
                ) as VeilId
                getVeilManager().launchReplay(veilId)
            })
        })

        this.content.querySelectorAll("[data-veil-launch]").forEach((btn) => {
            btn.addEventListener("click", (e) => {
                e.stopPropagation()
                const veilId = Number(
                    (btn as HTMLElement).dataset.veilLaunch
                ) as VeilId
                getVeilManager().launchVeil(veilId)
            })
        })
    }
}
