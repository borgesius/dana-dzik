export interface Venture {
    id: string
    name: string
    tagline: string
    emoji: string
    tier: number
    cost: number
    payout: number
    risk: number
    cooldownMs: number
}

export interface Upgrade {
    id: string
    name: string
    description: string
    cost: number
    effect: UpgradeEffect
}

interface UpgradeEffect {
    type:
        | "baseClickBonus"
        | "riskReduction"
        | "streakBonus"
        | "showOdds"
        | "ventureBoost"
        | "passiveIncome"
    value?: number
    ventureId?: string
}

export interface HistoryEntry {
    ventureId: string
    ventureName: string
    success: boolean
    amount: number
    timestamp: number
}

interface GameState {
    money: number
    lifetimeEarnings: number
    wins: number
    losses: number
    currentStreak: number
    biggestWin: number
    unlockedTiers: number[]
    ownedUpgrades: string[]
    cooldowns: Map<string, number>
    history: HistoryEntry[]
    popupLevel: number
}

type GameEventType =
    | "moneyChanged"
    | "ventureResult"
    | "tierUnlocked"
    | "upgradeAcquired"
    | "cooldownUpdate"
    | "popupsActivate"
    | "stateChanged"

type GameEventCallback = (data?: unknown) => void

const VENTURES: Venture[] = [
    {
        id: "make-money",
        name: "MAKE $$$ FAST",
        tagline: "Click here to start earning!",
        emoji: "💰",
        tier: 1,
        cost: 0,
        payout: 0.01,
        risk: 0,
        cooldownMs: 0,
    },
    {
        id: "email-forward",
        name: "Email Forwarding",
        tagline: "Forward to friends, earn commissions!",
        emoji: "📧",
        tier: 1,
        cost: 0.1,
        payout: 0.25,
        risk: 0.2,
        cooldownMs: 3000,
    },
    {
        id: "punch-monkey",
        name: "Interactive Ad",
        tagline: "Punch the monkey to win!",
        emoji: "🎯",
        tier: 2,
        cost: 0.5,
        payout: 1.5,
        risk: 0.3,
        cooldownMs: 5000,
    },
    {
        id: "ringtones",
        name: "Premium Ringtones",
        tagline: "Download exclusive ringtones!",
        emoji: "📱",
        tier: 2,
        cost: 1.0,
        payout: 2.5,
        risk: 0.25,
        cooldownMs: 5000,
    },
    {
        id: "work-home",
        name: "Home Business Kit",
        tagline: "Work from home stuffing envelopes!",
        emoji: "🏠",
        tier: 3,
        cost: 5.0,
        payout: 15,
        risk: 0.35,
        cooldownMs: 10000,
    },
    {
        id: "screensaver",
        name: "Desktop Suite",
        tagline: "Free screensavers and cursors!",
        emoji: "🖥️",
        tier: 3,
        cost: 3.0,
        payout: 8.0,
        risk: 0.3,
        cooldownMs: 8000,
    },
    {
        id: "nigerian-prince",
        name: "International Partnership",
        tagline: "Help transfer funds, keep 20%!",
        emoji: "👑",
        tier: 4,
        cost: 20,
        payout: 100,
        risk: 0.5,
        cooldownMs: 15000,
    },
    {
        id: "vacation",
        name: "Vacation Ownership",
        tagline: "Exclusive timeshare opportunity!",
        emoji: "🏝️",
        tier: 4,
        cost: 15,
        payout: 50,
        risk: 0.4,
        cooldownMs: 12000,
    },
    {
        id: "stock-tips",
        name: "Insider Market Tips",
        tagline: "Hot stock picks delivered daily!",
        emoji: "📈",
        tier: 4,
        cost: 25,
        payout: 75,
        risk: 0.45,
        cooldownMs: 15000,
    },
    {
        id: "mlm",
        name: "Multi-Level Marketing",
        tagline: "Build your downline today!",
        emoji: "🔺",
        tier: 5,
        cost: 100,
        payout: 400,
        risk: 0.55,
        cooldownMs: 20000,
    },
    {
        id: "download-ram",
        name: "System Optimization",
        tagline: "Download more RAM instantly!",
        emoji: "💾",
        tier: 5,
        cost: 50,
        payout: 150,
        risk: 0.4,
        cooldownMs: 15000,
    },
    {
        id: "y2k",
        name: "Y2K Preparedness Kit",
        tagline: "Be ready for the millennium!",
        emoji: "📦",
        tier: 5,
        cost: 75,
        payout: 250,
        risk: 0.45,
        cooldownMs: 18000,
    },
    {
        id: "winner",
        name: "CONGRATULATIONS!!!",
        tagline: "You are the 1,000,000th visitor!",
        emoji: "🎉",
        tier: 6,
        cost: 500,
        payout: 2500,
        risk: 0.6,
        cooldownMs: 30000,
    },
    {
        id: "dotcom-ipo",
        name: "Dot Com IPO",
        tagline: "Get in on the ground floor!",
        emoji: "🌐",
        tier: 6,
        cost: 750,
        payout: 3000,
        risk: 0.65,
        cooldownMs: 45000,
    },
]

