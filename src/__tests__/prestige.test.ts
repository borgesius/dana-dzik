import { describe, expect, it } from "vitest"

import {
    ASCENSION_PRESERVED_UPGRADES,
    calculateForesight,
    FORESIGHT_UPGRADE_MAP,
    FORESIGHT_UPGRADES,
} from "../lib/prestige/ascension"
import {
    calculateHindsight,
    HINDSIGHT_UPGRADE_MAP,
    HINDSIGHT_UPGRADES,
    PRESTIGE_THRESHOLD,
} from "../lib/prestige/constants"

// ── calculateHindsight ───────────────────────────────────────────────────────

describe("calculateHindsight", () => {
    it("returns 0 for 0 earnings", () => {
        expect(calculateHindsight(0)).toBe(0)
    })

    it("returns 0 for negative earnings", () => {
        expect(calculateHindsight(-100)).toBe(0)
    })

    it("follows the sqrt(earnings / 100) formula", () => {
        expect(calculateHindsight(10000)).toBe(
            Math.floor(Math.sqrt(10000 / 100))
        ) // 10
        expect(calculateHindsight(40000)).toBe(
            Math.floor(Math.sqrt(40000 / 100))
        ) // 20
    })

    it("increases monotonically with earnings", () => {
        let prev = 0
        for (let e = 0; e <= 100000; e += 500) {
            const h = calculateHindsight(e)
            expect(h).toBeGreaterThanOrEqual(prev)
            prev = h
        }
    })

    it("returns meaningful amount at prestige threshold", () => {
        const h = calculateHindsight(PRESTIGE_THRESHOLD)
        expect(h).toBeGreaterThan(0)
    })
})

// ── PRESTIGE_THRESHOLD ───────────────────────────────────────────────────────

describe("PRESTIGE_THRESHOLD", () => {
    it("is a positive number", () => {
        expect(PRESTIGE_THRESHOLD).toBeGreaterThan(0)
    })
})

// ── HINDSIGHT_UPGRADES ───────────────────────────────────────────────────────

describe("HINDSIGHT_UPGRADES", () => {
    it("has unique IDs", () => {
        const ids = HINDSIGHT_UPGRADES.map((u) => u.id)
        expect(new Set(ids).size).toBe(ids.length)
    })

    it("all upgrades have valid fields", () => {
        for (const u of HINDSIGHT_UPGRADES) {
            expect(u.name).toBeTruthy()
            expect(u.description).toBeTruthy()
            expect(u.cost).toBeGreaterThan(0)
            expect(u.maxPurchases).toBeGreaterThan(0)
            expect([
                "market",
                "production",
                "trading",
                "cross-system",
            ]).toContain(u.category)
        }
    })

    it("HINDSIGHT_UPGRADE_MAP matches array", () => {
        expect(HINDSIGHT_UPGRADE_MAP.size).toBe(HINDSIGHT_UPGRADES.length)
        for (const u of HINDSIGHT_UPGRADES) {
            expect(HINDSIGHT_UPGRADE_MAP.get(u.id)).toBe(u)
        }
    })

    it("has at least one upgrade per category", () => {
        const categories = new Set(HINDSIGHT_UPGRADES.map((u) => u.category))
        expect(categories).toContain("market")
        expect(categories).toContain("production")
        expect(categories).toContain("trading")
        expect(categories).toContain("cross-system")
    })
})

// ── calculateForesight ───────────────────────────────────────────────────────

describe("calculateForesight", () => {
    it("returns 0 for 0 spent", () => {
        expect(calculateForesight(0)).toBe(0)
    })

    it("follows floor(spent / 15) formula", () => {
        expect(calculateForesight(14)).toBe(0)
        expect(calculateForesight(15)).toBe(1)
        expect(calculateForesight(30)).toBe(2)
        expect(calculateForesight(100)).toBe(6)
    })

    it("increases monotonically", () => {
        let prev = 0
        for (let s = 0; s <= 200; s += 5) {
            const f = calculateForesight(s)
            expect(f).toBeGreaterThanOrEqual(prev)
            prev = f
        }
    })
})

// ── ASCENSION_PRESERVED_UPGRADES ─────────────────────────────────────────────

describe("ASCENSION_PRESERVED_UPGRADES", () => {
    it("contains valid hindsight upgrade IDs", () => {
        for (const id of ASCENSION_PRESERVED_UPGRADES) {
            expect(HINDSIGHT_UPGRADE_MAP.has(id)).toBe(true)
        }
    })

    it("is non-empty", () => {
        expect(ASCENSION_PRESERVED_UPGRADES.size).toBeGreaterThan(0)
    })
})

// ── FORESIGHT_UPGRADES ───────────────────────────────────────────────────────

describe("FORESIGHT_UPGRADES", () => {
    it("has unique IDs", () => {
        const ids = FORESIGHT_UPGRADES.map((u) => u.id)
        expect(new Set(ids).size).toBe(ids.length)
    })

    it("all upgrades have valid fields", () => {
        for (const u of FORESIGHT_UPGRADES) {
            expect(u.name).toBeTruthy()
            expect(u.description).toBeTruthy()
            expect(u.cost).toBeGreaterThan(0)
            expect(u.maxPurchases).toBeGreaterThan(0)
        }
    })

    it("FORESIGHT_UPGRADE_MAP matches array", () => {
        expect(FORESIGHT_UPGRADE_MAP.size).toBe(FORESIGHT_UPGRADES.length)
    })
})
