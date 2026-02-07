import { formatMoney } from "../../lib/formatMoney"
import type { MarketEngine } from "../../lib/marketGame/MarketEngine"
import { FORESIGHT_UPGRADES } from "../../lib/prestige/ascension"
import {
    HINDSIGHT_UPGRADES,
    PRESTIGE_THRESHOLD,
} from "../../lib/prestige/constants"
import {
    getPrestigeManager,
    type PrestigeManager,
} from "../../lib/prestige/PrestigeManager"
import { getCareerManager } from "../../lib/progression/CareerManager"
import { saveManager } from "../../lib/saveManager"

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

        // ── Ascension section ────────────────────────────────────────────
        const ascCount = this.prestige.getAscensionCount()
        const canAscend = this.prestige.canAscend()
        const foresightBalance = this.prestige.getForesight()

        if (canAscend || ascCount > 0) {
            html += `<div class="ascension-section">`
            html += `<h4>Ascension${ascCount > 0 ? ` (x${ascCount})` : ""}</h4>`

            if (foresightBalance > 0 || ascCount > 0) {
                html += `<div class="prestige-stat"><span>Foresight:</span><span class="prestige-currency">${foresightBalance} 🔮</span></div>`
            }

            if (canAscend) {
                const preview = this.prestige.getForesightPreview()
                html += `<button class="ascension-trigger-btn">Ascend (+${preview} 🔮)</button>`
                html += `<div class="prestige-locked" style="font-size:10px;margin-top:4px">Resets: prestige count, Hindsight, most upgrades</div>`
            }

            // Foresight shop
            if (ascCount > 0) {
                html += `<div class="foresight-shop"><h5>Foresight Shop</h5>`
                for (const upgrade of FORESIGHT_UPGRADES) {
                    const count = this.prestige.getForesightUpgradeCount(
                        upgrade.id
                    )
                    const maxed = count >= upgrade.maxPurchases
                    const canAfford = foresightBalance >= upgrade.cost

                    const cls = maxed
                        ? "hindsight-item owned"
                        : canAfford
                          ? "hindsight-item"
                          : "hindsight-item disabled"

                    html += `
                        <button class="${cls}" data-foresight="${upgrade.id}" ${maxed ? "disabled" : ""}>
                            <div class="hindsight-item-header">
                                <span class="hindsight-item-name">${upgrade.name}</span>
                                ${maxed ? '<span class="hindsight-badge">Owned</span>' : `<span class="hindsight-cost">${upgrade.cost} 🔮</span>`}
                            </div>
                            <div class="hindsight-item-desc">${upgrade.description}</div>
                            ${upgrade.maxPurchases > 1 ? `<div class="hindsight-item-stacks">${count}/${upgrade.maxPurchases}</div>` : ""}
                        </button>
                    `
                }
                html += `</div>`
            }

            html += `</div>`
        }

        this.contentEl.innerHTML = html

        const prestigeBtn = this.contentEl.querySelector(
            ".prestige-trigger-btn"
        )
        if (prestigeBtn) {
            prestigeBtn.addEventListener("click", () => this.doPrestige())
        }

        this.contentEl
            .querySelectorAll(".hindsight-item:not(.owned)[data-upgrade]")
            .forEach((btn) => {
                btn.addEventListener("click", () => {
                    const upgradeId = btn.getAttribute("data-upgrade")
                    if (upgradeId && this.prestige.purchaseUpgrade(upgradeId)) {
                        this.playSound("notify")
                        this.render()
                    }
                })
            })

        const ascensionBtn = this.contentEl.querySelector(
            ".ascension-trigger-btn"
        )
        if (ascensionBtn) {
            ascensionBtn.addEventListener("click", () => this.doAscension())
        }

        this.contentEl
            .querySelectorAll(".hindsight-item:not(.owned)[data-foresight]")
            .forEach((btn) => {
                btn.addEventListener("click", () => {
                    const upgradeId = btn.getAttribute("data-foresight")
                    if (
                        upgradeId &&
                        this.prestige.purchaseForesightUpgrade(upgradeId)
                    ) {
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

        // XP for prestiging is now handled by wiring.ts via prestige:triggered event

        this.playSound("notify")
        saveManager.requestSave()
        this.render()

        this.showPrestigeNotification(hindsight)
    }

    private doAscension(): void {
        if (!this.prestige.canAscend()) return

        const foresight = this.prestige.triggerAscension()

        this.game.resetForPrestige(
            this.prestige.getStartingCash(),
            this.prestige.getStartingPhases()
        )

        this.playSound("notify")
        saveManager.requestSave()
        this.render()

        const toast = document.createElement("div")
        toast.className = "prestige-toast"
        toast.textContent = `Ascended! +${foresight} 🔮 Foresight`
        document.body.appendChild(toast)
        setTimeout(() => {
            toast.classList.add("fade-out")
            setTimeout(() => toast.remove(), 500)
        }, 2500)
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
