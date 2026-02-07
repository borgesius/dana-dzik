import { formatMoney } from "../../lib/formatMoney"
import { getLocaleManager } from "../../lib/localeManager"
import { ChartRenderer } from "../../lib/marketGame/ChartRenderer"
import type { MarketEngine } from "../../lib/marketGame/MarketEngine"
import { COMMODITIES, type CommodityId } from "../../lib/marketGame/types"

export class ChartSection {
    private element: HTMLElement
    private chartRenderer: ChartRenderer | null = null
    private selectedCommodity: CommodityId = "EMAIL"
    private game: MarketEngine

    constructor(game: MarketEngine) {
        this.game = game
        this.element = this.createElement()
    }

    public getElement(): HTMLElement {
        return this.element
    }

    public getSelectedCommodity(): CommodityId {
        return this.selectedCommodity
    }

    public setSelectedCommodity(id: CommodityId): void {
        this.selectedCommodity = id
        this.updateTabSelection()
        this.renderChart()
    }

    private createElement(): HTMLElement {
        const section = document.createElement("div")
        section.className = "chart-section"

        const tabs = document.createElement("div")
        tabs.className = "commodity-tabs"

        const unlocked = this.game.getUnlockedCommodities()
        const lm = getLocaleManager()
        for (const c of COMMODITIES) {
            const isUnlocked = unlocked.includes(c.id)
            const tab = document.createElement("button")
            tab.className = `commodity-tab${c.id === this.selectedCommodity ? " active" : ""}${!isUnlocked ? " locked" : ""}`
            tab.textContent = c.id
            tab.dataset.commodityId = c.id
            tab.disabled = !isUnlocked
            if (!isUnlocked && c.unlockThreshold > 0) {
                tab.title = lm.t("commodityExchange.ui.unlockAt", {
                    threshold: formatMoney(c.unlockThreshold),
                })
            }
            tab.addEventListener("click", () => {
                this.selectedCommodity = c.id
                this.updateTabSelection()
                this.renderChart()
            })
            tabs.appendChild(tab)
        }

        section.appendChild(tabs)

        const chartWrap = document.createElement("div")
        chartWrap.className = "chart-wrapper"
        const canvas = document.createElement("canvas")
        canvas.className = "market-chart"
        chartWrap.appendChild(canvas)
        section.appendChild(chartWrap)

        this.chartRenderer = new ChartRenderer(canvas, {
            width: 280,
            height: 130,
        })

        return section
    }

    public updateTabSelection(): void {
        const tabs = this.element.querySelectorAll(".commodity-tab")
        const unlocked = this.game.getUnlockedCommodities()
        const lm = getLocaleManager()
        tabs.forEach((tab) => {
            const id = (tab as HTMLElement).dataset.commodityId as CommodityId
            const isUnlocked = unlocked.includes(id)
            tab.classList.toggle("active", id === this.selectedCommodity)
            tab.classList.toggle("locked", !isUnlocked)
            ;(tab as HTMLButtonElement).disabled = !isUnlocked

            // Update tooltip for locked tabs
            const def = COMMODITIES.find((c) => c.id === id)
            if (!isUnlocked && def && def.unlockThreshold > 0) {
                ;(tab as HTMLElement).title = lm.t(
                    "commodityExchange.ui.unlockAt",
                    { threshold: formatMoney(def.unlockThreshold) }
                )
            } else {
                ;(tab as HTMLElement).title = ""
            }
        })
    }

    public renderChart(): void {
        if (!this.chartRenderer) return

        const history = this.game.getPriceHistory(this.selectedCommodity)
        const showTrend = this.game.canShowTrend()
        const trend = this.game.getTrend(this.selectedCommodity)
        const trendStrength = this.game.canShowTrendStrength()
            ? this.game.getTrendStrength(this.selectedCommodity)
            : 0
        const maData = this.game.getMovingAverage(this.selectedCommodity, 20)

        this.chartRenderer.render(this.selectedCommodity, history, {
            showMovingAverage: maData.length > 0,
            showTrendArrow: showTrend,
            trendDirection: showTrend ? trend : null,
            trendStrength,
            movingAverageData: maData,
        })
    }
}
