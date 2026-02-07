import { formatMoney } from "../lib/formatMoney"
import { getLocaleManager } from "../lib/localeManager"
import {
    ChartRenderer,
    COMMODITIES,
    type CommodityId,
    FACTORIES,
    getMarketGame,
    INFLUENCES,
    type MarketEngine,
    UPGRADES,
} from "../lib/marketGame"

export class BusinessPanel {
    private element: HTMLElement
    private game: MarketEngine
    private isExpanded = false

    private newsTickerEl: HTMLElement | null = null
    private chartRenderer: ChartRenderer | null = null
    private selectedCommodity: CommodityId = "EMAIL"
    private portfolioEl: HTMLElement | null = null
    private factoriesEl: HTMLElement | null = null
    private upgradesEl: HTMLElement | null = null
    private influenceEl: HTMLElement | null = null
    private tradeControlsEl: HTMLElement | null = null

    constructor() {
        this.game = getMarketGame()
        this.element = this.createElement()
        this.setupEventListeners()
    }

    private createElement(): HTMLElement {
        const panel = document.createElement("div")
        panel.className = "business-panel"
        panel.style.display = "none"

        const lm = getLocaleManager()

        const header = document.createElement("div")
        header.className = "business-panel-header"

        const title = document.createElement("span")
        title.className = "business-panel-title"
        title.textContent = lm.t("commodityExchange.ui.title")
        header.appendChild(title)

        const closeBtn = document.createElement("button")
        closeBtn.className = "business-panel-close"
        closeBtn.textContent = lm.t("commodityExchange.ui.close")
        closeBtn.addEventListener("click", () => this.collapse())
        header.appendChild(closeBtn)

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

        const chartSection = this.createChartSection()
        leftCol.appendChild(chartSection)

        const tradeSection = this.createTradeSection()
        leftCol.appendChild(tradeSection)

        content.appendChild(leftCol)

        const rightCol = document.createElement("div")
        rightCol.className = "panel-col-right"

        const portfolioSection = this.createPortfolioSection()
        rightCol.appendChild(portfolioSection)

        const factoriesSection = this.createFactoriesSection()
        rightCol.appendChild(factoriesSection)

        const upgradesSection = this.createUpgradesSection()
        rightCol.appendChild(upgradesSection)

        const influenceSection = this.createInfluenceSection()
        rightCol.appendChild(influenceSection)

        content.appendChild(rightCol)

        panel.appendChild(content)

        return panel
    }

    private createChartSection(): HTMLElement {
        const section = document.createElement("div")
        section.className = "chart-section"

        const tabs = document.createElement("div")
        tabs.className = "commodity-tabs"

        const unlocked = this.game.getUnlockedCommodities()
        for (const c of COMMODITIES) {
            const tab = document.createElement("button")
            tab.className = `commodity-tab${c.id === this.selectedCommodity ? " active" : ""}${!unlocked.includes(c.id) ? " locked" : ""}`
            tab.textContent = c.id
            tab.dataset.commodityId = c.id
            tab.disabled = !unlocked.includes(c.id)
            tab.addEventListener("click", () => {
                this.selectedCommodity = c.id
                this.updateTabSelection()
                this.renderChart()
            })
            tabs.appendChild(tab)
        }

        section.appendChild(tabs)

        const chartWrap = document.createElement("div")
        chartWrap.className = "chart-wrapper"
        const canvas = document.createElement("canvas")
        canvas.className = "market-chart"
        chartWrap.appendChild(canvas)
        section.appendChild(chartWrap)

        this.chartRenderer = new ChartRenderer(canvas, {
            width: 280,
            height: 130,
        })

        return section
    }

    private createTradeSection(): HTMLElement {
        const section = document.createElement("div")
        section.className = "trade-section"
        this.tradeControlsEl = section
        this.renderTradeControls()
        return section
    }

    private createPortfolioSection(): HTMLElement {
        const section = document.createElement("div")
        section.className = "portfolio-section"

        const heading = document.createElement("h3")
        heading.textContent = getLocaleManager().t(
            "commodityExchange.ui.portfolio"
        )
        section.appendChild(heading)

        const list = document.createElement("div")
        list.className = "portfolio-list"
        this.portfolioEl = list
        section.appendChild(list)

        this.renderPortfolio()
        return section
    }

