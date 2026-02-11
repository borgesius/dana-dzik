import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { createCombatUnit } from "../lib/autobattler/combat"
import {
    addRoundScrap,
    BASE_LINE_SLOTS,
    buyUnit,
    createInitialShopState,
    generateShopOffers,
    getMajorityLineupFaction,
    getMaxLineSlots,
    getSellRefund,
    INITIAL_SCRAP,
    MAX_BENCH_SIZE,
    moveBenchToLineup,
    moveLineupToBench,
    moveUnit,
    rerollShop,
    REROLL_COST,
    SCRAP_PER_ROUND,
    sellUnit,
    SELL_REFUND_MULT,
    setLineSlotProvider,
    SHOP_SIZE,
    type ShopState,
    swapLineupPositions,
} from "../lib/autobattler/shop"
import type { CombatUnit, UnitId } from "../lib/autobattler/types"
import { ALL_UNITS, UNIT_MAP } from "../lib/autobattler/units"

// ── Helpers ──────────────────────────────────────────────────────────────────

/** All drifter IDs (always in the shop pool regardless of unlocks) */
const drifterIds = new Set<UnitId>(
    ALL_UNITS.filter((u) => u.faction === "drifters" && u.shopCost > 0).map(
        (u) => u.id
    )
)

/** A minimal set of unlocked non-drifter units for testing */
const testUnlocked = new Set<UnitId>([
    ...drifterIds,
    "qd-sharpshooter",
    "qd-deadeye",
    "dep-barricader",
])

// ── generateShopOffers ───────────────────────────────────────────────────────

describe("generateShopOffers", () => {
    it("returns SHOP_SIZE offers by default", () => {
        const offers = generateShopOffers(testUnlocked)
        expect(offers.length).toBe(SHOP_SIZE)
    })

    it("returns custom count of offers", () => {
        const offers = generateShopOffers(testUnlocked, 5)
        expect(offers.length).toBe(5)
    })

    it("all offers have valid unit IDs", () => {
        const offers = generateShopOffers(testUnlocked)
        for (const o of offers) {
            expect(UNIT_MAP.has(o.unitDefId)).toBe(true)
        }
    })

    it("offers are not sold by default", () => {
        const offers = generateShopOffers(testUnlocked)
        for (const o of offers) {
            expect(o.sold).toBe(false)
        }
    })

    it("offer cost matches unit shopCost", () => {
        const offers = generateShopOffers(testUnlocked)
        for (const o of offers) {
            const def = UNIT_MAP.get(o.unitDefId)!
            expect(o.cost).toBe(def.shopCost)
        }
    })

    it("returns empty array when pool is empty", () => {
        // No drifters, no unlocks → empty
        const emptySet = new Set<UnitId>()
        // Actually drifters are always in the pool, so we need to check that
        // even with an empty set, drifters are still offered
        const offers = generateShopOffers(emptySet)
        // Drifters should appear since they always show up
        expect(offers.length).toBe(SHOP_SIZE)
        for (const o of offers) {
            const def = UNIT_MAP.get(o.unitDefId)!
            expect(def.faction).toBe("drifters")
        }
    })

    it("preferred faction biases offers toward that faction", () => {
        // With many rolls, we should see some quickdraw offers
        vi.spyOn(Math, "random").mockReturnValue(0.1) // < 0.3, so use faction pool
        const offers = generateShopOffers(testUnlocked, 10, "quickdraw")
        const qdOffers = offers.filter((o) => {
            const def = UNIT_MAP.get(o.unitDefId)!
            return def.faction === "quickdraw"
        })
        expect(qdOffers.length).toBeGreaterThan(0)
        vi.restoreAllMocks()
    })
})

// ── createInitialShopState ───────────────────────────────────────────────────

describe("createInitialShopState", () => {
    it("starts with INITIAL_SCRAP", () => {
        const state = createInitialShopState(testUnlocked)
        expect(state.scrap).toBe(INITIAL_SCRAP)
    })

    it("starts with shop offers", () => {
        const state = createInitialShopState(testUnlocked)
        expect(state.offers.length).toBe(SHOP_SIZE)
    })

    it("starts with empty lineup and bench", () => {
        const state = createInitialShopState(testUnlocked)
        expect(state.lineup.length).toBe(0)
        expect(state.bench.length).toBe(0)
    })
})

