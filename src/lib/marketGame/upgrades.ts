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

export type UpgradeCategory = "trading" | "production" | "intelligence"

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
]
