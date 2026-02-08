export type UpgradeId =
    | "bulk-orders"
    | "limit-orders"
    | "trend-analysis"
    | "cpu-overclock"
    | "quality-assurance"
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
    | "autoscript"

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
    {
        id: "bulk-orders",
        name: "Bulk Order Processing",
        description: "Execute trades in quantities of 10.",
        category: "trading",
        cost: 20,
    },
    {
        id: "limit-orders",
        name: "Limit Order System",
        description: "Set a target price. Holdings sold automatically.",
        category: "trading",
        cost: 40,
    },
    {
        id: "trend-analysis",
        name: "Trend Analysis Package",
        description: "Directional indicators overlaid on price charts.",
        category: "trading",
        cost: 30,
    },
    {
        id: "cpu-overclock",
        name: "CPU Overclock",
        description: "Increase production cycle speed. May cause instability.",
        category: "production",
        cost: 50,
    },
    {
        id: "quality-assurance",
        name: "Quality Assurance",
        description: "Reduce output variance. Minimum yield guaranteed.",
        category: "production",
        cost: 60,
    },
    {
        id: "supply-chain",
        name: "Supply Chain Integration",
        description: "Convert surplus commodities into premium goods.",
        category: "production",
        cost: 80,
    },
    {
        id: "insider-newsletter",
        name: "Insider Newsletter",
        description:
            "Advance notice of market-moving events. 10 second lead time.",
        category: "intelligence",
        cost: 45,
    },
    {
        id: "analyst-reports",
        name: "Analyst Reports",
        description: "Numerical trend strength indicators.",
        category: "intelligence",
        cost: 35,
    },
    {
        id: "moving-average",
        name: "Moving Average Overlay",
        description: "Technical analysis tools for price chart.",
        category: "intelligence",
        cost: 25,
    },
    {
        id: "confidential-tip",
        name: "Confidential Tip",
        description:
            "A friend at the fund. Trend duration countdown visible on charts.",
        category: "intelligence",
        cost: 55,
    },
    {
        id: "material-advantage",
        name: "Material Advantage",
        description:
            "Material non-public information. Estimated price target on charts.",
        category: "intelligence",
        cost: 70,
    },
    {
        id: "seasonal-forecast",
        name: "Seasonal Forecast",
        description:
            "Quarterly outlook report. Shows the next trend direction after the current one ends.",
        category: "intelligence",
        cost: 90,
    },
    {
        id: "insider-calendar",
        name: "Insider Calendar",
        description:
            "The full schedule. Upcoming trend sequence visible as a forecast bar on charts.",
        category: "intelligence",
        cost: 120,
    },

    // ── Automation (per-commodity harvest upgrades) ──────────────────────────
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
        cost: 40,
    },
    {
        id: "harvest-dom",
        name: "DOM Registrar",
        description: "Bulk registration script. +1 DOM per harvest click.",
        category: "automation",
        cost: 100,
    },
    {
        id: "harvest-bw",
        name: "BW Allocator",
        description: "Bandwidth provisioner. +1 BW per harvest click.",
        category: "automation",
        cost: 250,
    },
    {
        id: "harvest-soft",
        name: "SOFT Compiler",
        description: "License keygen. +1 SOFT per harvest click.",
        category: "automation",
        cost: 600,
    },
    {
        id: "harvest-vc",
        name: "VC Pipeline",
        description: "Pitch deck generator. +1 VC per harvest click.",
        category: "automation",
        cost: 1500,
    },
    {
        id: "autoscript",
        name: "Autoscript",
        description:
            "Global automation. +1 unit per harvest click for ALL commodities.",
        category: "automation",
        cost: 80,
    },
]
