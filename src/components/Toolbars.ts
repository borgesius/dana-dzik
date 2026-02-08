import { isCalmMode, setCalmMode } from "../lib/calmMode"
import { emitAppEvent } from "../lib/events"
import { formatMoney } from "../lib/formatMoney"
import { getLocaleManager } from "../lib/localeManager"
import {
    getMarketGame,
    type MarketEngine,
} from "../lib/marketGame/MarketEngine"
import { getThemeManager } from "../lib/themeManager"
import { BusinessPanel } from "./BusinessPanel"
import { createColorSchemeToggle } from "./toolbars/ColorSchemeToggle"
import { CostWidget } from "./toolbars/CostWidget"
import { DeployWidget } from "./toolbars/DeployWidget"
import { createLanguageToggle } from "./toolbars/LanguageToggle"
import { MarketTicker } from "./toolbars/MarketTicker"
import { QAReportsWidget } from "./toolbars/QAReportsWidget"
import { WeatherWidget } from "./toolbars/WeatherWidget"

export class Toolbars {
    private element: HTMLElement
    private moneyEl: HTMLElement | null = null
    private searchInputEl: HTMLInputElement | null = null
    private game: MarketEngine
    private businessPanel: BusinessPanel
    private weatherWidget: WeatherWidget
    private qaWidget: QAReportsWidget
    private ticker: MarketTicker

    constructor() {
        this.game = getMarketGame()
        this.businessPanel = new BusinessPanel()
        this.weatherWidget = new WeatherWidget()
        this.qaWidget = new QAReportsWidget()
        this.ticker = new MarketTicker(this.game)
        this.element = this.createElement()
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
        this.weatherWidget.updateIfLoading(lm.t("toolbar.weatherLoading"))
        this.qaWidget.updateIfLoading(lm.t("toolbar.qaLoading"))
        this.ticker.update()
    }

    private createElement(): HTMLElement {
        const container = document.createElement("div")
        container.className = "toolbars-area"

        container.appendChild(this.createToolbar1())
        container.appendChild(this.createToolbar2())

        return container
    }

    public getBusinessPanelElement(): HTMLElement {
        return this.businessPanel.getElement()
    }

    private createToolbar1(): HTMLElement {
        const toolbar = document.createElement("div")
        toolbar.className = "toolbar"

        const labels = getThemeManager().getLabels()
        toolbar.appendChild(
            this.createSearchBar(labels.searchPlaceholder, "🔍")
        )
        toolbar.appendChild(this.weatherWidget.getElement())
        toolbar.appendChild(this.qaWidget.getElement())
        toolbar.appendChild(new CostWidget().getElement())
        toolbar.appendChild(new DeployWidget().getElement())

        const spacer = document.createElement("div")
        spacer.style.flex = "1"
        toolbar.appendChild(spacer)

        toolbar.appendChild(this.createAchievementsButton())
        toolbar.appendChild(this.createCalmModeToggle())
        toolbar.appendChild(createLanguageToggle())
        toolbar.appendChild(createColorSchemeToggle())

        return toolbar
    }

    private createAchievementsButton(): HTMLElement {
        const btn = document.createElement("button")
        btn.className = "toolbar-button achievements-button"
        btn.textContent = "🏆"
        btn.title = "Achievements"
        btn.addEventListener("click", () => {
            emitAppEvent("terminal:open-window", { windowId: "achievements" })
        })
        return btn
    }

    private createCalmModeToggle(): HTMLElement {
        const btn = document.createElement("button")
        btn.className = "toolbar-button calm-mode-toggle"
        btn.textContent = "🧘"
        btn.title = "Calm Mode"

        const updateBtn = (): void => {
            btn.classList.toggle("calm-active", isCalmMode())
        }

        updateBtn()

        btn.addEventListener("click", () => {
            setCalmMode(!isCalmMode())
            updateBtn()
        })

        document.addEventListener("calm-mode:changed", () => {
            updateBtn()
        })

        return btn
    }

    private createToolbar2(): HTMLElement {
        const toolbar = document.createElement("div")
        toolbar.className = "toolbar toolbar-game"

        const moneyCounter = document.createElement("div")
        moneyCounter.className = "money-counter"
        moneyCounter.innerHTML = `<span class="money-value">${formatMoney(this.game.getCash())}</span>`
        this.moneyEl = moneyCounter.querySelector(".money-value")
        toolbar.appendChild(moneyCounter)

        toolbar.appendChild(this.ticker.getElement())

        const hqToggle = document.createElement("button")
        hqToggle.className = "toolbar-button hq-toggle"
        hqToggle.innerHTML = getLocaleManager().t("toolbar.tradeClosed")
        hqToggle.addEventListener("click", () => {
            this.businessPanel.toggle()
            hqToggle.innerHTML = this.businessPanel.isOpen()
                ? getLocaleManager().t("toolbar.tradeOpen")
                : getLocaleManager().t("toolbar.tradeClosed")
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
        this.game.on("marketTick", () => this.ticker.update())
        this.game.on("commodityUnlocked", () => this.ticker.update())
        this.game.on("tradeExecuted", (data) => {
            const result = data as {
                action: string
                totalCost: number
            }
            this.animateTradeResult(result.action === "sell", result.totalCost)
        })
    }

    private updateMoneyDisplay(): void {
        if (!this.moneyEl) return
        const money = this.game.getCash()
        this.moneyEl.textContent = formatMoney(money)
        this.moneyEl.classList.add("money-flash")
        setTimeout(() => this.moneyEl?.classList.remove("money-flash"), 200)
    }

    private animateTradeResult(isProfit: boolean, amount: number): void {
        if (!this.moneyEl) return

        if (isProfit) {
            this.moneyEl.classList.add("money-win")
            setTimeout(() => this.moneyEl?.classList.remove("money-win"), 500)
        }

        const floater = document.createElement("span")
        floater.className = `amount-floater ${isProfit ? "positive" : "negative"}`
        floater.textContent = isProfit
            ? `+${formatMoney(amount)}`
            : `-${formatMoney(amount)}`
        this.moneyEl.parentElement?.appendChild(floater)
        setTimeout(() => floater.remove(), 1000)
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

    public getElement(): HTMLElement {
        return this.element
    }
}
