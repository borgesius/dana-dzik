import {
    type BusinessGame,
    getBusinessGame,
    type Venture,
} from "../lib/businessGame"
import { initStrava } from "../lib/strava"
import { BusinessPanel } from "./BusinessPanel"

function pick<T>(arr: T[]): T {
    return arr[Math.floor(Math.random() * arr.length)]
}

const QA_FALLBACKS = ["🔬 QA: ¯\\_(ツ)_/¯", "🔬 Tests: ?", "🔬 QA: N/A"]

const YEAR_VARIATIONS = ["1997", "1997", "199?", "in the 90s"]

interface LighthouseScores {
    performance: number | null
    accessibility: number | null
    bestPractices: number | null
    seo: number | null
}

interface ReportsResponse {
    ok: boolean
    data?: {
        lighthouse: {
            url: string | null
            workflowUrl: string
            status: string
            score: number | null
            scores: LighthouseScores
            updatedAt: string | null
        }
        playwright: {
            artifactUrl: string | null
            workflowUrl: string
            status: string
            updatedAt: string | null
        }
        coverage: {
            available: boolean
            metrics: {
                statements: number | null
                branches: number | null
                functions: number | null
                lines: number | null
            }
            workflowUrl: string
            updatedAt: string | null
        }
    }
}

export class Toolbars {
    private element: HTMLElement
    private weatherEl: HTMLElement | null = null
    private qaEl: HTMLElement | null = null
    private moneyEl: HTMLElement | null = null
    private ventureButtonsEl: HTMLElement | null = null
    private game: BusinessGame
    private businessPanel: BusinessPanel

    constructor() {
        this.game = getBusinessGame()
        this.businessPanel = new BusinessPanel()
        this.element = this.createElement()
        this.initDynamicData()
        this.setupGameListeners()
    }

    private createElement(): HTMLElement {
        const container = document.createElement("div")
        container.className = "toolbars-area"

        container.appendChild(this.createToolbar1())
        container.appendChild(this.createToolbar2())
        container.appendChild(this.businessPanel.getElement())

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
        toolbar.className = "toolbar toolbar-game"

        const moneyCounter = document.createElement("div")
        moneyCounter.className = "money-counter"
        moneyCounter.innerHTML = '<span class="money-value">$0.00</span>'
        this.moneyEl = moneyCounter.querySelector(".money-value")
        toolbar.appendChild(moneyCounter)

        const ventureButtons = document.createElement("div")
        ventureButtons.className = "venture-buttons"
        this.ventureButtonsEl = ventureButtons
        toolbar.appendChild(ventureButtons)

        this.renderVentureButtons()

        const hqToggle = document.createElement("button")
        hqToggle.className = "toolbar-button hq-toggle"
        hqToggle.innerHTML = "📊 HQ ▼"
        hqToggle.addEventListener("click", () => {
            this.businessPanel.toggle()
            hqToggle.innerHTML = this.businessPanel.isOpen()
                ? "📊 HQ ▲"
                : "📊 HQ ▼"
        })
        toolbar.appendChild(hqToggle)

        const github = document.createElement("a")
        github.className = "toolbar-button"
        github.textContent = "🐙 GitHub"
        github.href = "https://github.com/borgesius"
        github.target = "_blank"
        toolbar.appendChild(github)

        return toolbar
    }

    private setupGameListeners(): void {
        this.game.on("moneyChanged", () => this.updateMoneyDisplay())
        this.game.on("tierUnlocked", () => this.renderVentureButtons())
        this.game.on("cooldownUpdate", () => this.updateCooldowns())
        this.game.on("ventureResult", (data) => {
            const result = data as {
                ventureId: string
                success: boolean
                amount: number
            }
            this.animateVentureResult(
                result.ventureId,
                result.success,
                result.amount
            )
        })
    }

    private updateMoneyDisplay(): void {
        if (!this.moneyEl) return
        const money = this.game.getMoney()
        this.moneyEl.textContent = `$${money.toFixed(2)}`
        this.moneyEl.classList.add("money-flash")
        setTimeout(() => this.moneyEl?.classList.remove("money-flash"), 200)
    }

