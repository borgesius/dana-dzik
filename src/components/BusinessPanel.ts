import { getLocaleManager } from "../lib/localeManager"
import {
    getMarketGame,
    type MarketEngine,
} from "../lib/marketGame/MarketEngine"
import { ChartSection } from "./businessPanel/ChartSection"
import { EmployeesSection } from "./businessPanel/EmployeesSection"
import { FactoriesSection } from "./businessPanel/FactoriesSection"
import { InfluenceSection } from "./businessPanel/InfluenceSection"
import { PortfolioMgmtSection } from "./businessPanel/PortfolioMgmtSection"
import { PortfolioSection } from "./businessPanel/PortfolioSection"
import { PrestigeSection } from "./businessPanel/PrestigeSection"
import { TradeControls } from "./businessPanel/TradeControls"
import { UpgradesSection } from "./businessPanel/UpgradesSection"

const EXPANDED_STORAGE_KEY = "businessPanelExpanded"

export class BusinessPanel {
    private element: HTMLElement
    private game: MarketEngine
    private isExpanded = false
    private isWideMode = false
    private expandBtn: HTMLButtonElement | null = null

    private newsTickerEl: HTMLElement | null = null
    private chart: ChartSection
    private tradeControls: TradeControls
    private portfolio: PortfolioSection
    private factories: FactoriesSection
    private upgrades: UpgradesSection
    private influence: InfluenceSection
    private prestige: PrestigeSection
    private employees: EmployeesSection
    private portfolioMgmt: PortfolioMgmtSection

    constructor() {
        this.game = getMarketGame()
        this.isWideMode = localStorage.getItem(EXPANDED_STORAGE_KEY) === "true"
        this.chart = new ChartSection(this.game)
        this.tradeControls = new TradeControls(
            this.game,
            () => this.chart.getSelectedCommodity(),
            (type) => this.playSound(type)
        )
        this.portfolio = new PortfolioSection(this.game)
        this.factories = new FactoriesSection(this.game, (type) =>
            this.playSound(type)
        )
        this.upgrades = new UpgradesSection(this.game, (type) =>
            this.playSound(type)
        )
        this.influence = new InfluenceSection(
            this.game,
            () => this.chart.getSelectedCommodity(),
            (type) => this.playSound(type)
        )
        this.prestige = new PrestigeSection(this.game, (type) =>
            this.playSound(type)
        )
        this.employees = new EmployeesSection(this.game, (type) =>
            this.playSound(type)
        )
        this.portfolioMgmt = new PortfolioMgmtSection(this.game, (type) =>
            this.playSound(type)
        )
        this.element = this.createElement()
        if (this.isWideMode) {
            this.element.classList.add("expanded")
        }
        this.setupEventListeners()

        this.chart.setOnCommodityChange(() => {
            if (!this.isExpanded) return
            this.tradeControls.render()
            this.influence.render()
        })
    }

    private createElement(): HTMLElement {
        const panel = document.createElement("div")
        panel.className = "business-panel"

        const lm = getLocaleManager()

        const header = document.createElement("div")
        header.className = "business-panel-header"

        const title = document.createElement("span")
        title.className = "business-panel-title"
        title.textContent = lm.t("commodityExchange.ui.title")
        header.appendChild(title)

        const controls = document.createElement("div")
        controls.className = "business-panel-header-controls"

        const expandBtn = document.createElement("button")
        expandBtn.className = "business-panel-expand"
        expandBtn.textContent = this.isWideMode
            ? "Narrow \u25B8"
            : "\u25C2 Expand"
        expandBtn.addEventListener("click", () => this.toggleWideMode())
        this.expandBtn = expandBtn
        controls.appendChild(expandBtn)

        const closeBtn = document.createElement("button")
        closeBtn.className = "business-panel-close"
        closeBtn.textContent = lm.t("commodityExchange.ui.close")
        closeBtn.addEventListener("click", () => this.collapse())
        controls.appendChild(closeBtn)

        header.appendChild(controls)

        panel.appendChild(header)

        const newsTicker = document.createElement("div")
        newsTicker.className = "market-news-ticker"
        newsTicker.innerHTML =
            '<span class="ticker-text">SYSTEM: Market terminal initializing...</span>'
        this.newsTickerEl = newsTicker
        panel.appendChild(newsTicker)

        const content = document.createElement("div")
        content.className = "business-panel-content"

        const leftCol = document.createElement("div")
        leftCol.className = "panel-col-left"
        leftCol.appendChild(this.chart.getElement())
        leftCol.appendChild(this.tradeControls.getElement())
        leftCol.appendChild(this.portfolio.getElement())
        leftCol.appendChild(this.factories.getElement())
        leftCol.appendChild(this.influence.getElement())
        content.appendChild(leftCol)

        const rightCol = document.createElement("div")
        rightCol.className = "panel-col-right"
        rightCol.appendChild(this.upgrades.getElement())
        rightCol.appendChild(this.employees.getElement())
        rightCol.appendChild(this.portfolioMgmt.getElement())
        rightCol.appendChild(this.prestige.getElement())
        content.appendChild(rightCol)

        panel.appendChild(content)

        return panel
    }

