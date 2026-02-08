import { getLocaleManager } from "../localeManager"
import type { FactionId, OpponentDef, UnitTier } from "./types"
import { getUnitsForFaction } from "./units"

// ── Round parameters ────────────────────────────────────────────────────────

export interface RoundParams {
    unitCount: number
    /** Min and max unit level for the round */
    levelRange: [number, number]
    /** Probability (0-1) that the primary faction is a themed faction vs drifters */
    factionWeight: number
    /** Probability a high-tier unit appears */
    eliteChance: number
    /** Stat multiplier applied to opponent units (ATK and HP) */
    statMultiplier: number
}

/** Predefined params for the first 5 rounds */
const BASE_ROUND_PARAMS: RoundParams[] = [
    // Round 1: Easy drifters
    {
        unitCount: 2,
        levelRange: [1, 1],
        factionWeight: 0.0,
        eliteChance: 0.0,
        statMultiplier: 1.0,
    },
    // Round 2: Slightly harder drifters
    {
        unitCount: 3,
        levelRange: [1, 1],
        factionWeight: 0.2,
        eliteChance: 0.0,
        statMultiplier: 1.0,
    },
    // Round 3: Faction themed, some L2
    {
        unitCount: 3,
        levelRange: [1, 2],
        factionWeight: 0.9,
        eliteChance: 0.3,
        statMultiplier: 1.0,
    },
    // Round 4: Stronger faction
    {
        unitCount: 4,
        levelRange: [1, 2],
        factionWeight: 1.0,
        eliteChance: 0.5,
        statMultiplier: 1.0,
    },
    // Round 5: Boss round (params used for non-boss escort units)
    {
        unitCount: 4,
        levelRange: [2, 3],
        factionWeight: 1.0,
        eliteChance: 0.8,
        statMultiplier: 1.0,
    },
]

/** Generate round params procedurally for rounds beyond the predefined set */
function getRoundParams(round: number): RoundParams {
    if (round <= BASE_ROUND_PARAMS.length) {
        return BASE_ROUND_PARAMS[round - 1]
    }

    // Procedural scaling beyond round 5
    const unitCount = Math.min(6, 2 + Math.floor(round / 2))
    const minLevel = round >= 12 ? 2 : 1
    const maxLevel = round >= 8 ? 3 : 2
    const eliteChance = Math.min(1.0, 0.1 * round)
    // +5% ATK/HP per round beyond round 5
    const statMultiplier = 1.0 + (round - 5) * 0.05

    return {
        unitCount,
        levelRange: [minLevel, maxLevel],
        factionWeight: 1.0,
        eliteChance,
        statMultiplier,
    }
}

/** Exported for balance tests */
export const ROUND_PARAMS = BASE_ROUND_PARAMS

// ── Boss definitions ────────────────────────────────────────────────────────

export interface BossDef {
    id: string
    name: string
    faction: FactionId
    mechanic:
        | "eternalReturn"
        | "categoricalShield"
        | "sufficientReason"
        | "deconstruction"
    mechanicDescription: string
    /** Base ATK for the boss unit */
    baseATK: number
    /** Base HP for the boss unit */
    baseHP: number
}

export const BOSS_DEFS: BossDef[] = [
    {
        id: "boss-gadfly",
        name: "The Gadfly",
        faction: "quickdraw",
        mechanic: "eternalReturn",
        mechanicDescription: "Eternal Return: respawns once at 50% HP on death",
        baseATK: 10,
        baseHP: 12,
    },
    {
        id: "boss-noumenon",
        name: "The Noumenon",
        faction: "deputies",
        mechanic: "categoricalShield",
        mechanicDescription:
            "Categorical Shield: starts with shield = 50% max HP; all allies gain +2 Shield/round",
        baseATK: 6,
        baseHP: 20,
    },
    {
        id: "boss-automaton",
        name: "The Automaton",
        faction: "clockwork",
        mechanic: "sufficientReason",
        mechanicDescription:
            "Sufficient Reason: clones the weakest ally at round start",
        baseATK: 7,
        baseHP: 14,
    },
    {
        id: "boss-simulacrum",
        name: "The Simulacrum",
        faction: "prospectors",
        mechanic: "deconstruction",
        mechanicDescription:
            "Deconstruction: splits into two half-stat copies on death (each splits once more)",
        baseATK: 8,
        baseHP: 16,
    },
]

export const BOSS_MAP: ReadonlyMap<string, BossDef> = new Map(
    BOSS_DEFS.map((b) => [b.id, b])
)

/** Pick a random boss, avoiding the last one used */
export function pickBoss(lastBossId?: string): BossDef {
    const pool = lastBossId
        ? BOSS_DEFS.filter((b) => b.id !== lastBossId)
        : BOSS_DEFS
    return pool[Math.floor(Math.random() * pool.length)]
}

/** Check if a given round is a boss round */
export function isBossRound(round: number): boolean {
    return round >= 5 && round % 5 === 0
}

// ── Themed factions (excludes drifters) ─────────────────────────────────────

const THEMED_FACTIONS: FactionId[] = [
    "quickdraw",
    "deputies",
    "clockwork",
    "prospectors",
]

// ── Fallback name data ──────────────────────────────────────────────────────

const FALLBACK_ADJECTIVES = [
    "Tenured",
    "Emeritus",
    "Radical",
    "Dogmatic",
    "Heretical",
    "Dialectical",
    "Apodictic",
    "Restless",
    "Notorious",
    "Incorrigible",
]

