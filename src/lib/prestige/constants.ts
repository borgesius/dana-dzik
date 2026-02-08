// ── Prestige thresholds ──────────────────────────────────────────────────────

/** Minimum lifetime earnings before prestige becomes available */
export const PRESTIGE_THRESHOLD = 15000

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
        id: "lavish-capital",
        name: "Lavish Capital",
        description: "Begin each run with $15.00",
        cost: 12,
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
        name: "Faculty Grant",
        description: "Symposia grant +25% commodity rewards",
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

    // ── Expansion upgrades ──────────────────────────────────────────────────
    {
        id: "institutional-memory",
        name: "Institutional Memory",
        description: "Phase unlock thresholds reduced 15% (stacks)",
        cost: 8,
        maxPurchases: 3,
        category: "market",
    },
    {
        id: "factory-blueprints",
        name: "Factory Blueprints",
        description: "Factory cost scaling reduced (1.19x → 1.16x → 1.14x)",
        cost: 7,
        maxPurchases: 2,
        category: "production",
    },
    {
        id: "overclocked",
        name: "Overclocked",
        description: "Production speed bonus +20% (stacks)",
        cost: 9,
        maxPurchases: 2,
        category: "production",
    },
    {
        id: "hiring-discount",
        name: "Hiring Discount",
        description: "Employee hiring costs reduced 25%",
        cost: 6,
        maxPurchases: 1,
        category: "market",
    },
    {
        id: "scrap-dividend",
        name: "Thought Dividend",
        description: "Market trades have 5% chance to grant Thoughts",
        cost: 10,
        maxPurchases: 1,
        category: "cross-system",
    },
]

export const HINDSIGHT_UPGRADE_MAP: ReadonlyMap<string, HindsightUpgradeDef> =
    new Map(HINDSIGHT_UPGRADES.map((u) => [u.id, u]))