    private renderVentureButtons(): void {
        if (!this.ventureButtonsEl) return

        this.ventureButtonsEl.innerHTML = ""

        const unlockedVentures = this.game.getUnlockedVentures()
        const lockedVentures = this.game.getLockedVentures()

        unlockedVentures.forEach((venture) => {
            const btn = this.createVentureButton(venture)
            this.ventureButtonsEl?.appendChild(btn)
        })

        const shownLockedTiers = new Set<number>()
        lockedVentures.forEach((venture) => {
            if (shownLockedTiers.has(venture.tier)) return
            shownLockedTiers.add(venture.tier)

            const threshold = this.getTierThreshold(venture.tier)
            const lockedBtn = document.createElement("button")
            lockedBtn.className = "toolbar-button venture-btn locked"
            lockedBtn.innerHTML = `🔒 $${threshold}`
            lockedBtn.disabled = true
            lockedBtn.title = `Unlock at $${threshold} lifetime earnings`
            this.ventureButtonsEl?.appendChild(lockedBtn)
        })
    }

    private getTierThreshold(tier: number): number {
        const thresholds: Record<number, number> = {
            1: 0,
            2: 1,
            3: 10,
            4: 50,
            5: 200,
            6: 1000,
        }
        return thresholds[tier] ?? 0
    }

    private createVentureButton(venture: Venture): HTMLButtonElement {
        const btn = document.createElement("button")
        btn.className = `toolbar-button venture-btn ${venture.cost === 0 ? "green" : ""}`
        btn.dataset.ventureId = venture.id

        const displayName =
            venture.id === "make-money"
                ? `${venture.emoji} MAKE $$$ FAST`
                : `${venture.emoji} ${venture.name}`

        btn.innerHTML = `<span class="venture-text">${displayName}</span>`

        if (this.game.canShowOdds() && venture.risk > 0) {
            const successRate = Math.round(
                (1 - this.game.getEffectiveRisk(venture)) * 100
            )
            btn.title = `${venture.tagline}\nCost: $${venture.cost.toFixed(2)} | Win: $${venture.payout.toFixed(2)} | ${successRate}% success`
        } else if (venture.cost > 0) {
            btn.title = `${venture.tagline}\nCost: $${venture.cost.toFixed(2)} | Win: $${venture.payout.toFixed(2)}`
        } else {
            btn.title = venture.tagline
        }

        btn.addEventListener("click", () => {
            const result = this.game.executeVenture(venture.id)
            if (result) {
                this.playSound(result.success ? "notify" : "error")
            } else {
                this.playSound("error")
            }
        })

        return btn
    }

    private updateCooldowns(): void {
        if (!this.ventureButtonsEl) return

        const buttons = this.ventureButtonsEl.querySelectorAll(
            ".venture-btn[data-venture-id]"
        )
        buttons.forEach((btn) => {
            const ventureId = (btn as HTMLElement).dataset.ventureId
            if (!ventureId) return

            const remaining = this.game.getCooldownRemaining(ventureId)
            const isOnCooldown = remaining > 0
            const canAfford = this.game.canAfford(ventureId)

            btn.classList.toggle("on-cooldown", isOnCooldown)
            btn.classList.toggle("cannot-afford", !canAfford && !isOnCooldown)
            ;(btn as HTMLButtonElement).disabled = isOnCooldown || !canAfford

            const existingOverlay = btn.querySelector(".cooldown-overlay")
            if (isOnCooldown) {
                const seconds = Math.ceil(remaining / 1000)
                if (existingOverlay) {
                    existingOverlay.textContent = `${seconds}s`
                } else {
                    const overlay = document.createElement("span")
                    overlay.className = "cooldown-overlay"
                    overlay.textContent = `${seconds}s`
                    btn.appendChild(overlay)
                }
            } else if (existingOverlay) {
                existingOverlay.remove()
            }
        })
    }

    private animateVentureResult(
        ventureId: string,
        success: boolean,
        amount: number
    ): void {
        if (!this.ventureButtonsEl) return

        const btn = this.ventureButtonsEl.querySelector(
            `[data-venture-id="${ventureId}"]`
        )
        if (!btn) return

        const animClass = success ? "venture-success" : "venture-failure"
        btn.classList.add(animClass)
        setTimeout(() => btn.classList.remove(animClass), 500)

        const floater = document.createElement("span")
        floater.className = `amount-floater ${success ? "positive" : "negative"}`
        floater.textContent = success
            ? `+$${amount.toFixed(2)}`
            : `-$${Math.abs(amount).toFixed(2)}`
        btn.appendChild(floater)
        setTimeout(() => floater.remove(), 1000)

        if (success && this.moneyEl) {
            this.moneyEl.classList.add("money-win")
            setTimeout(() => this.moneyEl?.classList.remove("money-win"), 500)
        } else if (!success && this.moneyEl) {
            this.moneyEl.classList.add("money-lose")
            setTimeout(() => this.moneyEl?.classList.remove("money-lose"), 500)
        }
    }

