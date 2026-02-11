import { emitAppEvent } from "../events"
import type { PrestigeSaveData } from "../progression/types"
import {
    ASCENSION_PRESERVED_UPGRADES,
    ASCENSION_SPEND_THRESHOLD,
    calculateForesight,
    FORESIGHT_UPGRADE_MAP,
    type ForesightUpgradeId,
} from "./ascension"
import {
    getPrestigeThreshold,
    HINDSIGHT_UPGRADE_MAP,
    HINDSIGHT_UPGRADES,
    hindsightUpgradeCostAt,
    type HindsightUpgradeId,
} from "./constants"

interface PrestigeEventMap {
    prestigeTriggered: {
        count: number
        hindsightGained: number
        totalHindsight: number
    }
    hindsightPurchase: { upgradeId: HindsightUpgradeId; remaining: number }
    ascensionTriggered: { count: number; foresightGained: number }
    foresightPurchase: { upgradeId: ForesightUpgradeId; remaining: number }
}

let instance: PrestigeManager | null = null

export function getPrestigeManager(): PrestigeManager {
    if (!instance) {
        instance = new PrestigeManager()
    }
    return instance
}

export class PrestigeManager {
    private count: number = 0
    private currency: number = 0 // Hindsight
    private purchasedUpgrades: Map<HindsightUpgradeId, number> = new Map() // id -> purchase count
    private lifetimeAcrossPrestiges: number = 0
    private onDirty: (() => void) | null = null
    private eventListeners = new Map<string, ((data: never) => void)[]>()

    // ── Ascension state ───────────────────────────────────────────────────
    private ascensionCount: number = 0
    private foresight: number = 0
    private purchasedForesightUpgrades: Map<ForesightUpgradeId, number> =
        new Map()
    private totalHindsightSpent: number = 0

    /** Optional external hindsight rate bonus (returns flat additive, e.g. 0.1 = +10%) */
    public hindsightBonusProvider: (() => number) | null = null

    // ── Events ───────────────────────────────────────────────────────────────

    public on<K extends keyof PrestigeEventMap>(
        event: K,
        callback: (data: PrestigeEventMap[K]) => void
    ): void {
        if (!this.eventListeners.has(event)) {
            this.eventListeners.set(event, [])
        }
        this.eventListeners.get(event)?.push(callback as (data: never) => void)
    }

    private emit<K extends keyof PrestigeEventMap>(
        event: K,
        data: PrestigeEventMap[K]
    ): void {
        this.eventListeners
            .get(event)
            ?.forEach((cb) => (cb as (data: unknown) => void)(data))
    }

    // ── Dirty callback ───────────────────────────────────────────────────────

    public setDirtyCallback(fn: () => void): void {
        this.onDirty = fn
    }

    // ── Prestige check (scaling threshold) ────────────────────────────────

    public canPrestige(lifetimeEarnings: number): boolean {
        return lifetimeEarnings >= getPrestigeThreshold(this.count)
    }

    public getCurrentPrestigeThreshold(): number {
        return getPrestigeThreshold(this.count)
    }

    public getHindsightPreview(lifetimeEarnings: number): number {
        const exp = this.getHindsightExponent()
        const base = Math.floor(Math.pow(lifetimeEarnings / 100, exp))
        const bonus = this.hindsightBonusProvider?.() ?? 0
        return bonus > 0 ? Math.ceil(base * (1 + bonus)) : base
    }

    /**
     * Trigger a prestige. Returns the amount of Hindsight earned.
     * The caller is responsible for resetting the market game state.
     */
    public triggerPrestige(lifetimeEarnings: number): number {
        if (!this.canPrestige(lifetimeEarnings)) return 0

        const exp = this.getHindsightExponent()
        const baseHindsight = Math.floor(Math.pow(lifetimeEarnings / 100, exp))
        const hindsightBonus = this.hindsightBonusProvider?.() ?? 0
        const hindsightGained =
            hindsightBonus > 0
                ? Math.ceil(baseHindsight * (1 + hindsightBonus))
                : baseHindsight
        this.currency += hindsightGained
        this.lifetimeAcrossPrestiges += lifetimeEarnings
        this.count++

        this.emit("prestigeTriggered", {
            count: this.count,
            hindsightGained,
            totalHindsight: this.currency,
        })

        emitAppEvent("prestige:triggered", {
            count: this.count,
            hindsight: this.currency,
        })

        this.onDirty?.()
        return hindsightGained
    }

