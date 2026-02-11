import {
    type BootTimingBreakdown,
    getBootBreakdown,
    getBootTimeMs,
} from "../../lib/bootTime"

export class BootTimeWidget {
    private el: HTMLElement
    private tooltipEl: HTMLElement

    constructor() {
        this.el = document.createElement("div")
        this.el.className = "toolbar-boot"
        this.el.textContent = "\u26A1 ..."

        this.tooltipEl = document.createElement("div")
        this.tooltipEl.className = "toolbar-boot-tooltip"
        this.tooltipEl.style.display = "none"
        this.el.appendChild(this.tooltipEl)

        this.el.addEventListener("mouseenter", () => {
            this.tooltipEl.style.display = "block"
        })
        this.el.addEventListener("mouseleave", () => {
            this.tooltipEl.style.display = "none"
        })

        this.pollForBootTime()
    }

    public getElement(): HTMLElement {
        return this.el
    }

    private pollForBootTime(): void {
        const check = (): void => {
            const ms = getBootTimeMs()
            if (ms !== null) {
                if (this.el.firstChild) this.el.firstChild.textContent = `\u26A1 ${ms}ms`
                this.renderTooltip()
            } else {
                requestAnimationFrame(check)
            }
        }
        requestAnimationFrame(check)
    }

    private renderTooltip(): void {
        const breakdown = getBootBreakdown()
        if (!breakdown) return

        const rows = this.buildRows(breakdown)

        this.tooltipEl.innerHTML = `
            <div class="boot-title">Boot Timing</div>
            <div class="boot-divider"></div>
            ${rows}
            <div class="boot-divider"></div>
            <div class="boot-total">\u26A1 ${breakdown.totalMs}ms</div>
        `
    }

    private buildRows(b: BootTimingBreakdown): string {
        const rows: Array<{ label: string; value: string }> = []

        rows.push({ label: "Total", value: `${b.totalMs}ms` })

        if (b.dns > 0) {
            rows.push({ label: "DNS Lookup", value: `${b.dns}ms` })
        }
        if (b.tcp > 0) {
            rows.push({ label: "TCP Connect", value: `${b.tcp}ms` })
        }
        if (b.ttfb > 0) {
            rows.push({ label: "Time to First Byte", value: `${b.ttfb}ms` })
        }
        if (b.domParse > 0) {
            rows.push({ label: "DOM Parse", value: `${b.domParse}ms` })
        }
        if (b.resources > 0) {
            rows.push({ label: "Resources", value: `${b.resources}ms` })
        }

        return rows
            .map(
                (r) =>
                    `<div class="boot-row"><span class="boot-label">${r.label}</span><span class="boot-value">${r.value}</span></div>`
            )
            .join("")
    }
}