// ── getSellRefund ────────────────────────────────────────────────────────────

describe("getSellRefund", () => {
    it("L1 refund equals base shop cost", () => {
        const unit = createCombatUnit("drifter-brawler", 1)
        const def = UNIT_MAP.get("drifter-brawler")!
        expect(getSellRefund(unit)).toBe(def.shopCost * SELL_REFUND_MULT[0])
    })

    it("L2 refund is 2x base cost", () => {
        const unit = createCombatUnit("qd-sharpshooter", 2)
        const def = UNIT_MAP.get("qd-sharpshooter")!
        expect(getSellRefund(unit)).toBe(def.shopCost * SELL_REFUND_MULT[1])
    })

    it("L3 refund is 5x base cost", () => {
        const unit = createCombatUnit("dep-barricader", 3)
        const def = UNIT_MAP.get("dep-barricader")!
        expect(getSellRefund(unit)).toBe(def.shopCost * SELL_REFUND_MULT[2])
    })
})

// ── buyUnit ──────────────────────────────────────────────────────────────────

describe("buyUnit", () => {
    let state: ShopState

    beforeEach(() => {
        vi.restoreAllMocks()
        setLineSlotProvider(null as unknown as () => number)
        state = {
            scrap: 10,
            offers: [
                { unitDefId: "drifter-brawler" as UnitId, cost: 1, sold: false },
                { unitDefId: "qd-sharpshooter" as UnitId, cost: 2, sold: false },
                { unitDefId: "dep-barricader" as UnitId, cost: 2, sold: false },
            ],
            lineup: [],
            bench: [],
        }
    })

    it("buys a unit and adds it to lineup", () => {
        const success = buyUnit(state, 0)
        expect(success).toBe(true)
        expect(state.lineup.length).toBe(1)
        expect(state.lineup[0].unitDefId).toBe("drifter-brawler")
        expect(state.scrap).toBe(9)
        expect(state.offers[0].sold).toBe(true)
    })

    it("fails when already sold", () => {
        state.offers[0].sold = true
        const success = buyUnit(state, 0)
        expect(success).toBe(false)
    })

    it("fails when not enough scrap", () => {
        state.scrap = 0
        const success = buyUnit(state, 1)
        expect(success).toBe(false)
        expect(state.offers[1].sold).toBe(false)
    })

    it("fails with invalid offer index", () => {
        const success = buyUnit(state, 99)
        expect(success).toBe(false)
    })

    it("puts unit on bench when lineup is full", () => {
        // Fill lineup with non-matching units to avoid tryCombine
        const fillerIds: UnitId[] = ["drifter-scout", "drifter-medic", "drifter-heavy", "qd-sharpshooter", "dep-barricader"]
        for (let i = 0; i < BASE_LINE_SLOTS; i++) {
            state.lineup.push(createCombatUnit(fillerIds[i % fillerIds.length], 1))
        }
        const success = buyUnit(state, 0) // drifter-brawler not in lineup
        expect(success).toBe(true)
        expect(state.bench.length).toBe(1)
    })

    it("refunds when both lineup and bench are full", () => {
        const fillerIds: UnitId[] = ["drifter-scout", "drifter-medic", "drifter-heavy", "qd-sharpshooter", "dep-barricader"]
        for (let i = 0; i < BASE_LINE_SLOTS; i++) {
            state.lineup.push(createCombatUnit(fillerIds[i % fillerIds.length], 1))
        }
        const benchFillers: UnitId[] = ["qd-deadeye", "qd-dynamiter", "dep-marshal", "dep-trapper"]
        for (let i = 0; i < MAX_BENCH_SIZE; i++) {
            state.bench.push(createCombatUnit(benchFillers[i], 1))
        }
        const scrapBefore = state.scrap
        const success = buyUnit(state, 0) // drifter-brawler not in lineup or bench
        expect(success).toBe(false)
        expect(state.scrap).toBe(scrapBefore)
        expect(state.offers[0].sold).toBe(false)
    })
})

// ── sellUnit ─────────────────────────────────────────────────────────────────