    // ── Hindsight shop (scaling costs) ────────────────────────────────────

    /**
     * Cost of the *next* purchase of a hindsight upgrade, accounting for
     * scaling and current purchase count.
     */
    public getUpgradeCost(upgradeId: HindsightUpgradeId): number {
        const def = HINDSIGHT_UPGRADE_MAP.get(upgradeId)
        if (!def) return Infinity
        const currentCount = this.purchasedUpgrades.get(upgradeId) ?? 0
        if (currentCount >= def.maxPurchases) return Infinity
        return hindsightUpgradeCostAt(def, currentCount)
    }

    public purchaseUpgrade(upgradeId: HindsightUpgradeId): boolean {
        const def = HINDSIGHT_UPGRADE_MAP.get(upgradeId)
        if (!def) return false

        const currentCount = this.purchasedUpgrades.get(upgradeId) ?? 0
        if (currentCount >= def.maxPurchases) return false

        // Check prestige gate
        if (def.requiresPrestiges > this.count) return false

        const cost = hindsightUpgradeCostAt(def, currentCount)
        if (this.currency < cost) return false

        this.currency -= cost
        this.totalHindsightSpent += cost
        this.purchasedUpgrades.set(upgradeId, currentCount + 1)

        this.emit("hindsightPurchase", { upgradeId, remaining: this.currency })
        emitAppEvent("prestige:purchase", { upgradeId })
        this.onDirty?.()
        return true
    }

    public hasUpgrade(upgradeId: HindsightUpgradeId): boolean {
        return (this.purchasedUpgrades.get(upgradeId) ?? 0) > 0
    }

    public getUpgradePurchaseCount(upgradeId: HindsightUpgradeId): number {
        return this.purchasedUpgrades.get(upgradeId) ?? 0
    }

    /**
     * Check if a hindsight upgrade is visible (meets prestige gate).
     */
    public isUpgradeVisible(upgradeId: HindsightUpgradeId): boolean {
        const def = HINDSIGHT_UPGRADE_MAP.get(upgradeId)
        if (!def) return false
        return this.count >= def.requiresPrestiges
    }

    /**
     * Get all visible hindsight upgrades (those whose prestige gate is met).
     */
    public getVisibleUpgrades(): typeof HINDSIGHT_UPGRADES {
        return HINDSIGHT_UPGRADES.filter(
            (u) => this.count >= u.requiresPrestiges
        )
    }

    public getTotalHindsightSpent(): number {
        return this.totalHindsightSpent
    }

    // ── Dev-only setters ────────────────────────────────────────────────────

    public devSetPrestigeCount(n: number): void {
        this.count = n
        this.onDirty?.()
    }

    public devAddHindsight(amount: number): void {
        this.currency += amount
        this.onDirty?.()
    }

    public devSetAscensionCount(n: number): void {
        this.ascensionCount = n
        this.onDirty?.()
    }

    public devAddForesight(amount: number): void {
        this.foresight += amount
        this.onDirty?.()
    }

    // ── Getters ──────────────────────────────────────────────────────────────

    public getCount(): number {
        return this.count
    }

    public getCurrency(): number {
        return this.currency
    }

    public getLifetimeAcrossPrestiges(): number {
        return this.lifetimeAcrossPrestiges
    }

    /**
     * Returns the starting cash for a new run, considering prestige upgrades.
     */
    public getStartingCash(): number {
        if (this.hasUpgrade("lavish-capital")) return 15
        if (this.hasUpgrade("generous-capital")) return 5
        if (this.hasUpgrade("starting-capital")) return 1
        return 0.1
    }

    /**
     * Returns the set of phases that should be unlocked on new run.
     */
    public getStartingPhases(): number[] {
        const phases = [1]
        if (this.hasUpgrade("phase-memory")) phases.push(2)
        if (this.hasUpgrade("deep-phase-memory")) phases.push(2, 3)
        return [...new Set(phases)]
    }

    /**
     * Factory output multiplier from prestige upgrades.
     */
    public getFactoryMultiplier(): number {
        const count = this.getUpgradePurchaseCount("factory-efficiency")
        return 1 + count * 0.1
    }

    /**
     * Phase threshold reduction from Institutional Memory (15% per stack, max 3).
     */
    public getPhaseThresholdReduction(): number {
        const count = this.getUpgradePurchaseCount("institutional-memory")
        return count * 0.15
    }

