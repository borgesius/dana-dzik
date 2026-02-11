import { getDataAttribute } from "../../lib/domUtils"
import { formatMoney } from "../../lib/formatMoney"
import type { MarketEngine } from "../../lib/marketGame/MarketEngine"
import {
    ASCENSION_PRESERVED_UPGRADES,
    ASCENSION_SPEND_THRESHOLD,
    FORESIGHT_UPGRADES,
    type ForesightUpgradeId,
} from "../../lib/prestige/ascension"
import {
    HINDSIGHT_UPGRADES,
    type HindsightUpgradeDef,
    type HindsightUpgradeId,
    hindsightUpgradeCostAt,
} from "../../lib/prestige/constants"
import {
    getPrestigeManager,
    type PrestigeManager,
} from "../../lib/prestige/PrestigeManager"
import { getCareerManager } from "../../lib/progression/CareerManager"
import { saveManager } from "../../lib/saveManager"

/** Group hindsight upgrades by tier (requiresPrestiges). */
function groupByTier(
    upgrades: readonly HindsightUpgradeDef[]
): Map<number, HindsightUpgradeDef[]> {
    const groups = new Map<number, HindsightUpgradeDef[]>()
    for (const u of upgrades) {
        const tier = u.requiresPrestiges
        if (!groups.has(tier)) groups.set(tier, [])
        groups.get(tier)?.push(u)
    }
    return groups
}

const TIER_LABELS: Record<number, string> = {
    0: "Tier 1 — Foundations",
    3: "Tier 2 — Acceleration",
    6: "Tier 3 — Mastery",
    10: "Tier 4 — Transcendence",
}

export class PrestigeSection {
    private element: HTMLElement
    private contentEl: HTMLElement
    private game: MarketEngine
    private prestige: PrestigeManager
    private playSound: (type: string) => void
    private activeTooltip: HTMLElement | null = null

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
        heading.textContent = "Popping the bubble"

        const infoBtn = document.createElement("button")
        infoBtn.className = "prestige-info-btn"
        infoBtn.textContent = "?"
        infoBtn.addEventListener("click", (e) => {
            e.stopPropagation()
            this.togglePrestigeTooltip(infoBtn)
        })
        heading.appendChild(infoBtn)

        section.appendChild(heading)
        section.appendChild(this.contentEl)

