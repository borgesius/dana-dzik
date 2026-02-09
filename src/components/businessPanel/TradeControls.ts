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

        let html = `
            <div class="trade-info">
                <span class="trade-commodity">${commodity}</span>
                <span class="trade-price">${formatMoney(price)}</span>
                <span class="trade-holding">${lm.t("commodityExchange.ui.qty")}: ${formatQuantity(qty)}</span>
            </div>
            <div class="trade-buttons">
                <button class="toolbar-button trade-btn harvest-btn">${lm.t(`commodityExchange.ui.harvest_${commodity}`, { defaultValue: "" }) || lm.t("commodityExchange.ui.harvest", { defaultValue: "Harvest" })} (${formatQuantityFixed(harvestOutput, harvestDecimals)})</button>
                <button class="toolbar-button trade-btn buy-btn" ${canBuy ? "" : "disabled"}>${lm.t("commodityExchange.ui.buy")}</button>
                <button class="toolbar-button trade-btn sell-btn" ${canSell ? "" : "disabled"}>${lm.t("commodityExchange.ui.sell")}</button>
                <button class="toolbar-button trade-btn sell-all-btn" ${canSell ? "" : "disabled"}>${lm.t("commodityExchange.ui.sellAll")}</button>
            </div>
        `

        if (this.game.hasUpgrade("limit-orders")) {
            html += this.renderLimitOrders(commodity, qty, price)
        }

        this.element.innerHTML = html
        this.wireButtons()
    }

    private renderLimitOrders(
        commodity: CommodityId,
        qty: number,
        currentPrice: number
    ): string {
        const orders = this.game.getLimitOrders()
        const commodityOrders = orders
            .map((order, idx) => ({ ...order, globalIndex: idx }))
            .filter((o) => o.commodityId === commodity)

        let html = `<div class="limit-orders-section">`
        html += `<div class="limit-orders-header">LIMIT ORDERS</div>`

        html += `<div class="limit-order-form">`
        html += `<input type="number" class="limit-order-price" placeholder="Target price" min="0" step="0.01" value="${Math.ceil(currentPrice * 1.1)}" />`
        html += `<input type="number" class="limit-order-qty" placeholder="Qty" min="1" step="1" max="${Math.floor(qty)}" value="${Math.min(1, Math.floor(qty))}" />`
        html += `<button class="toolbar-button trade-btn limit-order-add-btn"${qty < 1 ? " disabled" : ""}>SET LIMIT</button>`
        html += `</div>`

        if (commodityOrders.length > 0) {
            html += `<div class="limit-order-list">`
            for (const order of commodityOrders) {
                const pctAbove = (
                    ((order.targetPrice - currentPrice) / currentPrice) *
                    100
                ).toFixed(1)
                html += `<div class="limit-order-row">`
                html += `<span class="limit-order-detail">${formatQuantity(order.quantity)} @ ${formatMoney(order.targetPrice)}</span>`
                html += `<span class="limit-order-pct">(${Number(pctAbove) >= 0 ? "+" : ""}${pctAbove}%)</span>`
                html += `<button class="toolbar-button limit-order-remove-btn" data-order-index="${order.globalIndex}">×</button>`
                html += `</div>`
            }
            html += `</div>`
        }

        html += `</div>`
        return html
    }

    private wireButtons(): void {
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

        const addBtn = this.element.querySelector(".limit-order-add-btn")
        addBtn?.addEventListener("click", () => {
            const priceInput = this.element.querySelector(
                ".limit-order-price"
            ) as HTMLInputElement
            const qtyInput = this.element.querySelector(
                ".limit-order-qty"
            ) as HTMLInputElement
            const targetPrice = parseFloat(priceInput?.value ?? "0")
            const quantity = parseInt(qtyInput?.value ?? "0", 10)

            if (
                targetPrice > 0 &&
                quantity > 0 &&
                this.game.addLimitOrder(
                    this.getSelectedCommodity(),
                    targetPrice,
                    quantity
                )
            ) {
                this.playSound("notify")
                this.render()
            }
        })

        this.element
            .querySelectorAll<HTMLElement>(".limit-order-remove-btn")
            .forEach((btn) => {
                btn.addEventListener("click", () => {
                    const idx = parseInt(
                        btn.getAttribute("data-order-index") ?? "-1",
                        10
                    )
                    if (idx >= 0) {
                        this.game.removeLimitOrder(idx)
                        this.playSound("click")
                        this.render()
                    }
                })
            })
    }
}
