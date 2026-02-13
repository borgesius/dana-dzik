import type { HindsightUpgradeId } from "./constants"

// ── Ascension layer (prestige-of-prestige) ──────────────────────────────────
//
// After spending enough total Hindsight (ASCENSION_SPEND_THRESHOLD),
// the player can "Ascend."
// Ascending resets: prestige count, Hindsight balance, selected Hindsight upgrades.
// Grants Foresight currency for a deeper upgrade shop.

export type ForesightUpgradeId =
    | "scrap-reserves"
    | "perpetual-factories"
    | "veteran-recruits"
    | "career-tenure"
    | "compound-interest"
    | "market-memory"
    | "deep-hindsight"
    | "spiral-momentum"
    | "factory-dominion"
    | "market-savant"
    | "mastery-retention"
    | "cross-pollination"
    | "institutional-knowledge"
    | "deep-hindsight-plus"

export interface ForesightUpgradeDef {
    id: ForesightUpgradeId
    name: string
    description: string
    cost: number
    maxPurchases: number
}

/** Total hindsight spent required to unlock ascension. */
export const ASCENSION_SPEND_THRESHOLD = 200

/**
 * Hindsight upgrades that survive ascension (comfort floor).
 * All others are reset.
 */
export const ASCENSION_PRESERVED_UPGRADES: ReadonlySet<HindsightUpgradeId> =
    new Set<HindsightUpgradeId>([
        "starting-capital",
        "generous-capital",
        "lavish-capital",
        "phase-memory",
        "deep-phase-memory",
    ])

/**
 * Foresight earned on ascension = floor(totalHindsightEverSpent / 15)
 * (was /20, raised to account for higher spend requirements)
 */
export function calculateForesight(totalHindsightSpent: number): number {
    return Math.floor(totalHindsightSpent / 15)
}

export const FORESIGHT_UPGRADES: ForesightUpgradeDef[] = [
    // ── Original foresight upgrades ──────────────────────────────────────
    {
        id: "scrap-reserves",
        name: "Thought Reserves",
        description: "Symposia start with +2 Thoughts permanently",
        cost: 4,
        maxPurchases: 3,
    },
    {
        id: "perpetual-factories",
        name: "Perpetual Factories",
        description: "1 factory of each type survives prestige",
        cost: 5,
        maxPurchases: 1,
    },
    {
        id: "veteran-recruits",
        name: "Veteran Recruits",
        description: "Org chart starts with 1 random employee after prestige",
        cost: 6,
        maxPurchases: 1,
    },
    {
        id: "career-tenure",
        name: "Career Tenure",
        description: "Career switch penalty reduced to 5% base",
        cost: 6,
        maxPurchases: 1,
    },
    {
        id: "compound-interest",
        name: "Compound Interest",
        description: "Offline catchup efficiency increases to 95%",
        cost: 7,
        maxPurchases: 1,
    },
    {
        id: "market-memory",
        name: "Market Memory",
        description: "Start each prestige with 1 random upgrade already owned",
        cost: 8,
        maxPurchases: 1,
    },
    {
        id: "deep-hindsight",
        name: "Deep Hindsight",
        description:
            "Hindsight formula exponent increases (0.5 → 0.55 → 0.6 → 0.65)",
        cost: 10,
        maxPurchases: 3,
    },
    {
        id: "spiral-momentum",
        name: "Spiral Momentum",
        description: "Unit unlocks persist through ascension",
        cost: 12,
        maxPurchases: 1,
    },

    // ── New foresight upgrades ───────────────────────────────────────────
    {
        id: "factory-dominion",
        name: "Factory Dominion",
        description:
            "Start prestige with 2 factories of each type (stacks with Perpetual)",
        cost: 9,
        maxPurchases: 1,
    },
    {
        id: "market-savant",
        name: "Market Savant",
        description:
            "Start prestige with 3 random upgrades (replaces Market Memory)",
        cost: 12,
        maxPurchases: 2,
    },
    {
        id: "mastery-retention",
        name: "Mastery Retention",
        description: "Mastery upgrade levels retain 25% through prestige",
        cost: 15,
        maxPurchases: 1,
    },
    {
        id: "cross-pollination",
        name: "Cross-Pollination",
        description: "Autobattler wins grant 2x commodity rewards",
        cost: 10,
        maxPurchases: 1,
    },
    {
        id: "institutional-knowledge",
        name: "Institutional Knowledge",
        description: "Start with Phase 4 (Influence) unlocked after prestige",
        cost: 14,
        maxPurchases: 1,
    },
    {
        id: "deep-hindsight-plus",
        name: "Deep Hindsight+",
        description: "Further increases hindsight exponent (0.65 → 0.70)",
        cost: 18,
        maxPurchases: 1,
    },
]

export const FORESIGHT_UPGRADE_MAP: ReadonlyMap<
    ForesightUpgradeId,
    ForesightUpgradeDef
> = new Map(FORESIGHT_UPGRADES.map((u) => [u.id, u]))
