import type { CombatUnit, ShopOffer } from "./types"
import { ALL_UNITS, UNIT_MAP } from "./units"
import { createCombatUnit } from "./combat"

const INITIAL_SCRAP = 5
const SCRAP_PER_ROUND = 3
const REROLL_COST = 1
const SELL_REFUND_FRACTION = 0.5
const SHOP_SIZE = 3
const MAX_LINE_SLOTS = 5

/** Determine which units can appear in the shop, based on the player's collection */
function getShopPool(unlockedUnitIds: Set<string>): string[] {
    return ALL_UNITS.filter(
        (u) => u.shopCost > 0 && (u.faction === "drifters" || unlockedUnitIds.has(u.id))
    ).map((u) => u.id)
}

export function generateShopOffers(
    unlockedUnitIds: Set<string>,
    count: number = SHOP_SIZE
): ShopOffer[] {
    const pool = getShopPool(unlockedUnitIds)
    if (pool.length === 0) return []

    const offers: ShopOffer[] = []
    for (let i = 0; i < count; i++) {
        const unitId = pool[Math.floor(Math.random() * pool.length)]
        const def = UNIT_MAP.get(unitId)
        offers.push({
            unitDefId: unitId,
            cost: def?.shopCost ?? 1,
            sold: false,
        })
    }
    return offers
}

export interface ShopState {
    scrap: number
    offers: ShopOffer[]
    lineup: CombatUnit[]
    bench: CombatUnit[]
}

export function createInitialShopState(
    unlockedUnitIds: Set<string>
): ShopState {
    return {
        scrap: INITIAL_SCRAP,
        offers: generateShopOffers(unlockedUnitIds),
        lineup: [],
        bench: [],
    }
}

export function buyUnit(state: ShopState, offerIndex: number): boolean {
    const offer = state.offers[offerIndex]
    if (!offer || offer.sold) return false
    if (state.scrap < offer.cost) return false

    state.scrap -= offer.cost
    offer.sold = true

    const unit = createCombatUnit(offer.unitDefId)

    // Try to combine with existing units first
    if (tryCombine(unit, state.lineup) || tryCombine(unit, state.bench)) {
        return true
    }

    // Add to lineup if space, otherwise bench
    if (state.lineup.length < MAX_LINE_SLOTS) {
        state.lineup.push(unit)
    } else {
        state.bench.push(unit)
    }
    return true
}

export function sellUnit(
    state: ShopState,
    source: "lineup" | "bench",
    index: number
): boolean {
    const list = source === "lineup" ? state.lineup : state.bench
    if (index < 0 || index >= list.length) return false

    const unit = list[index]
    const def = UNIT_MAP.get(unit.unitDefId)
    const refund = Math.ceil((def?.shopCost ?? 1) * SELL_REFUND_FRACTION)
    state.scrap += refund
    list.splice(index, 1)
    return true
}

export function rerollShop(
    state: ShopState,
    unlockedUnitIds: Set<string>
): boolean {
    if (state.scrap < REROLL_COST) return false
    state.scrap -= REROLL_COST
    state.offers = generateShopOffers(unlockedUnitIds)
    return true
}

export function addRoundScrap(state: ShopState): void {
    state.scrap += SCRAP_PER_ROUND
}

export function moveUnit(
    state: ShopState,
    from: "lineup" | "bench",
    fromIndex: number,
    to: "lineup" | "bench",
    toIndex: number
): boolean {
    const fromList = from === "lineup" ? state.lineup : state.bench
    const toList = to === "lineup" ? state.lineup : state.bench

    if (fromIndex < 0 || fromIndex >= fromList.length) return false

    if (to === "lineup" && from !== "lineup" && toList.length >= MAX_LINE_SLOTS) {
        return false
    }

    const [unit] = fromList.splice(fromIndex, 1)
    toIndex = Math.min(toIndex, toList.length)
    toList.splice(toIndex, 0, unit)
    return true
}

/**
 * Try to combine a unit with matching units in a list.
 * Three copies of the same unit at the same level combine into one unit at level + 1.
 */
function tryCombine(newUnit: CombatUnit, list: CombatUnit[]): boolean {
    const matches = list.filter(
        (u) =>
            u.unitDefId === newUnit.unitDefId && u.level === newUnit.level
    )

    if (matches.length >= 2) {
        // Remove two matches, upgrade the first one
        const target = matches[0]
        target.level = Math.min(3, target.level + 1) as 1 | 2 | 3
        const def = UNIT_MAP.get(target.unitDefId)
        if (def) {
            const levelMult = 1 + (target.level - 1) * 0.5
            target.currentATK = Math.floor(def.baseATK * levelMult)
            target.maxHP = Math.floor(def.baseHP * levelMult)
            target.currentHP = target.maxHP
        }

        // Remove the second match
        const secondIdx = list.indexOf(matches[1])
        if (secondIdx >= 0) list.splice(secondIdx, 1)

        return true
    }

    return false
}

export { INITIAL_SCRAP, SCRAP_PER_ROUND, MAX_LINE_SLOTS, REROLL_COST }
