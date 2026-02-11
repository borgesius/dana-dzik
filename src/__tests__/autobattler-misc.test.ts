import { describe, expect, it } from "vitest"

import {
    BUFF_COST_FRACTION,
    BUFF_MIN_COST,
    getBuffCost,
    RUN_BUFF_MAP,
    RUN_BUFFS,
} from "../lib/autobattler/runBuffs"
import type { FactionId, UnitTier } from "../lib/autobattler/types"
import { ALL_UNITS, getUnitsForFaction, UNIT_MAP } from "../lib/autobattler/units"

// ── runBuffs: getBuffCost ────────────────────────────────────────────────────

describe("getBuffCost", () => {
    it("returns minimum cost when net worth is 0", () => {
        expect(getBuffCost(0, 0.25)).toBe(BUFF_MIN_COST)
    })

    it("returns minimum cost when commodity price is 0", () => {
        expect(getBuffCost(100, 0)).toBe(BUFF_MIN_COST)
    })

    it("returns minimum cost when commodity price is negative", () => {
        expect(getBuffCost(100, -1)).toBe(BUFF_MIN_COST)
    })

    it("scales with net worth", () => {
        const lowCost = getBuffCost(100, 0.25)
        const highCost = getBuffCost(10000, 0.25)
        expect(highCost).toBeGreaterThan(lowCost)
    })

    it("inversely related to commodity price", () => {
        const cheapCost = getBuffCost(1000, 0.1) // low price = more units needed
        const expensiveCost = getBuffCost(1000, 10) // high price = fewer units needed
        expect(cheapCost).toBeGreaterThan(expensiveCost)
    })

    it("follows the formula ceil(netWorth * fraction / price)", () => {
        const netWorth = 1000
        const price = 2.0
        const expected = Math.max(
            BUFF_MIN_COST,
            Math.ceil((netWorth * BUFF_COST_FRACTION) / price)
        )
        expect(getBuffCost(netWorth, price)).toBe(expected)
    })

    it("always returns at least BUFF_MIN_COST", () => {
        // Even tiny amounts
        expect(getBuffCost(1, 100)).toBeGreaterThanOrEqual(BUFF_MIN_COST)
    })
})

// ── RUN_BUFFS data integrity ─────────────────────────────────────────────────

describe("RUN_BUFFS", () => {
    it("all buffs have unique IDs", () => {
        const ids = RUN_BUFFS.map((b) => b.id)
        expect(new Set(ids).size).toBe(ids.length)
    })

    it("all buffs have a name, description, icon, and commodityId", () => {
        for (const buff of RUN_BUFFS) {
            expect(buff.name).toBeTruthy()
            expect(buff.description).toBeTruthy()
            expect(buff.icon).toBeTruthy()
            expect(buff.commodityId).toBeTruthy()
        }
    })

    it("RUN_BUFF_MAP matches RUN_BUFFS", () => {
        expect(RUN_BUFF_MAP.size).toBe(RUN_BUFFS.length)
        for (const buff of RUN_BUFFS) {
            expect(RUN_BUFF_MAP.get(buff.id)).toBe(buff)
        }
    })
})

// ── units.ts: ALL_UNITS data integrity ───────────────────────────────────────

describe("ALL_UNITS data integrity", () => {
    it("has unique unit IDs", () => {
        const ids = ALL_UNITS.map((u) => u.id)
        expect(new Set(ids).size).toBe(ids.length)
    })

    it("UNIT_MAP contains all units", () => {
        expect(UNIT_MAP.size).toBe(ALL_UNITS.length)
        for (const unit of ALL_UNITS) {
            expect(UNIT_MAP.get(unit.id)).toBe(unit)
        }
    })

    it("all units have valid factions", () => {
        const validFactions: FactionId[] = [
            "quickdraw",
            "deputies",
            "clockwork",
            "prospectors",
            "drifters",
        ]
        for (const unit of ALL_UNITS) {
            expect(validFactions).toContain(unit.faction)
        }
    })

    it("all units have valid tiers (1, 2, or 3)", () => {
        const validTiers: UnitTier[] = [1, 2, 3]
        for (const unit of ALL_UNITS) {
            expect(validTiers).toContain(unit.tier)
        }
    })

    it("all units have positive base stats", () => {
        for (const unit of ALL_UNITS) {
            expect(unit.baseATK).toBeGreaterThan(0)
            expect(unit.baseHP).toBeGreaterThan(0)
        }
    })

    it("all units have an ability definition", () => {
        for (const unit of ALL_UNITS) {
            expect(unit.ability).toBeDefined()
            expect(unit.ability.trigger).toBeTruthy()
            expect(unit.ability.effect).toBeDefined()
            expect(unit.ability.description).toBeTruthy()
        }
    })

    it("shop-available units have positive shopCost", () => {
        const shopUnits = ALL_UNITS.filter(
            (u) => !u.id.startsWith("boss-") && !u.id.startsWith("bp-shade")
        )
        for (const unit of shopUnits) {
            expect(unit.shopCost).toBeGreaterThan(0)
        }
    })

    it("boss units have shopCost of 0", () => {
        const bossUnits = ALL_UNITS.filter((u) => u.id.startsWith("boss-"))
        for (const unit of bossUnits) {
            expect(unit.shopCost).toBe(0)
        }
    })

    it("each faction has at least 3 units", () => {
        const factions: FactionId[] = [
            "quickdraw",
            "deputies",
            "clockwork",
            "prospectors",
            "drifters",
        ]
        for (const faction of factions) {
            const units = ALL_UNITS.filter(
                (u) => u.faction === faction && u.shopCost > 0
            )
            expect(units.length).toBeGreaterThanOrEqual(3)
        }
    })

    it("each faction has units across multiple tiers", () => {
        const factions: FactionId[] = [
            "quickdraw",
            "deputies",
            "clockwork",
            "prospectors",
        ]
        for (const faction of factions) {
            const tiers = new Set(
                ALL_UNITS.filter(
                    (u) => u.faction === faction && u.shopCost > 0
                ).map((u) => u.tier)
            )
            expect(tiers.size).toBeGreaterThanOrEqual(2)
        }
    })
})

// ── getUnitsForFaction ───────────────────────────────────────────────────────

describe("getUnitsForFaction", () => {
    it("returns only shop-available units for a faction", () => {
        const units = getUnitsForFaction("quickdraw")
        expect(units.length).toBeGreaterThan(0)
        for (const u of units) {
            expect(u.faction).toBe("quickdraw")
            expect(u.shopCost).toBeGreaterThan(0)
        }
    })

    it("excludes boss units", () => {
        const units = getUnitsForFaction("quickdraw")
        for (const u of units) {
            expect(u.id).not.toMatch(/^boss-/)
        }
    })

    it("returns drifter units", () => {
        const units = getUnitsForFaction("drifters")
        expect(units.length).toBeGreaterThan(0)
    })

    it("returns empty for nonexistent faction", () => {
        const units = getUnitsForFaction("nonexistent" as FactionId)
        expect(units.length).toBe(0)
    })
})
