import type { CommodityId } from "../marketGame/types"

export interface RunBuff {
    id: string
    name: string
    description: string
    commodityId: CommodityId
    commodityCost: number
    icon: string
}

export const RUN_BUFFS: RunBuff[] = [
    {
        id: "email-rush",
        name: "Email Rush",
        description: "+2 ATK to all units in round 1",
        commodityId: "EMAIL",
        commodityCost: 5,
        icon: "⚔️",
    },
    {
        id: "ad-revenue",
        name: "Ad Revenue",
        description: "+2 bonus Thoughts per round",
        commodityId: "ADS",
        commodityCost: 5,
        icon: "💭",
    },
    {
        id: "soft-reroll",
        name: "Software Assist",
        description: "+1 free reroll per shop phase",
        commodityId: "SOFT",
        commodityCost: 5,
        icon: "🔄",
    },
    {
        id: "bandwidth-armor",
        name: "Bandwidth Armor",
        description: "+5 HP to all units",
        commodityId: "BW",
        commodityCost: 5,
        icon: "🛡️",
    },
    {
        id: "dom-expansion",
        name: "DOM Expansion",
        description: "Shop offers +1 extra unit",
        commodityId: "DOM",
        commodityCost: 5,
        icon: "🏪",
    },
    {
        id: "vc-funding",
        name: "VC Funding",
        description: "Start with +3 bonus Thoughts",
        commodityId: "VC",
        commodityCost: 5,
        icon: "💰",
    },
]

export const RUN_BUFF_MAP: ReadonlyMap<string, RunBuff> = new Map(
    RUN_BUFFS.map((b) => [b.id, b])
)
