// ── Prestige thresholds ──────────────────────────────────────────────────────

/** Minimum lifetime earnings before prestige becomes available */
export const PRESTIGE_THRESHOLD = 15000

/**
 * Prestige threshold scales with prestige count to prevent mindless
 * quick-prestige loops while rewarding longer runs.
 * 15K, 16.5K, 18K, 19.5K, 21K, ...
 */
export function getPrestigeThreshold(prestigeCount: number): number {
    return PRESTIGE_THRESHOLD * (1 + prestigeCount * 0.1)
}

/**
 * Hindsight currency formula: sqrt(lifetimeEarnings / 100)
 * At 5000 lifetime: ~7 Hindsight
 * At 20000 lifetime: ~14 Hindsight
 * At 100000 lifetime: ~31 Hindsight
 */
export function calculateHindsight(lifetimeEarnings: number): number {
    if (lifetimeEarnings <= 0) return 0
    return Math.floor(Math.sqrt(lifetimeEarnings / 100))
}

// ── Hindsight upgrade IDs ────────────────────────────────────────────────────

export type HindsightUpgradeId =
    // Tier 1
    | "starting-capital"
    | "generous-capital"
    | "lavish-capital"
    | "phase-memory"
    | "deep-phase-memory"
    | "factory-efficiency"
    | "cheaper-factories"
    | "market-intuition"
    | "insider-edge"
    | "frontier-dispatch"
    | "veterans-network"
    | "institutional-memory"
    | "factory-blueprints"
    | "overclocked"
    | "hiring-discount"
    | "scrap-dividend"
    // Tier 2
    | "harvest-boost"
    | "trade-volume"
    | "event-foresight"
    | "quick-start"
    | "commodity-affinity"
    | "portfolio-insurance"
    | "earnings-momentum"
    | "influence-mastery"
    // Tier 3
    | "das-expansion"
    | "rating-momentum"
    | "headhunter"
    | "factory-empire"
    | "thought-conductor"
    | "passive-income"
    // Tier 4
    | "market-oracle"
    | "perpetual-growth"
    | "compound-dividends"
    | "infinite-momentum"

// ── Hindsight shop ──────────────────────────────────────────────────────────

export interface HindsightUpgradeDef {
    id: HindsightUpgradeId
    name: string
    description: string
    cost: number
    maxPurchases: number // 1 = one-time, >1 = repeatable
    category: "market" | "production" | "trading" | "cross-system"
    /** Scaling for repeatable upgrades:
     *  cost(n) = baseCost + floor(baseCost * costScaling * n)
     *  where n is how many you already own.
     *  0 = no scaling (flat cost each time). */
    costScaling: number
    /** Gate: only visible/purchasable after N prestiges. */
    requiresPrestiges: number
}

/**
 * Compute the cost of the Nth purchase of a hindsight upgrade.
 * n is 0-indexed (0 = first purchase, 1 = second, etc.).
 */
export function hindsightUpgradeCostAt(
    def: HindsightUpgradeDef,
    n: number
): number {
    return def.cost + Math.floor(def.cost * def.costScaling * n)
}

/**
 * Total hindsight cost to fully max a single upgrade.
 */
export function hindsightUpgradeTotalCost(def: HindsightUpgradeDef): number {
    let total = 0
    for (let i = 0; i < def.maxPurchases; i++) {
        total += hindsightUpgradeCostAt(def, i)
    }
    return total
}

