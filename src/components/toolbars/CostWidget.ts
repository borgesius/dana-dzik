import {
    getSessionCostTracker,
    type SessionCostTracker,
} from "../../lib/sessionCost"

export class CostWidget {
    private el: HTMLElement
    private tooltipEl: HTMLElement

    constructor() {
        this.el = document.createElement("div")
        this.el.className = "toolbar-cost"
        this.el.innerHTML = "💸 $0.000000"

        this.tooltipEl = document.createElement("div")
        this.tooltipEl.className = "toolbar-cost-tooltip"
        this.tooltipEl.style.display = "none"
        this.el.appendChild(this.tooltipEl)

        this.el.addEventListener("mouseenter", () => {
            this.tooltipEl.style.display = "block"
        })
        this.el.addEventListener("mouseleave", () => {
            this.tooltipEl.style.display = "none"
        })

        this.initTracking()
    }

    public getElement(): HTMLElement {
        return this.el
    }

    private initTracking(): void {
        const tracker: SessionCostTracker | null = getSessionCostTracker()
        if (!tracker) return

        const update = (): void => {
            const breakdown = tracker.getBreakdown()
            const costText = this.formatCostValue(breakdown.totalCost)
            this.el.firstChild!.textContent = `💸 ${costText}`
            this.tooltipEl.innerHTML = this.renderTooltip(breakdown)
        }

        tracker.onUpdate(update)
        update()
    }

    private formatCostValue(cost: number): string {
        return `$${cost.toFixed(6)}`
    }

    private renderTooltip(breakdown: {
        items: Array<{
            label: string
            cost: number
            count: number
            sampled: boolean
        }>
        bandwidthBytes: number
        bandwidthCost: number
        totalCost: number
        isSampled: boolean
    }): string {
        const alwaysTracked = breakdown.items.filter((i) => !i.sampled)
        const sampled = breakdown.items.filter((i) => i.sampled)

        const alwaysRows = alwaysTracked
            .map((item) => {
                const costStr = this.formatCostValue(item.cost)
                return `<div class="cost-row"><span class="cost-label">${item.label} ×${item.count}</span><span class="cost-value">${costStr}</span></div>`
            })
            .join("")

        const mbStr = (breakdown.bandwidthBytes / (1024 * 1024)).toFixed(2)
        const bwCostStr = this.formatCostValue(breakdown.bandwidthCost)
        const bandwidthRow = `<div class="cost-row"><span class="cost-label">Bandwidth ~${mbStr} MB</span><span class="cost-value">${bwCostStr}</span></div>`

        const sampledSection =
            sampled.length > 0
                ? `<div class="cost-section-header">Sampled (1%)</div>` +
                  sampled
                      .map((item) => {
                          const costStr = this.formatCostValue(item.cost)
                          return `<div class="cost-row cost-row-sampled"><span class="cost-label">${item.label} ×${item.count}</span><span class="cost-value">${costStr}</span></div>`
                      })
                      .join("")
                : ""

        const lotteryHtml = breakdown.isSampled
            ? `<div class="cost-lottery cost-blink">🎰 YOU WON THE LOTTERY</div>`
            : ""

        const totalStr = this.formatCostValue(breakdown.totalCost)

        return `
            <picture>
                <source srcset="/assets/gifs/broke.webp" type="image/webp" />
                <img src="/assets/gifs/broke.png" alt="" class="cost-gif" onerror="this.style.display='none'" />
            </picture>
            <div class="cost-title">Normalized User Cost</div>
            <div class="cost-divider"></div>
            ${alwaysRows}
            ${bandwidthRow}
            ${sampledSection}
            ${lotteryHtml}
            <div class="cost-total-divider"></div>
            <div class="cost-total">-${totalStr} :(</div>
        `
    }
}
