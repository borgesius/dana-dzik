function pick<T>(arr: T[]): T {
    return arr[Math.floor(Math.random() * arr.length)]
}

const YEAR_VARIATIONS = ["1997", "1997", "199?", "in the 90s"]

export class WeatherWidget {
    private el: HTMLElement
    private yearStr = pick(YEAR_VARIATIONS)

    constructor() {
        this.el = document.createElement("div")
        this.el.className = "toolbar-weather"
        this.el.innerHTML = "Loading..."
        this.setHistoricalWeather()
    }

    public getElement(): HTMLElement {
        return this.el
    }

    public updateIfLoading(loadingText: string): void {
        if (this.el.textContent?.includes("Loading")) {
            this.el.innerHTML = loadingText
        }
    }

    private setHistoricalWeather(): void {
        const today = new Date()
        const month = today.toLocaleString("en-US", { month: "short" })
        const day = today.getDate()

        this.el.innerHTML = `☀️ ${month} ${day}, ${this.yearStr}`

        // Always use San Francisco coordinates
        void this.fetchHistoricalWeather(37.7749, -122.4194)
    }

    private async fetchHistoricalWeather(
        lat: number,
        lon: number
    ): Promise<void> {
        const today = new Date()
        const month = today.toLocaleString("en-US", { month: "short" })
        const day = today.getDate()
        const historicalDate = `1997-${String(today.getMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`

        try {
            const url = `https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lon}&start_date=${historicalDate}&end_date=${historicalDate}&daily=temperature_2m_max,temperature_2m_min,precipitation_sum&temperature_unit=fahrenheit&timezone=auto`
            const response = await fetch(url)
            // SAFETY: response shape per Open-Meteo Archive API contract
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

            const tempDisplay = this.formatTemperature(maxTemp)
            this.el.innerHTML = `${tempDisplay} ${emoji} SF - ${month} ${day}, ${this.yearStr}`
        } catch {
            this.setFallbackWeather()
        }
    }

    private formatTemperature(temp: number): string {
        const formats: Array<() => string> = [
            (): string => `${temp}°F`,
            (): string => `${temp}°F (±5)`,
            (): string =>
                `${temp}°F (feels like ${temp + Math.floor(Math.random() * 20) - 10}°F)`,
            (): string => `${temp}°F`,
            (): string => `${temp}°`,
        ]
        return pick(formats)()
    }

    private setFallbackWeather(): void {
        const today = new Date()
        const month = today.toLocaleString("en-US", { month: "short" })
        const day = today.getDate()

        const fallbackTemps: Record<string, number> = {
            Jan: 52,
            Feb: 55,
            Mar: 58,
            Apr: 62,
            May: 65,
            Jun: 68,
            Jul: 68,
            Aug: 69,
            Sep: 72,
            Oct: 68,
            Nov: 58,
            Dec: 52,
        }

        const fallbackEmoji: Record<string, string> = {
            Jan: "🌧️",
            Feb: "🌤️",
            Mar: "☀️",
            Apr: "☀️",
            May: "☀️",
            Jun: "☀️",
            Jul: "🌫️",
            Aug: "🌫️",
            Sep: "☀️",
            Oct: "☀️",
            Nov: "🌧️",
            Dec: "🌧️",
        }

        const temp = fallbackTemps[month] || 65
        const emoji = fallbackEmoji[month] || "☀️"
        const tempDisplay = this.formatTemperature(temp)
        this.el.innerHTML = `${tempDisplay} ${emoji} SF - ${month} ${day}, ${this.yearStr}`
    }
}