export const HINDSIGHT_UPGRADES: HindsightUpgradeDef[] = [
    // ═══════════════════════════════════════════════════════════════════════
    // TIER 1 — Available immediately (requiresPrestiges: 0)
    // ═══════════════════════════════════════════════════════════════════════

    // ── Market boosts ──────────────────────────────────────────────────────
    {
        id: "starting-capital",
        name: "Starting Capital",
        description: "Begin each run with $1.00 instead of $0.10",
        cost: 3,
        maxPurchases: 1,
        category: "market",
        costScaling: 0,
        requiresPrestiges: 0,
    },
    {
        id: "generous-capital",
        name: "Generous Capital",
        description: "Begin each run with $5.00",
        cost: 8,
        maxPurchases: 1,
        category: "market",
        costScaling: 0,
        requiresPrestiges: 0,
    },
    {
        id: "lavish-capital",
        name: "Lavish Capital",
        description: "Begin each run with $15.00",
        cost: 12,
        maxPurchases: 1,
        category: "market",
        costScaling: 0,
        requiresPrestiges: 0,
    },
    {
        id: "phase-memory",
        name: "Phase Memory",
        description: "Start with Phase 2 (Factories) already unlocked",
        cost: 10,
        maxPurchases: 1,
        category: "market",
        costScaling: 0,
        requiresPrestiges: 0,
    },
    {
        id: "deep-phase-memory",
        name: "Deep Phase Memory",
        description: "Start with Phase 3 (Upgrades) already unlocked",
        cost: 20,
        maxPurchases: 1,
        category: "market",
        costScaling: 0,
        requiresPrestiges: 0,
    },

    // ── Production boosts ──────────────────────────────────────────────────
    {
        id: "factory-efficiency",
        name: "Factory Efficiency I",
        description: "+10% factory output (stacks)",
        cost: 5,
        maxPurchases: 5,
        category: "production",
        costScaling: 0.6,
        requiresPrestiges: 0,
    },
    {
        id: "cheaper-factories",
        name: "Cheaper Factories",
        description: "Factories cost 15% less",
        cost: 6,
        maxPurchases: 1,
        category: "production",
        costScaling: 0,
        requiresPrestiges: 0,
    },

    // ── Trading boosts ─────────────────────────────────────────────────────
    {
        id: "market-intuition",
        name: "Market Intuition",
        description: "Trend analysis available from the start",
        cost: 4,
        maxPurchases: 1,
        category: "trading",
        costScaling: 0,
        requiresPrestiges: 0,
    },
    {
        id: "insider-edge",
        name: "Insider Edge",
        description: "Market events are slightly less random",
        cost: 7,
        maxPurchases: 1,
        category: "trading",
        costScaling: 0,
        requiresPrestiges: 0,
    },

    // ── Cross-system boosts ────────────────────────────────────────────────
    {
        id: "frontier-dispatch",
        name: "Faculty Grant",
        description: "Symposia grant +25% commodity rewards",
        cost: 12,
        maxPurchases: 1,
        category: "cross-system",
        costScaling: 0,
        requiresPrestiges: 0,
    },
    {
        id: "veterans-network",
        name: "Veteran's Network",
        description: "Career tree bonuses apply at 1.5x after prestige",
        cost: 15,
        maxPurchases: 1,
        category: "cross-system",
        costScaling: 0,
        requiresPrestiges: 0,
    },

    // ── Expansion upgrades ─────────────────────────────────────────────────
    {
        id: "institutional-memory",
        name: "Institutional Memory",
        description: "Phase unlock thresholds reduced 15% (stacks)",
        cost: 8,
        maxPurchases: 3,
        category: "market",
        costScaling: 0.5,
        requiresPrestiges: 0,
    },
    {
        id: "factory-blueprints",
        name: "Factory Blueprints",
        description:
            "Factory cost scaling reduced (1.19x → 1.16x → 1.14x)",
        cost: 7,
        maxPurchases: 2,
        category: "production",
        costScaling: 0.7,
        requiresPrestiges: 0,
    },
    {
        id: "overclocked",
        name: "Overclocked",
        description: "Production speed bonus +20% (stacks)",
        cost: 9,
        maxPurchases: 2,
        category: "production",
        costScaling: 0.55,
        requiresPrestiges: 0,
    },
    {
        id: "hiring-discount",
        name: "Hiring Discount",
        description: "Employee hiring costs reduced 25%",
        cost: 6,
        maxPurchases: 1,
        category: "market",
        costScaling: 0,
        requiresPrestiges: 0,
    },
    {
        id: "scrap-dividend",
        name: "Thought Dividend",
        description: "Market trades have 5% chance to grant Thoughts",
        cost: 10,
        maxPurchases: 1,
        category: "cross-system",
        costScaling: 0,
        requiresPrestiges: 0,
    },

    // ═══════════════════════════════════════════════════════════════════════
    // TIER 2 — Requires 3+ prestiges
    // ═══════════════════════════════════════════════════════════════════════
    {
        id: "harvest-boost",
        name: "Harvest Boost",
        description: "+15% harvest yield per stack",
        cost: 7,
        maxPurchases: 3,
        category: "production",
        costScaling: 0.5,
        requiresPrestiges: 3,
    },
    {
        id: "trade-volume",
        name: "Trade Volume",
        description: "+10 to all trade batch sizes per stack",
        cost: 6,
        maxPurchases: 2,
        category: "trading",
        costScaling: 0.5,
        requiresPrestiges: 3,
    },
    {
        id: "event-foresight",
        name: "Event Foresight",
        description: "Events revealed 3 ticks earlier",
        cost: 10,
        maxPurchases: 1,
        category: "trading",
        costScaling: 0,
        requiresPrestiges: 3,
    },
    {
        id: "quick-start",
        name: "Quick Start",
        description: "First 30 ticks: factories produce at 2x speed",
        cost: 8,
        maxPurchases: 1,
        category: "production",
        costScaling: 0,
        requiresPrestiges: 3,
    },
    {
        id: "commodity-affinity",
        name: "Commodity Affinity",
        description: "Unlock 1 commodity immediately per stack",
        cost: 5,
        maxPurchases: 6,
        category: "market",
        costScaling: 0.4,
        requiresPrestiges: 3,
    },
    {
        id: "portfolio-insurance",
        name: "Portfolio Insurance",
        description: "25% of holdings survive prestige",
        cost: 9,
        maxPurchases: 1,
        category: "market",
        costScaling: 0,
        requiresPrestiges: 3,
    },
    {
        id: "earnings-momentum",
        name: "Earnings Momentum",
        description:
            "Lifetime earnings count 10% toward next prestige's hindsight",
        cost: 12,
        maxPurchases: 1,
        category: "market",
        costScaling: 0,
        requiresPrestiges: 3,
    },
    {
        id: "influence-mastery",
        name: "Influence Mastery",
        description: "Influence cooldowns reduced 30%",
        cost: 8,
        maxPurchases: 1,
        category: "trading",
        costScaling: 0,
        requiresPrestiges: 3,
    },

    // ═══════════════════════════════════════════════════════════════════════
    // TIER 3 — Requires 6+ prestiges
    // ═══════════════════════════════════════════════════════════════════════
    {
        id: "das-expansion",
        name: "DAS Expansion",
        description: "+2 max DAS positions per stack",
        cost: 14,
        maxPurchases: 2,
        category: "market",
        costScaling: 0.5,
        requiresPrestiges: 6,
    },
    {
        id: "rating-momentum",
        name: "Rating Momentum",
        description: "Rating reviews every 40 ticks (vs 50)",
        cost: 11,
        maxPurchases: 1,
        category: "market",
        costScaling: 0,
        requiresPrestiges: 6,
    },
    {
        id: "headhunter",
        name: "Headhunter",
        description: "Employee candidates always start at max level",
        cost: 10,
        maxPurchases: 1,
        category: "market",
        costScaling: 0,
        requiresPrestiges: 6,
    },
    {
        id: "factory-empire",
        name: "Factory Empire",
        description: "Factory cost scaling -0.01 per stack",
        cost: 15,
        maxPurchases: 3,
        category: "production",
        costScaling: 0.4,
        requiresPrestiges: 6,
    },
    {
        id: "thought-conductor",
        name: "Thought Conductor",
        description: "Trades: 10% chance to grant 2x Thoughts",
        cost: 13,
        maxPurchases: 1,
        category: "cross-system",
        costScaling: 0,
        requiresPrestiges: 6,
    },
    {
        id: "passive-income",
        name: "Passive Income",
        description: "Earn 0.05% of net worth per tick as passive cash",
        cost: 16,
        maxPurchases: 1,
        category: "market",
        costScaling: 0,
        requiresPrestiges: 6,
    },

    // ═══════════════════════════════════════════════════════════════════════
    // TIER 4 — Requires 10+ prestiges
    // ═══════════════════════════════════════════════════════════════════════
    {
        id: "market-oracle",
        name: "Market Oracle",
        description: "See event impact magnitude before it happens",
        cost: 18,
        maxPurchases: 1,
        category: "trading",
        costScaling: 0,
        requiresPrestiges: 10,
    },
    {
        id: "perpetual-growth",
        name: "Perpetual Growth",
        description:
            "Harvest yield grows +0.1% per lifetime prestige permanently",
        cost: 20,
        maxPurchases: 1,
        category: "production",
        costScaling: 0,
        requiresPrestiges: 10,
    },
    {
        id: "compound-dividends",
        name: "Compound Dividends",
        description: "DAS yield compounds (yield reinvested automatically)",
        cost: 22,
        maxPurchases: 1,
        category: "market",
        costScaling: 0,
        requiresPrestiges: 10,
    },
    {
        id: "infinite-momentum",
        name: "Infinite Momentum",
        description:
            "Mastery upgrade levels retain 10% through prestige (floor)",
        cost: 25,
        maxPurchases: 1,
        category: "cross-system",
        costScaling: 0,
        requiresPrestiges: 10,
    },
]

export const HINDSIGHT_UPGRADE_MAP: ReadonlyMap<HindsightUpgradeId, HindsightUpgradeDef> =
    new Map(HINDSIGHT_UPGRADES.map((u) => [u.id, u]))
