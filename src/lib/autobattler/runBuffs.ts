import type { CommodityId } from "../marketGame/types"

export interface RunBuff {
    id: string
    name: string
    description: string
    commodityId: CommodityId
    icon: string
}

/** Fraction of net worth each buff costs (8 % → buying all 6 = ~48 %). */
export const BUFF_COST_FRACTION = 0.08
/** Minimum commodity units a buff can cost (keeps it buyable early game). */
export const BUFF_MIN_COST = 3

/**
 * Compute the dynamic commodity-unit cost for a buff.
 * `netWorth` = MarketEngine.getNetWorth()
 * `commodityPrice` = current market price of the buff's commodity
 */
export function getBuffCost(netWorth: number, commodityPrice: number): number {
    if (commodityPrice <= 0) return BUFF_MIN_COST
    return Math.max(
        BUFF_MIN_COST,
        Math.ceil((netWorth * BUFF_COST_FRACTION) / commodityPrice)
    )
}

export const RUN_BUFFS: RunBuff[] = [
    {
        id: "email-rush",
        name: "Email Rush",
        description: "+1 ATK to all units in combat",
        commodityId: "EMAIL",
        icon: "⚔️",
    },
    {
        id: "ad-revenue",
        name: "Ad Revenue",
        description: "+1 bonus Thought per round",
        commodityId: "ADS",
        icon: "💭",
    },
    {
        id: "soft-reroll",
        name: "Software Assist",
        description: "+1 free reroll per shop phase",
        commodityId: "SOFT",
        icon: "🔄",
    },
    {
        id: "bandwidth-armor",
        name: "Bandwidth Armor",
        description: "+5 HP to all units",
        commodityId: "BW",
        icon: "🛡️",
    },
    {
        id: "dom-expansion",
        name: "DOM Expansion",
        description: "Shop offers +1 extra unit",
        commodityId: "DOM",
        icon: "🏪",
    },
    {
        id: "vc-funding",
        name: "VC Funding",
        description: "Start with +5 bonus Thoughts",
        commodityId: "VC",
        icon: "💰",
    },
]

export const RUN_BUFF_MAP: ReadonlyMap<string, RunBuff> = new Map(
    RUN_BUFFS.map((b) => [b.id, b])
)
