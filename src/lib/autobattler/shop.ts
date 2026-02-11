import { type CombatBonuses, createCombatUnit } from "./combat"
import type { CombatUnit, FactionId, ShopOffer, UnitId } from "./types"
import { ALL_UNITS, UNIT_MAP } from "./units"

export const INITIAL_SCRAP = 5
export const SCRAP_PER_ROUND = 3
export const REROLL_COST = 1
/** Sell refund multipliers by level: L1=full, L2=2x, L3=5x base cost */
export const SELL_REFUND_MULT = [1, 2, 5]
export const SHOP_SIZE = 3
export const BASE_LINE_SLOTS = 5
export const MAX_BENCH_SIZE = 4

/** Provider for dynamic line slot count based on player level */
let lineSlotProvider: (() => number) | null = null

export function setLineSlotProvider(fn: () => number): void {
    lineSlotProvider = fn
}

export function getMaxLineSlots(): number {
    return lineSlotProvider?.() ?? BASE_LINE_SLOTS
}

/** Determine which units can appear in the shop, based on the player's collection */
function getShopPool(unlockedUnitIds: Set<UnitId>): UnitId[] {
    return ALL_UNITS.filter(
        (u) =>
            u.shopCost > 0 &&
            (u.faction === "drifters" || unlockedUnitIds.has(u.id))
    ).map((u) => u.id)
}

/**
 * Generate shop offers, optionally weighted toward a preferred faction.
 * @param preferredFaction If provided, 30% chance each slot offers a unit from this faction.
 */
