import { formatMoney } from "../../lib/formatMoney"
import { getLocaleManager } from "../../lib/localeManager"
import type { MarketEngine } from "../../lib/marketGame/MarketEngine"

export class PortfolioSection {
    private element: HTMLElement
    private listEl: HTMLElement
    private game: MarketEngine

    constructor(game: MarketEngine) {
        this.game = game
        this.listEl = document.createElement("div")
        this.listEl.className = "portfolio-list"
        this.element = this.createElement()
        this.render()
    }

    public getElement(): HTMLElement {
        return this.element
    }

    private createElement(): HTMLElement {
        const section = document.createElement("div")
        section.className = "portfolio-section"

        const heading = document.createElement("h3")
        heading.textContent = getLocaleManager().t(
            "commodityExchange.ui.portfolio"
        )
        section.appendChild(heading)
        section.appendChild(this.listEl)

        return section
    }

    public render(): void {
        const holdings = this.game.getAllHoldings()
        const lm = getLocaleManager()

        if (holdings.size === 0) {
            this.listEl.innerHTML = `<div class="portfolio-empty">${lm.t("commodityExchange.ui.noHoldings")}</div>`
            return
        }

        this.listEl.innerHTML = ""

        holdings.forEach((holding, commodityId) => {
            if (holding.quantity <= 0) return

            const price = this.game.getPrice(commodityId)
            const avgCost =
                holding.quantity > 0 ? holding.totalCost / holding.quantity : 0
            const currentValue = holding.quantity * price
            const pl = currentValue - holding.totalCost

            const row = document.createElement("div")
            row.className = "portfolio-row"
            row.innerHTML = `
                <span class="portfolio-ticker">${commodityId}</span>
                <span class="portfolio-qty">${holding.quantity}</span>
                <span class="portfolio-avg">${formatMoney(avgCost)}</span>
                <span class="portfolio-pl ${pl >= 0 ? "positive" : "negative"}">${pl >= 0 ? "+" : ""}${formatMoney(pl)}</span>
            `
            this.listEl.appendChild(row)
        })
    }
}
