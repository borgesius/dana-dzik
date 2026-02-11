// ── Career ───────────────────────────────────────────────────────────────────

export type CareerBranch = "engineering" | "trading" | "growth" | "executive"

export interface CareerHistoryEntry {
    branch: CareerBranch
    startedAt: number // timestamp
    endedAt: number | null // null = current
}

// ── Progression save data ────────────────────────────────────────────────────

import type { CareerNodeId } from "./careers"
import type { ForesightUpgradeId } from "../prestige/ascension"
import type { HindsightUpgradeId } from "../prestige/constants"
import type { BossId, FactionId, RelicId, UnitId } from "../autobattler/types"

export interface ExplorationSaveData {
    seenWindows: string[]
    seenThemes: string[]
    seenLocales: string[]
    awardedPinballThresholds: number[]
    guestbookSigned: boolean
}

export interface ProgressionSaveData {
    totalXP: number
    level: number
    activeCareer: CareerBranch | null
    careerHistory: CareerHistoryEntry[]
    skillPoints: Record<
        string,
        {
            invested: number
            dormant: boolean
            unlockedNodes: CareerNodeId[]
        }
    >
    educationNodes: CareerNodeId[]
    skillNodes?: CareerNodeId[]
    /** Mastery ranks: masteryId -> count */
    masteryRanks?: Record<string, number>
    /** Persistent exploration XP guards */
    exploration?: ExplorationSaveData
}

export function createEmptyProgressionData(): ProgressionSaveData {
    return {
        totalXP: 0,
        level: 0,
        activeCareer: null,
        careerHistory: [],
        skillPoints: {},
        educationNodes: [],
    }
}

// ── Prestige save data ──────────────────────────────────────────────────────

export interface PrestigeSaveData {
    count: number
    currency: number // Hindsight
    purchasedUpgrades: HindsightUpgradeId[]
    lifetimeAcrossPrestiges: number
    /** Ascension layer */
    ascensionCount?: number
    foresight?: number
    purchasedForesightUpgrades?: ForesightUpgradeId[]
    totalHindsightSpent?: number
}

export function createEmptyPrestigeData(): PrestigeSaveData {
    return {
        count: 0,
        currency: 0,
        purchasedUpgrades: [],
        lifetimeAcrossPrestiges: 0,
        ascensionCount: 0,
        foresight: 0,
        purchasedForesightUpgrades: [],
        totalHindsightSpent: 0,
    }
}

// ── Autobattler save data ───────────────────────────────────────────────────

export interface AutobattlerUnitEntry {
    unitId: UnitId
    count: number
}

export interface AutobattlerSaveData {
    collection: AutobattlerUnitEntry[]
    completedRuns: number
    unlockedFactions: FactionId[]
    spiralProgress: Partial<Record<FactionId, boolean>>
    /** Personal bests */
    highestRound?: number
    totalBossesDefeated?: number
    /** Set of defeated boss IDs for Comprehensive Exams achievement */
    bossesDefeatedSet?: BossId[]
    /** Permanently unlocked relic IDs */
    unlockedRelics?: RelicId[]
    /** Total units bought across all runs */
    totalUnitsBought?: number
}

export function createEmptyAutobattlerData(): AutobattlerSaveData {
    return {
        collection: [],
        completedRuns: 0,
        unlockedFactions: [],
        spiralProgress: {},
        highestRound: 0,
        totalBossesDefeated: 0,
        bossesDefeatedSet: [],
        unlockedRelics: [],
        totalUnitsBought: 0,
    }
}