    private createFactoriesSection(): HTMLElement {
        const section = document.createElement("div")
        section.className = "factories-section"
        section.style.display = this.game.isPhaseUnlocked(2) ? "block" : "none"

        const heading = document.createElement("h3")
        heading.textContent = getLocaleManager().t(
            "commodityExchange.ui.production"
        )
        section.appendChild(heading)

        const list = document.createElement("div")
        list.className = "factories-list"
        this.factoriesEl = list
        section.appendChild(list)

        this.renderFactories()
        return section
    }

    private createUpgradesSection(): HTMLElement {
        const section = document.createElement("div")
        section.className = "upgrades-section"
        section.style.display = this.game.isPhaseUnlocked(3) ? "block" : "none"

        const heading = document.createElement("h3")
        heading.textContent = getLocaleManager().t(
            "commodityExchange.ui.improvements"
        )
        section.appendChild(heading)

        const list = document.createElement("div")
        list.className = "upgrades-list"
        this.upgradesEl = list
        section.appendChild(list)

        this.renderUpgrades()
        return section
    }

    private createInfluenceSection(): HTMLElement {
        const section = document.createElement("div")
        section.className = "influence-section"
        section.style.display = this.game.isPhaseUnlocked(4) ? "block" : "none"

        const heading = document.createElement("h3")
        heading.textContent = getLocaleManager().t(
            "commodityExchange.ui.marketOperations"
        )
        section.appendChild(heading)

        const list = document.createElement("div")
        list.className = "influence-list"
        this.influenceEl = list
        section.appendChild(list)

        this.renderInfluence()
        return section
    }

    private setupEventListeners(): void {
        this.game.on("marketTick", () => {
            if (!this.isExpanded) return
            this.renderChart()
            this.renderPortfolio()
            this.renderTradeControls()
        })
        this.game.on("moneyChanged", () => {
            if (!this.isExpanded) return
            this.renderTradeControls()
            this.renderFactories()
            this.renderUpgrades()
        })
        this.game.on("portfolioChanged", () => {
            if (!this.isExpanded) return
            this.renderPortfolio()
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
            this.updateTabSelection()
        })
        this.game.on("upgradeAcquired", () => {
            if (!this.isExpanded) return
            this.renderUpgrades()
        })
        this.game.on("factoryDeployed", () => {
            if (!this.isExpanded) return
            this.renderFactories()
        })
        this.game.on("limitOrderFilled", () => {
            if (!this.isExpanded) return
            this.renderPortfolio()
            this.renderTradeControls()
        })
    }

    public expand(): void {
        this.isExpanded = true
        this.element.style.display = "block"
        this.renderAll()
    }

    public collapse(): void {
        this.isExpanded = false
        this.element.style.display = "none"
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
        this.updateTabSelection()
        this.renderChart()
        this.renderPortfolio()
        this.renderTradeControls()
        this.renderFactories()
        this.renderUpgrades()
        this.renderInfluence()
    }

    private updatePhaseVisibility(): void {
        const factoriesSection =
            this.element.querySelector(".factories-section")
        const upgradesSection = this.element.querySelector(".upgrades-section")
        const influenceSection =
            this.element.querySelector(".influence-section")

        if (factoriesSection) {
            ;(factoriesSection as HTMLElement).style.display =
                this.game.isPhaseUnlocked(2) ? "block" : "none"
        }
        if (upgradesSection) {
            ;(upgradesSection as HTMLElement).style.display =
                this.game.isPhaseUnlocked(3) ? "block" : "none"
        }
        if (influenceSection) {
            ;(influenceSection as HTMLElement).style.display =
                this.game.isPhaseUnlocked(4) ? "block" : "none"
        }
    }

    private updateTabSelection(): void {
        const tabs = this.element.querySelectorAll(".commodity-tab")
        const unlocked = this.game.getUnlockedCommodities()
        tabs.forEach((tab) => {
            const id = (tab as HTMLElement).dataset.commodityId as CommodityId
            tab.classList.toggle("active", id === this.selectedCommodity)
            tab.classList.toggle("locked", !unlocked.includes(id))
            ;(tab as HTMLButtonElement).disabled = !unlocked.includes(id)
        })
    }

    private updateNewsTicker(text: string): void {
        if (!this.newsTickerEl) return
        const span = this.newsTickerEl.querySelector(".ticker-text")
        if (span) {
            span.textContent = text
        }
    }

