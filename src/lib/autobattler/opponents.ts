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
}

export const ROUND_PARAMS: RoundParams[] = [
    // Round 1: Easy drifters
    { unitCount: 2, levelRange: [1, 1], factionWeight: 0.0, eliteChance: 0.0 },
    // Round 2: Slightly harder drifters
    { unitCount: 3, levelRange: [1, 1], factionWeight: 0.2, eliteChance: 0.0 },
    // Round 3: Faction themed, some L2
    { unitCount: 3, levelRange: [1, 2], factionWeight: 0.9, eliteChance: 0.3 },
    // Round 4: Stronger faction
    { unitCount: 4, levelRange: [1, 2], factionWeight: 1.0, eliteChance: 0.5 },
    // Round 5: Boss round
    { unitCount: 4, levelRange: [2, 3], factionWeight: 1.0, eliteChance: 0.8 },
]

// ── Themed factions (excludes drifters) ─────────────────────────────────────

const THEMED_FACTIONS: FactionId[] = [
    "quickdraw",
    "deputies",
    "clockwork",
    "prospectors",
]

// ── Name generation ─────────────────────────────────────────────────────────

const ADJECTIVES = [
    "Dusty",
    "Grizzled",
    "Veteran",
    "Ruthless",
    "Ironclad",
    "Spectral",
    "Reckless",
    "Weathered",
    "Cunning",
    "Notorious",
]

const FACTION_NOUNS: Record<FactionId, string[]> = {
    quickdraw: [
        "Gunslingers",
        "Syndicate",
        "Outlaws",
        "Desperados",
        "Shootists",
    ],
    deputies: ["Lawmen", "Garrison", "Posse", "Marshals", "Sentinels"],
    clockwork: ["Workshop", "Collective", "Assembly", "Automata", "Foundry"],
    prospectors: [
        "Excavation",
        "Bone Diggers",
        "Miners",
        "Specter Crew",
        "Unearthed",
    ],
    drifters: ["Wanderers", "Drifters", "Stragglers", "Vagrants", "Roamers"],
}

function generateOpponentName(faction: FactionId): string {
    const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)]
    const nouns = FACTION_NOUNS[faction]
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
    const roundIdx = Math.min(round - 1, ROUND_PARAMS.length - 1)
    const params = ROUND_PARAMS[roundIdx]

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
        // Occasionally mix in a drifter for variety (20% chance, not on boss rounds)
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
