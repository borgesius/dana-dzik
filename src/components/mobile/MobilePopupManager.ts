import { POPUP_CONFIG } from "../../config/popup"
import { isCalmMode } from "../../lib/calmMode"
import { formatMoney } from "../../lib/formatMoney"
import { getMarketGame } from "../../lib/marketGame/MarketEngine"
import {
    BONUS_POPUP_CONTENTS,
    POPUP_CONTENTS,
    type PopupContent,
} from "../../lib/popupContent"

const POPUP_LEVEL_INTERVALS: Record<number, number> = {
    1: 15000,
    2: 10000,
    3: 6000,
}

const DEFAULT_SPAWN_INTERVAL = 12000
const SPAWN_JITTER = 5000
const BONUS_POPUP_CHANCE = 0.25
const RECOVERY_POPUP_CHANCE = 0.6

const PHASE_BONUS_MULTIPLIERS: Record<number, number> = {
    1: 1,
    2: 2,
    3: 5,
    4: 15,
}

const RECOVERY_THRESHOLDS: Record<number, number> = {
    1: 0.05,
    2: 3,
    3: 5,
    4: 25,
}

export class MobilePopupManager {
    private container: HTMLElement
    private activePopup: HTMLElement | null = null
    private spawnInterval: number | null = null
    private sessionTimeout: number | null = null
    private sessionEndTime = 0
    private sessionActive = false
    private popupLevel = 0
    private gameActivated = false

    constructor(container: HTMLElement) {
        this.container = container
        this.setupGameListener()

        document.addEventListener("calm-mode:changed", ((
            e: CustomEvent<{ enabled: boolean }>
        ) => {
            if (e.detail.enabled) {
                this.endSession()
                if (this.activePopup) {
                    this.activePopup.remove()
                    this.activePopup = null
                }
            }
        }) as EventListener)
    }

    private setupGameListener(): void {
        const game = getMarketGame()

        game.on("tradeExecuted", () => {
            this.onGameEngaged()
        })

        game.on("popupsActivate", (level: unknown) => {
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

    public onGameEngaged(): void {
        this.startSession(POPUP_CONFIG.gameSessionDurationMs)
    }

    public onWindowOpen(): void {
        if (Math.random() < POPUP_CONFIG.windowTriggerChance) {
            this.startSession(POPUP_CONFIG.windowSessionDurationMs)
        }
    }

    private startSession(durationMs: number): void {
        if (isCalmMode()) return
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
            if (!this.activePopup) {
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

    private getBonusChance(): number {
        const game = getMarketGame()
        const phase = game.getMaxUnlockedPhase()
        const cash = game.getCash()
        const threshold = RECOVERY_THRESHOLDS[phase] ?? 0.05

        return cash < threshold ? RECOVERY_POPUP_CHANCE : BONUS_POPUP_CHANCE
    }

    public spawnPopup(): void {
        if (this.activePopup) return

        let content: PopupContent

        if (this.gameActivated && Math.random() < this.getBonusChance()) {
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

        const alert = this.createAlert(content)
        this.container.appendChild(alert)
        this.activePopup = alert
    }

    private scaleBonusPopup(baseContent: PopupContent): PopupContent {
        const game = getMarketGame()
        const phase = game.getMaxUnlockedPhase()
        const multiplier = PHASE_BONUS_MULTIPLIERS[phase] ?? 1
        const scaledAmount = (baseContent.bonusAmount ?? 0) * multiplier

        return {
            ...baseContent,
            bonusAmount: scaledAmount,
            body: `${baseContent.body} Worth ${formatMoney(scaledAmount)}!`,
        }
    }

    private createAlert(content: PopupContent): HTMLElement {
        const backdrop = document.createElement("div")
        backdrop.className = "ios-alert-backdrop"

        const alert = document.createElement("div")
        alert.className = "ios-alert"

        const body = document.createElement("div")
        body.className = "ios-alert-body"

        const title = document.createElement("h3")
        title.className = "ios-alert-title"
        title.textContent = content.headline

        const message = document.createElement("p")
        message.className = "ios-alert-message"
        message.textContent = content.body

        body.appendChild(title)
        body.appendChild(message)
        alert.appendChild(body)

        const buttons = document.createElement("div")
        buttons.className = "ios-alert-buttons"

        for (const btn of content.buttons) {
            const button = document.createElement("button")
            button.className = `ios-alert-btn${btn.className === "green" || btn.className === "primary" ? " bold" : ""}`
            button.textContent = btn.text

            button.addEventListener("click", () => {
                if (btn.action === "bonus" && content.bonusAmount) {
                    this.claimBonus(content.bonusAmount)
                }
                this.closePopup(backdrop)
            })

            buttons.appendChild(button)
        }

        alert.appendChild(buttons)
        backdrop.appendChild(alert)

        return backdrop
    }

    private claimBonus(amount: number): void {
        const game = getMarketGame()
        game.addBonus(amount)
    }

    private closePopup(popup: HTMLElement): void {
        if (this.activePopup === popup) {
            this.activePopup = null
        }
        popup.remove()
    }
}
