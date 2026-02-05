import { initStrava } from "../lib/strava"

interface ReportsResponse {
    ok: boolean
    data?: {
        lighthouse: {
            url: string | null
            workflowUrl: string
            status: string
            score: number | null
            updatedAt: string | null
        }
        playwright: {
            artifactUrl: string | null
            workflowUrl: string
            status: string
            updatedAt: string | null
        }
    }
}

export class Toolbars {
    private element: HTMLElement
    private weatherEl: HTMLElement | null = null
    private qaEl: HTMLElement | null = null

    constructor() {
        this.element = this.createElement()
        this.initDynamicData()
    }

    private createElement(): HTMLElement {
        const container = document.createElement("div")
        container.className = "toolbars-area"

        container.appendChild(this.createToolbar1())
        container.appendChild(this.createToolbar2())

        return container
    }

    private createToolbar1(): HTMLElement {
        const toolbar = document.createElement("div")
        toolbar.className = "toolbar"

        const askJeeves = this.createSearchBar("Ask Jeeves", "🔍")
        toolbar.appendChild(askJeeves)

        const weather = document.createElement("div")
        weather.className = "toolbar-weather"
        weather.innerHTML = "☀️ Loading..."
        this.weatherEl = weather
        toolbar.appendChild(weather)

        const qa = document.createElement("div")
        qa.className = "toolbar-qa"
        qa.innerHTML = "🔬 QA: Loading..."
        this.qaEl = qa
        toolbar.appendChild(qa)

        return toolbar
    }

    private createToolbar2(): HTMLElement {
        const toolbar = document.createElement("div")
        toolbar.className = "toolbar"

        const buttons = [
            { text: "FREE SMILEYS 😀", className: "green", href: "" },
            { text: "CURSOR MANIA ✨", className: "green", href: "" },
            { text: "FREE SCREENSAVERS", className: "", href: "" },
            { text: "💰 MAKE $$$ FAST", className: "green", href: "" },
            { text: "FREE RINGTONES", className: "", href: "" },
            {
                text: "🐙 GitHub",
                className: "",
                href: "https://github.com/borgesius",
            },
        ]

        buttons.forEach(({ text, className, href }) => {
            if (href) {
                const link = document.createElement("a")
                link.className = `toolbar-button ${className}`
                link.textContent = text
                link.href = href
                link.target = "_blank"
                toolbar.appendChild(link)
            } else {
                const btn = document.createElement("button")
                btn.className = `toolbar-button ${className}`
                btn.textContent = text
                toolbar.appendChild(btn)
            }
        })

        const yahoo = this.createSearchBar("Yahoo!", "Search")
        toolbar.appendChild(yahoo)

        return toolbar
    }

    private createSearchBar(
        placeholder: string,
        buttonText: string
    ): HTMLElement {
        const container = document.createElement("div")
        container.className = "toolbar-search"

        const input = document.createElement("input")
        input.type = "text"
        input.placeholder = placeholder
        container.appendChild(input)

        const btn = document.createElement("button")
        btn.textContent = buttonText
        container.appendChild(btn)

        return container
    }

    private initDynamicData(): void {
        this.setHistoricalWeather()
        void this.fetchQAReports()
        void initStrava()
    }

    private async fetchQAReports(): Promise<void> {
        if (!this.qaEl) return

        try {
            const controller = new AbortController()
            const timeoutId = setTimeout(() => controller.abort(), 3000)

            const response = await fetch("/api/reports", {
                signal: controller.signal,
            })
            clearTimeout(timeoutId)

            const result = (await response.json()) as ReportsResponse

            if (!result.ok || !result.data) {
                this.qaEl.innerHTML = "🔬 QA: N/A"
                return
            }

            const { lighthouse, playwright } = result.data

            const lhStatus = lighthouse.status === "success" ? "✅" : "❌"
            const pwStatus = playwright.status === "success" ? "✅" : "❌"

            const lhLink = lighthouse.url || lighthouse.workflowUrl
            const pwLink = playwright.artifactUrl || playwright.workflowUrl

            this.qaEl.innerHTML = `
                <a href="${lhLink}" target="_blank" class="qa-badge qa-${lighthouse.status}" title="Lighthouse Report">
                    ${lhStatus} LH
                </a>
                <a href="${pwLink}" target="_blank" class="qa-badge qa-${playwright.status}" title="Playwright Report">
                    ${pwStatus} E2E
                </a>
            `
        } catch {
            this.qaEl.innerHTML = "🔬 QA: N/A"
        }
    }

    private setHistoricalWeather(): void {
        if (!this.weatherEl) return

        const today = new Date()
        const month = today.toLocaleString("en-US", { month: "short" })
        const day = today.getDate()

        this.weatherEl.innerHTML = `☀️ ${month} ${day}, 1997`

        if (!navigator.geolocation) {
            this.setFallbackWeather()
            return
        }

        navigator.geolocation.getCurrentPosition(
            (position) => {
                void this.fetchHistoricalWeather(
                    position.coords.latitude,
                    position.coords.longitude
                )
            },
            () => {
                this.setFallbackWeather()
            },
            { timeout: 5000 }
        )
    }

    private async fetchHistoricalWeather(
        lat: number,
        lon: number
    ): Promise<void> {
        if (!this.weatherEl) return

        const today = new Date()
        const month = today.toLocaleString("en-US", { month: "short" })
        const day = today.getDate()
        const historicalDate = `1997-${String(today.getMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`

        try {
            const url = `https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lon}&start_date=${historicalDate}&end_date=${historicalDate}&daily=temperature_2m_max,temperature_2m_min,precipitation_sum&temperature_unit=fahrenheit&timezone=auto`
            const response = await fetch(url)
            const data = (await response.json()) as {
                daily: {
                    temperature_2m_max: number[]
                    temperature_2m_min: number[]
                    precipitation_sum: number[]
                }
            }

            const maxTemp = Math.round(data.daily.temperature_2m_max[0])
            const precip = data.daily.precipitation_sum[0]

            let emoji = "☀️"
            if (precip > 5) emoji = "🌧️"
            else if (precip > 0) emoji = "🌤️"
            else if (maxTemp < 40) emoji = "❄️"

            this.weatherEl.innerHTML = `${maxTemp}°F ${emoji} - ${month} ${day}, 1997`
        } catch {
            this.setFallbackWeather()
        }
    }

    private setFallbackWeather(): void {
        if (!this.weatherEl) return

        const today = new Date()
        const month = today.toLocaleString("en-US", { month: "short" })
        const day = today.getDate()

        const fallback: Record<string, string> = {
            Jan: "52°F 🌧️",
            Feb: "55°F 🌤️",
            Mar: "58°F ☀️",
            Apr: "62°F ☀️",
            May: "65°F ☀️",
            Jun: "68°F ☀️",
            Jul: "68°F 🌫️",
            Aug: "69°F 🌫️",
            Sep: "72°F ☀️",
            Oct: "68°F ☀️",
            Nov: "58°F 🌧️",
            Dec: "52°F 🌧️",
        }

        const temp = fallback[month] || "65°F ☀️"
        this.weatherEl.innerHTML = `${temp} SF - ${month} ${day}, 1997`
    }

    public getElement(): HTMLElement {
        return this.element
    }
}
