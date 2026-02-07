import { emitAppEvent } from "../events"
import type { PrestigeSaveData } from "../progression/types"
import {
    calculateHindsight,
    HINDSIGHT_UPGRADE_MAP,
    PRESTIGE_THRESHOLD,
} from "./constants"

type PrestigeEventType = "prestigeTriggered" | "hindsightPurchase"
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
        return calculateHindsight(lifetimeEarnings)
    }

    /**
     * Trigger a prestige. Returns the amount of Hindsight earned.
     * The caller is responsible for resetting the market game state.
     */
    public triggerPrestige(lifetimeEarnings: number): number {
        if (!this.canPrestige(lifetimeEarnings)) return 0

        const baseHindsight = calculateHindsight(lifetimeEarnings)
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

    // ── Serialization ────────────────────────────────────────────────────────

    public serialize(): PrestigeSaveData {
        const purchased: string[] = []
        for (const [id, count] of this.purchasedUpgrades) {
            for (let i = 0; i < count; i++) {
                purchased.push(id)
            }
        }
        return {
            count: this.count,
            currency: this.currency,
            purchasedUpgrades: purchased,
            lifetimeAcrossPrestiges: this.lifetimeAcrossPrestiges,
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
    }
}
