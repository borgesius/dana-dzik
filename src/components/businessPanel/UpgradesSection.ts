import { formatMoney } from "../../lib/formatMoney"
import { getLocaleManager } from "../../lib/localeManager"
import type { MarketEngine } from "../../lib/marketGame/MarketEngine"
import { PHASE_THRESHOLDS, UPGRADES } from "../../lib/marketGame/types"

export class UpgradesSection {
    private element: HTMLElement
    private listEl: HTMLElement
    private lockedEl: HTMLElement
    private game: MarketEngine
    private playSound: (type: string) => void

    constructor(game: MarketEngine, playSound: (type: string) => void) {
        this.game = game
        this.playSound = playSound
        this.listEl = document.createElement("div")
        this.listEl.className = "upgrades-list"
        this.lockedEl = document.createElement("div")
        this.lockedEl.className = "phase-locked-teaser"
        this.element = this.createElement()
        this.render()
    }

    public getElement(): HTMLElement {
        return this.element
    }

    private createElement(): HTMLElement {
        const section = document.createElement("div")
        section.className = "upgrades-section"

        const heading = document.createElement("h3")
        heading.textContent = getLocaleManager().t(
            "commodityExchange.ui.improvements"
        )
        section.appendChild(heading)
        section.appendChild(this.lockedEl)
        section.appendChild(this.listEl)

        this.updateVisibility()
        return section
    }

    public updateVisibility(): void {
        const unlocked = this.game.isPhaseUnlocked(3)
        const prevUnlocked = this.game.isPhaseUnlocked(2)
        if (unlocked) {
            this.element.style.display = "block"
            this.listEl.style.display = ""
            this.lockedEl.style.display = "none"
        } else if (prevUnlocked) {
            // Show locked teaser only after previous phase is unlocked
            this.element.style.display = "block"
            this.listEl.style.display = "none"
            const lm = getLocaleManager()
            this.lockedEl.style.display = ""
            this.lockedEl.textContent = lm.t(
                "commodityExchange.ui.phaseEarningsHint",
                { threshold: formatMoney(PHASE_THRESHOLDS.upgrades) }
            )
        } else {
            this.element.style.display = "none"
        }
    }

    public render(): void {
        if (!this.game.isPhaseUnlocked(3)) return

        const cash = this.game.getCash()
        const owned = this.game.getOwnedUpgrades()
        const lm = getLocaleManager()
        this.listEl.innerHTML = ""

        for (const u of UPGRADES) {
            const isOwned = owned.includes(u.id)
            const canAfford = cash >= u.cost

            const btn = document.createElement("button")
            btn.className = `upgrade-btn ${isOwned ? "owned" : ""} ${!canAfford && !isOwned ? "disabled" : ""}`

            if (isOwned) {
                btn.innerHTML = `
                    <span class="upgrade-name">${lm.t(`commodityExchange.upgrades.${u.id}.name`)}</span>
                    <span class="upgrade-badge">${lm.t("commodityExchange.ui.installed")}</span>
                `
                btn.disabled = true
            } else {
                btn.innerHTML = `
                    <span class="upgrade-name">${lm.t(`commodityExchange.upgrades.${u.id}.name`)}</span>
                    <span class="upgrade-cost">${formatMoney(u.cost)}</span>
                    <span class="upgrade-desc">${lm.t(`commodityExchange.upgrades.${u.id}.description`)}</span>
                `
                btn.disabled = !canAfford
                btn.addEventListener("click", () => {
                    if (this.game.purchaseUpgrade(u.id)) {
                        this.playSound("notify")
                        this.render()
                    }
                })
            }

            this.listEl.appendChild(btn)
        }
    }
}