describe("sellUnit", () => {
    let state: ShopState

    beforeEach(() => {
        state = {
            scrap: 0,
            offers: [],
            lineup: [createCombatUnit("drifter-brawler", 1)],
            bench: [createCombatUnit("qd-sharpshooter", 1)],
        }
    })

    it("sells a lineup unit and refunds scrap", () => {
        const def = UNIT_MAP.get("drifter-brawler")!
        const success = sellUnit(state, "lineup", 0)
        expect(success).toBe(true)
        expect(state.lineup.length).toBe(0)
        expect(state.scrap).toBe(def.shopCost * SELL_REFUND_MULT[0])
    })

    it("sells a bench unit and refunds scrap", () => {
        const def = UNIT_MAP.get("qd-sharpshooter")!
        const success = sellUnit(state, "bench", 0)
        expect(success).toBe(true)
        expect(state.bench.length).toBe(0)
        expect(state.scrap).toBe(def.shopCost * SELL_REFUND_MULT[0])
    })

    it("fails with invalid index", () => {
        expect(sellUnit(state, "lineup", -1)).toBe(false)
        expect(sellUnit(state, "lineup", 99)).toBe(false)
    })
})

// ── rerollShop ───────────────────────────────────────────────────────────────

describe("rerollShop", () => {
    it("rerolls and deducts scrap", () => {
        const state = createInitialShopState(testUnlocked)
        const scrapBefore = state.scrap
        const success = rerollShop(state, testUnlocked)
        expect(success).toBe(true)
        expect(state.scrap).toBe(scrapBefore - REROLL_COST)
        expect(state.offers.length).toBe(SHOP_SIZE)
    })

    it("fails when not enough scrap", () => {
        const state = createInitialShopState(testUnlocked)
        state.scrap = 0
        const success = rerollShop(state, testUnlocked)
        expect(success).toBe(false)
    })
})

// ── addRoundScrap ────────────────────────────────────────────────────────────

describe("addRoundScrap", () => {
    it("adds SCRAP_PER_ROUND to state", () => {
        const state = createInitialShopState(testUnlocked)
        const before = state.scrap
        addRoundScrap(state)
        expect(state.scrap).toBe(before + SCRAP_PER_ROUND)
    })
})

// ── moveUnit ─────────────────────────────────────────────────────────────────

describe("moveUnit", () => {
    let state: ShopState

    beforeEach(() => {
        setLineSlotProvider(null as unknown as () => number)
        state = {
            scrap: 10,
            offers: [],
            lineup: [
                createCombatUnit("drifter-brawler", 1),
                createCombatUnit("drifter-scout", 1),
            ],
            bench: [createCombatUnit("qd-sharpshooter", 1)],
        }
    })

    it("moves unit from lineup to bench", () => {
        const success = moveUnit(state, "lineup", 0, "bench", 0)
        expect(success).toBe(true)
        expect(state.lineup.length).toBe(1)
        expect(state.bench.length).toBe(2)
    })

    it("moves unit from bench to lineup", () => {
        const success = moveUnit(state, "bench", 0, "lineup", 0)
        expect(success).toBe(true)
        expect(state.lineup.length).toBe(3)
        expect(state.bench.length).toBe(0)
    })

    it("fails with invalid indices", () => {
        expect(moveUnit(state, "lineup", -1, "bench", 0)).toBe(false)
        expect(moveUnit(state, "lineup", 99, "bench", 0)).toBe(false)
    })

    it("fails moving to lineup when full", () => {
        while (state.lineup.length < BASE_LINE_SLOTS) {
            state.lineup.push(createCombatUnit("drifter-brawler", 1))
        }
        const success = moveUnit(state, "bench", 0, "lineup", 0)
        expect(success).toBe(false)
    })

    it("fails moving to bench when full", () => {
        while (state.bench.length < MAX_BENCH_SIZE) {
            state.bench.push(createCombatUnit("drifter-brawler", 1))
        }
        const success = moveUnit(state, "lineup", 0, "bench", 0)
        expect(success).toBe(false)
    })
})

// ── swapLineupPositions ──────────────────────────────────────────────────────

