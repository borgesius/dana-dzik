// ── Ascension layer (prestige-of-prestige) ──────────────────────────────────
//
// After buying all Hindsight upgrades, the player can "Ascend."
// Ascending resets: prestige count, Hindsight balance, selected Hindsight upgrades.
// Grants Foresight currency for a deeper upgrade shop.

export interface ForesightUpgradeDef {
    id: string
    name: string
    description: string
    cost: number
    maxPurchases: number
}

/**
 * Hindsight upgrades that survive ascension (comfort floor).
 * All others are reset.
 */
export const ASCENSION_PRESERVED_UPGRADES: ReadonlySet<string> = new Set([
    "starting-capital",
    "generous-capital",
    "lavish-capital",
    "phase-memory",
    "deep-phase-memory",
])

/**
 * Foresight earned on ascension = floor(totalHindsightEverSpent / 20)
 */
export function calculateForesight(totalHindsightSpent: number): number {
    return Math.floor(totalHindsightSpent / 20)
}

export const FORESIGHT_UPGRADES: ForesightUpgradeDef[] = [
    {
        id: "scrap-reserves",
        name: "Scrap Reserves",
        description: "Hacking runs start with +2 scrap permanently",
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
            "Hindsight formula exponent increases (0.5 → 0.55 → 0.6)",
        cost: 10,
        maxPurchases: 2,
    },
    {
        id: "spiral-momentum",
        name: "Spiral Momentum",
        description: "Unit unlocks persist through ascension",
        cost: 12,
        maxPurchases: 1,
    },
]

export const FORESIGHT_UPGRADE_MAP: ReadonlyMap<string, ForesightUpgradeDef> =
    new Map(FORESIGHT_UPGRADES.map((u) => [u.id, u]))
