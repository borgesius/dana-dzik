import { formatMoney } from "../formatMoney"
import type { CommodityId } from "./types"

const CHART_BG = "#000000"
const CHART_GRID = "#1a3a1a"
const CHART_LINE = "#00ff00"
const CHART_MA_LINE = "#ffff00"
const CHART_TEXT = "#00cc00"
const CHART_FONT = '10px "Courier New", monospace'
const CHART_BULL_ARROW = "#00ff00"
const CHART_BEAR_ARROW = "#ff4444"
const CHART_FLAT_ARROW = "#888888"

const Y_AXIS_WIDTH = 55
const X_PADDING = 4
const Y_PADDING = 12

export interface ChartOptions {
    width: number
    height: number
    showMovingAverage: boolean
    showTrendArrow: boolean
    trendDirection: "bull" | "bear" | "flat" | null
    trendStrength: number
    movingAverageData: number[]
}

const DEFAULT_OPTIONS: ChartOptions = {
    width: 300,
    height: 150,
    showMovingAverage: false,
    showTrendArrow: false,
    trendDirection: null,
    trendStrength: 0,
    movingAverageData: [],
}

export class ChartRenderer {
    private canvas: HTMLCanvasElement
    private ctx: CanvasRenderingContext2D
    private options: ChartOptions

    constructor(canvas: HTMLCanvasElement, options?: Partial<ChartOptions>) {
        this.canvas = canvas
        this.options = { ...DEFAULT_OPTIONS, ...options }

        const ctx = canvas.getContext("2d")
        if (!ctx) throw new Error("Failed to get canvas 2d context")
        this.ctx = ctx

        this.resize(this.options.width, this.options.height)
    }

    public resize(width: number, height: number): void {
        const dpr =
            typeof window !== "undefined" ? (window.devicePixelRatio ?? 1) : 1
        this.canvas.width = width * dpr
        this.canvas.height = height * dpr
        this.canvas.style.width = `${width}px`
        this.canvas.style.height = `${height}px`
        this.ctx.scale(dpr, dpr)
        this.options.width = width
        this.options.height = height
    }

    public updateOptions(options: Partial<ChartOptions>): void {
        Object.assign(this.options, options)
    }

    public render(
        _commodityId: CommodityId,
        priceHistory: number[],
        options?: Partial<ChartOptions>
    ): void {
        if (options) {
            Object.assign(this.options, options)
        }

        const { width, height } = this.options
        const ctx = this.ctx

        ctx.save()
        ctx.setTransform(1, 0, 0, 1, 0, 0)
        const dpr =
            typeof window !== "undefined" ? (window.devicePixelRatio ?? 1) : 1
        ctx.scale(dpr, dpr)

        ctx.fillStyle = CHART_BG
        ctx.fillRect(0, 0, width, height)

        if (priceHistory.length === 0) {
            ctx.font = CHART_FONT
            ctx.fillStyle = CHART_TEXT
            ctx.textAlign = "center"
            ctx.fillText("NO DATA", width / 2, height / 2)
            ctx.restore()
            return
        }

        const chartLeft = Y_AXIS_WIDTH
        const chartRight = width - X_PADDING
        const chartTop = Y_PADDING
        const chartBottom = height - Y_PADDING
        const chartWidth = chartRight - chartLeft
        const chartHeight = chartBottom - chartTop

        const minPrice = Math.min(...priceHistory) * 0.95
        const maxPrice = Math.max(...priceHistory) * 1.05
        const priceRange = maxPrice - minPrice || 1

        this.drawGrid(
            ctx,
            chartLeft,
            chartTop,
            chartWidth,
            chartHeight,
            minPrice,
            maxPrice
        )

        this.drawPriceLine(
            ctx,
            priceHistory,
            chartLeft,
            chartTop,
            chartWidth,
            chartHeight,
            minPrice,
            priceRange
        )

        if (
            this.options.showMovingAverage &&
            this.options.movingAverageData.length > 0
        ) {
            this.drawMovingAverage(
                ctx,
                priceHistory,
                chartLeft,
                chartTop,
                chartWidth,
                chartHeight,
                minPrice,
                priceRange
            )
        }

        if (this.options.showTrendArrow && this.options.trendDirection) {
            this.drawTrendArrow(ctx, chartRight, chartTop)
        }

        ctx.restore()
    }

