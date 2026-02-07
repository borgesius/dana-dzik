import { PHOTO_VARIANTS } from "./analytics"

interface Stats {
    totalViews: number
    uniqueVisitors: number
    windowViews: Record<string, number>
    funnel: Record<string, number>
    abTest: {
        name: string
        variants: Record<string, { assigned: number; converted: number }>
    }
    perf: {
        avgLoadTime: number
        byType: Record<string, { avg: number; count: number }>
    }
}

interface StatsResponse {
    ok: boolean
    data?: Stats
    error?: string
}

export function initSiteStats(): void {
    void fetchAndDisplayStats()
}

async function fetchAndDisplayStats(): Promise<void> {
    const loadingEl = document.getElementById("stats-loading")
    const gridEl = document.getElementById("stats-grid")
    const heatmapSection = document.getElementById("stats-heatmap")
    const funnelSection = document.getElementById("stats-funnel")
    const abSection = document.getElementById("stats-ab")
    const perfSection = document.getElementById("stats-perf")

    try {
        const response = await fetch("/api/analytics")
        const contentType = response.headers.get("content-type")

        if (!contentType?.includes("application/json")) {
            if (loadingEl) {
                loadingEl.textContent =
                    "Analytics not available (deploy to Vercel)"
            }
            return
        }

        const result = (await response.json()) as StatsResponse

        if (!result.ok || !result.data) {
            if (loadingEl) {
                loadingEl.textContent = result.error || "Could not load stats"
            }
            return
        }

        const stats = result.data

        if (loadingEl) loadingEl.style.display = "none"
        if (gridEl) gridEl.style.display = "grid"
        if (heatmapSection) heatmapSection.style.display = "block"
        if (funnelSection) funnelSection.style.display = "block"
        if (abSection) abSection.style.display = "block"
        if (perfSection) perfSection.style.display = "block"

        renderOverview(stats)
        renderHeatmap(stats.windowViews)
        renderFunnel(stats.funnel)
        renderAbTest(stats.abTest)
        renderPerf(stats.perf)
    } catch {
        if (loadingEl) {
            loadingEl.textContent = "Could not load analytics"
        }
    }
}

function renderOverview(stats: Stats): void {
    const viewsEl = document.getElementById("stat-views")
    const clicksEl = document.getElementById("stat-clicks")

    if (viewsEl) {
        viewsEl.textContent = stats.totalViews.toLocaleString()
    }

    if (clicksEl) {
        const totalClicks = Object.values(stats.windowViews).reduce(
            (a, b) => a + b,
            0
        )
        clicksEl.textContent = totalClicks.toLocaleString()
    }
}

function renderHeatmap(windowViews: Record<string, number>): void {
    const container = document.getElementById("heatmap-bars")
    if (!container) return

    const entries = Object.entries(windowViews).sort((a, b) => b[1] - a[1])
    const maxViews = Math.max(...Object.values(windowViews), 1)

    const windowLabels: Record<string, string> = {
        welcome: "Welcome",
        about: "About",
        projects: "Projects",
        resume: "Resume",
        links: "Links",
        guestbook: "Guestbook",
        felixgpt: "FelixGPT",
        stats: "Stats",
    }

    container.innerHTML = entries
        .map(([id, count]) => {
            const pct = Math.round((count / maxViews) * 100)
            const label = windowLabels[id] || id
            return `
                <div class="heatmap-row">
                    <span class="heatmap-label">${label}</span>
                    <div class="heatmap-bar-container">
                        <div class="heatmap-bar" style="width: ${pct}%"></div>
                    </div>
                    <span class="heatmap-count">${count}</span>
                </div>
            `
        })
        .join("")
}

function renderFunnel(funnel: Record<string, number>): void {
    const container = document.getElementById("funnel-chart")
    if (!container) return

    const steps = [
        { key: "launched", label: "Launched App" },
        { key: "boot_complete", label: "Finished Intro" },
        { key: "engaged", label: "Interacted" },
    ]

    const maxCount = Math.max(...steps.map((s) => funnel[s.key] || 0), 1)

    container.innerHTML = steps
        .map((step, i) => {
            const count = funnel[step.key] || 0
            const pct = Math.round((count / maxCount) * 100)
            const prevCount = i > 0 ? funnel[steps[i - 1].key] || 0 : count
            const dropoff =
                prevCount > 0
                    ? Math.round(((prevCount - count) / prevCount) * 100)
                    : 0

            return `
                <div class="funnel-step">
                    <div class="funnel-bar" style="width: ${pct}%">
                        <span class="funnel-label">${step.label}</span>
                        <span class="funnel-count">${count}</span>
                    </div>
                    ${i > 0 && dropoff > 0 ? `<span class="funnel-dropoff">-${dropoff}%</span>` : ""}
                </div>
            `
        })
        .join("")
}

function renderAbTest(abTest: Stats["abTest"]): void {
    const container = document.getElementById("ab-results")
    if (!container) return

    const variants = Object.entries(abTest.variants)

    if (variants.length === 0) {
        container.innerHTML = "<p>No A/B test data yet</p>"
        return
    }

    container.innerHTML = variants
        .sort((a, b) => b[1].assigned - a[1].assigned)
        .map(([name, data]) => {
            const rate =
                data.assigned > 0
                    ? ((data.converted / data.assigned) * 100).toFixed(1)
                    : "0.0"
            const variantData = PHOTO_VARIANTS.find((v) => v.id === name)
            const photo = variantData?.photo || ""
            const webp = variantData?.webp || ""
            return `
                <div class="ab-variant">
                    <div class="ab-variant-header">
                        ${photo ? `<picture><source srcset="${webp}" type="image/webp" /><img src="${photo}" alt="Variant ${name}" class="ab-photo" /></picture>` : ""}
                        <div class="ab-variant-info">
                            <span class="ab-variant-name">Photo ${name}</span>
                            <span class="ab-variant-rate">${rate}% engagement</span>
                        </div>
                    </div>
                    <div class="ab-variant-stats">
                        <span>${data.assigned} visitors</span>
                        <span>${data.converted} engaged</span>
                    </div>
                </div>
            `
        })
        .join("")
}

function renderPerf(perf: Stats["perf"]): void {
    const container = document.getElementById("perf-stats")
    if (!container) return

    const typeLabels: Record<string, string> = {
        script: "📜 Scripts",
        style: "🎨 Styles",
        image: "🖼️ Images",
        font: "🔤 Fonts",
        audio: "🔊 Audio",
        other: "📦 Other",
    }

    const entries = Object.entries(perf.byType).sort(
        (a, b) => b[1].avg - a[1].avg
    )

    container.innerHTML = `
        <div class="perf-overview">
            <div class="perf-stat">
                <span class="perf-value">${perf.avgLoadTime}ms</span>
                <span class="perf-label">Avg Load</span>
            </div>
        </div>
        <div class="perf-breakdown">
            ${entries
                .map(([type, data]) => {
                    const label = typeLabels[type] || type
                    return `
                        <div class="perf-row">
                            <span class="perf-type">${label}</span>
                            <span class="perf-avg">${data.avg}ms avg</span>
                            <span class="perf-count">(${data.count})</span>
                        </div>
                    `
                })
                .join("")}
        </div>
    `
}
