/** Non-standard Chrome performance.memory API */
interface PerformanceMemory {
    usedJSHeapSize: number
    totalJSHeapSize: number
    jsHeapSizeLimit: number
}

interface PerformanceWithMemory extends Performance {
    memory?: PerformanceMemory
}

export class SystemResourcesWidget {
    private el: HTMLElement
    private tooltipEl: HTMLElement
    private intervalId: ReturnType<typeof setInterval> | null = null

    constructor() {
        this.el = document.createElement("div")
        this.el.className = "toolbar-sysres"
        this.el.textContent = "\uD83D\uDDA5\uFE0F ..."

        this.tooltipEl = document.createElement("div")
        this.tooltipEl.className = "toolbar-sysres-tooltip"
        this.tooltipEl.style.display = "none"
        this.el.appendChild(this.tooltipEl)

        this.el.addEventListener("mouseenter", () => {
            this.tooltipEl.style.display = "block"
        })
        this.el.addEventListener("mouseleave", () => {
            this.tooltipEl.style.display = "none"
        })

        this.update()
        this.intervalId = setInterval(() => this.update(), 3000)
    }

    public getElement(): HTMLElement {
        return this.el
    }

    public destroy(): void {
        if (this.intervalId) {
            clearInterval(this.intervalId)
            this.intervalId = null
        }
    }

    private update(): void {
        const mem = this.getMemory()
        const domCount = this.getDomNodeCount()

        // Badge: show heap if available, otherwise DOM count
        if (mem) {
            const usedMB = mem.usedJSHeapSize / (1024 * 1024)
            this.el.firstChild!.textContent = `\uD83D\uDDA5\uFE0F ${usedMB.toFixed(1)} MB`
        } else {
            this.el.firstChild!.textContent = `\uD83D\uDDA5\uFE0F ${domCount} nodes`
        }

        this.tooltipEl.innerHTML = this.renderTooltip(mem, domCount)
    }

    private renderTooltip(
        mem: PerformanceMemory | null,
        domCount: number
    ): string {
        const sections: string[] = []

        // Memory section
        sections.push('<div class="sysres-section-header">Memory</div>')
        if (mem) {
            const usedMB = (mem.usedJSHeapSize / (1024 * 1024)).toFixed(1)
            const totalMB = (mem.totalJSHeapSize / (1024 * 1024)).toFixed(1)
            const limitMB = (mem.jsHeapSizeLimit / (1024 * 1024)).toFixed(0)
            const pct = (
                (mem.usedJSHeapSize / mem.jsHeapSizeLimit) *
                100
            ).toFixed(1)

            sections.push(this.row("Heap Used", `${usedMB} MB`))
            sections.push(this.row("Heap Total", `${totalMB} MB`))
            sections.push(this.row("Heap Limit", `${limitMB} MB`))
            sections.push(this.row("Usage", `${pct}%`))
        } else {
            sections.push(this.row("Heap", "N/A (Chrome only)"))
        }

        // DOM section
        sections.push('<div class="sysres-section-header">DOM</div>')
        sections.push(this.row("Nodes", domCount.toLocaleString()))
        sections.push(
            this.row(
                "Scripts",
                document.querySelectorAll("script").length.toString()
            )
        )
        sections.push(
            this.row("Stylesheets", document.styleSheets.length.toString())
        )
        sections.push(
            this.row("Event Listeners", this.estimateListeners().toString())
        )

        // Network section
        const resources = this.getResourceStats()
        sections.push('<div class="sysres-section-header">Network</div>')
        sections.push(this.row("Resources Loaded", resources.count.toString()))
        sections.push(
            this.row("Total Transferred", this.formatBytes(resources.bytes))
        )

        return `
            <div class="sysres-title">System Resources</div>
            <div class="sysres-divider"></div>
            ${sections.join("")}
        `
    }

    private row(label: string, value: string): string {
        return `<div class="sysres-row"><span class="sysres-label">${label}</span><span class="sysres-value">${value}</span></div>`
    }

    private getMemory(): PerformanceMemory | null {
        const perf = performance as PerformanceWithMemory
        return perf.memory ?? null
    }

    private getDomNodeCount(): number {
        return document.querySelectorAll("*").length
    }

    private estimateListeners(): number {
        // Walk the DOM and count elements with common event handler attributes
        // This is a rough heuristic -- no reliable way to count JS listeners
        let count = 0
        const elements = document.querySelectorAll("*")
        const attrs = [
            "onclick",
            "onmousedown",
            "onmouseup",
            "onmouseover",
            "onmouseenter",
            "onmouseleave",
            "onkeydown",
            "onkeyup",
            "oninput",
            "onchange",
            "onsubmit",
        ]
        elements.forEach((el) => {
            for (const attr of attrs) {
                if (el.hasAttribute(attr)) count++
            }
        })
        // Add a baseline for programmatic listeners (rough estimate)
        return count + Math.min(elements.length, 200)
    }

    private getResourceStats(): { count: number; bytes: number } {
        try {
            const entries = performance.getEntriesByType(
                "resource"
            ) as PerformanceResourceTiming[]
            let totalBytes = 0
            for (const entry of entries) {
                if (entry.transferSize > 0) {
                    totalBytes += entry.transferSize
                }
            }
            return { count: entries.length, bytes: totalBytes }
        } catch {
            return { count: 0, bytes: 0 }
        }
    }

    private formatBytes(bytes: number): string {
        if (bytes >= 1024 * 1024) {
            return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
        }
        if (bytes >= 1024) {
            return `${(bytes / 1024).toFixed(1)} KB`
        }
        return `${bytes} B`
    }
}