    /**
     * Factory cost scaling factor (default 1.19, reduced by Factory Blueprints + Empire).
     * Blueprints: 0 = 1.19, 1 = 1.16, 2 = 1.14
     * Factory Empire: -0.01 per stack
     */
    public getFactoryCostScaling(): number {
        const bpCount = this.getUpgradePurchaseCount("factory-blueprints")
        let base = 1.19
        if (bpCount >= 2) base = 1.14
        else if (bpCount >= 1) base = 1.16

        const empireCount = this.getUpgradePurchaseCount("factory-empire")
        return Math.max(1.05, base - empireCount * 0.01)
    }

    /**
     * Production speed bonus from Overclocked (+20% per stack, max 2).
     * Returns multiplier like 1.0, 1.2, 1.4
     */
    public getProductionSpeedMultiplier(): number {
        const count = this.getUpgradePurchaseCount("overclocked")
        return 1 + count * 0.2
    }

    /**
     * Hiring discount from prestige upgrades (0 or 0.25).
     */
    public getHiringDiscount(): number {
        return this.hasUpgrade("hiring-discount") ? 0.25 : 0
    }

    /**
     * Whether Scrap Dividend is unlocked (5% trade -> scrap).
     */
    public hasScrapDividend(): boolean {
        return this.hasUpgrade("scrap-dividend")
    }

    /**
     * Factory cost discount from Cheaper Factories (0 or 0.15).
     */
    public getCheaperFactoriesDiscount(): number {
        return this.hasUpgrade("cheaper-factories") ? 0.15 : 0
    }

    /**
     * Whether Insider Edge is active (events less random).
     */
    public hasInsiderEdge(): boolean {
        return this.hasUpgrade("insider-edge")
    }

    /**
     * Whether Frontier Dispatch is active (+25% autobattler commodity rewards).
     */
    public hasFrontierDispatch(): boolean {
        return this.hasUpgrade("frontier-dispatch")
    }

    /**
     * Career bonus multiplier from Veteran's Network (1.0 or 1.5).
     */
    public getVeteransNetworkMultiplier(): number {
        return this.hasUpgrade("veterans-network") ? 1.5 : 1
    }

    // ── Tier 2 upgrade accessors ────────────────────────────────────────────

    /**
     * Harvest yield bonus from Harvest Boost (+15% per stack, max 3).
     */
    public getHarvestBoostMultiplier(): number {
        const count = this.getUpgradePurchaseCount("harvest-boost")
        return 1 + count * 0.15
    }

    /**
     * Trade batch size bonus from Trade Volume (+10 per stack, max 2).
     */
    public getTradeBatchBonus(): number {
        return this.getUpgradePurchaseCount("trade-volume") * 10
    }

    /**
     * Event foresight ticks from Event Foresight (0 or 3).
     */
    public getEventForesightTicks(): number {
        return this.hasUpgrade("event-foresight") ? 3 : 0
    }

    /**
     * Quick Start: first 30 ticks get 2x factory speed.
     */
    public hasQuickStart(): boolean {
        return this.hasUpgrade("quick-start")
    }

    /**
     * Commodity Affinity: number of commodities to unlock immediately.
     */
    public getCommodityAffinityCount(): number {
        return this.getUpgradePurchaseCount("commodity-affinity")
    }

    /**
     * Portfolio Insurance: 25% of holdings survive prestige.
     */
    public hasPortfolioInsurance(): boolean {
        return this.hasUpgrade("portfolio-insurance")
    }

    /**
     * Earnings Momentum: lifetime earnings count 10% toward next prestige.
     */
    public hasEarningsMomentum(): boolean {
        return this.hasUpgrade("earnings-momentum")
    }

    /**
     * Influence Mastery: influence cooldowns reduced 30%.
     */
    public hasInfluenceMastery(): boolean {
        return this.hasUpgrade("influence-mastery")
    }

    // ── Tier 3 upgrade accessors ────────────────────────────────────────────

    /**
     * DAS Expansion: +2 max DAS positions per stack.
     */
    public getDASExpansion(): number {
        return this.getUpgradePurchaseCount("das-expansion") * 2
    }

    /**
     * Rating Momentum: review ticks (40 vs 50).
     */
    public getRatingReviewTicks(): number {
        return this.hasUpgrade("rating-momentum") ? 40 : 50
    }

    /**
     * Headhunter: employee candidates always max level.
     */
    public hasHeadhunter(): boolean {
        return this.hasUpgrade("headhunter")
    }

