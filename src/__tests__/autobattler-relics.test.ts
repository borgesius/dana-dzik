import { beforeEach, describe, expect, it, vi } from "vitest"

import {
    getDefaultUnlockedRelicIds,
    getRelicCountByTier,
    getUnlockedRelicDefs,
    RELIC_DEFS,
    RELIC_MAP,
    type RelicTier,
    rollRelicChoices,
} from "../lib/autobattler/relics"
import type { RelicId } from "../lib/autobattler/types"

// ── RELIC_DEFS integrity ─────────────────────────────────────────────────────

describe("RELIC_DEFS integrity", () => {
    it("has unique IDs", () => {
        const ids = RELIC_DEFS.map((r) => r.id)
        expect(new Set(ids).size).toBe(ids.length)
    })

    it("all relics have a valid tier", () => {
        const validTiers: RelicTier[] = [
            "common",
            "rare",
            "legendary",
            "secret",
        ]
        for (const r of RELIC_DEFS) {
            expect(validTiers).toContain(r.tier)
        }
    })

    it("all relics have an effect type", () => {
        for (const r of RELIC_DEFS) {
            expect(r.effect.type).toBeTruthy()
        }
    })

    it("all relics have an unlock condition", () => {
        for (const r of RELIC_DEFS) {
            expect(r.unlockCondition.type).toBeTruthy()
        }
    })

    it("RELIC_MAP matches RELIC_DEFS", () => {
        expect(RELIC_MAP.size).toBe(RELIC_DEFS.length)
        for (const r of RELIC_DEFS) {
            expect(RELIC_MAP.get(r.id)).toBe(r)
        }
    })
})

// ── getDefaultUnlockedRelicIds ───────────────────────────────────────────────

describe("getDefaultUnlockedRelicIds", () => {
    it("returns relics with 'default' unlock condition", () => {
        const defaults = getDefaultUnlockedRelicIds()
        expect(defaults.length).toBeGreaterThan(0)

        for (const id of defaults) {
            const relic = RELIC_MAP.get(id)!
            expect(relic.unlockCondition.type).toBe("default")
        }
    })

    it("all default-condition relics are included", () => {
        const defaults = getDefaultUnlockedRelicIds()
        const expected = RELIC_DEFS.filter(
            (r) => r.unlockCondition.type === "default"
        ).map((r) => r.id)
        expect(defaults).toEqual(expect.arrayContaining(expected))
        expect(defaults.length).toBe(expected.length)
    })
})

// ── getUnlockedRelicDefs ─────────────────────────────────────────────────────

describe("getUnlockedRelicDefs", () => {
    it("filters to only unlocked relics", () => {
        const unlocked = new Set<RelicId>(["aletheia", "wuji"])
        const result = getUnlockedRelicDefs(unlocked)
        expect(result.length).toBe(2)
        expect(result.map((r) => r.id)).toEqual(
            expect.arrayContaining(["aletheia", "wuji"])
        )
    })

    it("returns empty for empty unlock set", () => {
        const result = getUnlockedRelicDefs(new Set())
        expect(result.length).toBe(0)
    })

    it("ignores non-existent IDs in the unlock set", () => {
        const result = getUnlockedRelicDefs(
            new Set<RelicId>(["nonexistent" as RelicId])
        )
        expect(result.length).toBe(0)
    })
})

// ── getRelicCountByTier ──────────────────────────────────────────────────────

describe("getRelicCountByTier", () => {
    it("returns correct count for common relics", () => {
        const expected = RELIC_DEFS.filter((r) => r.tier === "common").length
        expect(getRelicCountByTier("common")).toBe(expected)
    })

    it("returns correct count for rare relics", () => {
        const expected = RELIC_DEFS.filter((r) => r.tier === "rare").length
        expect(getRelicCountByTier("rare")).toBe(expected)
    })

    it("returns correct count for legendary relics", () => {
        const expected = RELIC_DEFS.filter((r) => r.tier === "legendary").length
        expect(getRelicCountByTier("legendary")).toBe(expected)
    })

    it("returns correct count for secret relics", () => {
        const expected = RELIC_DEFS.filter((r) => r.tier === "secret").length
        expect(getRelicCountByTier("secret")).toBe(expected)
    })

    it("total across all tiers equals total relics", () => {
        const total =
            getRelicCountByTier("common") +
            getRelicCountByTier("rare") +
            getRelicCountByTier("legendary") +
            getRelicCountByTier("secret")
        expect(total).toBe(RELIC_DEFS.length)
    })
})

// ── rollRelicChoices ─────────────────────────────────────────────────────────

describe("rollRelicChoices", () => {
    beforeEach(() => {
        vi.restoreAllMocks()
    })

    it("returns up to count relics from pool", () => {
        const pool = RELIC_DEFS.slice(0, 5)
        const choices = rollRelicChoices(pool, 3)
        expect(choices.length).toBe(3)
    })

    it("returns fewer than count when pool is smaller", () => {
        const pool = RELIC_DEFS.slice(0, 2)
        const choices = rollRelicChoices(pool, 5)
        expect(choices.length).toBe(2)
    })

    it("excludes already-held relics", () => {
        const pool = RELIC_DEFS.slice(0, 5)
        const held = new Set([pool[0].id, pool[1].id])
        const choices = rollRelicChoices(pool, 5, held)
        for (const c of choices) {
            expect(held.has(c.id)).toBe(false)
        }
        expect(choices.length).toBe(3)
    })

    it("returns empty when all pool relics are held", () => {
        const pool = RELIC_DEFS.slice(0, 3)
        const held = new Set(pool.map((r) => r.id))
        const choices = rollRelicChoices(pool, 3, held)
        expect(choices.length).toBe(0)
    })

    it("returns no duplicate relics", () => {
        const choices = rollRelicChoices(RELIC_DEFS, 10)
        const ids = choices.map((c) => c.id)
        expect(new Set(ids).size).toBe(ids.length)
    })
})