    private setupEventListeners(): void {
        this.game.on("marketTick", () => {
            if (!this.isExpanded) return
            this.chart.renderChart()
            this.portfolio.render()
            this.tradeControls.render()
            this.employees.render()
            this.portfolioMgmt.render()
        })
        this.game.on("moneyChanged", () => {
            if (!this.isExpanded) return
            this.tradeControls.render()
            this.factories.render()
            this.upgrades.render()
        })
        this.game.on("portfolioChanged", () => {
            if (!this.isExpanded) return
            this.portfolio.render()
        })
        this.game.on("newsEvent", (data) => {
            const d = data as { text: string }
            this.updateNewsTicker(d.text)
        })
        this.game.on("phaseUnlocked", () => {
            this.updatePhaseVisibility()
            this.renderAll()
        })
        this.game.on("commodityUnlocked", () => {
            this.chart.updateTabSelection()
        })
        this.game.on("upgradeAcquired", () => {
            if (!this.isExpanded) return
            this.upgrades.render()
        })
        this.game.on("factoryDeployed", () => {
            if (!this.isExpanded) return
            this.factories.render()
        })
        this.game.on("limitOrderFilled", () => {
            if (!this.isExpanded) return
            this.portfolio.render()
            this.tradeControls.render()
        })
        this.game.on("harvestExecuted", () => {
            if (!this.isExpanded) return
            this.portfolio.render()
            this.tradeControls.render()
        })
        this.game.on("stateChanged", () => {
            if (!this.isExpanded) return
            this.updatePhaseVisibility()
            this.renderAll()
        })
    }

    public expand(): void {
        this.isExpanded = true
        this.element.classList.add("open")
        this.renderAll()
    }

    public collapse(): void {
        this.isExpanded = false
        this.element.classList.remove("open")
    }

    public toggle(): void {
        if (this.isExpanded) {
            this.collapse()
        } else {
            this.expand()
        }
    }

    public isOpen(): boolean {
        return this.isExpanded
    }

    private renderAll(): void {
        this.updatePhaseVisibility()
        this.chart.updateTabSelection()
        this.chart.renderChart()
        this.portfolio.render()
        this.tradeControls.render()
        this.factories.render()
        this.upgrades.render()
        this.influence.render()
        this.employees.render()
        this.portfolioMgmt.render()
        this.prestige.render()
    }

    private toggleWideMode(): void {
        this.isWideMode = !this.isWideMode
        this.element.classList.toggle("expanded", this.isWideMode)
        if (this.expandBtn) {
            this.expandBtn.textContent = this.isWideMode
                ? "Narrow \u25B8"
                : "\u25C2 Expand"
        }
        localStorage.setItem(EXPANDED_STORAGE_KEY, String(this.isWideMode))
    }

    private updatePhaseVisibility(): void {
        this.factories.updateVisibility()
        this.upgrades.updateVisibility()
        this.influence.updateVisibility()
        this.employees.updateVisibility()
        this.portfolioMgmt.updateVisibility()
        this.prestige.updateVisibility()

        if (this.expandBtn) {
            this.expandBtn.style.display = this.game.isPhaseUnlocked(2)
                ? "block"
                : "none"
        }
    }

    private updateNewsTicker(text: string): void {
        if (!this.newsTickerEl) return
        const span = this.newsTickerEl.querySelector(".ticker-text")
        if (span) {
            span.textContent = text
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

    public getElement(): HTMLElement {
        return this.element
    }
}
