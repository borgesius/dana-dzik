import { formatMoney } from "../../lib/formatMoney"
import { getLocaleManager } from "../../lib/localeManager"
import type { MarketEngine } from "../../lib/marketGame/MarketEngine"
import {
    type CommodityId,
    INFLUENCES,
    PHASE_THRESHOLDS,
} from "../../lib/marketGame/types"

export class InfluenceSection {
    private element: HTMLElement
    private listEl: HTMLElement
    private lockedEl: HTMLElement
    private game: MarketEngine
    private getSelectedCommodity: () => CommodityId
    private playSound: (type: string) => void

    constructor(
        game: MarketEngine,
        getSelectedCommodity: () => CommodityId,
        playSound: (type: string) => void
    ) {
        this.game = game
        this.getSelectedCommodity = getSelectedCommodity
        this.playSound = playSound
        this.listEl = document.createElement("div")
        this.listEl.className = "influence-list"
        this.lockedEl = document.createElement("div")
        this.lockedEl.className = "phase-locked-teaser"
        this.element = this.createElement()
        this.updateVisibility()
        this.render()
    }

    public getElement(): HTMLElement {
        return this.element
    }

    private createElement(): HTMLElement {
        const section = document.createElement("div")
        section.className = "influence-section"

        const heading = document.createElement("h3")
        heading.textContent = getLocaleManager().t(
            "commodityExchange.ui.marketOperations"
        )
        section.appendChild(heading)
        section.appendChild(this.lockedEl)
        section.appendChild(this.listEl)

        return section
    }

    public updateVisibility(): void {
        const unlocked = this.game.isPhaseUnlocked(4)
        const prevUnlocked = this.game.isPhaseUnlocked(3)
        if (unlocked) {
            this.element.style.display = "block"
            this.listEl.style.display = ""
            this.lockedEl.style.display = "none"
        } else if (prevUnlocked) {
            this.element.style.display = "block"
            this.listEl.style.display = "none"
            const lm = getLocaleManager()
            this.lockedEl.style.display = ""
            this.lockedEl.textContent = lm.t(
                "commodityExchange.ui.phaseEarningsHint",
                { threshold: formatMoney(PHASE_THRESHOLDS.influence) }
            )
        } else {
            this.element.style.display = "none"
        }
    }

    public render(): void {
        if (!this.game.isPhaseUnlocked(4)) return

        const lm = getLocaleManager()
        this.listEl.innerHTML = ""

        for (const inf of INFLUENCES) {
            const onCooldown = this.game.isInfluenceOnCooldown(inf.id)
            const remaining = this.game.getInfluenceCooldownRemaining(inf.id)
            const cash = this.game.getCash()
            const canAffordCash = cash >= inf.cashCost

            let canAffordCommodities = true
            const costParts: string[] = []

            if (inf.cashCost > 0) {
                costParts.push(formatMoney(inf.cashCost))
            }
            for (const [cId, qty] of Object.entries(inf.commodityCosts)) {
                const holding = this.game.getHolding(cId as CommodityId)
                if (!holding || holding.quantity < qty) {
                    canAffordCommodities = false
                }
                costParts.push(`${qty} ${cId}`)
            }

            const canExecute =
                !onCooldown && canAffordCash && canAffordCommodities

            const card = document.createElement("div")
            card.className = "influence-card"

            const cooldownText = onCooldown
                ? `${lm.t("commodityExchange.ui.cooldown")} ${Math.ceil(remaining / 1000)}s`
                : ""

            card.innerHTML = `
                <div class="influence-info">
                    <span class="influence-name">${lm.t(`commodityExchange.influence.${inf.id}.name`)}</span>
                    <span class="influence-desc">${lm.t(`commodityExchange.influence.${inf.id}.description`)}</span>
                    <span class="influence-cost">${costParts.join(" + ")}</span>
                </div>
                <button class="toolbar-button influence-exec-btn" ${canExecute ? "" : "disabled"}>
                    ${onCooldown ? cooldownText : lm.t("commodityExchange.ui.execute")}
                </button>
            `

            const btn = card.querySelector(".influence-exec-btn")
            btn?.addEventListener("click", () => {
                if (
                    this.game.executeInfluence(
                        inf.id,
                        this.getSelectedCommodity()
                    )
                ) {
                    this.playSound("notify")
                    this.render()
                }
            })

            this.listEl.appendChild(card)
        }
    }
}
