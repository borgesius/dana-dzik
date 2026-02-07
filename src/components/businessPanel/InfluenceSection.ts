import { formatMoney } from "../../lib/formatMoney"
import { getLocaleManager } from "../../lib/localeManager"
import type { MarketEngine } from "../../lib/marketGame/MarketEngine"
import { type CommodityId, INFLUENCES } from "../../lib/marketGame/types"

export class InfluenceSection {
    private element: HTMLElement
    private listEl: HTMLElement
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
        this.element = this.createElement()
        this.render()
    }

    public getElement(): HTMLElement {
        return this.element
    }

    private createElement(): HTMLElement {
        const section = document.createElement("div")
        section.className = "influence-section"
        section.style.display = this.game.isPhaseUnlocked(4) ? "block" : "none"

        const heading = document.createElement("h3")
        heading.textContent = getLocaleManager().t(
            "commodityExchange.ui.marketOperations"
        )
        section.appendChild(heading)
        section.appendChild(this.listEl)

        return section
    }

    public updateVisibility(): void {
        this.element.style.display = this.game.isPhaseUnlocked(4)
            ? "block"
            : "none"
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
