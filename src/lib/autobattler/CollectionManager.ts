import { emitAppEvent } from "../events"
import type {
    AutobattlerSaveData,
    AutobattlerUnitEntry,
} from "../progression/types"
import { getDefaultUnlockedRelicIds } from "./relics"
import type { BossId, FactionId, RelicId, UnitId } from "./types"
import { ALL_UNITS, getUnitsForFaction } from "./units"

interface CollectionEventMap {
    unitUnlocked: { unitId: UnitId }
    factionComplete: { faction: FactionId }
    spiralComplete: undefined
    relicUnlocked: { relicId: RelicId }
}

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
    private collection: Map<UnitId, number> = new Map() // unitId -> count
    private completedRuns: number = 0
    private unlockedFactions: Set<FactionId> = new Set()
    private spiralProgress: Map<FactionId, boolean> = new Map()
    private onDirty: (() => void) | null = null
    private eventListeners = new Map<string, ((data: never) => void)[]>()

    // ── Personal bests ──────────────────────────────────────────────────────
    private highestRound: number = 0
    private totalBossesDefeated: number = 0
    private bossesDefeatedSet: Set<BossId> = new Set()

    // ── Relic unlocks ────────────────────────────────────────────────────────
    private unlockedRelics: Set<RelicId> = new Set(getDefaultUnlockedRelicIds())
    /** Total units bought across all runs (for relic unlock tracking) */
    private totalUnitsBought: number = 0

    // ── Events ───────────────────────────────────────────────────────────────

    public on<K extends keyof CollectionEventMap>(
        event: K,
        callback: CollectionEventMap[K] extends undefined
            ? () => void
            : (data: CollectionEventMap[K]) => void
    ): void {
        if (!this.eventListeners.has(event)) {
            this.eventListeners.set(event, [])
        }
        this.eventListeners.get(event)?.push(callback as (data: never) => void)
    }

    private emit<K extends keyof CollectionEventMap>(
        event: K,
        ...args: CollectionEventMap[K] extends undefined
            ? []
            : [data: CollectionEventMap[K]]
    ): void {
        const data = args[0]
        this.eventListeners
            .get(event)
            ?.forEach((cb) => (cb as (data: unknown) => void)(data))
    }

    // ── Dirty callback ───────────────────────────────────────────────────────

    public setDirtyCallback(fn: () => void): void {
        this.onDirty = fn
    }

    // ── Collection operations ────────────────────────────────────────────────

    public addUnit(unitId: UnitId): void {
        const current = this.collection.get(unitId) ?? 0
        this.collection.set(unitId, current + 1)

        if (current === 0) {
            this.emit("unitUnlocked", { unitId })
            emitAppEvent("autobattler:unit-unlocked", { unitId })

            const unit = ALL_UNITS.find((u) => u.id === unitId)
            if (unit && unit.faction !== "drifters") {
                this.unlockedFactions.add(unit.faction)
                if (this.isFactionComplete(unit.faction)) {
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

    public hasUnit(unitId: UnitId): boolean {
        return (this.collection.get(unitId) ?? 0) > 0
    }

    public getUnitCount(unitId: UnitId): number {
        return this.collection.get(unitId) ?? 0
    }

    public getUnlockedUnitIds(): Set<UnitId> {
        const ids = new Set<UnitId>()
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
        majorityFaction?: FactionId,
        losses: number = 0,
        lineupFactions: FactionId[] = [],
        highestRound: number = 0,
        relicsCollected: number = 0
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
            relicsCollected,
        })
        this.onDirty?.()
    }

    /**
     * Record a boss defeat for personal bests / achievement tracking.
     * Returns the number of unique bosses defeated.
     */
    public recordBossDefeated(bossId: BossId): number {
        this.totalBossesDefeated++
        this.bossesDefeatedSet.add(bossId)
        this.onDirty?.()
        return this.bossesDefeatedSet.size
    }

    // ── Getters ──────────────────────────────────────────────────────────────

    public getCompletedRuns(): number {
        return this.completedRuns
    }

    public getUnlockedFactions(): FactionId[] {
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

    public hasBossDefeated(bossId: BossId): boolean {
        return this.bossesDefeatedSet.has(bossId)
    }

    // ── Relic unlock operations ──────────────────────────────────────────────

    public unlockRelic(relicId: RelicId): void {
        if (this.unlockedRelics.has(relicId)) return
        this.unlockedRelics.add(relicId)
        this.emit("relicUnlocked", { relicId })
        emitAppEvent("autobattler:relic-unlocked", { relicId })
        this.onDirty?.()
    }

    public hasRelicUnlocked(relicId: RelicId): boolean {
        return this.unlockedRelics.has(relicId)
    }

    public getUnlockedRelicIds(): Set<RelicId> {
        return new Set(this.unlockedRelics)
    }

    public getUnlockedRelicCount(): number {
        return this.unlockedRelics.size
    }

    public getTotalUnitsBought(): number {
        return this.totalUnitsBought
    }

    public addUnitsBought(count: number): void {
        this.totalUnitsBought += count
        this.onDirty?.()
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
            unlockedRelics: [...this.unlockedRelics],
            totalUnitsBought: this.totalUnitsBought,
        }
    }

    public deserialize(data: AutobattlerSaveData): void {
        this.collection.clear()
        this.unlockedFactions.clear()
        this.spiralProgress.clear()
        this.bossesDefeatedSet.clear()
        this.unlockedRelics.clear()

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
                this.spiralProgress.set(k as FactionId, v)
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

        // Relic unlocks (merge with defaults)
        for (const id of getDefaultUnlockedRelicIds()) {
            this.unlockedRelics.add(id)
        }
        if (data.unlockedRelics) {
            for (const id of data.unlockedRelics) {
                this.unlockedRelics.add(id)
            }
        }
        this.totalUnitsBought = data.totalUnitsBought ?? 0
    }
}
