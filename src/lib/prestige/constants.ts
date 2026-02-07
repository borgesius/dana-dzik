// ── Prestige thresholds ──────────────────────────────────────────────────────

/** Minimum lifetime earnings before prestige becomes available */
export const PRESTIGE_THRESHOLD = 5000

/**
 * Hindsight currency formula: sqrt(lifetimeEarnings / 100)
 * At 5000 lifetime: ~7 Hindsight
 * At 20000 lifetime: ~14 Hindsight
 * At 100000 lifetime: ~31 Hindsight
 */
export function calculateHindsight(lifetimeEarnings: number): number {
    return Math.floor(Math.sqrt(lifetimeEarnings / 100))
}

// ── Hindsight shop ───────────────────────────────────────────────────────────

export interface HindsightUpgradeDef {
    id: string
    name: string
    description: string
    cost: number
    maxPurchases: number // 1 = one-time, >1 = repeatable
    category: "market" | "production" | "trading" | "cross-system"
}

export const HINDSIGHT_UPGRADES: HindsightUpgradeDef[] = [
    // ── Market boosts ────────────────────────────────────────────────────────
    {
        id: "starting-capital",
        name: "Starting Capital",
        description: "Begin each run with $1.00 instead of $0.10",
        cost: 3,
        maxPurchases: 1,
        category: "market",
    },
    {
        id: "generous-capital",
        name: "Generous Capital",
        description: "Begin each run with $5.00",
        cost: 8,
        maxPurchases: 1,
        category: "market",
    },
    {
        id: "phase-memory",
        name: "Phase Memory",
        description: "Start with Phase 2 (Factories) already unlocked",
        cost: 10,
        maxPurchases: 1,
        category: "market",
    },
    {
        id: "deep-phase-memory",
        name: "Deep Phase Memory",
        description: "Start with Phase 3 (Upgrades) already unlocked",
        cost: 20,
        maxPurchases: 1,
        category: "market",
    },

    // ── Production boosts ────────────────────────────────────────────────────
    {
        id: "factory-efficiency",
        name: "Factory Efficiency I",
        description: "+10% factory output (stacks)",
        cost: 5,
        maxPurchases: 5,
        category: "production",
    },
    {
        id: "cheaper-factories",
        name: "Cheaper Factories",
        description: "Factories cost 15% less",
        cost: 6,
        maxPurchases: 1,
        category: "production",
    },

    // ── Trading boosts ───────────────────────────────────────────────────────
    {
        id: "market-intuition",
        name: "Market Intuition",
        description: "Trend analysis available from the start",
        cost: 4,
        maxPurchases: 1,
        category: "trading",
    },
    {
        id: "insider-edge",
        name: "Insider Edge",
        description: "Market events are slightly less random",
        cost: 7,
        maxPurchases: 1,
        category: "trading",
    },

    // ── Cross-system boosts (unlocked later) ─────────────────────────────────
    {
        id: "frontier-dispatch",
        name: "Frontier Dispatch",
        description: "Autobattler runs grant +25% commodity rewards",
        cost: 12,
        maxPurchases: 1,
        category: "cross-system",
    },
    {
        id: "veterans-network",
        name: "Veteran's Network",
        description: "Career tree bonuses apply at 1.5x after prestige",
        cost: 15,
        maxPurchases: 1,
        category: "cross-system",
    },
]

export const HINDSIGHT_UPGRADE_MAP: ReadonlyMap<string, HindsightUpgradeDef> =
    new Map(HINDSIGHT_UPGRADES.map((u) => [u.id, u]))