    /**
     * Thought Conductor: trades have 10% chance to grant 2x Thoughts.
     */
    public hasThoughtConductor(): boolean {
        return this.hasUpgrade("thought-conductor")
    }

    /**
     * Passive Income: earn 0.05% net worth per tick.
     */
    public hasPassiveIncome(): boolean {
        return this.hasUpgrade("passive-income")
    }

    // ── Tier 4 upgrade accessors ────────────────────────────────────────────

    /**
     * Market Oracle: see event impact magnitude.
     */
    public hasMarketOracle(): boolean {
        return this.hasUpgrade("market-oracle")
    }

    /**
     * Perpetual Growth: harvest yield grows +0.1% per lifetime prestige.
     */
    public getPerpetualGrowthBonus(): number {
        if (!this.hasUpgrade("perpetual-growth")) return 0
        return this.count * 0.001
    }

    /**
     * Compound Dividends: DAS yield compounds.
     */
    public hasCompoundDividends(): boolean {
        return this.hasUpgrade("compound-dividends")
    }

    /**
     * Infinite Momentum: mastery levels retain 10% through prestige.
     */
    public hasInfiniteMomentum(): boolean {
        return this.hasUpgrade("infinite-momentum")
    }

    // ── Foresight upgrade accessors ───────────────────────────────────────

    /**
     * Whether Perpetual Factories is active (1 of each factory survives prestige).
     */
    public hasPerpetualFactories(): boolean {
        return this.hasForesightUpgrade("perpetual-factories")
    }

    /**
     * Whether Veteran Recruits is active (seed 1 employee after prestige).
     */
    public hasVeteranRecruits(): boolean {
        return this.hasForesightUpgrade("veteran-recruits")
    }

    /**
     * Whether Career Tenure is active (reduced dormant penalty).
     */
    public hasCareerTenure(): boolean {
        return this.hasForesightUpgrade("career-tenure")
    }

    /**
     * Offline catchup efficiency (0.8 base, 0.95 with Compound Interest).
     */
    public getOfflineEfficiency(): number {
        return this.hasForesightUpgrade("compound-interest") ? 0.95 : 0.8
    }

    /**
     * Whether Market Memory is active (1 random upgrade after prestige).
     */
    public hasMarketMemory(): boolean {
        return this.hasForesightUpgrade("market-memory")
    }

    /**
     * Whether Spiral Momentum is active (unit unlocks persist through ascension).
     */
    public hasSpiralMomentum(): boolean {
        return this.hasForesightUpgrade("spiral-momentum")
    }

    // ── New foresight upgrade accessors ───────────────────────────────────

    /**
     * Factory Dominion: start prestige with 2 of each factory type.
     */
    public getFactoryDominionCount(): number {
        return this.hasForesightUpgrade("factory-dominion") ? 2 : 0
    }

    /**
     * Market Savant: start prestige with N random upgrades.
     */
    public getMarketSavantCount(): number {
        return this.getForesightUpgradeCount("market-savant") * 3
    }

    /**
     * Mastery Retention: mastery levels retain 25% through prestige.
     */
    public hasMasteryRetention(): boolean {
        return this.hasForesightUpgrade("mastery-retention")
    }

    /**
     * Cross-Pollination: autobattler wins grant 2x commodity rewards.
     */
    public hasCrossPollination(): boolean {
        return this.hasForesightUpgrade("cross-pollination")
    }

    /**
     * Institutional Knowledge: start with Phase 4 unlocked.
     */
    public hasInstitutionalKnowledge(): boolean {
        return this.hasForesightUpgrade("institutional-knowledge")
    }

    // ── Ascension ─────────────────────────────────────────────────────────

    /**
     * Can ascend if total hindsight spent >= ASCENSION_SPEND_THRESHOLD.
     * Players don't need to buy ALL upgrades, just invest enough total.
     */
    public canAscend(): boolean {
        return this.totalHindsightSpent >= ASCENSION_SPEND_THRESHOLD
    }

    public getAscensionCount(): number {
        return this.ascensionCount
    }

    public getForesight(): number {
        return this.foresight
    }

    public getForesightPreview(): number {
        return calculateForesight(this.totalHindsightSpent)
    }

