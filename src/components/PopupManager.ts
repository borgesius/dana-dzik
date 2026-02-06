import { POPUP_CONFIG } from "../config"
import { getBusinessGame } from "../lib/businessGame"
import {
    BONUS_POPUP_CONTENTS,
    POPUP_CONTENTS,
    type PopupContent,
} from "../lib/popupContent"

const POPUP_LEVEL_INTERVALS: Record<number, number> = {
    1: 15000,
    2: 10000,
    3: 6000,
}

const DEFAULT_SPAWN_INTERVAL = 12000
const SPAWN_JITTER = 5000
const BONUS_POPUP_CHANCE = 0.25

const TIER_BONUS_MULTIPLIERS: Record<number, number> = {
    1: 1,
    2: 1,
    3: 2,
    4: 5,
    5: 10,
    6: 25,
}

/**
 * Manages popup windows that appear in timed sessions triggered by
 * game engagement or (randomly) when a window is opened.
 */
export class PopupManager {
    private container: HTMLElement
    private activePopups: HTMLElement[] = []
    private spawnInterval: number | null = null
    private sessionTimeout: number | null = null
    private sessionEndTime = 0
    private sessionActive = false
    private disabled = false
    private zIndex = 9000
    private popupLevel = 0
    private gameActivated = false

    constructor(container: HTMLElement) {
        this.container = container
        this.setupGameListener()
    }

    private setupGameListener(): void {
        const game = getBusinessGame()

        game.on("ventureResult", () => {
            this.onGameEngaged()
        })

        game.on("popupsActivate", (level) => {
            const lvl = level as number
            if (lvl > this.popupLevel) {
                this.popupLevel = lvl
                this.gameActivated = true
                if (this.sessionActive) {
                    this.restartSpawning()
                }
            }
        })
    }

    public setEnabled(enabled: boolean): void {
        this.disabled = !enabled
        if (this.disabled) {
            this.endSession()
            this.activePopups.forEach((p) => p.remove())
            this.activePopups = []
        }
    }

    public onGameEngaged(): void {
        this.startSession(POPUP_CONFIG.gameSessionDurationMs)
    }

    public onWindowOpen(): void {
        if (Math.random() < POPUP_CONFIG.windowTriggerChance) {
            this.startSession(POPUP_CONFIG.windowSessionDurationMs)
        }
    }

    private startSession(durationMs: number): void {
        if (this.disabled) return

        const newEndTime = Date.now() + durationMs
        if (newEndTime <= this.sessionEndTime) return

        this.sessionEndTime = newEndTime

        if (this.sessionTimeout) {
            window.clearTimeout(this.sessionTimeout)
        }

        if (!this.sessionActive) {
            this.sessionActive = true
            this.startSpawning()
            setTimeout(() => this.spawnPopup(), 1500)
        }

        this.sessionTimeout = window.setTimeout(() => {
            this.endSession()
        }, durationMs)
    }

    private startSpawning(): void {
        const interval = this.getSpawnInterval()

        this.spawnInterval = window.setInterval(() => {
            if (this.activePopups.length < POPUP_CONFIG.maxConcurrent) {
                this.spawnPopup()
            }
        }, interval)
    }

    private getSpawnInterval(): number {
        const levelInterval =
            POPUP_LEVEL_INTERVALS[this.popupLevel] ?? DEFAULT_SPAWN_INTERVAL
        const base =
            this.popupLevel > 0 ? levelInterval : DEFAULT_SPAWN_INTERVAL
        return base + Math.random() * SPAWN_JITTER
    }

    private restartSpawning(): void {
        if (this.spawnInterval) {
            window.clearInterval(this.spawnInterval)
        }
        this.startSpawning()
    }

    private endSession(): void {
        this.sessionActive = false
        this.sessionEndTime = 0
        if (this.spawnInterval) {
            window.clearInterval(this.spawnInterval)
            this.spawnInterval = null
        }
        if (this.sessionTimeout) {
            window.clearTimeout(this.sessionTimeout)
            this.sessionTimeout = null
        }
    }

    /** Stops spawning popups and removes all active popups. */
    public stop(): void {
        this.endSession()
        this.activePopups.forEach((popup) => popup.remove())
        this.activePopups = []
        this.gameActivated = false
        this.popupLevel = 0
    }

    /** Spawns a random popup window. */
    public spawnPopup(): void {
        let content: PopupContent

        if (this.gameActivated && Math.random() < BONUS_POPUP_CHANCE) {
            const baseContent =
                BONUS_POPUP_CONTENTS[
                    Math.floor(Math.random() * BONUS_POPUP_CONTENTS.length)
                ]
            content = this.scaleBonusPopup(baseContent)
        } else {
            content =
                POPUP_CONTENTS[
                    Math.floor(Math.random() * POPUP_CONTENTS.length)
                ]
        }

        const popup = this.createPopup(content)
        this.container.appendChild(popup)
        this.activePopups.push(popup)

        this.playSound("popup")
    }

    private scaleBonusPopup(baseContent: PopupContent): PopupContent {
        const game = getBusinessGame()
        const tier = game.getMaxUnlockedTier()
        const multiplier = TIER_BONUS_MULTIPLIERS[tier] ?? 1
        const scaledAmount = (baseContent.bonusAmount ?? 0) * multiplier

        return {
            ...baseContent,
            bonusAmount: scaledAmount,
            body: `${baseContent.body} Worth $${scaledAmount.toFixed(2)}!`,
        }
    }

    private createPopup(content: PopupContent): HTMLElement {
        const popup = document.createElement("div")
        popup.className = `popup-window ${content.type === "winner" ? "winner" : ""} ${content.type === "bonus" ? "bonus" : ""}`
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

        const buttonsHtml = content.buttons
            .map(
                (btn, index) => `
                <button class="popup-btn ${btn.className ?? ""}" data-action="${btn.action ?? "close"}" data-index="${index}">${btn.text}</button>
            `
            )
            .join("")

        contentDiv.innerHTML = `
            <h2>${content.headline}</h2>
            ${content.image ? `<img src="${content.image}" alt="" style="max-width: 100px;"/>` : ""}
            <p>${content.body}</p>
            <div class="popup-buttons">
                ${buttonsHtml}
            </div>
        `

        const buttons = contentDiv.querySelectorAll(".popup-btn")
        buttons.forEach((btn) => {
            btn.addEventListener("click", () => {
                const action = (btn as HTMLElement).dataset.action
                if (action === "bonus" && content.bonusAmount) {
                    this.claimBonus(content.bonusAmount)
                }
                this.closePopup(popup)
            })
        })

        popup.appendChild(titlebar)
        popup.appendChild(contentDiv)

        return popup
    }

    private claimBonus(amount: number): void {
        const game = getBusinessGame()
        game.addBonus(amount)
        this.playSound("notify")
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
