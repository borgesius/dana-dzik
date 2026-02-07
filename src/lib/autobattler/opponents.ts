import type { FactionId, OpponentDef } from "./types"

/**
 * Opponent templates organized by round difficulty.
 * Early rounds feature drifters, later rounds feature themed factions.
 */
const ROUND_OPPONENTS: OpponentDef[][] = [
    // Round 1: Easy drifters
    [
        {
            name: "Dusty Wanderer",
            faction: "drifters",
            units: [
                { unitId: "drifter-brawler", level: 1 },
                { unitId: "drifter-scout", level: 1 },
            ],
        },
        {
            name: "Lost Traveler",
            faction: "drifters",
            units: [
                { unitId: "drifter-scout", level: 1 },
                { unitId: "drifter-medic", level: 1 },
            ],
        },
    ],
    // Round 2: Slightly harder drifters
    [
        {
            name: "Road Agent",
            faction: "drifters",
            units: [
                { unitId: "drifter-brawler", level: 1 },
                { unitId: "drifter-brawler", level: 1 },
                { unitId: "drifter-scout", level: 1 },
            ],
        },
        {
            name: "Frontier Posse",
            faction: "drifters",
            units: [
                { unitId: "drifter-heavy", level: 1 },
                { unitId: "drifter-medic", level: 1 },
            ],
        },
    ],
    // Round 3: Faction themed
    [
        {
            name: "Quickdraw Patrol",
            faction: "quickdraw",
            units: [
                { unitId: "qd-sharpshooter", level: 1 },
                { unitId: "qd-dynamiter", level: 1 },
                { unitId: "drifter-scout", level: 1 },
            ],
        },
        {
            name: "Deputy Outpost",
            faction: "deputies",
            units: [
                { unitId: "dep-barricader", level: 1 },
                { unitId: "dep-trapper", level: 1 },
                { unitId: "drifter-medic", level: 1 },
            ],
        },
        {
            name: "Clockwork Scout",
            faction: "clockwork",
            units: [
                { unitId: "cw-accumulator", level: 1 },
                { unitId: "cw-gearsmith", level: 1 },
                { unitId: "drifter-brawler", level: 1 },
            ],
        },
        {
            name: "Bone Miners",
            faction: "prospectors",
            units: [
                { unitId: "bp-tunneler", level: 1 },
                { unitId: "bp-rattler", level: 1 },
                { unitId: "bp-tunneler", level: 1 },
            ],
        },
    ],
    // Round 4: Stronger faction
    [
        {
            name: "Syndicate Enforcer",
            faction: "quickdraw",
            units: [
                { unitId: "qd-deadeye", level: 1 },
                { unitId: "qd-sharpshooter", level: 1 },
                { unitId: "qd-dynamiter", level: 1 },
            ],
        },
        {
            name: "Iron Fortress",
            faction: "deputies",
            units: [
                { unitId: "dep-marshal", level: 1 },
                { unitId: "dep-barricader", level: 1 },
                { unitId: "dep-trapper", level: 1 },
            ],
        },
        {
            name: "Clockwork Workshop",
            faction: "clockwork",
            units: [
                { unitId: "cw-tesla-coil", level: 1 },
                { unitId: "cw-accumulator", level: 1 },
                { unitId: "cw-gearsmith", level: 1 },
            ],
        },
        {
            name: "Bone Excavation",
            faction: "prospectors",
            units: [
                { unitId: "bp-foreman", level: 1 },
                { unitId: "bp-tunneler", level: 1 },
                { unitId: "bp-rattler", level: 1 },
            ],
        },
    ],
    // Round 5: Boss round
    [
        {
            name: "Syndicate Boss",
            faction: "quickdraw",
            units: [
                { unitId: "qd-kingpin", level: 1 },
                { unitId: "qd-deadeye", level: 1 },
                { unitId: "qd-outlaw", level: 1 },
                { unitId: "qd-sharpshooter", level: 1 },
            ],
        },
        {
            name: "The Hanging Judge",
            faction: "deputies",
            units: [
                { unitId: "dep-judge", level: 1 },
                { unitId: "dep-warden", level: 1 },
                { unitId: "dep-marshal", level: 1 },
                { unitId: "dep-barricader", level: 1 },
            ],
        },
        {
            name: "Grand Architect",
            faction: "clockwork",
            units: [
                { unitId: "cw-architect", level: 1 },
                { unitId: "cw-overcharger", level: 1 },
                { unitId: "cw-tesla-coil", level: 1 },
                { unitId: "cw-accumulator", level: 1 },
            ],
        },
        {
            name: "Bone Patriarch",
            faction: "prospectors",
            units: [
                { unitId: "bp-patriarch", level: 1 },
                { unitId: "bp-necrominer", level: 1 },
                { unitId: "bp-foreman", level: 1 },
                { unitId: "bp-tunneler", level: 1 },
            ],
        },
    ],
]

/**
 * Pick an opponent for the given round.
 * If a preferred faction is specified, try to pick an opponent of that faction.
 */
export function pickOpponent(
    round: number,
    preferredFaction?: FactionId
): OpponentDef {
    const roundIdx = Math.min(round - 1, ROUND_OPPONENTS.length - 1)
    const pool = ROUND_OPPONENTS[roundIdx]

    if (preferredFaction) {
        const factioned = pool.filter((o) => o.faction === preferredFaction)
        if (factioned.length > 0) {
            return factioned[Math.floor(Math.random() * factioned.length)]
        }
    }

    return pool[Math.floor(Math.random() * pool.length)]
}
