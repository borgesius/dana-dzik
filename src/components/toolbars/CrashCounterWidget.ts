import { onAppEvent } from "../../lib/events"

const EFFECT_LABELS: Record<string, string> = {
    bsod: "BSOD",
    "display-corrupt": "Display Corruption",
    "clock-haywire": "Clock Haywire",
    "memory-fault": "Memory Fault",
    restart: "System Restart",
}

interface CrashStats {
    total: number
    byType: Record<string, number>
}

export class CrashCounterWidget {
    private el: HTMLElement
    private tooltipEl: HTMLElement
    private crashData: CrashStats = { total: 0, byType: {} }

    constructor() {
        this.el = document.createElement("div")
        this.el.className = "toolbar-crash"
        this.el.textContent = "\uD83D\uDCA5 ..."

        this.tooltipEl = document.createElement("div")
        this.tooltipEl.className = "toolbar-crash-tooltip"
        this.tooltipEl.style.display = "none"
        this.el.appendChild(this.tooltipEl)

        this.el.addEventListener("mouseenter", () => {
            this.tooltipEl.style.display = "block"
        })
        this.el.addEventListener("mouseleave", () => {
            this.tooltipEl.style.display = "none"
        })

        void this.fetchCrashData()
        this.listenForCrashes()
    }

    public getElement(): HTMLElement {
        return this.el
    }

    private async fetchCrashData(): Promise<void> {
        try {
            const res = await fetch("/api/analytics")
            if (!res.ok) return

            const json = (await res.json()) as {
                ok: boolean
                data?: {
                    crashes?: CrashStats
                }
            }

            if (json.ok && json.data?.crashes) {
                this.crashData = json.data.crashes
            }
        } catch {
            // Silently fail
        }

        this.render()
    }

    private listenForCrashes(): void {
        onAppEvent("system-crash:triggered", (detail) => {
            this.crashData.total++
            const type = detail.effectType
            this.crashData.byType[type] = (this.crashData.byType[type] ?? 0) + 1
            this.render()
        })
    }

    private render(): void {
        const total = this.crashData.total
        if (this.el.firstChild) this.el.firstChild.textContent = `\uD83D\uDCA5 ${this.formatNumber(total)}`
        this.tooltipEl.innerHTML = this.renderTooltip()
    }

    private renderTooltip(): string {
        const types = Object.entries(this.crashData.byType)
        const typeRows = types
            .sort((a, b) => b[1] - a[1])
            .map(([type, count]) => {
                const label = EFFECT_LABELS[type] ?? type
                return `<div class="crash-row"><span class="crash-label">${label}</span><span class="crash-value">${this.formatNumber(count)}</span></div>`
            })
            .join("")

        return `
            <div class="crash-title">System Crashes</div>
            <div class="crash-subtitle">across all visitors</div>
            <div class="crash-divider"></div>
            ${typeRows || '<div class="crash-row"><span class="crash-label">No crashes yet</span></div>'}
            <div class="crash-divider"></div>
            <div class="crash-total">\uD83D\uDCA5 ${this.formatNumber(this.crashData.total)} total</div>
        `
    }

    private formatNumber(n: number): string {
        return n.toLocaleString()
    }
}
