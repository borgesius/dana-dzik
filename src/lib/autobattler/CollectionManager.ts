import { emitAppEvent } from "../events"
import type {
    AutobattlerSaveData,
    AutobattlerUnitEntry,
} from "../progression/types"
import type { FactionId } from "./types"
import { ALL_UNITS, getUnitsForFaction } from "./units"

type CollectionEventType = "unitUnlocked" | "factionComplete" | "spiralComplete"
type CollectionCallback = (data?: unknown) => void

let instance: CollectionManager | null = null

export function getCollectionManager(): CollectionManager {
    if (!instance) {
        instance = new CollectionManager()
    }
    return instance
}

const FACTIONS: FactionId[] = [
    "quickdraw",
    "deputies",
    "clockwork",
    "prospectors",
]

export class CollectionManager {
    private collection: Map<string, number> = new Map() // unitId -> count
    private completedRuns: number = 0
    private unlockedFactions: Set<string> = new Set()
    private spiralProgress: Map<string, boolean> = new Map()
    private onDirty: (() => void) | null = null
    private eventListeners: Map<CollectionEventType, CollectionCallback[]> =
        new Map()

    // ── Personal bests ──────────────────────────────────────────────────────
    private highestRound: number = 0
    private totalBossesDefeated: number = 0
    private bossesDefeatedSet: Set<string> = new Set()

    // ── Events ───────────────────────────────────────────────────────────────

    public on(event: CollectionEventType, callback: CollectionCallback): void {
        if (!this.eventListeners.has(event)) {
            this.eventListeners.set(event, [])
        }
        this.eventListeners.get(event)?.push(callback)
    }

    private emit(event: CollectionEventType, data?: unknown): void {
        this.eventListeners.get(event)?.forEach((cb) => cb(data))
    }

    // ── Dirty callback ───────────────────────────────────────────────────────

    public setDirtyCallback(fn: () => void): void {
        this.onDirty = fn
    }

    // ── Collection operations ────────────────────────────────────────────────

    public addUnit(unitId: string): void {
        const current = this.collection.get(unitId) ?? 0
        this.collection.set(unitId, current + 1)

        if (current === 0) {
            this.emit("unitUnlocked", { unitId })
            emitAppEvent("autobattler:unit-unlocked", { unitId })

            const unit = ALL_UNITS.find((u) => u.id === unitId)
            if (unit && unit.faction !== "drifters") {
                this.unlockedFactions.add(unit.faction)
                if (this.isFactionComplete(unit.faction as FactionId)) {
                    this.spiralProgress.set(unit.faction, true)
                    this.emit("factionComplete", { faction: unit.faction })
                    emitAppEvent("autobattler:faction-complete", {
                        faction: unit.faction,
                    })

                    if (this.isSpiralComplete()) {
                        this.emit("spiralComplete")
                        emitAppEvent("autobattler:spiral-complete")
                    }
                }
            }
        }

        this.onDirty?.()
    }

    public hasUnit(unitId: string): boolean {
        return (this.collection.get(unitId) ?? 0) > 0
    }

    public getUnitCount(unitId: string): number {
        return this.collection.get(unitId) ?? 0
    }

    public getUnlockedUnitIds(): Set<string> {
        const ids = new Set<string>()
        for (const [id, count] of this.collection) {
            if (count > 0) ids.add(id)
        }
        return ids
    }

    public isFactionComplete(faction: FactionId): boolean {
        const factionUnits = getUnitsForFaction(faction)
        return factionUnits.every((u) => this.hasUnit(u.id))
    }

    public isSpiralComplete(): boolean {
        return FACTIONS.every((f) => this.isFactionComplete(f))
    }

    public getCollectionSize(): number {
        let count = 0
        for (const v of this.collection.values()) {
            if (v > 0) count++
        }
        return count
    }

    // ── Run tracking ─────────────────────────────────────────────────────────

    public recordRunComplete(
        majorityFaction?: string,
        losses: number = 0,
        lineupFactions: string[] = [],
        highestRound: number = 0
    ): void {
        this.completedRuns++

        if (highestRound > this.highestRound) {
            this.highestRound = highestRound
        }

        emitAppEvent("autobattler:run-complete", {
            majorityFaction,
            losses,
            lineupFactions,
            highestRound,
        })
        this.onDirty?.()
    }

    /**
     * Record a boss defeat for personal bests / achievement tracking.
     * Returns the number of unique bosses defeated.
     */
    public recordBossDefeated(bossId: string): number {
        this.totalBossesDefeated++
        this.bossesDefeatedSet.add(bossId)
        this.onDirty?.()
        return this.bossesDefeatedSet.size
    }

    // ── Getters ──────────────────────────────────────────────────────────────

    public getCompletedRuns(): number {
        return this.completedRuns
    }

    public getUnlockedFactions(): string[] {
        return [...this.unlockedFactions]
    }

    public getHighestRound(): number {
        return this.highestRound
    }

    public getTotalBossesDefeated(): number {
        return this.totalBossesDefeated
    }

    public getUniqueBossesDefeated(): number {
        return this.bossesDefeatedSet.size
    }

    // ── Dev-only setters ────────────────────────────────────────────────────

    public devUnlockAllUnits(): void {
        for (const unit of ALL_UNITS) {
            if (!this.hasUnit(unit.id)) {
                this.addUnit(unit.id)
            }
        }
    }

    public devSetBossesDefeated(count: number): void {
        this.totalBossesDefeated = count
        this.onDirty?.()
    }

    // ── Serialization ────────────────────────────────────────────────────────

    public serialize(): AutobattlerSaveData {
        const collection: AutobattlerUnitEntry[] = []
        for (const [unitId, count] of this.collection) {
            if (count > 0) {
                collection.push({ unitId, count })
            }
        }

        const spiral: Record<string, boolean> = {}
        for (const [k, v] of this.spiralProgress) {
            spiral[k] = v
        }

        return {
            collection,
            completedRuns: this.completedRuns,
            unlockedFactions: [...this.unlockedFactions],
            spiralProgress: spiral,
            highestRound: this.highestRound,
            totalBossesDefeated: this.totalBossesDefeated,
            bossesDefeatedSet: [...this.bossesDefeatedSet],
        }
    }

    public deserialize(data: AutobattlerSaveData): void {
        this.collection.clear()
        this.unlockedFactions.clear()
        this.spiralProgress.clear()
        this.bossesDefeatedSet.clear()

        if (data.collection) {
            for (const entry of data.collection) {
                this.collection.set(entry.unitId, entry.count)
            }
        }

        this.completedRuns = data.completedRuns ?? 0

        if (data.unlockedFactions) {
            for (const f of data.unlockedFactions) {
                this.unlockedFactions.add(f)
            }
        }

        if (data.spiralProgress) {
            for (const [k, v] of Object.entries(data.spiralProgress)) {
                this.spiralProgress.set(k, v)
            }
        }

        // Personal bests
        this.highestRound = data.highestRound ?? 0
        this.totalBossesDefeated = data.totalBossesDefeated ?? 0
        if (data.bossesDefeatedSet) {
            for (const id of data.bossesDefeatedSet) {
                this.bossesDefeatedSet.add(id)
            }
        }
    }
}