    private renderChart(): void {
        if (!this.chartRenderer) return

        const history = this.game.getPriceHistory(this.selectedCommodity)
        const showTrend = this.game.canShowTrend()
        const trend = this.game.getTrend(this.selectedCommodity)
        const trendStrength = this.game.canShowTrendStrength()
            ? this.game.getTrendStrength(this.selectedCommodity)
            : 0
        const maData = this.game.getMovingAverage(this.selectedCommodity, 20)

        this.chartRenderer.render(this.selectedCommodity, history, {
            showMovingAverage: maData.length > 0,
            showTrendArrow: showTrend,
            trendDirection: showTrend ? trend : null,
            trendStrength,
            movingAverageData: maData,
        })
    }

    private renderTradeControls(): void {
        if (!this.tradeControlsEl) return

        const price = this.game.getPrice(this.selectedCommodity)
        const cash = this.game.getCash()
        const holding = this.game.getHolding(this.selectedCommodity)
        const qty = holding?.quantity ?? 0
        const lm = getLocaleManager()

        const canBuy = cash >= price
        const canSell = qty > 0

        this.tradeControlsEl.innerHTML = `
            <div class="trade-info">
                <span class="trade-commodity">${this.selectedCommodity}</span>
                <span class="trade-price">${formatMoney(price)}</span>
                <span class="trade-holding">${lm.t("commodityExchange.ui.qty")}: ${qty}</span>
            </div>
            <div class="trade-buttons">
                <button class="toolbar-button trade-btn buy-btn" ${canBuy ? "" : "disabled"}>${lm.t("commodityExchange.ui.buy")}</button>
                <button class="toolbar-button trade-btn sell-btn" ${canSell ? "" : "disabled"}>${lm.t("commodityExchange.ui.sell")}</button>
                <button class="toolbar-button trade-btn sell-all-btn" ${canSell ? "" : "disabled"}>${lm.t("commodityExchange.ui.sellAll")}</button>
            </div>
        `

        const buyBtn = this.tradeControlsEl.querySelector(".buy-btn")
        const sellBtn = this.tradeControlsEl.querySelector(".sell-btn")
        const sellAllBtn = this.tradeControlsEl.querySelector(".sell-all-btn")

        buyBtn?.addEventListener("click", () => {
            const result = this.game.buy(this.selectedCommodity)
            if (result) {
                this.playSound("notify")
            }
        })
        sellBtn?.addEventListener("click", () => {
            const result = this.game.sell(this.selectedCommodity)
            if (result) {
                this.playSound("notify")
            }
        })
        sellAllBtn?.addEventListener("click", () => {
            const result = this.game.sellAll(this.selectedCommodity)
            if (result) {
                this.playSound("notify")
            }
        })
    }

    private renderPortfolio(): void {
        if (!this.portfolioEl) return

        const holdings = this.game.getAllHoldings()
        const lm = getLocaleManager()

        if (holdings.size === 0) {
            this.portfolioEl.innerHTML = `<div class="portfolio-empty">${lm.t("commodityExchange.ui.noHoldings")}</div>`
            return
        }

        this.portfolioEl.innerHTML = ""

        holdings.forEach((holding, commodityId) => {
            if (holding.quantity <= 0) return

            const price = this.game.getPrice(commodityId)
            const avgCost =
                holding.quantity > 0 ? holding.totalCost / holding.quantity : 0
            const currentValue = holding.quantity * price
            const pl = currentValue - holding.totalCost

            const row = document.createElement("div")
            row.className = "portfolio-row"
            row.innerHTML = `
                <span class="portfolio-ticker">${commodityId}</span>
                <span class="portfolio-qty">${holding.quantity}</span>
                <span class="portfolio-avg">${formatMoney(avgCost)}</span>
                <span class="portfolio-pl ${pl >= 0 ? "positive" : "negative"}">${pl >= 0 ? "+" : ""}${formatMoney(pl)}</span>
            `
            this.portfolioEl?.appendChild(row)
        })
    }

    private renderFactories(): void {
        if (!this.factoriesEl) return
        if (!this.game.isPhaseUnlocked(2)) return

        const cash = this.game.getCash()
        const lm = getLocaleManager()
        this.factoriesEl.innerHTML = ""

        for (const f of FACTORIES) {
            const count = this.game.getFactoryCount(f.id)
            const currentCost = this.game.getFactoryCost(f.id)
            const canAfford = cash >= currentCost

            const card = document.createElement("div")
            card.className = "factory-card"

            card.innerHTML = `
                <div class="factory-info">
                    <span class="factory-name">${lm.t(`commodityExchange.factories.${f.id}.name`)}</span>
                    <span class="factory-desc">${lm.t(`commodityExchange.factories.${f.id}.description`)}</span>
                    <span class="factory-output">${f.produces} ~${((f.minOutput + f.maxOutput) / 2).toFixed(1)}/${lm.t("commodityExchange.ui.tick")}</span>
                    ${count > 0 ? `<span class="factory-count">x${count} ${lm.t("commodityExchange.ui.deployed")}</span>` : ""}
                </div>
                <button class="toolbar-button factory-deploy-btn" ${canAfford ? "" : "disabled"}>
                    ${lm.t("commodityExchange.ui.deploy")} ${formatMoney(currentCost)}
                </button>
            `

            const btn = card.querySelector(".factory-deploy-btn")
            btn?.addEventListener("click", () => {
                if (this.game.deployFactory(f.id)) {
                    this.playSound("notify")
                    this.renderFactories()
                }
            })

            this.factoriesEl.appendChild(card)
        }
    }