    /**
     * Trigger ascension. Resets prestige count, Hindsight, and non-preserved upgrades.
     * Returns Foresight earned.
     */
    public triggerAscension(): number {
        if (!this.canAscend()) return 0

        const foresightGained = calculateForesight(this.totalHindsightSpent)
        this.foresight += foresightGained
        this.ascensionCount++

        this.count = 0
        this.currency = 0
        this.totalHindsightSpent = 0

        const preserved = new Map<HindsightUpgradeId, number>()
        for (const [id, count] of this.purchasedUpgrades) {
            if (ASCENSION_PRESERVED_UPGRADES.has(id)) {
                preserved.set(id, count)
            }
        }
        this.purchasedUpgrades = preserved

        this.emit("ascensionTriggered", {
            count: this.ascensionCount,
            foresightGained,
        })
        emitAppEvent("prestige:ascension", {
            count: this.ascensionCount,
            foresight: this.foresight,
        })

        this.onDirty?.()
        return foresightGained
    }

    // ── Foresight shop ────────────────────────────────────────────────────

    public purchaseForesightUpgrade(upgradeId: ForesightUpgradeId): boolean {
        const def = FORESIGHT_UPGRADE_MAP.get(upgradeId)
        if (!def) return false

        const currentCount = this.purchasedForesightUpgrades.get(upgradeId) ?? 0
        if (currentCount >= def.maxPurchases) return false
        if (this.foresight < def.cost) return false

        this.foresight -= def.cost
        this.purchasedForesightUpgrades.set(upgradeId, currentCount + 1)

        this.emit("foresightPurchase", {
            upgradeId,
            remaining: this.foresight,
        })
        emitAppEvent("prestige:foresight-purchase", { upgradeId })
        this.onDirty?.()
        return true
    }

    public hasForesightUpgrade(upgradeId: ForesightUpgradeId): boolean {
        return (this.purchasedForesightUpgrades.get(upgradeId) ?? 0) > 0
    }

    public getForesightUpgradeCount(upgradeId: ForesightUpgradeId): number {
        return this.purchasedForesightUpgrades.get(upgradeId) ?? 0
    }

    /**
     * Bonus starting scrap for autobattler from Scrap Reserves.
     */
    public getScrapReservesBonus(): number {
        return this.getForesightUpgradeCount("scrap-reserves") * 2
    }

    /**
     * Enhanced hindsight exponent from Deep Hindsight.
     */
    public getHindsightExponent(): number {
        const count = this.getForesightUpgradeCount("deep-hindsight")
        return 0.5 + count * 0.05 // 0.5, 0.55, 0.6, 0.65
    }

    // ── Serialization ────────────────────────────────────────────────────────

    public serialize(): PrestigeSaveData {
        const purchased: HindsightUpgradeId[] = []
        for (const [id, count] of this.purchasedUpgrades) {
            for (let i = 0; i < count; i++) {
                purchased.push(id)
            }
        }
        const purchasedForesight: ForesightUpgradeId[] = []
        for (const [id, count] of this.purchasedForesightUpgrades) {
            for (let i = 0; i < count; i++) {
                purchasedForesight.push(id)
            }
        }
        return {
            count: this.count,
            currency: this.currency,
            purchasedUpgrades: purchased,
            lifetimeAcrossPrestiges: this.lifetimeAcrossPrestiges,
            ascensionCount: this.ascensionCount,
            foresight: this.foresight,
            purchasedForesightUpgrades: purchasedForesight,
            totalHindsightSpent: this.totalHindsightSpent,
        }
    }

    public deserialize(data: PrestigeSaveData): void {
        this.count = data.count ?? 0
        this.currency = data.currency ?? 0
        this.lifetimeAcrossPrestiges = data.lifetimeAcrossPrestiges ?? 0

        this.purchasedUpgrades.clear()
        if (data.purchasedUpgrades) {
            for (const id of data.purchasedUpgrades) {
                this.purchasedUpgrades.set(
                    id,
                    (this.purchasedUpgrades.get(id) ?? 0) + 1
                )
            }
        }

        // Ascension
        this.ascensionCount = data.ascensionCount ?? 0
        this.foresight = data.foresight ?? 0
        this.totalHindsightSpent = data.totalHindsightSpent ?? 0

        this.purchasedForesightUpgrades.clear()
        if (data.purchasedForesightUpgrades) {
            for (const id of data.purchasedForesightUpgrades) {
                this.purchasedForesightUpgrades.set(
                    id,
                    (this.purchasedForesightUpgrades.get(id) ?? 0) + 1
                )
            }
        }
    }
}
