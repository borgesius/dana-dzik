import {
    type BusinessGame,
    getBusinessGame,
    type HistoryEntry,
    type Upgrade,
} from "../lib/businessGame"
import { getLocaleManager } from "../lib/localeManager"

export class BusinessPanel {
    private element: HTMLElement
    private game: BusinessGame
    private isExpanded = false
    private statsEl: HTMLElement | null = null
    private upgradesEl: HTMLElement | null = null
    private historyEl: HTMLElement | null = null

    constructor() {
        this.game = getBusinessGame()
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
        title.textContent = lm.t("businessPanel.title")
        header.appendChild(title)

        const closeBtn = document.createElement("button")
        closeBtn.className = "business-panel-close"
        closeBtn.textContent = lm.t("businessPanel.close")
        closeBtn.addEventListener("click", () => this.collapse())
        header.appendChild(closeBtn)

        panel.appendChild(header)

        const statsSection = document.createElement("div")
        statsSection.className = "business-panel-stats"
        this.statsEl = statsSection
        panel.appendChild(statsSection)

        const content = document.createElement("div")
        content.className = "business-panel-content"

        const upgradesSection = document.createElement("div")
        upgradesSection.className = "business-panel-upgrades"

        const upgradesTitle = document.createElement("h3")
        upgradesTitle.textContent = lm.t("businessPanel.improvements")
        upgradesSection.appendChild(upgradesTitle)

        const upgradesList = document.createElement("div")
        upgradesList.className = "business-panel-upgrades-list"
        this.upgradesEl = upgradesList
        upgradesSection.appendChild(upgradesList)

        content.appendChild(upgradesSection)

        const historySection = document.createElement("div")
        historySection.className = "business-panel-history"

        const historyTitle = document.createElement("h3")
        historyTitle.textContent = lm.t("businessPanel.transactions")
        historySection.appendChild(historyTitle)

        const historyList = document.createElement("div")
        historyList.className = "business-panel-history-list"
        this.historyEl = historyList
        historySection.appendChild(historyList)

        content.appendChild(historySection)

        panel.appendChild(content)

        this.render()

        return panel
    }

    private setupEventListeners(): void {
        this.game.on("moneyChanged", () => this.renderStats())
        this.game.on("ventureResult", () => this.renderHistory())
        this.game.on("upgradeAcquired", () => this.renderUpgrades())
        this.game.on("stateChanged", () => this.render())
    }

    public expand(): void {
        this.isExpanded = true
        this.element.style.display = "block"
        this.render()
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

    private render(): void {
        this.renderStats()
        this.renderUpgrades()
        this.renderHistory()
    }

    private renderStats(): void {
        if (!this.statsEl) return

        const lm = getLocaleManager()
        const money = this.game.getMoney()
        const lifetime = this.game.getLifetimeEarnings()
        const wins = this.game.getWins()
        const losses = this.game.getLosses()
        const streak = this.game.getCurrentStreak()
        const bestWin = this.game.getBiggestWin()

        const streakDisplay =
            streak > 0
                ? `🔥 ${streak}`
                : streak < 0
                  ? `❄️ ${Math.abs(streak)}`
                  : "—"

        this.statsEl.innerHTML = `
            <div class="stat-row">
                <div class="stat-item">
                    <span class="stat-label">${lm.t("businessPanel.balance")}</span>
                    <span class="stat-value money">$${money.toFixed(2)}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">${lm.t("businessPanel.revenue")}</span>
                    <span class="stat-value">$${lifetime.toFixed(2)}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">${lm.t("businessPanel.success")}</span>
                    <span class="stat-value">${wins}/${wins + losses}</span>
                </div>
            </div>
            <div class="stat-row">
                <div class="stat-item">
                    <span class="stat-label">${lm.t("businessPanel.streak")}</span>
                    <span class="stat-value">${streakDisplay}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">${lm.t("businessPanel.bestWin")}</span>
                    <span class="stat-value">$${bestWin.toFixed(2)}</span>
                </div>
            </div>
        `
    }

    private renderUpgrades(): void {
        if (!this.upgradesEl) return

        const upgrades = this.game.getUpgrades()
        const owned = this.game.getOwnedUpgrades()
        const money = this.game.getMoney()

        this.upgradesEl.innerHTML = ""

        upgrades.forEach((upgrade: Upgrade) => {
            const isOwned = owned.includes(upgrade.id)
            const canAfford = money >= upgrade.cost

            const btn = document.createElement("button")
            btn.className = `upgrade-btn ${isOwned ? "owned" : ""} ${!canAfford && !isOwned ? "disabled" : ""}`

            if (isOwned) {
                btn.innerHTML = `
                    <span class="upgrade-name">${upgrade.name}</span>
                    <span class="upgrade-badge">${getLocaleManager().t("businessPanel.acquired")}</span>
                `
                btn.disabled = true
            } else {
                btn.innerHTML = `
                    <span class="upgrade-name">${upgrade.name}</span>
                    <span class="upgrade-cost">$${upgrade.cost.toFixed(2)}</span>
                    <span class="upgrade-desc">${upgrade.description}</span>
                `
                btn.disabled = !canAfford

                btn.addEventListener("click", () => {
                    if (this.game.purchaseUpgrade(upgrade.id)) {
                        this.playSound("notify")
                        this.renderUpgrades()
                    }
                })
            }

            this.upgradesEl?.appendChild(btn)
        })
    }

    private renderHistory(): void {
        if (!this.historyEl) return

        const history = this.game.getHistory()

        if (history.length === 0) {
            this.historyEl.innerHTML = `<div class="history-empty">${getLocaleManager().t("businessPanel.noTransactions")}</div>`
            return
        }

        this.historyEl.innerHTML = ""

        history.forEach((entry: HistoryEntry) => {
            const item = document.createElement("div")
            item.className = `history-item ${entry.success ? "success" : "failure"}`

            const icon = entry.success ? "✅" : "❌"
            const amountStr =
                entry.amount >= 0
                    ? `+$${entry.amount.toFixed(2)}`
                    : `-$${Math.abs(entry.amount).toFixed(2)}`

            item.innerHTML = `
                <span class="history-icon">${icon}</span>
                <span class="history-name">${entry.ventureName}</span>
                <span class="history-amount">${amountStr}</span>
            `

            this.historyEl?.appendChild(item)
        })
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
