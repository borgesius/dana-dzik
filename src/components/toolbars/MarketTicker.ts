import { formatMoney } from "../../lib/formatMoney"
import type { MarketEngine } from "../../lib/marketGame/MarketEngine"
import { COMMODITIES } from "../../lib/marketGame/types"

export class MarketTicker {
    private el: HTMLElement
    private game: MarketEngine

    constructor(game: MarketEngine) {
        this.game = game
        this.el = document.createElement("div")
        this.el.className = "market-ticker"
        this.update()
    }

    public getElement(): HTMLElement {
        return this.el
    }

    public update(): void {
        const unlocked = this.game.getUnlockedCommodities()
        const parts = COMMODITIES.filter((c) => unlocked.includes(c.id)).map(
            (c) => {
                const price = this.game.getPrice(c.id)
                const history = this.game.getPriceHistory(c.id)
                const prev =
                    history.length > 1 ? history[history.length - 2] : price
                const arrow =
                    price > prev ? "\u25B2" : price < prev ? "\u25BC" : "\u2015"
                const arrowClass =
                    price > prev ? "up" : price < prev ? "down" : "flat"
                return `<span class="ticker-item"><span class="ticker-symbol">${c.id}</span> <span class="ticker-price">${formatMoney(price)}</span> <span class="ticker-arrow ${arrowClass}">${arrow}</span></span>`
            }
        )

        this.el.innerHTML = parts.join(
            '<span class="ticker-sep">\u00A0\u00A0</span>'
        )
    }
}