const UPGRADES: Upgrade[] = [
    {
        id: "ergonomic-keyboard",
        name: "Ergonomic Keyboard",
        description: "Base click earns $0.02",
        cost: 5,
        effect: { type: "baseClickBonus", value: 0.02 },
    },
    {
        id: "sales-training",
        name: "Sales Training",
        description: "All ventures -5% risk",
        cost: 15,
        effect: { type: "riskReduction", value: 0.05 },
    },
    {
        id: "lucky-tie",
        name: "Lucky Tie",
        description: "Hot streak bonus +15%",
        cost: 30,
        effect: { type: "streakBonus", value: 0.15 },
    },
    {
        id: "market-research",
        name: "Market Research",
        description: "See exact success % on hover",
        cost: 50,
        effect: { type: "showOdds" },
    },
    {
        id: "mailing-list",
        name: "Mailing List",
        description: "Email Program: -50% cost, +50% payout",
        cost: 75,
        effect: { type: "ventureBoost", ventureId: "email-forward" },
    },
    {
        id: "corner-office",
        name: "Corner Office",
        description: "Passive income: $0.01/second",
        cost: 150,
        effect: { type: "passiveIncome", value: 0.01 },
    },
]

const TIER_THRESHOLDS: Record<number, number> = {
    1: 0,
    2: 1,
    3: 10,
    4: 50,
    5: 200,
    6: 1000,
}

const POPUP_THRESHOLDS = [
    { threshold: 5, level: 1 },
    { threshold: 25, level: 2 },
    { threshold: 100, level: 3 },
]

const STREAK_THRESHOLD = 3
const BASE_STREAK_BONUS = 0.1
const BAD_LUCK_BONUS = 0.15

export class BusinessGame {
    private state: GameState
    private eventListeners: Map<GameEventType, GameEventCallback[]> = new Map()
    private passiveIncomeInterval: ReturnType<typeof setInterval> | null = null
    private cooldownInterval: ReturnType<typeof setInterval> | null = null

    constructor() {
        this.state = {
            money: 0,
            lifetimeEarnings: 0,
            wins: 0,
            losses: 0,
            currentStreak: 0,
            biggestWin: 0,
            unlockedTiers: [1],
            ownedUpgrades: [],
            cooldowns: new Map(),
            history: [],
            popupLevel: 0,
        }

        this.cooldownInterval = setInterval(() => {
            this.emit("cooldownUpdate")
        }, 100)
    }

    public on(event: GameEventType, callback: GameEventCallback): void {
        if (!this.eventListeners.has(event)) {
            this.eventListeners.set(event, [])
        }
        this.eventListeners.get(event)?.push(callback)
    }

    private emit(event: GameEventType, data?: unknown): void {
        this.eventListeners.get(event)?.forEach((cb) => cb(data))
    }

    public getMoney(): number {
        return this.state.money
    }

    public getLifetimeEarnings(): number {
        return this.state.lifetimeEarnings
    }

    public getWins(): number {
        return this.state.wins
    }

    public getLosses(): number {
        return this.state.losses
    }

    public getCurrentStreak(): number {
        return this.state.currentStreak
    }

    public getBiggestWin(): number {
        return this.state.biggestWin
    }

    public getHistory(): HistoryEntry[] {
        return [...this.state.history]
    }

    public getOwnedUpgrades(): string[] {
        return [...this.state.ownedUpgrades]
    }

    public hasUpgrade(upgradeId: string): boolean {
        return this.state.ownedUpgrades.includes(upgradeId)
    }

    public getVentures(): Venture[] {
        return VENTURES
    }

    public getUpgrades(): Upgrade[] {
        return UPGRADES
    }

    public getUnlockedVentures(): Venture[] {
        return VENTURES.filter((v) => this.state.unlockedTiers.includes(v.tier))
    }

    public getLockedVentures(): Venture[] {
        return VENTURES.filter(
            (v) => !this.state.unlockedTiers.includes(v.tier)
        )
    }

    public getNextUnlockThreshold(): number | null {
        const maxUnlockedTier = Math.max(...this.state.unlockedTiers)
        const nextTier = maxUnlockedTier + 1
        return TIER_THRESHOLDS[nextTier] ?? null
    }

    public isOnCooldown(ventureId: string): boolean {
        const cooldownEnd = this.state.cooldowns.get(ventureId)
        if (!cooldownEnd) return false
        return Date.now() < cooldownEnd
    }

    public getCooldownRemaining(ventureId: string): number {
        const cooldownEnd = this.state.cooldowns.get(ventureId)
        if (!cooldownEnd) return 0
        return Math.max(0, cooldownEnd - Date.now())
    }

    public canAfford(ventureId: string): boolean {
        const venture = VENTURES.find((v) => v.id === ventureId)
        if (!venture) return false
        const cost = this.getEffectiveCost(venture)
        return this.state.money >= cost
    }

    private getEffectiveCost(venture: Venture): number {
        let cost = venture.cost
        if (venture.id === "email-forward" && this.hasUpgrade("mailing-list")) {
            cost *= 0.5
        }
        return cost
    }