export function generateShopOffers(
    unlockedUnitIds: Set<UnitId>,
    count: number = SHOP_SIZE,
    preferredFaction?: FactionId
): ShopOffer[] {
    const pool = getShopPool(unlockedUnitIds)
    if (pool.length === 0) return []

    // Build a faction-specific pool if requested
    const factionPool = preferredFaction
        ? pool.filter((id) => {
              const def = UNIT_MAP.get(id)
              return def?.faction === preferredFaction
          })
        : []

    const offers: ShopOffer[] = []
    for (let i = 0; i < count; i++) {
        // 30% chance to offer from preferred faction (if pool exists)
        const useFaction = factionPool.length > 0 && Math.random() < 0.3
        const pickPool = useFaction ? factionPool : pool
        const unitId = pickPool[Math.floor(Math.random() * pickPool.length)]
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
    unlockedUnitIds: Set<UnitId>
): ShopState {
    return {
        scrap: INITIAL_SCRAP,
        offers: generateShopOffers(unlockedUnitIds),
        lineup: [],
        bench: [],
    }
}

export function buyUnit(
    state: ShopState,
    offerIndex: number,
    combatBonuses?: CombatBonuses
): boolean {
    const offer = state.offers[offerIndex]
    if (!offer || offer.sold) return false
    if (state.scrap < offer.cost) return false

    state.scrap -= offer.cost
    offer.sold = true

    const unit = createCombatUnit(offer.unitDefId, 1, combatBonuses)

    if (
        tryCombine(unit, state.lineup, combatBonuses) ||
        tryCombine(unit, state.bench, combatBonuses)
    ) {
        return true
    }

    if (state.lineup.length < getMaxLineSlots()) {
        state.lineup.push(unit)
    } else if (state.bench.length < MAX_BENCH_SIZE) {
        state.bench.push(unit)
    } else {
        // No room -- refund and fail
        state.scrap += offer.cost
        offer.sold = false
        return false
    }
    return true
}

export function getSellRefund(unit: CombatUnit): number {
    const def = UNIT_MAP.get(unit.unitDefId)
    const baseCost = def?.shopCost ?? 1
    const mult = SELL_REFUND_MULT[Math.min(unit.level, 3) - 1] ?? 1
    return baseCost * mult
}

export function sellUnit(
    state: ShopState,
    source: "lineup" | "bench",
    index: number
): boolean {
    const list = source === "lineup" ? state.lineup : state.bench
    if (index < 0 || index >= list.length) return false

    const unit = list[index]
    state.scrap += getSellRefund(unit)
    list.splice(index, 1)
    return true
}

export function rerollShop(
    state: ShopState,
    unlockedUnitIds: Set<UnitId>,
    preferredFaction?: FactionId
): boolean {
    if (state.scrap < REROLL_COST) return false
    state.scrap -= REROLL_COST
    state.offers = generateShopOffers(
        unlockedUnitIds,
        SHOP_SIZE,
        preferredFaction
    )
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

    if (
        to === "lineup" &&
        from !== "lineup" &&
        toList.length >= getMaxLineSlots()
    ) {
        return false
    }

    if (to === "bench" && from !== "bench" && toList.length >= MAX_BENCH_SIZE) {
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
function tryCombine(
    newUnit: CombatUnit,
    list: CombatUnit[],
    combatBonuses?: CombatBonuses
): boolean {
    const matches = list.filter(
        (u) => u.unitDefId === newUnit.unitDefId && u.level === newUnit.level
    )

    if (matches.length >= 2) {
        const target = matches[0]
        target.level = Math.min(3, target.level + 1) as 1 | 2 | 3
        const def = UNIT_MAP.get(target.unitDefId)
        if (def) {
            const levelMult = 1 + (target.level - 1) * 0.5
            const factionAtkBonus =
                combatBonuses?.factionATK?.[def.faction] ?? 0
            const atkMult = 1 + (combatBonuses?.atkBonus ?? 0) + factionAtkBonus
            const hpMult = 1 + (combatBonuses?.hpBonus ?? 0)
            target.currentATK = Math.floor(def.baseATK * levelMult * atkMult)
            target.maxHP = Math.floor(def.baseHP * levelMult * hpMult)
            target.currentHP = target.maxHP
        }

        const secondIdx = list.indexOf(matches[1])
        if (secondIdx >= 0) list.splice(secondIdx, 1)

        return true
    }

    return false
}

/** Swap two positions within the lineup */
export function swapLineupPositions(
    state: ShopState,
    indexA: number,
    indexB: number
): boolean {
    if (
        indexA < 0 ||
        indexA >= state.lineup.length ||
        indexB < 0 ||
        indexB >= state.lineup.length ||
        indexA === indexB
    )
        return false

    const temp = state.lineup[indexA]
    state.lineup[indexA] = state.lineup[indexB]
    state.lineup[indexB] = temp
    return true
}

/** Move a unit from bench to a specific lineup position (insert) */
export function moveBenchToLineup(
    state: ShopState,
    benchIndex: number,
    lineupIndex: number
): boolean {
    if (benchIndex < 0 || benchIndex >= state.bench.length) return false
    if (state.lineup.length >= getMaxLineSlots()) return false

    const [unit] = state.bench.splice(benchIndex, 1)
    const clampedIdx = Math.min(lineupIndex, state.lineup.length)
    state.lineup.splice(clampedIdx, 0, unit)
    return true
}

/** Move a unit from lineup to bench */
export function moveLineupToBench(
    state: ShopState,
    lineupIndex: number
): boolean {
    if (lineupIndex < 0 || lineupIndex >= state.lineup.length) return false
    if (state.bench.length >= MAX_BENCH_SIZE) return false

    const [unit] = state.lineup.splice(lineupIndex, 1)
    state.bench.push(unit)
    return true
}

/** Get the most-represented non-drifter faction in the lineup */
export function getMajorityLineupFaction(
    lineup: CombatUnit[]
): FactionId | undefined {
    const counts = new Map<FactionId, number>()
    for (const unit of lineup) {
        if (unit.faction !== "drifters") {
            counts.set(unit.faction, (counts.get(unit.faction) ?? 0) + 1)
        }
    }
    let best: FactionId | undefined
    let bestCount = 0
    for (const [faction, count] of counts) {
        if (count > bestCount) {
            bestCount = count
            best = faction
        }
    }
    return best
}
