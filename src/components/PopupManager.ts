import { POPUP_CONFIG } from "../config"
import { POPUP_CONTENTS, type PopupContent } from "../lib/popupContent"

/**
 * Manages popup windows that appear periodically to simulate spam/malware popups.
 */
export class PopupManager {
    private container: HTMLElement
    private activePopups: HTMLElement[] = []
    private spawnInterval: number | null = null
    private zIndex = 9000

    constructor(container: HTMLElement) {
        this.container = container
    }

    /** Starts the popup spawning timer. */
    public start(): void {
        setTimeout(() => this.spawnPopup(), POPUP_CONFIG.initialDelay)

        this.spawnInterval = window.setInterval(
            () => {
                if (this.activePopups.length < POPUP_CONFIG.maxConcurrent) {
                    this.spawnPopup()
                }
            },
            POPUP_CONFIG.minInterval +
                Math.random() * POPUP_CONFIG.randomInterval
        )
    }

    /** Stops spawning popups and removes all active popups. */
    public stop(): void {
        if (this.spawnInterval) {
            window.clearInterval(this.spawnInterval)
            this.spawnInterval = null
        }
        this.activePopups.forEach((popup) => popup.remove())
        this.activePopups = []
    }

    /** Spawns a random popup window. */
    public spawnPopup(): void {
        const content =
            POPUP_CONTENTS[Math.floor(Math.random() * POPUP_CONTENTS.length)]
        const popup = this.createPopup(content)
        this.container.appendChild(popup)
        this.activePopups.push(popup)

        this.playSound("popup")
    }

    private createPopup(content: PopupContent): HTMLElement {
        const popup = document.createElement("div")
        popup.className = `popup-window ${content.type === "winner" ? "winner" : ""}`
        popup.style.zIndex = (this.zIndex++).toString()

        const maxX = window.innerWidth - 350
        const maxY = window.innerHeight - 250
        popup.style.left = `${Math.random() * maxX}px`
        popup.style.top = `${Math.random() * maxY}px`

        const titlebar = document.createElement("div")
        titlebar.className = "window-titlebar"
        titlebar.innerHTML = `
            <span class="window-titlebar-text">${content.title}</span>
            <div class="window-titlebar-buttons">
                <button class="window-btn close">×</button>
            </div>
        `

        const closeBtn = titlebar.querySelector(".window-btn.close")
        closeBtn?.addEventListener("click", () => this.closePopup(popup))

        this.makeDraggable(popup, titlebar)

        const contentDiv = document.createElement("div")
        contentDiv.className = "popup-content"
        contentDiv.innerHTML = `
            <h2>${content.headline}</h2>
            ${content.image ? `<img src="${content.image}" alt="" style="max-width: 100px;"/>` : ""}
            <p>${content.body}</p>
            <div class="popup-buttons">
                ${content.buttons
                    .map(
                        (btn) => `
                    <button class="popup-btn ${btn.className ?? ""}">${btn.text}</button>
                `
                    )
                    .join("")}
            </div>
        `

        const buttons = contentDiv.querySelectorAll(".popup-btn")
        buttons.forEach((btn) => {
            btn.addEventListener("click", () => {
                this.closePopup(popup)
            })
        })

        popup.appendChild(titlebar)
        popup.appendChild(contentDiv)

        return popup
    }

    private closePopup(popup: HTMLElement): void {
        const index = this.activePopups.indexOf(popup)
        if (index > -1) {
            this.activePopups.splice(index, 1)
        }
        popup.remove()
        this.playSound("close")
    }

    private makeDraggable(popup: HTMLElement, handle: HTMLElement): void {
        let isDragging = false
        let offset = { x: 0, y: 0 }

        handle.addEventListener("mousedown", (e) => {
            if ((e.target as HTMLElement).closest(".window-btn")) return
            isDragging = true
            const rect = popup.getBoundingClientRect()
            offset = { x: e.clientX - rect.left, y: e.clientY - rect.top }
            popup.style.zIndex = (this.zIndex++).toString()
        })

        document.addEventListener("mousemove", (e) => {
            if (!isDragging) return
            popup.style.left = `${e.clientX - offset.x}px`
            popup.style.top = `${e.clientY - offset.y}px`
        })

        document.addEventListener("mouseup", () => {
            isDragging = false
        })
    }

    private playSound(type: string): void {
        const audioManager = (
            window as unknown as {
                audioManager?: {
                    playSound: (t: string) => void
                    playRandomPopup: () => void
                }
            }
        ).audioManager
        if (audioManager) {
            if (type === "popup") {
                audioManager.playRandomPopup()
            } else {
                audioManager.playSound(type)
            }
        }
    }
}
