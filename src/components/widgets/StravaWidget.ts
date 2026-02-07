import { createWidgetFrame } from "./WidgetFrame"

interface ActivitySummary {
    name: string
    date: string
    value: string
    detail?: string
}

interface StravaApiResponse {
    ok: boolean
    data: {
        bestRun: ActivitySummary | null
        bestRide: ActivitySummary | null
        longestRide: ActivitySummary | null
    } | null
    error?: string
}

export class StravaWidget {
    private widget: HTMLElement

    constructor() {
        this.widget = createWidgetFrame("🏃 Strava", "strava-widget")

        const content = document.createElement("div")
        content.className = "widget-content strava"
        content.innerHTML = `
            <div class="strava-loading">Loading activities...</div>
        `

        this.widget.appendChild(content)
        void this.fetchStrava(content)
    }

    public getElement(): HTMLElement {
        return this.widget
    }

    private async fetchStrava(content: HTMLElement): Promise<void> {
        try {
            const response = await fetch("/api/strava")

            const contentType = response.headers.get("content-type")
            if (!contentType?.includes("application/json")) {
                content.innerHTML = `<div class="strava-empty">Strava unavailable</div>`
                return
            }

            if (!response.ok) {
                throw new Error(`API error: ${response.status}`)
            }

            // SAFETY: response shape controlled by our /api/strava endpoint
            const result = (await response.json()) as StravaApiResponse

            if (!result.ok || !result.data) {
                content.innerHTML = `<div class="strava-empty">No recent activities</div>`
                return
            }

            const { bestRun, bestRide, longestRide } = result.data

            content.innerHTML = `
                ${this.renderStat("🏃 Best Run (3mo)", bestRun)}
                ${this.renderStat("🚴 Best Ride (3mo)", bestRide)}
                ${this.renderStat("🚴 Longest Ride (3mo)", longestRide)}
            `
        } catch (error) {
            console.error("[Widgets] Strava error:", error)
            content.innerHTML = `<div class="strava-error">Could not load</div>`
        }
    }

    private renderStat(label: string, stat: ActivitySummary | null): string {
        if (!stat) {
            return `<div class="strava-stat empty"><span class="stat-label">${label}</span><span class="stat-value">—</span></div>`
        }
        return `
            <div class="strava-stat">
                <span class="stat-label">${label}</span>
                <span class="stat-name">${stat.name}</span>
                <span class="stat-value">${stat.value}</span>
                <span class="stat-detail">${stat.detail || ""}</span>
            </div>
        `
    }
}