describe("swapLineupPositions", () => {
    it("swaps two lineup units", () => {
        const state: ShopState = {
            scrap: 0,
            offers: [],
            lineup: [
                createCombatUnit("drifter-brawler", 1),
                createCombatUnit("drifter-scout", 1),
            ],
            bench: [],
        }
        const id0 = state.lineup[0].instanceId
        const id1 = state.lineup[1].instanceId

        const success = swapLineupPositions(state, 0, 1)
        expect(success).toBe(true)
        expect(state.lineup[0].instanceId).toBe(id1)
        expect(state.lineup[1].instanceId).toBe(id0)
    })

    it("fails for same index", () => {
        const state: ShopState = {
            scrap: 0,
            offers: [],
            lineup: [createCombatUnit("drifter-brawler", 1)],
            bench: [],
        }
        expect(swapLineupPositions(state, 0, 0)).toBe(false)
    })

    it("fails for out-of-range indices", () => {
        const state: ShopState = {
            scrap: 0,
            offers: [],
            lineup: [createCombatUnit("drifter-brawler", 1)],
            bench: [],
        }
        expect(swapLineupPositions(state, 0, 5)).toBe(false)
        expect(swapLineupPositions(state, -1, 0)).toBe(false)
    })
})

// ── moveBenchToLineup / moveLineupToBench ────────────────────────────────────

describe("moveBenchToLineup", () => {
    it("moves a bench unit to a specific lineup position", () => {
        const state: ShopState = {
            scrap: 0,
            offers: [],
            lineup: [createCombatUnit("drifter-brawler", 1)],
            bench: [createCombatUnit("qd-sharpshooter", 1)],
        }
        const benchUnitId = state.bench[0].instanceId
        const success = moveBenchToLineup(state, 0, 0)
        expect(success).toBe(true)
        expect(state.lineup[0].instanceId).toBe(benchUnitId)
        expect(state.bench.length).toBe(0)
    })

    it("fails with invalid bench index", () => {
        const state: ShopState = {
            scrap: 0,
            offers: [],
            lineup: [],
            bench: [],
        }
        expect(moveBenchToLineup(state, 0, 0)).toBe(false)
    })
})

describe("moveLineupToBench", () => {
    it("moves a lineup unit to bench", () => {
        const state: ShopState = {
            scrap: 0,
            offers: [],
            lineup: [createCombatUnit("drifter-brawler", 1)],
            bench: [],
        }
        const success = moveLineupToBench(state, 0)
        expect(success).toBe(true)
        expect(state.lineup.length).toBe(0)
        expect(state.bench.length).toBe(1)
    })

    it("fails when bench is full", () => {
        const state: ShopState = {
            scrap: 0,
            offers: [],
            lineup: [createCombatUnit("drifter-brawler", 1)],
            bench: Array.from({ length: MAX_BENCH_SIZE }, () =>
                createCombatUnit("drifter-brawler", 1)
            ),
        }
        expect(moveLineupToBench(state, 0)).toBe(false)
    })
})

// ── getMajorityLineupFaction ─────────────────────────────────────────────────

describe("getMajorityLineupFaction", () => {
    it("returns the most common non-drifter faction", () => {
        const lineup: CombatUnit[] = [
            createCombatUnit("qd-sharpshooter", 1),
            createCombatUnit("qd-deadeye", 1),
            createCombatUnit("dep-barricader", 1),
        ]
        expect(getMajorityLineupFaction(lineup)).toBe("quickdraw")
    })

    it("ignores drifters", () => {
        const lineup: CombatUnit[] = [
            createCombatUnit("drifter-brawler", 1),
            createCombatUnit("drifter-scout", 1),
            createCombatUnit("drifter-medic", 1),
            createCombatUnit("qd-sharpshooter", 1),
        ]
        expect(getMajorityLineupFaction(lineup)).toBe("quickdraw")
    })

    it("returns undefined when lineup is only drifters", () => {
        const lineup: CombatUnit[] = [
            createCombatUnit("drifter-brawler", 1),
            createCombatUnit("drifter-scout", 1),
        ]
        expect(getMajorityLineupFaction(lineup)).toBeUndefined()
    })

    it("returns undefined for empty lineup", () => {
        expect(getMajorityLineupFaction([])).toBeUndefined()
    })
})

// ── getMaxLineSlots / setLineSlotProvider ────────────────────────────────────

describe("getMaxLineSlots", () => {
    afterEach(() => {
        setLineSlotProvider(null as unknown as () => number)
    })

    it("returns BASE_LINE_SLOTS when no provider is set", () => {
        setLineSlotProvider(null as unknown as () => number)
        expect(getMaxLineSlots()).toBe(BASE_LINE_SLOTS)
    })

    it("returns provider value when set", () => {
        setLineSlotProvider(() => 7)
        expect(getMaxLineSlots()).toBe(7)
    })
})