    private getEffectivePayout(venture: Venture): number {
        let payout = venture.payout
        if (
            venture.id === "make-money" &&
            this.hasUpgrade("ergonomic-keyboard")
        ) {
            payout = 0.02
        }
        if (venture.id === "email-forward" && this.hasUpgrade("mailing-list")) {
            payout *= 1.5
        }
        return payout
    }

    public getEffectiveRisk(venture: Venture): number {
        let risk = venture.risk

        if (this.hasUpgrade("sales-training")) {
            risk -= 0.05
        }

        const streakBonus = this.hasUpgrade("lucky-tie")
            ? 0.15
            : BASE_STREAK_BONUS

        if (this.state.currentStreak >= STREAK_THRESHOLD) {
            risk -= streakBonus
        }

        if (this.state.currentStreak <= -STREAK_THRESHOLD) {
            risk -= BAD_LUCK_BONUS
        }

        return Math.max(0, Math.min(1, risk))
    }

    public canShowOdds(): boolean {
        return this.hasUpgrade("market-research")
    }

    public executeVenture(ventureId: string): {
        success: boolean
        amount: number
    } | null {
        const venture = VENTURES.find((v) => v.id === ventureId)
        if (!venture) return null

        if (!this.state.unlockedTiers.includes(venture.tier)) return null

        if (this.isOnCooldown(ventureId)) return null

        const cost = this.getEffectiveCost(venture)
        if (this.state.money < cost) return null

        this.state.money -= cost

        const risk = this.getEffectiveRisk(venture)
        const success = Math.random() >= risk

        let amount: number
        if (success) {
            amount = this.getEffectivePayout(venture)
            this.state.money += amount
            this.state.lifetimeEarnings += amount
            this.state.wins++
            this.state.currentStreak =
                this.state.currentStreak > 0 ? this.state.currentStreak + 1 : 1
            if (amount > this.state.biggestWin) {
                this.state.biggestWin = amount
            }
        } else {
            amount = -cost
            this.state.losses++
            this.state.currentStreak =
                this.state.currentStreak < 0 ? this.state.currentStreak - 1 : -1
        }

        if (venture.cooldownMs > 0) {
            this.state.cooldowns.set(ventureId, Date.now() + venture.cooldownMs)
        }

        this.state.history.unshift({
            ventureId,
            ventureName: venture.name,
            success,
            amount,
            timestamp: Date.now(),
        })
        if (this.state.history.length > 10) {
            this.state.history.pop()
        }

        this.emit("ventureResult", { ventureId, success, amount })
        this.emit("moneyChanged", this.state.money)

        this.checkUnlocks()
        this.checkPopups()

        return { success, amount }
    }

    private checkUnlocks(): void {
        const earnings = this.state.lifetimeEarnings

        for (const [tier, threshold] of Object.entries(TIER_THRESHOLDS)) {
            const tierNum = parseInt(tier)
            if (
                earnings >= threshold &&
                !this.state.unlockedTiers.includes(tierNum)
            ) {
                this.state.unlockedTiers.push(tierNum)
                this.emit("tierUnlocked", tierNum)
            }
        }
    }

    private checkPopups(): void {
        const earnings = this.state.lifetimeEarnings

        for (const { threshold, level } of POPUP_THRESHOLDS) {
            if (earnings >= threshold && this.state.popupLevel < level) {
                this.state.popupLevel = level
                this.emit("popupsActivate", level)
            }
        }
    }

    public purchaseUpgrade(upgradeId: string): boolean {
        const upgrade = UPGRADES.find((u) => u.id === upgradeId)
        if (!upgrade) return false

        if (this.state.ownedUpgrades.includes(upgradeId)) return false

        if (this.state.money < upgrade.cost) return false

        this.state.money -= upgrade.cost
        this.state.ownedUpgrades.push(upgradeId)

        if (upgrade.effect.type === "passiveIncome" && upgrade.effect.value) {
            this.startPassiveIncome(upgrade.effect.value)
        }

        this.emit("upgradeAcquired", upgradeId)
        this.emit("moneyChanged", this.state.money)

        return true
    }

    private startPassiveIncome(amountPerSecond: number): void {
        if (this.passiveIncomeInterval) return

        this.passiveIncomeInterval = setInterval(() => {
            this.state.money += amountPerSecond
            this.state.lifetimeEarnings += amountPerSecond
            this.emit("moneyChanged", this.state.money)
            this.checkUnlocks()
            this.checkPopups()
        }, 1000)
    }

    public addBonus(amount: number): void {
        this.state.money += amount
        this.state.lifetimeEarnings += amount
        this.emit("moneyChanged", this.state.money)
        this.checkUnlocks()
        this.checkPopups()
    }

    public destroy(): void {
        if (this.passiveIncomeInterval) {
            clearInterval(this.passiveIncomeInterval)
        }
        if (this.cooldownInterval) {
            clearInterval(this.cooldownInterval)
        }
    }
}

let gameInstance: BusinessGame | null = null

export function getBusinessGame(): BusinessGame {
    if (!gameInstance) {
        gameInstance = new BusinessGame()
    }
    return gameInstance
}