        return section
    }

    private togglePrestigeTooltip(anchor: HTMLElement): void {
        if (this.activeTooltip) {
            this.dismissTooltip()
            return
        }

        const lifetime = this.game.getLifetimeEarnings()
        const threshold = this.prestige.getCurrentPrestigeThreshold()
        const preview = this.prestige.getHindsightPreview(lifetime)
        const canPrestige = this.prestige.canPrestige(lifetime)

        let previewLine: string
        if (canPrestige) {
            previewLine = `<strong>+${preview} 💎</strong> Hindsight available now`
        } else if (preview > 0) {
            previewLine = `Would earn <strong>${preview} 💎</strong> (need ${formatMoney(threshold - lifetime)} more)`
        } else {
            previewLine = `Earn at least ${formatMoney(threshold)} to pop`
        }

        this.showTooltip(
            anchor,
            `<div class="prestige-tooltip-title">What is popping the bubble?</div>
            <p>Popping the bubble <strong>resets</strong> your current run — cash, inventory, factories, upgrades, and employees go back to zero.</p>
            <p>In return you earn <strong>Hindsight 💎</strong>, a permanent currency used to buy upgrades that persist across runs.</p>
            <div class="prestige-tooltip-section">
                <div class="prestige-tooltip-label">You lose:</div>
                <div>Cash, holdings, factories, market upgrades, employees</div>
            </div>
            <div class="prestige-tooltip-section">
                <div class="prestige-tooltip-label">You keep:</div>
                <div>Hindsight 💎, Hindsight Shop purchases, career progress, Foresight 🔮</div>
            </div>
            <div class="prestige-tooltip-preview">${previewLine}</div>`
        )
    }

    private toggleAscensionTooltip(anchor: HTMLElement): void {
        if (this.activeTooltip) {
            this.dismissTooltip()
            return
        }

        const foresightPreview = this.prestige.getForesightPreview()
        const totalSpent = this.prestige.getTotalHindsightSpent()

        const preservedNames = HINDSIGHT_UPGRADES.filter((u) =>
            ASCENSION_PRESERVED_UPGRADES.has(u.id)
        ).map((u) => u.name)

        this.showTooltip(
            anchor,
            `<div class="prestige-tooltip-title">What is Ascension?</div>
            <p>Ascension is a <strong>deeper reset</strong>. It resets your prestige count, Hindsight balance, and most Hindsight Shop upgrades.</p>
            <p>In return you earn <strong>Foresight 🔮</strong>, used for powerful upgrades that survive all future ascensions.</p>
            <div class="prestige-tooltip-section">
                <div class="prestige-tooltip-label">You lose:</div>
                <div>Prestige count, Hindsight 💎, most hindsight shop upgrades</div>
            </div>
            <div class="prestige-tooltip-section">
                <div class="prestige-tooltip-label">You keep:</div>
                <div>Foresight 🔮, Foresight Shop purchases, preserved upgrades: ${preservedNames.join(", ")}</div>
            </div>
            <div class="prestige-tooltip-section">
                <div class="prestige-tooltip-label">Requires:</div>
                <div>Spend ${ASCENSION_SPEND_THRESHOLD} total Hindsight (currently: ${totalSpent})</div>
            </div>
            <div class="prestige-tooltip-preview">Would earn <strong>+${foresightPreview} 🔮</strong> Foresight</div>`
        )
    }

    private showTooltip(anchor: HTMLElement, html: string): void {
        this.dismissTooltip()

        const tooltip = document.createElement("div")
        tooltip.className = "prestige-tooltip"
        tooltip.innerHTML = html

        const dismiss = (e: MouseEvent): void => {
            if (!tooltip.contains(e.target as Node) && e.target !== anchor) {
                this.dismissTooltip()
                document.removeEventListener("click", dismiss)
            }
        }
        requestAnimationFrame(() => document.addEventListener("click", dismiss))

        anchor.parentElement?.appendChild(tooltip)
        this.activeTooltip = tooltip
    }

    private dismissTooltip(): void {
        this.activeTooltip?.remove()
        this.activeTooltip = null
    }

    public updateVisibility(): void {
        const threshold = this.prestige.getCurrentPrestigeThreshold()
        const show =
            this.prestige.getCount() > 0 ||
            this.game.getLifetimeEarnings() >= threshold * 0.5
        this.element.style.display = show ? "block" : "none"
    }

    public render(): void {
        const lifetime = this.game.getLifetimeEarnings()
        const threshold = this.prestige.getCurrentPrestigeThreshold()
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
                    Sell it all. Today. (+${preview} 💎)
                </button>
            `
        } else {
            const remaining = threshold - lifetime
            const progress = Math.min(1, lifetime / threshold) * 100
            html += `
                <div class="prestige-locked">
                    Earn ${formatMoney(Math.max(0, remaining))} more to pop
                </div>
                <div class="prestige-progress-bar">
                    <div class="prestige-progress-fill" style="width: ${progress.toFixed(1)}%"></div>
                </div>
            `
            if (preview > 0) {
                html += `
                    <div class="prestige-preview-hint">
                        Popping now would earn <strong>${preview} 💎</strong> Hindsight
                    </div>
                `
            }
        }

        // ── Hindsight Shop (tiered) ──────────────────────────────────────
        if (prestigeCount > 0 || currentHindsight > 0) {
            html += `<div class="hindsight-shop"><h4>Hindsight Shop</h4>`

            const catSpend = this.getCategorySpend()
            if (catSpend.size > 0) {
                const topCat = [...catSpend.entries()].sort(
                    (a, b) => b[1] - a[1]
                )[0]
                html += `<div class="specialization-indicator">Specialization: <strong>${topCat[0]}</strong></div>`
            }

            const tiers = groupByTier(HINDSIGHT_UPGRADES)
            const sortedTiers = [...tiers.keys()].sort((a, b) => a - b)

            for (const tierReq of sortedTiers) {
                const tierUpgrades = tiers.get(tierReq)
                if (!tierUpgrades) continue
                const isUnlocked = prestigeCount >= tierReq
                const label = TIER_LABELS[tierReq] ?? `Tier (${tierReq}+ prestiges)`

                html += `<div class="hindsight-tier ${isUnlocked ? "" : "locked"}">`
                html += `<div class="tier-header">${label}</div>`

                if (!isUnlocked) {
                    const progress = Math.min(1, prestigeCount / tierReq) * 100
                    html += `
                        <div class="tier-locked-msg">Unlocks after ${tierReq} prestiges (${prestigeCount}/${tierReq})</div>
                        <div class="prestige-progress-bar tier-progress">
                            <div class="prestige-progress-fill" style="width: ${progress.toFixed(1)}%"></div>
                        </div>
                    `
                    html += `</div>`
                    continue
                }

                for (const upgrade of tierUpgrades) {
                    const count = this.prestige.getUpgradePurchaseCount(
                        upgrade.id
                    )
                    const maxed = count >= upgrade.maxPurchases
                    const cost = maxed
                        ? 0
                        : hindsightUpgradeCostAt(upgrade, count)
                    const canAfford = !maxed && currentHindsight >= cost

                    const cls = maxed
                        ? "hindsight-item owned"
                        : canAfford
                          ? "hindsight-item"
                          : "hindsight-item disabled"

                    html += `
                        <button class="${cls}" data-upgrade="${upgrade.id}" ${maxed ? "disabled" : ""}>
                            <div class="hindsight-item-header">
                                <span class="hindsight-item-name">${upgrade.name}</span>
                                ${maxed ? '<span class="hindsight-badge">Owned</span>' : `<span class="hindsight-cost">${cost} 💎</span>`}
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

        // ── Ascension section ────────────────────────────────────────────
        const ascCount = this.prestige.getAscensionCount()
        const canAscend = this.prestige.canAscend()
        const foresightBalance = this.prestige.getForesight()
        const totalSpent = this.prestige.getTotalHindsightSpent()

        if (totalSpent > 0 || ascCount > 0) {
            html += `<div class="ascension-section">`
            html += `<h4>Ascension${ascCount > 0 ? ` (x${ascCount})` : ""}<button class="prestige-info-btn ascension-info-btn">?</button></h4>`

            if (foresightBalance > 0 || ascCount > 0) {
                html += `<div class="prestige-stat"><span>Foresight:</span><span class="prestige-currency">${foresightBalance} 🔮</span></div>`
            }

            const ascProgress =
                Math.min(1, totalSpent / ASCENSION_SPEND_THRESHOLD) * 100
            html += `
                <div class="prestige-stat"><span>Hindsight Spent:</span><span>${totalSpent}/${ASCENSION_SPEND_THRESHOLD}</span></div>
                <div class="prestige-progress-bar ascension-progress">
                    <div class="prestige-progress-fill" style="width: ${ascProgress.toFixed(1)}%"></div>
                </div>
            `

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
                    const upgradeId = getDataAttribute<HindsightUpgradeId>(btn, "upgrade")
                    if (upgradeId && this.prestige.purchaseUpgrade(upgradeId)) {
                        this.playSound("notify")
                        this.render()
                    }
                })
            })

        const ascensionInfoBtn = this.contentEl.querySelector(
            ".ascension-info-btn"
        )
        if (ascensionInfoBtn) {
            ascensionInfoBtn.addEventListener("click", (e) => {
                e.stopPropagation()
                this.toggleAscensionTooltip(ascensionInfoBtn as HTMLElement)
            })
        }

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
                    const upgradeId = getDataAttribute<ForesightUpgradeId>(btn, "foresight")
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

    /** Compute total hindsight invested per category. */
    private getCategorySpend(): Map<string, number> {
        const spend = new Map<string, number>()
        for (const u of HINDSIGHT_UPGRADES) {
            const count = this.prestige.getUpgradePurchaseCount(u.id)
            if (count > 0) {
                let total = 0
                for (let i = 0; i < count; i++) {
                    total += hindsightUpgradeCostAt(u, i)
                }
                spend.set(u.category, (spend.get(u.category) ?? 0) + total)
            }
        }
        return spend
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

        this.playSound("notify")
        saveManager.requestSave()
        this.render()

        this.showPrestigeNotification(hindsight)
    }

    private doAscension(): void {
        if (!this.prestige.canAscend()) return

        const foresight = this.prestige.triggerAscension()

        const careerCashBonus = getCareerManager().getBonus("startingCash")
        const baseCash = this.prestige.getStartingCash()
        this.game.resetForPrestige(
            baseCash + careerCashBonus,
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
