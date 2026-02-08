export type UpgradeId =
    | "batch-processing"
    | "bulk-orders"
    | "block-trading"
    | "limit-orders"
    | "trend-analysis"
    | "cpu-overclock"
    | "overclock-ii"
    | "quality-assurance"
    | "quality-assurance-ii"
    | "supply-chain"
    | "insider-newsletter"
    | "analyst-reports"
    | "moving-average"
    | "confidential-tip"
    | "material-advantage"
    | "seasonal-forecast"
    | "insider-calendar"
    | "harvest-email"
    | "harvest-ads"
    | "harvest-dom"
    | "harvest-bw"
    | "harvest-soft"
    | "harvest-vc"
    | "autoscript-i"
    | "autoscript-ii"
    | "autoscript-iii"

export type UpgradeCategory =
    | "trading"
    | "production"
    | "intelligence"
    | "automation"

export interface UpgradeDef {
    id: UpgradeId
    name: string
    description: string
    category: UpgradeCategory
    cost: number
}

export const UPGRADES: UpgradeDef[] = [
    // ── Trading (5 upgrades) ────────────────────────────────────────────────
    {
        id: "batch-processing",
        name: "Batch Processing",
        description: "Execute trades in quantities of 5.",
        category: "trading",
        cost: 25,
    },
    {
        id: "trend-analysis",
        name: "Trend Analysis Package",
        description: "Directional indicators overlaid on price charts.",
        category: "trading",
        cost: 40,
    },
    {
        id: "bulk-orders",
        name: "Bulk Order Processing",
        description: "Execute trades in quantities of 10.",
        category: "trading",
        cost: 100,
    },
    {
        id: "limit-orders",
        name: "Limit Order System",
        description: "Set a target price. Holdings sold automatically.",
        category: "trading",
        cost: 200,
    },
    {
        id: "block-trading",
        name: "Block Trading",
        description: "Institutional-size lots. Execute trades in quantities of 50.",
        category: "trading",
        cost: 400,
    },

    // ── Production (5 upgrades) ─────────────────────────────────────────────
    {
        id: "cpu-overclock",
        name: "CPU Overclock",
        description: "Reduce production cycle by 1 tick. May cause instability.",
        category: "production",
        cost: 75,
    },
    {
        id: "quality-assurance",
        name: "Quality Assurance",
        description: "Reduce output variance. Minimum yield 25% of max.",
        category: "production",
        cost: 150,
    },
    {
        id: "overclock-ii",
        name: "Overclock II",
        description: "Further cycle reduction. Total -2 ticks per cycle.",
        category: "production",
        cost: 300,
    },
    {
        id: "supply-chain",
        name: "Supply Chain Integration",
        description: "Convert surplus commodities into premium goods.",
        category: "production",
        cost: 500,
    },
    {
        id: "quality-assurance-ii",
        name: "Quality Assurance II",
        description: "Tighter tolerances. Minimum yield 50% of max.",
        category: "production",
        cost: 800,
    },

    // ── Intelligence (7 upgrades) ───────────────────────────────────────────
    {
        id: "moving-average",
        name: "Moving Average Overlay",
        description: "Technical analysis tools for price chart.",
        category: "intelligence",
        cost: 30,
    },
    {
        id: "analyst-reports",
        name: "Analyst Reports",
        description: "Numerical trend strength indicators.",
        category: "intelligence",
        cost: 50,
    },
    {
        id: "insider-newsletter",
        name: "Insider Newsletter",
        description:
            "Advance notice of market-moving events. 10 second lead time.",
        category: "intelligence",
        cost: 80,
    },
    {
        id: "confidential-tip",
        name: "Confidential Tip",
        description:
            "A friend at the fund. Trend duration countdown visible on charts.",
        category: "intelligence",
        cost: 125,
    },
    {
        id: "material-advantage",
        name: "Material Advantage",
        description:
            "Material non-public information. Estimated price target on charts.",
        category: "intelligence",
        cost: 200,
    },
    {
        id: "seasonal-forecast",
        name: "Seasonal Forecast",
        description:
            "Quarterly outlook report. Shows the next trend direction after the current one ends.",
        category: "intelligence",
        cost: 350,
    },
    {
        id: "insider-calendar",
        name: "Insider Calendar",
        description:
            "The full schedule. Upcoming trend sequence visible as a forecast bar on charts.",
        category: "intelligence",
        cost: 600,
    },

    // ── Automation (per-commodity harvest upgrades + autoscript tiers) ───────
    {
        id: "harvest-email",
        name: "EMAIL Harvester",
        description: "Automated scraper. +1 EMAIL per harvest click.",
        category: "automation",
        cost: 15,
    },
    {
        id: "harvest-ads",
        name: "ADS Generator",
        description: "Impression bot. +1 ADS per harvest click.",
        category: "automation",
        cost: 50,
    },
    {
        id: "autoscript-i",
        name: "Autoscript I",
        description:
            "Basic automation. +25% harvest yield for all commodities.",
        category: "automation",
        cost: 100,
    },
    {
        id: "harvest-dom",
        name: "DOM Registrar",
        description: "Bulk registration script. +1 DOM per harvest click.",
        category: "automation",
        cost: 150,
    },
    {
        id: "harvest-bw",
        name: "BW Allocator",
        description: "Bandwidth provisioner. +1 BW per harvest click.",
        category: "automation",
        cost: 400,
    },
    {
        id: "autoscript-ii",
        name: "Autoscript II",
        description:
            "Advanced automation. +50% harvest yield for all commodities.",
        category: "automation",
        cost: 700,
    },
    {
        id: "harvest-soft",
        name: "SOFT Compiler",
        description: "License keygen. +1 SOFT per harvest click.",
        category: "automation",
        cost: 1000,
    },
    {
        id: "harvest-vc",
        name: "VC Pipeline",
        description: "Pitch deck generator. +1 VC per harvest click.",
        category: "automation",
        cost: 2500,
    },
    {
        id: "autoscript-iii",
        name: "Autoscript III",
        description:
            "Full automation suite. +75% harvest yield for all commodities.",
        category: "automation",
        cost: 4000,
    },
]
