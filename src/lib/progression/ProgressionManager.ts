import { emitAppEvent } from "../events"
import { levelFromXP, xpToNextLevel } from "./constants"
import type { ProgressionSaveData } from "./types"
import { createEmptyProgressionData } from "./types"

type ProgressionEventType = "xpGained" | "levelUp"
type ProgressionCallback = (data?: unknown) => void

let instance: ProgressionManager | null = null

export function getProgressionManager(): ProgressionManager {
    if (!instance) {
        instance = new ProgressionManager()
    }
    return instance
}

export class ProgressionManager {
    private totalXP: number = 0
    private level: number = 0
    private onDirty: (() => void) | null = null
    private eventListeners: Map<ProgressionEventType, ProgressionCallback[]> =
        new Map()

    /** Optional external XP rate bonus provider (returns a flat additive bonus, e.g. 0.1 = +10% XP) */
    public xpBonusProvider: (() => number) | null = null

    // ── Events ───────────────────────────────────────────────────────────────

    public on(event: ProgressionEventType, callback: ProgressionCallback): void {
        if (!this.eventListeners.has(event)) {
            this.eventListeners.set(event, [])
        }
        this.eventListeners.get(event)?.push(callback)
    }

    private emit(event: ProgressionEventType, data?: unknown): void {
        this.eventListeners.get(event)?.forEach((cb) => cb(data))
    }

    // ── XP ───────────────────────────────────────────────────────────────────

    public addXP(amount: number): void {
        if (amount <= 0) return

        // Apply XP rate bonus from career tree
        const xpBonus = this.xpBonusProvider?.() ?? 0
        const effective = xpBonus > 0 ? Math.ceil(amount * (1 + xpBonus)) : amount

        this.totalXP += effective
        const newLevel = levelFromXP(this.totalXP)

        this.emit("xpGained", { amount: effective, totalXP: this.totalXP })

        if (newLevel > this.level) {
            const oldLevel = this.level
            this.level = newLevel
            this.emit("levelUp", {
                oldLevel,
                newLevel,
                totalXP: this.totalXP,
            })
            emitAppEvent("progression:level-up", { level: newLevel })
        }

        this.onDirty?.()
    }

    public getTotalXP(): number {
        return this.totalXP
    }

    public getLevel(): number {
        return this.level
    }

    public getLevelProgress(): {
        currentLevel: number
        xpIntoLevel: number
        xpNeededForNext: number
        progress: number
    } {
        return xpToNextLevel(this.totalXP)
    }

    // ── Dirty callback ───────────────────────────────────────────────────────

    public setDirtyCallback(fn: () => void): void {
        this.onDirty = fn
    }

    // ── Serialization ────────────────────────────────────────────────────────

    public serialize(): ProgressionSaveData {
        return {
            ...createEmptyProgressionData(),
            totalXP: this.totalXP,
            level: this.level,
        }
    }

    public deserialize(data: ProgressionSaveData): void {
        this.totalXP = data.totalXP ?? 0
        this.level = data.level ?? 0

        // Recalculate level from XP in case of inconsistency
        const correctLevel = levelFromXP(this.totalXP)
        if (correctLevel !== this.level) {
            this.level = correctLevel
        }
    }
}
