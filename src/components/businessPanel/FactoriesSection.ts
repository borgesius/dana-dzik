import { formatMoney } from "../../lib/formatMoney"
import { getLocaleManager } from "../../lib/localeManager"
import type { MarketEngine } from "../../lib/marketGame/MarketEngine"
import { FACTORIES } from "../../lib/marketGame/types"

export class FactoriesSection {
    private element: HTMLElement
    private listEl: HTMLElement
    private game: MarketEngine
    private playSound: (type: string) => void

    constructor(game: MarketEngine, playSound: (type: string) => void) {
        this.game = game
        this.playSound = playSound
        this.listEl = document.createElement("div")
        this.listEl.className = "factories-list"
        this.element = this.createElement()
        this.render()
    }

    public getElement(): HTMLElement {
        return this.element
    }

    private createElement(): HTMLElement {
        const section = document.createElement("div")
        section.className = "factories-section"
        section.style.display = this.game.isPhaseUnlocked(2) ? "block" : "none"

        const heading = document.createElement("h3")
        heading.textContent = getLocaleManager().t(
            "commodityExchange.ui.production"
        )
        section.appendChild(heading)
        section.appendChild(this.listEl)

        return section
    }

    public updateVisibility(): void {
        this.element.style.display = this.game.isPhaseUnlocked(2)
            ? "block"
            : "none"
    }

    public render(): void {
        if (!this.game.isPhaseUnlocked(2)) return

        const cash = this.game.getCash()
        const lm = getLocaleManager()
        this.listEl.innerHTML = ""

        for (const f of FACTORIES) {
            const count = this.game.getFactoryCount(f.id)
            const currentCost = this.game.getFactoryCost(f.id)
            const canAfford = cash >= currentCost

            const card = document.createElement("div")
            card.className = "factory-card"

            card.innerHTML = `
                <div class="factory-info">
                    <span class="factory-name">${lm.t(`commodityExchange.factories.${f.id}.name`)}</span>
                    <span class="factory-desc">${lm.t(`commodityExchange.factories.${f.id}.description`)}</span>
                    <span class="factory-output">${f.produces} ~${((f.minOutput + f.maxOutput) / 2).toFixed(1)}/${lm.t("commodityExchange.ui.tick")}</span>
                    ${count > 0 ? `<span class="factory-count">x${count} ${lm.t("commodityExchange.ui.deployed")}</span>` : ""}
                </div>
                <button class="toolbar-button factory-deploy-btn" ${canAfford ? "" : "disabled"}>
                    ${lm.t("commodityExchange.ui.deploy")} ${formatMoney(currentCost)}
                </button>
            `

            const btn = card.querySelector(".factory-deploy-btn")
            btn?.addEventListener("click", () => {
                if (this.game.deployFactory(f.id)) {
                    this.playSound("notify")
                    this.render()
                }
            })

            this.listEl.appendChild(card)
        }
    }
}
