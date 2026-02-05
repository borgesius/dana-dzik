import { SOCIAL } from "../config"
import { initStrava } from "../lib/strava"

/**
 * Creates the fake browser toolbars with search bars, weather, stocks, and links.
 */
export class Toolbars {
    private element: HTMLElement

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
        weather.id = "toolbar-weather"
        weather.innerHTML = "☀️ Loading..."
        toolbar.appendChild(weather)

        const ticker = document.createElement("div")
        ticker.className = "toolbar-ticker"
        const tickerText = document.createElement("span")
        tickerText.id = "toolbar-ticker"
        tickerText.textContent = "Loading stocks..."
        ticker.appendChild(tickerText)
        toolbar.appendChild(ticker)

        const strava = document.createElement("a")
        strava.className = "toolbar-button"
        strava.id = "strava-activity"
        strava.textContent = "🏃 Strava"
        strava.href = SOCIAL.strava.url
        strava.target = "_blank"
        toolbar.appendChild(strava)

        return toolbar
    }

    private createToolbar2(): HTMLElement {
        const toolbar = document.createElement("div")
        toolbar.className = "toolbar"

        const buttons = [
            { text: "FREE SMILEYS 😀", className: "green" },
            { text: "CURSOR MANIA ✨", className: "green" },
            { text: "FREE SCREENSAVERS", className: "" },
            { text: "💰 MAKE $$$ FAST", className: "green" },
            { text: "FREE RINGTONES", className: "" },
        ]

        buttons.forEach(({ text, className }) => {
            const btn = document.createElement("button")
            btn.className = `toolbar-button ${className}`
            btn.textContent = text
            toolbar.appendChild(btn)
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
        this.setHistoricalStocks()
        void initStrava()
    }

    private setHistoricalWeather(): void {
        const weather = document.getElementById("toolbar-weather")
        if (!weather) return

        const today = new Date()
        const month = today.toLocaleString("en-US", { month: "short" })
        const day = today.getDate()

        const historicalWeather: Record<string, string> = {
            Jan: "32°F ❄️",
            Feb: "35°F 🌨️",
            Mar: "45°F 🌧️",
            Apr: "55°F 🌤️",
            May: "65°F ☀️",
            Jun: "75°F ☀️",
            Jul: "82°F ☀️",
            Aug: "80°F ☀️",
            Sep: "70°F 🌤️",
            Oct: "58°F 🍂",
            Nov: "45°F 🌧️",
            Dec: "36°F ❄️",
        }

        const temp = historicalWeather[month] || "72°F ☀️"
        weather.innerHTML = `${temp} SF - ${month} ${day}, 1997`
    }

    private setHistoricalStocks(): void {
        const ticker = document.getElementById("toolbar-ticker")
        if (!ticker) return

        const stocks1997 = [
            "AAPL: $0.47 ▼",
            "MSFT: $20.12 ▲",
            "AMZN: $1.73 ▲",
            "INTC: $18.50 ▲",
            "CSCO: $8.25 ▲",
        ]

        ticker.textContent = stocks1997.join(" | ")
    }

    public getElement(): HTMLElement {
        return this.element
    }
}
