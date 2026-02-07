import {
    type BusinessGame,
    getBusinessGame,
    type Venture,
} from "../lib/businessGame"
import { getLocaleManager, type LocaleId } from "../lib/localeManager"
import { initStrava } from "../lib/strava"
import {
    type ColorScheme,
    getThemeManager,
    type ResolvedColorScheme,
} from "../lib/themeManager"
import { BusinessPanel } from "./BusinessPanel"

function pick<T>(arr: T[]): T {
    return arr[Math.floor(Math.random() * arr.length)]
}

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
    private searchInputEl: HTMLInputElement | null = null
    private game: BusinessGame
    private businessPanel: BusinessPanel

    constructor() {
        this.game = getBusinessGame()
        this.businessPanel = new BusinessPanel()
        this.element = this.createElement()
        this.initDynamicData()
        this.setupGameListeners()

        getThemeManager().on("themeChanged", () => this.applyThemeLabels())
        getLocaleManager().on("localeChanged", () => this.applyTranslations())
    }

    private applyThemeLabels(): void {
        const labels = getThemeManager().getLabels()
        if (this.searchInputEl) {
            this.searchInputEl.placeholder = labels.searchPlaceholder
        }
    }

    private applyTranslations(): void {
        const lm = getLocaleManager()
        const labels = getThemeManager().getLabels()
        if (this.searchInputEl) {
            this.searchInputEl.placeholder = labels.searchPlaceholder
        }
        if (this.weatherEl && this.weatherEl.textContent?.includes("Loading")) {
            this.weatherEl.innerHTML = lm.t("toolbar.weatherLoading")
        }
        if (this.qaEl && this.qaEl.textContent?.includes("Loading")) {
            this.qaEl.innerHTML = lm.t("toolbar.qaLoading")
        }
        this.renderVentureButtons()
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

        const lm = getLocaleManager()
        const labels = getThemeManager().getLabels()
        const askJeeves = this.createSearchBar(labels.searchPlaceholder, "🔍")
        toolbar.appendChild(askJeeves)

        const weather = document.createElement("div")
        weather.className = "toolbar-weather"
        weather.innerHTML = lm.t("toolbar.weatherLoading")
        this.weatherEl = weather
        toolbar.appendChild(weather)

        const qa = document.createElement("div")
        qa.className = "toolbar-qa"
        qa.innerHTML = lm.t("toolbar.qaLoading")
        this.qaEl = qa
        toolbar.appendChild(qa)

        const spacer = document.createElement("div")
        spacer.style.flex = "1"
        toolbar.appendChild(spacer)

        toolbar.appendChild(this.createLanguageToggle())
        toolbar.appendChild(this.createColorSchemeToggle())

        return toolbar
    }

    private createLanguageToggle(): HTMLElement {
        const LOCALE_ORDER: LocaleId[] = [
            "en",
            "es",
            "fr",
            "de",
            "it",
            "pt",
            "ja",
            "zh",
        ]

        const lm = getLocaleManager()
        const container = document.createElement("div")
        container.className = "language-toggle-container"
        container.style.position = "relative"

        const btn = document.createElement("button")
        btn.className = "toolbar-button language-toggle"
        btn.title = `${lm.t("toolbar.language", { language: lm.getLocaleName() })}`

        const updateBtn = (): void => {
            const locale = lm.getCurrentLocale()
            btn.textContent = lm.getLocaleFlag(locale)
            btn.title = `${lm.t("toolbar.language", { language: lm.getLocaleName() })}`
        }

        updateBtn()

        const dropdown = document.createElement("div")
        dropdown.className = "language-dropdown"
        dropdown.style.display = "none"

        LOCALE_ORDER.forEach((locale) => {
            const option = document.createElement("button")
            option.className = "language-option"
            option.textContent = `${lm.getLocaleFlag(locale)} ${lm.getLocaleName(locale)}`
            option.dataset.locale = locale

            if (locale === lm.getCurrentLocale()) {
                option.classList.add("active")
            }

            option.addEventListener("click", (e) => {
                e.stopPropagation()
                void lm.setLocale(locale)
                updateBtn()
                dropdown.style.display = "none"

                dropdown.querySelectorAll(".language-option").forEach((opt) => {
                    opt.classList.remove("active")
                })
                option.classList.add("active")
            })

            dropdown.appendChild(option)
        })

        btn.addEventListener("click", (e) => {
            e.stopPropagation()
            const isVisible = dropdown.style.display === "block"
            dropdown.style.display = isVisible ? "none" : "block"
        })

        document.addEventListener("click", () => {
            dropdown.style.display = "none"
        })

        lm.on("localeChanged", () => {
            updateBtn()
            dropdown.querySelectorAll(".language-option").forEach((opt) => {
                const optLocale = opt.getAttribute("data-locale") as LocaleId
                if (optLocale === lm.getCurrentLocale()) {
                    opt.classList.add("active")
                } else {
                    opt.classList.remove("active")
                }
            })
        })

        container.appendChild(btn)
        container.appendChild(dropdown)

        return container
    }

    private createColorSchemeToggle(): HTMLElement {
        const SCHEME_ICONS: Record<ColorScheme, string> = {
            light: "\u2600\uFE0F",
            dark: "\uD83C\uDF19",
            system: "\uD83D\uDCBB",
        }

        const SCHEME_ORDER: ColorScheme[] = ["light", "dark", "system"]

        const tm = getThemeManager()
        const lm = getLocaleManager()
        const btn = document.createElement("button")
        btn.className = "toolbar-button color-scheme-toggle"
        btn.title = lm.t("toolbar.colorScheme", { scheme: tm.getColorScheme() })

        const updateBtn = (): void => {
            const scheme = tm.getColorScheme()
            btn.textContent = SCHEME_ICONS[scheme]
            btn.title = lm.t("toolbar.colorScheme", { scheme })
        }

        updateBtn()

        btn.addEventListener("click", () => {
            const current = tm.getColorScheme()
            const idx = SCHEME_ORDER.indexOf(current)
            const next = SCHEME_ORDER[(idx + 1) % SCHEME_ORDER.length]
            tm.setColorScheme(next)
            updateBtn()
        })

        tm.on(
            "colorSchemeChanged",
            (_data: { theme: string; colorScheme: ResolvedColorScheme }) => {
                updateBtn()
            }
        )

        lm.on("localeChanged", () => {
            updateBtn()
        })

        return btn
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
        hqToggle.innerHTML = getLocaleManager().t("toolbar.hqClosed")
        hqToggle.addEventListener("click", () => {
            this.businessPanel.toggle()
            hqToggle.innerHTML = this.businessPanel.isOpen()
                ? getLocaleManager().t("toolbar.hqOpen")
                : getLocaleManager().t("toolbar.hqClosed")
        })
        toolbar.appendChild(hqToggle)

        const github = document.createElement("a")
        github.className = "toolbar-button"
        github.textContent = getLocaleManager().t("toolbar.github")
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
            lockedBtn.innerHTML = getLocaleManager().t("toolbar.locked", {
                threshold,
            })
            lockedBtn.disabled = true
            lockedBtn.title = getLocaleManager().t("toolbar.unlockAt", {
                threshold,
            })
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
        const lm = getLocaleManager()
        const btn = document.createElement("button")
        btn.className = `toolbar-button venture-btn ${venture.cost === 0 ? "green" : ""}`
        btn.dataset.ventureId = venture.id

        const displayName =
            venture.id === "make-money"
                ? `${venture.emoji} ${lm.t("toolbar.makeMoney")}`
                : `${venture.emoji} ${venture.name}`

        btn.innerHTML = `<span class="venture-text">${displayName}</span>`

        if (this.game.canShowOdds() && venture.risk > 0) {
            const successRate = Math.round(
                (1 - this.game.getEffectiveRisk(venture)) * 100
            )
            btn.title = lm.t("toolbar.tooltipWithOdds", {
                tagline: venture.tagline,
                cost: venture.cost.toFixed(2),
                payout: venture.payout.toFixed(2),
                successRate,
            })
        } else if (venture.cost > 0) {
            btn.title = lm.t("toolbar.tooltipWithoutOdds", {
                tagline: venture.tagline,
                cost: venture.cost.toFixed(2),
                payout: venture.payout.toFixed(2),
            })
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
        this.searchInputEl = input
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
        const lm = getLocaleManager()
        const s = lighthouse.scores
        const rows: string[] = []

        if (s.performance !== null) {
            rows.push(
                `<div class="qa-tooltip-row"><span class="qa-tooltip-label">${this.scoreEmoji(s.performance)} ${lm.t("qa.performance")}</span><span class="qa-tooltip-value">${s.performance}</span></div>`
            )
        }
        if (s.accessibility !== null) {
            rows.push(
                `<div class="qa-tooltip-row"><span class="qa-tooltip-label">${this.scoreEmoji(s.accessibility)} ${lm.t("qa.accessibility")}</span><span class="qa-tooltip-value">${s.accessibility}</span></div>`
            )
        }
        if (s.bestPractices !== null) {
            rows.push(
                `<div class="qa-tooltip-row"><span class="qa-tooltip-label">${this.scoreEmoji(s.bestPractices)} ${lm.t("qa.bestPractices")}</span><span class="qa-tooltip-value">${s.bestPractices}</span></div>`
            )
        }
        if (s.seo !== null) {
            rows.push(
                `<div class="qa-tooltip-row"><span class="qa-tooltip-label">${this.scoreEmoji(s.seo)} ${lm.t("qa.seo")}</span><span class="qa-tooltip-value">${s.seo}</span></div>`
            )
        }

        if (rows.length === 0) {
            rows.push(
                `<div class="qa-tooltip-row"><span class="qa-tooltip-label">${lm.t("qa.noScores")}</span></div>`
            )
        }

        const statusText =
            lighthouse.status === "success"
                ? lm.t("qa.passing")
                : lm.t("qa.failing")
        const dateStr = lighthouse.updatedAt
            ? new Date(lighthouse.updatedAt).toLocaleDateString()
            : ""

        return `
            <div class="qa-tooltip">
                <div class="qa-tooltip-title">${lm.t("qa.lighthouseReport")}</div>
                ${rows.join("")}
                <div class="qa-tooltip-status">${statusText}${dateStr ? ` · ${dateStr}` : ""}</div>
                <div class="qa-tooltip-click">${lm.t("qa.clickFullReport")}</div>
            </div>
        `
    }

    private buildPlaywrightTooltip(playwright: {
        status: string
        updatedAt: string | null
    }): string {
        const lm = getLocaleManager()
        const passed = playwright.status === "success"
        const statusText = passed
            ? lm.t("qa.allTestsPassing")
            : lm.t("qa.testsFailing")
        const statusEmoji = passed ? "✅" : "❌"
        const dateStr = playwright.updatedAt
            ? new Date(playwright.updatedAt).toLocaleDateString()
            : ""

        return `
            <div class="qa-tooltip">
                <div class="qa-tooltip-title">${lm.t("qa.e2eTests")}</div>
                <div class="qa-tooltip-row">
                    <span class="qa-tooltip-label">${lm.t("qa.status")}</span>
                    <span class="qa-tooltip-value">${statusEmoji} ${statusText}</span>
                </div>
                <div class="qa-tooltip-status">${lm.t("qa.chromiumLatest")}${dateStr ? ` · ${dateStr}` : ""}</div>
                <div class="qa-tooltip-click">${lm.t("qa.clickFullReport")}</div>
            </div>
        `
    }

    private buildCoverageTooltip(
        coverage: NonNullable<ReportsResponse["data"]>["coverage"]
    ): string {
        const lm = getLocaleManager()
        const m = coverage.metrics
        const rows: string[] = []

        if (m.statements !== null) {
            rows.push(
                `<div class="qa-tooltip-row"><span class="qa-tooltip-label">${this.scoreEmoji(m.statements)} ${lm.t("qa.statements")}</span><span class="qa-tooltip-value">${m.statements}%</span></div>`
            )
        }
        if (m.branches !== null) {
            rows.push(
                `<div class="qa-tooltip-row"><span class="qa-tooltip-label">${this.scoreEmoji(m.branches)} ${lm.t("qa.branches")}</span><span class="qa-tooltip-value">${m.branches}%</span></div>`
            )
        }
        if (m.functions !== null) {
            rows.push(
                `<div class="qa-tooltip-row"><span class="qa-tooltip-label">${this.scoreEmoji(m.functions)} ${lm.t("qa.functions")}</span><span class="qa-tooltip-value">${m.functions}%</span></div>`
            )
        }
        if (m.lines !== null) {
            rows.push(
                `<div class="qa-tooltip-row"><span class="qa-tooltip-label">${this.scoreEmoji(m.lines)} ${lm.t("qa.lines")}</span><span class="qa-tooltip-value">${m.lines}%</span></div>`
            )
        }

        if (rows.length === 0) {
            rows.push(
                `<div class="qa-tooltip-row"><span class="qa-tooltip-label">${lm.t("qa.noMetrics")}</span></div>`
            )
        }

        const dateStr = coverage.updatedAt
            ? new Date(coverage.updatedAt).toLocaleDateString()
            : ""

        return `
            <div class="qa-tooltip">
                <div class="qa-tooltip-title">${lm.t("qa.testCoverage")}</div>
                ${rows.join("")}
                <div class="qa-tooltip-status">${lm.t("qa.v8Provider")}${dateStr ? ` · ${dateStr}` : ""}</div>
                <div class="qa-tooltip-click">${lm.t("qa.clickCIDetails")}</div>
            </div>
        `
    }

    private wrapBadge(badgeHtml: string, tooltipHtml: string): string {
        return `<span class="qa-badge-wrap">${badgeHtml}${tooltipHtml}</span>`
    }

    private async fetchQAReports(): Promise<void> {
        if (!this.qaEl) return

        const lm = getLocaleManager()

        try {
            const controller = new AbortController()
            const timeoutId = setTimeout(() => controller.abort(), 3000)

            const response = await fetch("/api/reports", {
                signal: controller.signal,
            })
            clearTimeout(timeoutId)

            const result = (await response.json()) as ReportsResponse

            if (!result.ok || !result.data) {
                this.qaEl.innerHTML = pick([
                    lm.t("toolbar.qaFallback1"),
                    lm.t("toolbar.qaFallback2"),
                    lm.t("toolbar.qaFallback3"),
                ])
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
            this.qaEl.innerHTML = pick([
                getLocaleManager().t("toolbar.qaFallback1"),
                getLocaleManager().t("toolbar.qaFallback2"),
                getLocaleManager().t("toolbar.qaFallback3"),
            ])
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
