import { emitAppEvent } from "../events"
import type { PrestigeSaveData } from "../progression/types"
import {
    ASCENSION_PRESERVED_UPGRADES,
    calculateForesight,
    FORESIGHT_UPGRADE_MAP,
} from "./ascension"
import {
    HINDSIGHT_UPGRADE_MAP,
    HINDSIGHT_UPGRADES,
    PRESTIGE_THRESHOLD,
} from "./constants"

type PrestigeEventType =
    | "prestigeTriggered"
    | "hindsightPurchase"
    | "ascensionTriggered"
    | "foresightPurchase"
type PrestigeCallback = (data?: unknown) => void

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
    private purchasedUpgrades: Map<string, number> = new Map() // id -> purchase count
    private lifetimeAcrossPrestiges: number = 0
    private onDirty: (() => void) | null = null
    private eventListeners: Map<PrestigeEventType, PrestigeCallback[]> =
        new Map()

    // ── Ascension state ───────────────────────────────────────────────────
    private ascensionCount: number = 0
    private foresight: number = 0
    private purchasedForesightUpgrades: Map<string, number> = new Map()
    private totalHindsightSpent: number = 0

    /** Optional external hindsight rate bonus (returns flat additive, e.g. 0.1 = +10%) */
    public hindsightBonusProvider: (() => number) | null = null

    // ── Events ───────────────────────────────────────────────────────────────

    public on(event: PrestigeEventType, callback: PrestigeCallback): void {
        if (!this.eventListeners.has(event)) {
            this.eventListeners.set(event, [])
        }
        this.eventListeners.get(event)?.push(callback)
    }

    private emit(event: PrestigeEventType, data?: unknown): void {
        this.eventListeners.get(event)?.forEach((cb) => cb(data))
    }

    // ── Dirty callback ───────────────────────────────────────────────────────

    public setDirtyCallback(fn: () => void): void {
        this.onDirty = fn
    }

    // ── Prestige check ───────────────────────────────────────────────────────

    public canPrestige(lifetimeEarnings: number): boolean {
        return lifetimeEarnings >= PRESTIGE_THRESHOLD
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

    // ── Hindsight shop ───────────────────────────────────────────────────────

    public purchaseUpgrade(upgradeId: string): boolean {
        const def = HINDSIGHT_UPGRADE_MAP.get(upgradeId)
        if (!def) return false

        const currentCount = this.purchasedUpgrades.get(upgradeId) ?? 0
        if (currentCount >= def.maxPurchases) return false
        if (this.currency < def.cost) return false

        this.currency -= def.cost
        this.totalHindsightSpent += def.cost
        this.purchasedUpgrades.set(upgradeId, currentCount + 1)

        this.emit("hindsightPurchase", { upgradeId, remaining: this.currency })
        emitAppEvent("prestige:purchase", { upgradeId })
        this.onDirty?.()
        return true
    }

    public hasUpgrade(upgradeId: string): boolean {
        return (this.purchasedUpgrades.get(upgradeId) ?? 0) > 0
    }

    public getUpgradePurchaseCount(upgradeId: string): number {
        return this.purchasedUpgrades.get(upgradeId) ?? 0
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
     * Factory cost scaling factor (default 1.19, reduced by Factory Blueprints).
     * 0 purchases = 1.19, 1 = 1.16, 2 = 1.14
     */
    public getFactoryCostScaling(): number {
        const count = this.getUpgradePurchaseCount("factory-blueprints")
        if (count >= 2) return 1.14
        if (count >= 1) return 1.16
        return 1.19
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

    // ── Ascension ─────────────────────────────────────────────────────────

    /**
     * Can ascend if all hindsight upgrades are fully purchased.
     */
    public canAscend(): boolean {
        for (const upgrade of HINDSIGHT_UPGRADES) {
            const count = this.purchasedUpgrades.get(upgrade.id) ?? 0
            if (count < upgrade.maxPurchases) return false
        }
        return true
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

        const preserved = new Map<string, number>()
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

    public purchaseForesightUpgrade(upgradeId: string): boolean {
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

    public hasForesightUpgrade(upgradeId: string): boolean {
        return (this.purchasedForesightUpgrades.get(upgradeId) ?? 0) > 0
    }

    public getForesightUpgradeCount(upgradeId: string): number {
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
        return 0.5 + count * 0.05 // 0.5, 0.55, 0.6
    }

    // ── Serialization ────────────────────────────────────────────────────────

    public serialize(): PrestigeSaveData {
        const purchased: string[] = []
        for (const [id, count] of this.purchasedUpgrades) {
            for (let i = 0; i < count; i++) {
                purchased.push(id)
            }
        }
        const purchasedForesight: string[] = []
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