const FALLBACK_NOUNS: Record<FactionId, string[]> = {
    quickdraw: ["Nihilists", "Absurdists", "Overmen", "Abyss-Gazers", "Madmen"],
    deputies: [
        "Systematizers",
        "Categorists",
        "Faculty",
        "Dialecticians",
        "Academics",
    ],
    clockwork: [
        "Geometers",
        "Determinists",
        "Logicians",
        "Axiomatics",
        "Monads",
    ],
    prospectors: [
        "Deconstructors",
        "Nomads",
        "Assemblages",
        "Rhizomes",
        "Semionauts",
    ],
    drifters: ["Adjuncts", "Auditors", "Sessionals", "Lecturers", "TAs"],
}

// ── Name generation ─────────────────────────────────────────────────────────

function generateOpponentName(faction: FactionId): string {
    const lm = getLocaleManager()
    const t = lm.t.bind(lm)
    const adjectives = t("symposium.opponents.adjectives", {
        returnObjects: true,
        defaultValue: FALLBACK_ADJECTIVES,
    }) as unknown as string[]
    const nouns = t(`symposium.opponents.nouns.${faction}`, {
        returnObjects: true,
        defaultValue: FALLBACK_NOUNS[faction],
    }) as unknown as string[]
    const adj = adjectives[Math.floor(Math.random() * adjectives.length)]
    const noun = nouns[Math.floor(Math.random() * nouns.length)]
    return `${adj} ${noun}`
}

// ── Level assignment ────────────────────────────────────────────────────────

function assignLevel(
    tier: UnitTier,
    levelRange: [number, number],
    eliteChance: number
): number {
    const [minLvl, maxLvl] = levelRange
    if (minLvl === maxLvl) return minLvl

    // Higher-tier units are more likely to be leveled up
    const tierBoost = tier >= 2 ? 0.3 : 0.0
    const roll = Math.random()

    if (roll < eliteChance + tierBoost) {
        return maxLvl
    }
    return minLvl
}

// ── Procedural generation ───────────────────────────────────────────────────

function generateOpponent(
    round: number,
    preferredFaction?: FactionId
): OpponentDef {
    const params = getRoundParams(round)

    // Pick primary faction
    let faction: FactionId
    if (preferredFaction && preferredFaction !== "drifters") {
        faction = preferredFaction
    } else if (Math.random() < params.factionWeight) {
        faction =
            THEMED_FACTIONS[Math.floor(Math.random() * THEMED_FACTIONS.length)]
    } else {
        faction = "drifters"
    }

    const pool = getUnitsForFaction(faction)
    const drifterPool = getUnitsForFaction("drifters")

    if (pool.length === 0) {
        // Fallback to drifters if faction has no units
        faction = "drifters"
    }

    const activePool = pool.length > 0 ? pool : drifterPool
    const units: { unitId: string; level: number }[] = []

    for (let i = 0; i < params.unitCount; i++) {
        // Occasionally mix in a drifter for variety (20% chance, not on later rounds)
        const useDrifter =
            faction !== "drifters" &&
            drifterPool.length > 0 &&
            i > 0 &&
            round < 5 &&
            Math.random() < 0.2

        const unitPool = useDrifter ? drifterPool : activePool
        const picked = unitPool[Math.floor(Math.random() * unitPool.length)]
        const level = assignLevel(
            picked.tier,
            params.levelRange,
            params.eliteChance
        )

        units.push({ unitId: picked.id, level })
    }

    // Sort lineup: higher tier / higher level units toward the front for strategic play
    units.sort((a, b) => b.level - a.level)

    return {
        name: generateOpponentName(faction),
        faction,
        units,
    }
}

/**
 * Generate a boss opponent for a boss round.
 */
function generateBossOpponent(round: number, boss: BossDef): OpponentDef {
    const params = getRoundParams(round)

    // Boss escort: 2-3 faction units alongside the boss
    const escortCount = Math.min(3, Math.max(2, params.unitCount - 1))
    const pool = getUnitsForFaction(boss.faction)
    const units: { unitId: string; level: number }[] = []

    // Add the boss unit itself (using the boss ID)
    units.push({ unitId: boss.id, level: 3 })

    // Add escort units
    for (let i = 0; i < escortCount; i++) {
        if (pool.length > 0) {
            const picked = pool[Math.floor(Math.random() * pool.length)]
            const level = assignLevel(
                picked.tier,
                params.levelRange,
                params.eliteChance
            )
            units.push({ unitId: picked.id, level })
        }
    }

    return {
        name: boss.name,
        faction: boss.faction,
        units,
        isBoss: true,
        bossId: boss.id,
    }
}

/** Get the stat multiplier for a given round (used by RunManager for opponent bonuses) */
export function getOpponentStatMultiplier(round: number): number {
    return getRoundParams(round).statMultiplier
}

// ── Public API ──────────────────────────────────────────────────────────────

/**
 * Pick an opponent for the given round.
 * Uses procedural generation with round-based difficulty scaling.
 * If a preferred faction is specified, the opponent will use that faction.
 */
export function pickOpponent(
    round: number,
    preferredFaction?: FactionId
): OpponentDef {
    return generateOpponent(round, preferredFaction)
}

/**
 * Pick a boss opponent for a boss round.
 */
export function pickBossOpponent(
    round: number,
    lastBossId?: string
): OpponentDef {
    const boss = pickBoss(lastBossId)
    return generateBossOpponent(round, boss)
}
