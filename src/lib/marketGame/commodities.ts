export type CommodityId = "EMAIL" | "ADS" | "DOM" | "BW" | "SOFT" | "VC"

export interface CommodityDef {
    id: CommodityId
    name: string
    description: string
    basePrice: number
    volatility: number
    unlockThreshold: number
}

export const COMMODITIES: CommodityDef[] = [
    {
        id: "EMAIL",
        name: "Email Databases",
        description: "Verified opt-in addresses. Updated daily.",
        basePrice: 0.05,
        volatility: 0.08,
        unlockThreshold: 0,
    },
    {
        id: "ADS",
        name: "Banner Impressions",
        description: "Premium 468x60 ad placements.",
        basePrice: 0.25,
        volatility: 0.065,
        unlockThreshold: 0,
    },
    {
        id: "DOM",
        name: ".com Domains",
        description: "Pre-registered premium domain names.",
        basePrice: 2.0,
        volatility: 0.05,
        unlockThreshold: 10,
    },
    {
        id: "BW",
        name: "Bandwidth",
        description: "Dedicated T1 line capacity. 1.544 Mbps.",
        basePrice: 8.0,
        volatility: 0.035,
        unlockThreshold: 50,
    },
    {
        id: "SOFT",
        name: "Software Licenses",
        description: "Enterprise volume licensing. Shrinkwrap ready.",
        basePrice: 25.0,
        volatility: 0.025,
        unlockThreshold: 250,
    },
    {
        id: "VC",
        name: "Venture Capital",
        description: "Pre-IPO investment securities. Limited availability.",
        basePrice: 100.0,
        volatility: 0.1,
        unlockThreshold: 2000,
    },
]
