// ── Career ───────────────────────────────────────────────────────────────────

export type CareerBranch = "engineering" | "trading" | "growth" | "executive"

export interface CareerHistoryEntry {
    branch: CareerBranch
    startedAt: number // timestamp
    endedAt: number | null // null = current
}

// ── Progression save data ────────────────────────────────────────────────────

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
            unlockedNodes: string[]
        }
    >
    educationNodes: string[]
    skillNodes?: string[]
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
    purchasedUpgrades: string[]
    lifetimeAcrossPrestiges: number
    /** Ascension layer */
    ascensionCount?: number
    foresight?: number
    purchasedForesightUpgrades?: string[]
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
    unitId: string
    count: number
}

export interface AutobattlerSaveData {
    collection: AutobattlerUnitEntry[]
    completedRuns: number
    unlockedFactions: string[]
    spiralProgress: Record<string, boolean>
    /** Personal bests */
    highestRound?: number
    totalBossesDefeated?: number
    /** Set of defeated boss IDs for Comprehensive Exams achievement */
    bossesDefeatedSet?: string[]
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
    }
}
