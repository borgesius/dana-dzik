import {
    formatMoney,
    formatQuantity,
    formatQuantityFixed,
} from "../../lib/formatMoney"
import { getLocaleManager } from "../../lib/localeManager"
import type { MarketEngine } from "../../lib/marketGame/MarketEngine"
import type { CommodityId } from "../../lib/marketGame/types"

export class TradeControls {
    private element: HTMLElement
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
        this.element = document.createElement("div")
        this.element.className = "trade-section"
        this.render()
    }

    public getElement(): HTMLElement {
        return this.element
    }

    public render(): void {
        const commodity = this.getSelectedCommodity()
        const price = this.game.getPrice(commodity)
        const cash = this.game.getCash()
        const holding = this.game.getHolding(commodity)
        const qty = holding?.quantity ?? 0
        const lm = getLocaleManager()
        const harvestOutput = this.game.getHarvestOutput(commodity)
        const harvestDecimals = this.game.getHarvestDecimals(commodity)

        const canBuy = cash >= price
        const canSell = qty > 0

        this.element.innerHTML = `
            <div class="trade-info">
                <span class="trade-commodity">${commodity}</span>
                <span class="trade-price">${formatMoney(price)}</span>
                <span class="trade-holding">${lm.t("commodityExchange.ui.qty")}: ${formatQuantity(qty)}</span>
            </div>
            <div class="trade-buttons">
                <button class="toolbar-button trade-btn harvest-btn">${lm.t(`commodityExchange.ui.harvest_${commodity}`) || lm.t("commodityExchange.ui.harvest")} (${formatQuantityFixed(harvestOutput, harvestDecimals)})</button>
                <button class="toolbar-button trade-btn buy-btn" ${canBuy ? "" : "disabled"}>${lm.t("commodityExchange.ui.buy")}</button>
                <button class="toolbar-button trade-btn sell-btn" ${canSell ? "" : "disabled"}>${lm.t("commodityExchange.ui.sell")}</button>
                <button class="toolbar-button trade-btn sell-all-btn" ${canSell ? "" : "disabled"}>${lm.t("commodityExchange.ui.sellAll")}</button>
            </div>
        `

        const harvestBtn = this.element.querySelector(".harvest-btn")
        const buyBtn = this.element.querySelector(".buy-btn")
        const sellBtn = this.element.querySelector(".sell-btn")
        const sellAllBtn = this.element.querySelector(".sell-all-btn")

        harvestBtn?.addEventListener("click", () => {
            const result = this.game.harvest(this.getSelectedCommodity())
            if (result > 0) {
                this.playSound("click")
            }
        })
        buyBtn?.addEventListener("click", () => {
            const result = this.game.buy(this.getSelectedCommodity())
            if (result) {
                this.playSound("notify")
            }
        })
        sellBtn?.addEventListener("click", () => {
            const result = this.game.sell(this.getSelectedCommodity())
            if (result) {
                this.playSound("notify")
            }
        })
        sellAllBtn?.addEventListener("click", () => {
            const result = this.game.sellAll(this.getSelectedCommodity())
            if (result) {
                this.playSound("notify")
            }
        })
    }
}