    private playSound(type: string): void {
        const audioManager = (
            window as unknown as {
                audioManager?: { playSound: (t: string) => void }
            }
        ).audioManager
        if (audioManager) {
            audioManager.playSound(type)
        }
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

    private scoreEmoji(score: number): string {
        if (score >= 90) return "🟢"
        if (score >= 50) return "🟠"
        return "🔴"
    }

    private formatLighthouseLabel(lighthouse: {
        status: string
        scores: LighthouseScores
    }): string {
        const perf = lighthouse.scores.performance
        if (perf !== null) return `LH ${perf}`
        return "LH"
    }

    private buildLighthouseTooltip(lighthouse: {
        status: string
        scores: LighthouseScores
        updatedAt: string | null
    }): string {
        const s = lighthouse.scores
        const rows: string[] = []

        if (s.performance !== null) {
            rows.push(
                `<div class="qa-tooltip-row"><span class="qa-tooltip-label">${this.scoreEmoji(s.performance)} Performance</span><span class="qa-tooltip-value">${s.performance}</span></div>`
            )
        }
        if (s.accessibility !== null) {
            rows.push(
                `<div class="qa-tooltip-row"><span class="qa-tooltip-label">${this.scoreEmoji(s.accessibility)} Accessibility</span><span class="qa-tooltip-value">${s.accessibility}</span></div>`
            )
        }
        if (s.bestPractices !== null) {
            rows.push(
                `<div class="qa-tooltip-row"><span class="qa-tooltip-label">${this.scoreEmoji(s.bestPractices)} Best Practices</span><span class="qa-tooltip-value">${s.bestPractices}</span></div>`
            )
        }
        if (s.seo !== null) {
            rows.push(
                `<div class="qa-tooltip-row"><span class="qa-tooltip-label">${this.scoreEmoji(s.seo)} SEO</span><span class="qa-tooltip-value">${s.seo}</span></div>`
            )
        }

        if (rows.length === 0) {
            rows.push(
                '<div class="qa-tooltip-row"><span class="qa-tooltip-label">No scores available</span></div>'
            )
        }

        const statusText =
            lighthouse.status === "success" ? "Passing" : "Failing"
        const dateStr = lighthouse.updatedAt
            ? new Date(lighthouse.updatedAt).toLocaleDateString()
            : ""

        return `
            <div class="qa-tooltip">
                <div class="qa-tooltip-title">Lighthouse Report</div>
                ${rows.join("")}
                <div class="qa-tooltip-status">${statusText}${dateStr ? ` · ${dateStr}` : ""}</div>
                <div class="qa-tooltip-click">Click for full report</div>
            </div>
        `
    }

    private buildPlaywrightTooltip(playwright: {
        status: string
        updatedAt: string | null
    }): string {
        const passed = playwright.status === "success"
        const statusText = passed ? "All tests passing" : "Tests failing"
        const statusEmoji = passed ? "✅" : "❌"
        const dateStr = playwright.updatedAt
            ? new Date(playwright.updatedAt).toLocaleDateString()
            : ""

        return `
            <div class="qa-tooltip">
                <div class="qa-tooltip-title">E2E Tests (Playwright)</div>
                <div class="qa-tooltip-row">
                    <span class="qa-tooltip-label">Status</span>
                    <span class="qa-tooltip-value">${statusEmoji} ${statusText}</span>
                </div>
                <div class="qa-tooltip-status">Chromium · Latest on main${dateStr ? ` · ${dateStr}` : ""}</div>
                <div class="qa-tooltip-click">Click for full report</div>
            </div>
        `
    }

    private buildCoverageTooltip(
        coverage: NonNullable<ReportsResponse["data"]>["coverage"]
    ): string {
        const m = coverage.metrics
        const rows: string[] = []

        if (m.statements !== null) {
            rows.push(
                `<div class="qa-tooltip-row"><span class="qa-tooltip-label">${this.scoreEmoji(m.statements)} Statements</span><span class="qa-tooltip-value">${m.statements}%</span></div>`
            )
        }
        if (m.branches !== null) {
            rows.push(
                `<div class="qa-tooltip-row"><span class="qa-tooltip-label">${this.scoreEmoji(m.branches)} Branches</span><span class="qa-tooltip-value">${m.branches}%</span></div>`
            )
        }
        if (m.functions !== null) {
            rows.push(
                `<div class="qa-tooltip-row"><span class="qa-tooltip-label">${this.scoreEmoji(m.functions)} Functions</span><span class="qa-tooltip-value">${m.functions}%</span></div>`
            )
        }
        if (m.lines !== null) {
            rows.push(
                `<div class="qa-tooltip-row"><span class="qa-tooltip-label">${this.scoreEmoji(m.lines)} Lines</span><span class="qa-tooltip-value">${m.lines}%</span></div>`
            )
        }

        if (rows.length === 0) {
            rows.push(
                '<div class="qa-tooltip-row"><span class="qa-tooltip-label">No metrics available</span></div>'
            )
        }

        const dateStr = coverage.updatedAt
            ? new Date(coverage.updatedAt).toLocaleDateString()
            : ""

        return `
            <div class="qa-tooltip">
                <div class="qa-tooltip-title">Test Coverage</div>
                ${rows.join("")}
                <div class="qa-tooltip-status">v8 provider${dateStr ? ` · ${dateStr}` : ""}</div>
                <div class="qa-tooltip-click">Click for CI run details</div>
            </div>
        `
    }

    private wrapBadge(badgeHtml: string, tooltipHtml: string): string {
        return `<span class="qa-badge-wrap">${badgeHtml}${tooltipHtml}</span>`
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
                this.qaEl.innerHTML = pick(QA_FALLBACKS)
                return
            }

            const { lighthouse, playwright, coverage } = result.data

            const lhStatus = lighthouse.status === "success" ? "✅" : "❌"
            const pwStatus = playwright.status === "success" ? "✅" : "❌"

            const lhLink = lighthouse.url || lighthouse.workflowUrl
            const pwLink = playwright.artifactUrl || playwright.workflowUrl

            const lhLabel = this.formatLighthouseLabel(lighthouse)

            const lhBadge = `<a href="${lhLink}" target="_blank" class="qa-badge qa-${lighthouse.status}">${lhStatus} ${lhLabel}</a>`
            const lhTooltip = this.buildLighthouseTooltip(lighthouse)

            const pwBadge = `<a href="${pwLink}" target="_blank" class="qa-badge qa-${playwright.status}">${pwStatus} E2E</a>`
            const pwTooltip = this.buildPlaywrightTooltip(playwright)

            let badges =
                this.wrapBadge(lhBadge, lhTooltip) +
                this.wrapBadge(pwBadge, pwTooltip)

            if (coverage?.available) {
                const covLabel =
                    coverage.metrics.lines !== null
                        ? `📊 ${coverage.metrics.lines}%`
                        : "📊 COV"
                const covBadge = `<a href="${coverage.workflowUrl}" target="_blank" class="qa-badge qa-success">${covLabel}</a>`
                const covTooltip = this.buildCoverageTooltip(coverage)
                badges += this.wrapBadge(covBadge, covTooltip)
            }

            this.qaEl.innerHTML = badges
        } catch {
            this.qaEl.innerHTML = pick(QA_FALLBACKS)
        }
    }

    private yearStr = pick(YEAR_VARIATIONS)

    private setHistoricalWeather(): void {
        if (!this.weatherEl) return

        const today = new Date()
        const month = today.toLocaleString("en-US", { month: "short" })
        const day = today.getDate()

        this.weatherEl.innerHTML = `☀️ ${month} ${day}, ${this.yearStr}`

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

            const tempDisplay = this.formatTemperature(maxTemp)
            this.weatherEl.innerHTML = `${tempDisplay} ${emoji} - ${month} ${day}, ${this.yearStr}`
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
        if (!this.weatherEl) return

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
        this.weatherEl.innerHTML = `${tempDisplay} ${emoji} SF - ${month} ${day}, ${this.yearStr}`
    }

    public getElement(): HTMLElement {
        return this.element
    }
}
