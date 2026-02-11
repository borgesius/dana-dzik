import { emitAppEvent } from "../events"
import { levelFromXP, xpForLevel, xpToNextLevel } from "./constants"
import type { ProgressionSaveData } from "./types"
import { createEmptyProgressionData } from "./types"

interface ProgressionEventMap {
    xpGained: { amount: number; totalXP: number }
    levelUp: { oldLevel: number; newLevel: number; totalXP: number }
}

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
    private eventListeners = new Map<string, ((data: never) => void)[]>()

    /** Optional external XP rate bonus provider (returns a flat additive bonus, e.g. 0.1 = +10% XP) */
    public xpBonusProvider: (() => number) | null = null

    // ── Persistent exploration guards ────────────────────────────────────────
    private seenWindows: Set<string> = new Set()
    private seenThemes: Set<string> = new Set()
    private seenLocales: Set<string> = new Set()
    private awardedPinballThresholds: Set<number> = new Set()
    private guestbookSigned: boolean = false

    // ── Events ───────────────────────────────────────────────────────────────

    public on<K extends keyof ProgressionEventMap>(
        event: K,
        callback: (data: ProgressionEventMap[K]) => void
    ): void {
        if (!this.eventListeners.has(event)) {
            this.eventListeners.set(event, [])
        }
        this.eventListeners.get(event)?.push(callback as (data: never) => void)
    }

    private emit<K extends keyof ProgressionEventMap>(
        event: K,
        data: ProgressionEventMap[K]
    ): void {
        this.eventListeners
            .get(event)
            ?.forEach((cb) => (cb as (data: ProgressionEventMap[K]) => void)(data))
    }

    // ── XP ───────────────────────────────────────────────────────────────────

    public addXP(amount: number): void {
        if (amount <= 0) return

        const xpBonus = this.xpBonusProvider?.() ?? 0
        const effective =
            xpBonus > 0 ? Math.ceil(amount * (1 + xpBonus)) : amount

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

    /** Dev-only: directly set level and corresponding XP */
    public devSetLevel(level: number): void {
        this.totalXP = xpForLevel(level) + 1
        this.level = level
        this.onDirty?.()
    }

    public getLevelProgress(): {
        currentLevel: number
        xpIntoLevel: number
        xpNeededForNext: number
        progress: number
    } {
        return xpToNextLevel(this.totalXP)
    }

    // ── Exploration guards ─────────────────────────────────────────────────

    public hasSeenWindow(windowId: string): boolean {
        return this.seenWindows.has(windowId)
    }

    public markWindowSeen(windowId: string): void {
        this.seenWindows.add(windowId)
        this.onDirty?.()
    }

    public hasSeenTheme(themeId: string): boolean {
        return this.seenThemes.has(themeId)
    }

    public markThemeSeen(themeId: string): void {
        this.seenThemes.add(themeId)
        this.onDirty?.()
    }

    public hasSeenLocale(localeId: string): boolean {
        return this.seenLocales.has(localeId)
    }

    public markLocaleSeen(localeId: string): void {
        this.seenLocales.add(localeId)
        this.onDirty?.()
    }

    public hasPinballThreshold(threshold: number): boolean {
        return this.awardedPinballThresholds.has(threshold)
    }

    public markPinballThreshold(threshold: number): void {
        this.awardedPinballThresholds.add(threshold)
        this.onDirty?.()
    }

    public hasSignedGuestbook(): boolean {
        return this.guestbookSigned
    }

    public markGuestbookSigned(): void {
        this.guestbookSigned = true
        this.onDirty?.()
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
            exploration: {
                seenWindows: [...this.seenWindows],
                seenThemes: [...this.seenThemes],
                seenLocales: [...this.seenLocales],
                awardedPinballThresholds: [...this.awardedPinballThresholds],
                guestbookSigned: this.guestbookSigned,
            },
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

        // Restore exploration guards
        const ex = data.exploration
        if (ex) {
            this.seenWindows = new Set(ex.seenWindows ?? [])
            this.seenThemes = new Set(ex.seenThemes ?? [])
            this.seenLocales = new Set(ex.seenLocales ?? [])
            this.awardedPinballThresholds = new Set(
                ex.awardedPinballThresholds ?? []
            )
            this.guestbookSigned = ex.guestbookSigned ?? false
        }
    }
}
