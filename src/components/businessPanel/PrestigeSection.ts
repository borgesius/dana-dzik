import { formatMoney } from "../../lib/formatMoney"
import type { MarketEngine } from "../../lib/marketGame/MarketEngine"
import {
    getPrestigeManager,
    type PrestigeManager,
} from "../../lib/prestige/PrestigeManager"
import {
    HINDSIGHT_UPGRADES,
    PRESTIGE_THRESHOLD,
} from "../../lib/prestige/constants"
import { getCareerManager } from "../../lib/progression/CareerManager"
import { getProgressionManager } from "../../lib/progression/ProgressionManager"
import { saveManager } from "../../lib/saveManager"

const PRESTIGE_XP = 100

export class PrestigeSection {
    private element: HTMLElement
    private contentEl: HTMLElement
    private game: MarketEngine
    private prestige: PrestigeManager
    private playSound: (type: string) => void

    constructor(game: MarketEngine, playSound: (type: string) => void) {
        this.game = game
        this.prestige = getPrestigeManager()
        this.playSound = playSound
        this.contentEl = document.createElement("div")
        this.contentEl.className = "prestige-content"
        this.element = this.createElement()
        this.render()
    }

    public getElement(): HTMLElement {
        return this.element
    }

    private createElement(): HTMLElement {
        const section = document.createElement("div")
        section.className = "prestige-section"

        const heading = document.createElement("h3")
        heading.textContent = "The Bubble Pop"
        section.appendChild(heading)
        section.appendChild(this.contentEl)

        return section
    }

    public updateVisibility(): void {
        // Always visible once lifetime earnings have hit prestige threshold at least once
        // or if prestige count > 0
        const show =
            this.prestige.getCount() > 0 ||
            this.game.getLifetimeEarnings() >= PRESTIGE_THRESHOLD * 0.5
        this.element.style.display = show ? "block" : "none"
    }

    public render(): void {
        const lifetime = this.game.getLifetimeEarnings()
        const canPrestige = this.prestige.canPrestige(lifetime)
        const preview = this.prestige.getHindsightPreview(lifetime)
        const currentHindsight = this.prestige.getCurrency()
        const prestigeCount = this.prestige.getCount()

        let html = `
            <div class="prestige-info">
                <div class="prestige-stat">
                    <span>Hindsight:</span>
                    <span class="prestige-currency">${currentHindsight} 💎</span>
                </div>
                <div class="prestige-stat">
                    <span>Times Popped:</span>
                    <span>${prestigeCount}</span>
                </div>
                <div class="prestige-stat">
                    <span>Lifetime Earnings:</span>
                    <span>${formatMoney(lifetime)}</span>
                </div>
            </div>
        `

        // Prestige trigger button
        if (canPrestige) {
            html += `
                <button class="prestige-trigger-btn">
                    Pop the Bubble (+${preview} 💎)
                </button>
            `
        } else {
            const remaining = PRESTIGE_THRESHOLD - lifetime
            html += `
                <div class="prestige-locked">
                    Earn ${formatMoney(Math.max(0, remaining))} more to pop
                </div>
            `
        }

        // Hindsight shop
        if (prestigeCount > 0 || currentHindsight > 0) {
            html += `<div class="hindsight-shop"><h4>Hindsight Shop</h4>`
            for (const upgrade of HINDSIGHT_UPGRADES) {
                const count = this.prestige.getUpgradePurchaseCount(upgrade.id)
                const maxed = count >= upgrade.maxPurchases
                const canAfford = currentHindsight >= upgrade.cost

                const cls = maxed
                    ? "hindsight-item owned"
                    : canAfford
                      ? "hindsight-item"
                      : "hindsight-item disabled"

                html += `
                    <button class="${cls}" data-upgrade="${upgrade.id}" ${maxed ? "disabled" : ""}>
                        <div class="hindsight-item-header">
                            <span class="hindsight-item-name">${upgrade.name}</span>
                            ${maxed ? '<span class="hindsight-badge">Owned</span>' : `<span class="hindsight-cost">${upgrade.cost} 💎</span>`}
                        </div>
                        <div class="hindsight-item-desc">${upgrade.description}</div>
                        ${upgrade.maxPurchases > 1 ? `<div class="hindsight-item-stacks">${count}/${upgrade.maxPurchases}</div>` : ""}
                    </button>
                `
            }
            html += `</div>`
        }

        this.contentEl.innerHTML = html

        // Wire prestige button
        const prestigeBtn = this.contentEl.querySelector(".prestige-trigger-btn")
        if (prestigeBtn) {
            prestigeBtn.addEventListener("click", () => this.doPrestige())
        }

        // Wire shop buttons
        this.contentEl
            .querySelectorAll(".hindsight-item:not(.owned)")
            .forEach((btn) => {
                btn.addEventListener("click", () => {
                    const upgradeId = btn.getAttribute("data-upgrade")
                    if (upgradeId && this.prestige.purchaseUpgrade(upgradeId)) {
                        this.playSound("notify")
                        this.render()
                    }
                })
            })
    }

    private doPrestige(): void {
        const lifetime = this.game.getLifetimeEarnings()
        if (!this.prestige.canPrestige(lifetime)) return

        const hindsight = this.prestige.triggerPrestige(lifetime)

        // Reset market game (apply career startingCash bonus)
        const careerCashBonus = getCareerManager().getBonus("startingCash")
        const baseCash = this.prestige.getStartingCash()
        this.game.resetForPrestige(
            baseCash + careerCashBonus,
            this.prestige.getStartingPhases()
        )

        // Grant XP for prestiging
        getProgressionManager().addXP(PRESTIGE_XP)

        this.playSound("notify")
        saveManager.requestSave()
        this.render()

        // Show a brief notification
        this.showPrestigeNotification(hindsight)
    }

    private showPrestigeNotification(hindsight: number): void {
        const toast = document.createElement("div")
        toast.className = "prestige-toast"
        toast.textContent = `Bubble Popped! +${hindsight} 💎 Hindsight`
        document.body.appendChild(toast)
        setTimeout(() => {
            toast.classList.add("fade-out")
            setTimeout(() => toast.remove(), 500)
        }, 2500)
    }
}