    private renderUpgrades(): void {
        if (!this.upgradesEl) return
        if (!this.game.isPhaseUnlocked(3)) return

        const cash = this.game.getCash()
        const owned = this.game.getOwnedUpgrades()
        const lm = getLocaleManager()
        this.upgradesEl.innerHTML = ""

        for (const u of UPGRADES) {
            const isOwned = owned.includes(u.id)
            const canAfford = cash >= u.cost

            const btn = document.createElement("button")
            btn.className = `upgrade-btn ${isOwned ? "owned" : ""} ${!canAfford && !isOwned ? "disabled" : ""}`

            if (isOwned) {
                btn.innerHTML = `
                    <span class="upgrade-name">${lm.t(`commodityExchange.upgrades.${u.id}.name`)}</span>
                    <span class="upgrade-badge">${lm.t("commodityExchange.ui.installed")}</span>
                `
                btn.disabled = true
            } else {
                btn.innerHTML = `
                    <span class="upgrade-name">${lm.t(`commodityExchange.upgrades.${u.id}.name`)}</span>
                    <span class="upgrade-cost">${formatMoney(u.cost)}</span>
                    <span class="upgrade-desc">${lm.t(`commodityExchange.upgrades.${u.id}.description`)}</span>
                `
                btn.disabled = !canAfford
                btn.addEventListener("click", () => {
                    if (this.game.purchaseUpgrade(u.id)) {
                        this.playSound("notify")
                        this.renderUpgrades()
                    }
                })
            }

            this.upgradesEl.appendChild(btn)
        }
    }

    private renderInfluence(): void {
        if (!this.influenceEl) return
        if (!this.game.isPhaseUnlocked(4)) return

        const lm = getLocaleManager()
        this.influenceEl.innerHTML = ""

        for (const inf of INFLUENCES) {
            const onCooldown = this.game.isInfluenceOnCooldown(inf.id)
            const remaining = this.game.getInfluenceCooldownRemaining(inf.id)
            const cash = this.game.getCash()
            const canAffordCash = cash >= inf.cashCost

            let canAffordCommodities = true
            const costParts: string[] = []

            if (inf.cashCost > 0) {
                costParts.push(formatMoney(inf.cashCost))
            }
            for (const [cId, qty] of Object.entries(inf.commodityCosts)) {
                const holding = this.game.getHolding(cId as CommodityId)
                if (!holding || holding.quantity < qty) {
                    canAffordCommodities = false
                }
                costParts.push(`${qty} ${cId}`)
            }

            const canExecute =
                !onCooldown && canAffordCash && canAffordCommodities

            const card = document.createElement("div")
            card.className = "influence-card"

            const cooldownText = onCooldown
                ? `${lm.t("commodityExchange.ui.cooldown")} ${Math.ceil(remaining / 1000)}s`
                : ""

            card.innerHTML = `
                <div class="influence-info">
                    <span class="influence-name">${lm.t(`commodityExchange.influence.${inf.id}.name`)}</span>
                    <span class="influence-desc">${lm.t(`commodityExchange.influence.${inf.id}.description`)}</span>
                    <span class="influence-cost">${costParts.join(" + ")}</span>
                </div>
                <button class="toolbar-button influence-exec-btn" ${canExecute ? "" : "disabled"}>
                    ${onCooldown ? cooldownText : lm.t("commodityExchange.ui.execute")}
                </button>
            `

            const btn = card.querySelector(".influence-exec-btn")
            btn?.addEventListener("click", () => {
                if (
                    this.game.executeInfluence(inf.id, this.selectedCommodity)
                ) {
                    this.playSound("notify")
                    this.renderInfluence()
                }
            })

            this.influenceEl.appendChild(card)
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
