import type { CommodityId } from "./commodities"

export type InfluenceId = "promo-campaign" | "negative-press" | "pump-and-dump"

export interface InfluenceDef {
    id: InfluenceId
    name: string
    description: string
    cashCost: number
    commodityCosts: Partial<Record<CommodityId, number>>
    priceEffect: number
    durationTicks: number
    cooldownMs: number
}

export const INFLUENCES: InfluenceDef[] = [
    {
        id: "promo-campaign",
        name: "Promotional Campaign",
        description: "Generate artificial demand for selected commodity.",
        cashCost: 25,
        commodityCosts: { ADS: 30 },
        priceEffect: 0.4,
        durationTicks: 12,
        cooldownMs: 90000,
    },
    {
        id: "negative-press",
        name: "Negative Press Release",
        description: "Temporarily depress market value of target commodity.",
        cashCost: 25,
        commodityCosts: { EMAIL: 15 },
        priceEffect: -0.3,
        durationTicks: 12,
        cooldownMs: 90000,
    },
    {
        id: "pump-and-dump",
        name: "Pump and Dump",
        description: "Coordinated price inflation with automated liquidation.",
        cashCost: 50,
        commodityCosts: { ADS: 20, EMAIL: 40 },
        priceEffect: 0.6,
        durationTicks: 6,
        cooldownMs: 180000,
    },
]
