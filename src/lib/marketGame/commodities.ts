export type CommodityId =
    | "EMAIL"
    | "ADS"
    | "LIVE"
    | "DOM"
    | "GLUE"
    | "BW"
    | "SOFT"
    | "VC"

export interface CommodityDef {
    id: CommodityId
    name: string
    description: string
    basePrice: number
    volatility: number
    unlockThreshold: number
    /** Min ticks a trend lasts for this commodity (lower = faster oscillation) */
    trendMinTicks: number
    /** Max ticks a trend lasts for this commodity (lower = faster oscillation) */
    trendMaxTicks: number
    /** Units produced per base harvest click (scales with upgrades). Equalises $/click across commodities. */
    harvestQuantity: number
}

export const COMMODITIES: CommodityDef[] = [
    {
        id: "EMAIL",
        name: "Email Databases",
        description: "Verified opt-in addresses. Updated daily.",
        basePrice: 0.05,
        volatility: 0.1,
        unlockThreshold: 0,
        trendMinTicks: 6,
        trendMaxTicks: 15,
        harvestQuantity: 40, // 40 × $0.05 = $2.00
    },
    {
        id: "ADS",
        name: "Banner Impressions",
        description: "Premium 468x60 ad placements.",
        basePrice: 0.25,
        volatility: 0.08,
        unlockThreshold: 0,
        trendMinTicks: 8,
        trendMaxTicks: 20,
        harvestQuantity: 8, // 8 × $0.25 = $2.00
    },
    {
        id: "LIVE",
        name: "Livestock",
        description: "Grade-A cattle futures. Delivery not included.",
        basePrice: 0.5,
        volatility: 0.065,
        unlockThreshold: 15,
        trendMinTicks: 9,
        trendMaxTicks: 24,
        harvestQuantity: 4, // 4 × $0.50 = $2.00
    },
    {
        id: "DOM",
        name: ".com Domains",
        description: "Pre-registered premium domain names.",
        basePrice: 2.0,
        volatility: 0.055,
        unlockThreshold: 30,
        trendMinTicks: 10,
        trendMaxTicks: 28,
        harvestQuantity: 1, // 1 × $2.00 = $2.00
    },
    {
        id: "GLUE",
        name: "Glue",
        description: "Industrial-strength adhesive. Handle with care.",
        basePrice: 5.0,
        volatility: 0.045,
        unlockThreshold: 100,
        trendMinTicks: 11,
        trendMaxTicks: 32,
        harvestQuantity: 0.4, // 0.4 × $5.00 = $2.00
    },
    {
        id: "BW",
        name: "Bandwidth",
        description: "Dedicated T1 line capacity. 1.544 Mbps.",
        basePrice: 8.0,
        volatility: 0.04,
        unlockThreshold: 200,
        trendMinTicks: 12,
        trendMaxTicks: 36,
        harvestQuantity: 0.25, // 0.25 × $8.00 = $2.00
    },
    {
        id: "SOFT",
        name: "Software Licenses",
        description: "Enterprise volume licensing. Shrinkwrap ready.",
        basePrice: 25.0,
        volatility: 0.03,
        unlockThreshold: 1000,
        trendMinTicks: 18,
        trendMaxTicks: 50,
        harvestQuantity: 0.08, // 0.08 × $25.00 = $2.00
    },
    {
        id: "VC",
        name: "Venture Capital",
        description: "Pre-IPO investment securities. Limited availability.",
        basePrice: 100.0,
        volatility: 0.035,
        unlockThreshold: 8000,
        trendMinTicks: 40,
        trendMaxTicks: 100,
        harvestQuantity: 0.02, // 0.02 × $100.00 = $2.00
    },
]