    private drawGrid(
        ctx: CanvasRenderingContext2D,
        chartLeft: number,
        chartTop: number,
        chartWidth: number,
        chartHeight: number,
        minPrice: number,
        maxPrice: number
    ): void {
        const gridLines = 4
        ctx.strokeStyle = CHART_GRID
        ctx.lineWidth = 1
        ctx.font = CHART_FONT
        ctx.fillStyle = CHART_TEXT
        ctx.textAlign = "right"

        for (let i = 0; i <= gridLines; i++) {
            const y = chartTop + (i / gridLines) * chartHeight
            const price = maxPrice - (i / gridLines) * (maxPrice - minPrice)

            ctx.beginPath()
            ctx.moveTo(chartLeft, y)
            ctx.lineTo(chartLeft + chartWidth, y)
            ctx.stroke()

            ctx.fillText(formatMoney(price), chartLeft - 4, y + 3)
        }
    }

    private drawPriceLine(
        ctx: CanvasRenderingContext2D,
        priceHistory: number[],
        chartLeft: number,
        chartTop: number,
        chartWidth: number,
        chartHeight: number,
        minPrice: number,
        priceRange: number
    ): void {
        ctx.strokeStyle = CHART_LINE
        ctx.lineWidth = 1.5
        ctx.beginPath()

        const step =
            priceHistory.length > 1 ? chartWidth / (priceHistory.length - 1) : 0

        for (let i = 0; i < priceHistory.length; i++) {
            const x = chartLeft + i * step
            const normalizedPrice = (priceHistory[i] - minPrice) / priceRange
            const y = chartTop + chartHeight - normalizedPrice * chartHeight

            if (i === 0) {
                ctx.moveTo(Math.round(x), Math.round(y))
            } else {
                const prevX = chartLeft + (i - 1) * step
                const midX = Math.round((prevX + x) / 2)
                ctx.lineTo(midX, Math.round(y))
                ctx.lineTo(Math.round(x), Math.round(y))
            }
        }

        ctx.stroke()
    }

    private drawMovingAverage(
        ctx: CanvasRenderingContext2D,
        priceHistory: number[],
        chartLeft: number,
        chartTop: number,
        chartWidth: number,
        chartHeight: number,
        minPrice: number,
        priceRange: number
    ): void {
        const maData = this.options.movingAverageData
        if (maData.length === 0) return

        ctx.strokeStyle = CHART_MA_LINE
        ctx.lineWidth = 1
        ctx.setLineDash([4, 4])
        ctx.beginPath()

        const offset = priceHistory.length - maData.length
        const step =
            priceHistory.length > 1 ? chartWidth / (priceHistory.length - 1) : 0

        for (let i = 0; i < maData.length; i++) {
            const x = chartLeft + (i + offset) * step
            const normalizedPrice = (maData[i] - minPrice) / priceRange
            const y = chartTop + chartHeight - normalizedPrice * chartHeight

            if (i === 0) {
                ctx.moveTo(Math.round(x), Math.round(y))
            } else {
                ctx.lineTo(Math.round(x), Math.round(y))
            }
        }

        ctx.stroke()
        ctx.setLineDash([])
    }

    private drawTrendArrow(
        ctx: CanvasRenderingContext2D,
        chartRight: number,
        chartTop: number
    ): void {
        const dir = this.options.trendDirection
        const x = chartRight - 15
        const y = chartTop + 10

        ctx.font = "bold 14px monospace"
        ctx.textAlign = "center"

        if (dir === "bull") {
            ctx.fillStyle = CHART_BULL_ARROW
            ctx.fillText("\u25B2", x, y)
        } else if (dir === "bear") {
            ctx.fillStyle = CHART_BEAR_ARROW
            ctx.fillText("\u25BC", x, y)
        } else {
            ctx.fillStyle = CHART_FLAT_ARROW
            ctx.fillText("\u25B6", x, y)
        }
    }

    public getCanvas(): HTMLCanvasElement {
        return this.canvas
    }
}
