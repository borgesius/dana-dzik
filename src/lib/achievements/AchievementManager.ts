import { ACHIEVEMENT_MAP } from "./definitions"
import type { AchievementId, AchievementSaveData, CounterKey } from "./types"

type AchievementListener = (id: AchievementId) => void

export class AchievementManager {
    private earned: Map<AchievementId, number> = new Map()
    private counters: Map<string, number> = new Map()
    private sets: Map<string, Set<string>> = new Map()
    private reported: Set<AchievementId> = new Set()

    private listeners: AchievementListener[] = []
    private onDirty: (() => void) | null = null

    public onEarned(fn: AchievementListener): void {
        this.listeners.push(fn)
    }

    public setDirtyCallback(fn: () => void): void {
        this.onDirty = fn
    }

    public earn(id: AchievementId): boolean {
        if (!ACHIEVEMENT_MAP.has(id)) return false
        if (this.earned.has(id)) return false

        this.earned.set(id, Date.now())
        for (const fn of this.listeners) {
            fn(id)
        }
        this.onDirty?.()
        return true
    }

    public hasEarned(id: AchievementId): boolean {
        return this.earned.has(id)
    }

    public getEarnedTimestamp(id: AchievementId): number | null {
        return this.earned.get(id) ?? null
    }

    public getEarnedCount(): number {
        return this.earned.size
    }

    public getTotalCount(): number {
        return ACHIEVEMENT_MAP.size
    }

    public getAllEarned(): ReadonlyMap<AchievementId, number> {
        return this.earned
    }

    // ── Counters ─────────────────────────────────────────────────────────────

    public incrementCounter(key: CounterKey, amount: number = 1): number {
        const current = this.counters.get(key) ?? 0
        const next = current + amount
        this.counters.set(key, next)
        return next
    }

    public getCounter(key: CounterKey): number {
        return this.counters.get(key) ?? 0
    }

    // ── Sets (for tracking unique items like "windows opened") ───────────────

    public addToSet(key: string, value: string): number {
        let set = this.sets.get(key)
        if (!set) {
            set = new Set()
            this.sets.set(key, set)
        }
        set.add(value)
        return set.size
    }

    public getSetSize(key: string): number {
        return this.sets.get(key)?.size ?? 0
    }

    public setHas(key: string, value: string): boolean {
        return this.sets.get(key)?.has(value) ?? false
    }

    // ── Reporting (analytics dedup) ──────────────────────────────────────────

    public markReported(id: AchievementId): void {
        this.reported.add(id)
    }

    public isReported(id: AchievementId): boolean {
        return this.reported.has(id)
    }

    public getUnreported(): AchievementId[] {
        const result: AchievementId[] = []
        for (const id of this.earned.keys()) {
            if (!this.reported.has(id)) {
                result.push(id)
            }
        }
        return result
    }

    // ── Serialization ────────────────────────────────────────────────────────

    public serialize(): AchievementSaveData {
        const earned: Record<string, number> = {}
        for (const [id, ts] of this.earned) {
            earned[id] = ts
        }

        const counters: Record<string, number> = {}
        for (const [k, v] of this.counters) {
            counters[k] = v
        }

        const sets: Record<string, string[]> = {}
        for (const [k, v] of this.sets) {
            sets[k] = [...v]
        }

        return {
            earned,
            counters,
            sets,
            reported: [...this.reported],
        }
    }

    public deserialize(data: AchievementSaveData): void {
        this.earned.clear()
        this.counters.clear()
        this.sets.clear()
        this.reported.clear()

        if (data.earned) {
            for (const [id, ts] of Object.entries(data.earned)) {
                if (ACHIEVEMENT_MAP.has(id)) {
                    this.earned.set(id as AchievementId, ts)
                }
            }
        }

        if (data.counters) {
            for (const [k, v] of Object.entries(data.counters)) {
                this.counters.set(k, v)
            }
        }

        if (data.sets) {
            for (const [k, arr] of Object.entries(data.sets)) {
                this.sets.set(k, new Set(arr))
            }
        }

        if (data.reported) {
            for (const id of data.reported) {
                if (ACHIEVEMENT_MAP.has(id)) {
                    this.reported.add(id as AchievementId)
                }
            }
        }
    }
}
