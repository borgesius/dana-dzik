import { formatMoney } from "../../lib/formatMoney"
import { getLocaleManager } from "../../lib/localeManager"
import { ChartRenderer } from "../../lib/marketGame/ChartRenderer"
import type { MarketEngine } from "../../lib/marketGame/MarketEngine"
import { COMMODITIES, type CommodityId } from "../../lib/marketGame/types"

/** Each tick = 1 market day. Timescale options define how many days to show. */
export type TimescaleId = "1W" | "1M" | "3M" | "6M" | "1Y" | "ALL"

const TIMESCALES: { id: TimescaleId; label: string; days: number }[] = [
    { id: "1W", label: "1W", days: 5 },
    { id: "1M", label: "1M", days: 20 },
    { id: "3M", label: "3M", days: 60 },
    { id: "6M", label: "6M", days: 120 },
    { id: "1Y", label: "1Y", days: 250 },
    { id: "ALL", label: "ALL", days: Infinity },
]

export class ChartSection {
    private element: HTMLElement
    private chartRenderer: ChartRenderer | null = null
    private selectedCommodity: CommodityId = "EMAIL"
    private selectedTimescale: TimescaleId = "3M"
    private game: MarketEngine
    private onCommodityChange: (() => void) | null = null
    private resizeObserver: ResizeObserver | null = null

    constructor(game: MarketEngine) {
        this.game = game
        this.element = this.createElement()
    }

    public setOnCommodityChange(cb: () => void): void {
        this.onCommodityChange = cb
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

        // ── Top bar: commodity tabs (left) + timescale tabs (right) ──
        const chartHeader = document.createElement("div")
        chartHeader.className = "chart-header"

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
                this.onCommodityChange?.()
            })
            tabs.appendChild(tab)
        }
        chartHeader.appendChild(tabs)

        const timescaleTabs = document.createElement("div")
        timescaleTabs.className = "timescale-tabs"
        for (const ts of TIMESCALES) {
            const btn = document.createElement("button")
            btn.className = `timescale-tab${ts.id === this.selectedTimescale ? " active" : ""}`
            btn.textContent = ts.label
            btn.dataset.timescaleId = ts.id
            btn.addEventListener("click", () => {
                this.selectedTimescale = ts.id
                this.updateTimescaleSelection()
                this.renderChart()
            })
            timescaleTabs.appendChild(btn)
        }
        chartHeader.appendChild(timescaleTabs)

        section.appendChild(chartHeader)

        const chartWrap = document.createElement("div")
        chartWrap.className = "chart-wrapper"
        const canvas = document.createElement("canvas")
        canvas.className = "market-chart"
        chartWrap.appendChild(canvas)
        section.appendChild(chartWrap)

        this.chartRenderer = new ChartRenderer(canvas, {
            width: 280,
            height: 180,
        })

        // Dynamically resize chart to fill container width
        this.resizeObserver = new ResizeObserver((entries) => {
            for (const entry of entries) {
                const w = Math.floor(entry.contentRect.width)
                if (w > 0 && this.chartRenderer) {
                    this.chartRenderer.resize(w, 180)
                    this.renderChart()
                }
            }
        })
        this.resizeObserver.observe(chartWrap)

        return section
    }

    private updateTimescaleSelection(): void {
        const btns = this.element.querySelectorAll(".timescale-tab")
        btns.forEach((btn) => {
            const id = (btn as HTMLElement).dataset.timescaleId as TimescaleId
            btn.classList.toggle("active", id === this.selectedTimescale)
        })
    }

    /** Return the number of data points to show for the current timescale. */
    private getTimescaleDays(): number {
        const ts = TIMESCALES.find((t) => t.id === this.selectedTimescale)
        return ts ? ts.days : Infinity
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

        const fullHistory = this.game.getPriceHistory(this.selectedCommodity)
        const showTrend = this.game.canShowTrend()
        const trend = this.game.getTrend(this.selectedCommodity)
        const trendStrength = this.game.canShowTrendStrength()
            ? this.game.getTrendStrength(this.selectedCommodity)
            : 0
        const fullMaData = this.game.getMovingAverage(
            this.selectedCommodity,
            20
        )

        const trendTicksRemaining = this.game.canShowTrendDuration()
            ? this.game.getTrendTicksRemaining(this.selectedCommodity)
            : null
        const priceTarget = this.game.canShowPriceTarget()
            ? this.game.getPriceTarget(this.selectedCommodity)
            : null

        // Slice to the selected timescale window (1 tick = 1 market day)
        const days = this.getTimescaleDays()
        const history =
            days < fullHistory.length ? fullHistory.slice(-days) : fullHistory

        // Slice MA data to match the visible window
        // MA data aligns to the end of fullHistory, so we need to trim
        // from the front if there are more MA points than visible days.
        let maData = fullMaData
        if (days < fullHistory.length && fullMaData.length > 0) {
            // MA array covers indices [period-1 .. fullHistory.length-1]
            // We want only the portion that falls within the visible window
            const maOffset = fullHistory.length - fullMaData.length
            const visibleStart = fullHistory.length - days
            const maSliceStart = Math.max(0, visibleStart - maOffset)
            maData = fullMaData.slice(maSliceStart)
        }

        this.chartRenderer.render(this.selectedCommodity, history, {
            showMovingAverage: maData.length > 0,
            showTrendArrow: showTrend,
            trendDirection: showTrend ? trend : null,
            trendStrength,
            movingAverageData: maData,
            trendTicksRemaining,
            priceTarget,
        })
    }
}
