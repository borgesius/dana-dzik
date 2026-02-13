import { beforeEach, describe, expect, it, vi } from "vitest"

import {
    BOSS_DEFS,
    BOSS_MAP,
    BOSS_MODIFIER_MAP,
    BOSS_MODIFIERS,
    getOpponentStatMultiplier,
    isBossRound,
    pickBoss,
    pickBossModifier,
    pickBossOpponent,
    pickOpponent,
    ROUND_PARAMS,
} from "../lib/autobattler/opponents"
import { UNIT_MAP } from "../lib/autobattler/units"

// ── isBossRound ──────────────────────────────────────────────────────────────

describe("isBossRound", () => {
    it("returns false for rounds 1-4", () => {
        for (let r = 1; r <= 4; r++) {
            expect(isBossRound(r)).toBe(false)
        }
    })

    it("returns true for round 5", () => {
        expect(isBossRound(5)).toBe(true)
    })

    it("returns true for multiples of 5 at or above 5", () => {
        expect(isBossRound(10)).toBe(true)
        expect(isBossRound(15)).toBe(true)
        expect(isBossRound(20)).toBe(true)
    })

    it("returns false for non-multiples of 5", () => {
        expect(isBossRound(6)).toBe(false)
        expect(isBossRound(7)).toBe(false)
        expect(isBossRound(11)).toBe(false)
    })

    it("returns false for round 0", () => {
        expect(isBossRound(0)).toBe(false)
    })
})

// ── getOpponentStatMultiplier ────────────────────────────────────────────────

describe("getOpponentStatMultiplier", () => {
    it("returns 1.0 for rounds 1-5", () => {
        for (let r = 1; r <= 5; r++) {
            expect(getOpponentStatMultiplier(r)).toBe(1.0)
        }
    })

    it("scales up beyond round 5", () => {
        expect(getOpponentStatMultiplier(6)).toBeGreaterThan(1.0)
        expect(getOpponentStatMultiplier(10)).toBeGreaterThan(
            getOpponentStatMultiplier(6)
        )
    })

    it("increases monotonically for procedural rounds", () => {
        for (let r = 6; r <= 20; r++) {
            expect(getOpponentStatMultiplier(r + 1)).toBeGreaterThanOrEqual(
                getOpponentStatMultiplier(r)
            )
        }
    })
})

// ── ROUND_PARAMS ─────────────────────────────────────────────────────────────

describe("ROUND_PARAMS", () => {
    it("has at least 5 predefined rounds", () => {
        expect(ROUND_PARAMS.length).toBeGreaterThanOrEqual(5)
    })

    it("unit count grows or stays same across rounds", () => {
        for (let i = 1; i < ROUND_PARAMS.length; i++) {
            expect(ROUND_PARAMS[i].unitCount).toBeGreaterThanOrEqual(
                ROUND_PARAMS[i - 1].unitCount
            )
        }
    })

    it("all rounds have valid level ranges", () => {
        for (const p of ROUND_PARAMS) {
            expect(p.levelRange[0]).toBeGreaterThanOrEqual(1)
            expect(p.levelRange[1]).toBeGreaterThanOrEqual(p.levelRange[0])
            expect(p.levelRange[1]).toBeLessThanOrEqual(3)
        }
    })

    it("all rounds have stat multiplier >= 1.0", () => {
        for (const p of ROUND_PARAMS) {
            expect(p.statMultiplier).toBeGreaterThanOrEqual(1.0)
        }
    })
})

// ── BOSS_DEFS ────────────────────────────────────────────────────────────────

describe("BOSS_DEFS", () => {
    it("has at least 4 bosses", () => {
        expect(BOSS_DEFS.length).toBeGreaterThanOrEqual(4)
    })

    it("all boss IDs are unique", () => {
        const ids = BOSS_DEFS.map((b) => b.id)
        expect(new Set(ids).size).toBe(ids.length)
    })

    it("all boss unit IDs exist in UNIT_MAP", () => {
        for (const boss of BOSS_DEFS) {
            expect(UNIT_MAP.has(boss.id)).toBe(true)
        }
    })

    it("BOSS_MAP matches BOSS_DEFS", () => {
        expect(BOSS_MAP.size).toBe(BOSS_DEFS.length)
        for (const boss of BOSS_DEFS) {
            expect(BOSS_MAP.get(boss.id)).toBe(boss)
        }
    })
})

// ── pickBoss ─────────────────────────────────────────────────────────────────

describe("pickBoss", () => {
    beforeEach(() => {
        vi.restoreAllMocks()
    })

    it("returns a valid boss def", () => {
        const boss = pickBoss()
        expect(BOSS_MAP.has(boss.id)).toBe(true)
    })

    it("avoids the last boss used", () => {
        vi.spyOn(Math, "random").mockReturnValue(0)
        const boss1 = pickBoss()
        // Pick again avoiding boss1
        const boss2 = pickBoss(boss1.id)
        expect(boss2.id).not.toBe(boss1.id)
    })
})

// ── BOSS_MODIFIERS ───────────────────────────────────────────────────────────

describe("BOSS_MODIFIERS", () => {
    it("has unique modifier IDs", () => {
        const ids = BOSS_MODIFIERS.map((m) => m.id)
        expect(new Set(ids).size).toBe(ids.length)
    })

    it("all modifiers have name and description", () => {
        for (const m of BOSS_MODIFIERS) {
            expect(m.name).toBeTruthy()
            expect(m.description).toBeTruthy()
        }
    })

    it("BOSS_MODIFIER_MAP matches BOSS_MODIFIERS", () => {
        expect(BOSS_MODIFIER_MAP.size).toBe(BOSS_MODIFIERS.length)
    })
})

// ── pickBossModifier ─────────────────────────────────────────────────────────

describe("pickBossModifier", () => {
    beforeEach(() => {
        vi.restoreAllMocks()
    })

    it("can return undefined (no modifier)", () => {
        // Force high random value so modifier check fails
        vi.spyOn(Math, "random").mockReturnValue(0.99)
        const result = pickBossModifier("quickdraw", 5)
        // At round 5: chance = 0.5 + 5*0.05 = 0.75, random 0.99 > 0.75 → undefined
        expect(result).toBeUndefined()
    })

    it("returns a modifier at high rounds (100% chance)", () => {
        vi.spyOn(Math, "random").mockReturnValue(0.5)
        const result = pickBossModifier("quickdraw", 20)
        // At round 20: chance = min(1.0, 0.5 + 20*0.05) = 1.0, so always picks
        expect(result).toBeDefined()
    })

    it("faction-specific modifiers only appear for matching faction", () => {
        // Force deterministic picks
        let callCount = 0
        vi.spyOn(Math, "random").mockImplementation(() => {
            callCount++
            return callCount === 1 ? 0 : 0 // first call = modifier chance, second = pool pick
        })
        const mod = pickBossModifier("quickdraw", 20)
        if (mod?.faction) {
            expect(mod.faction).toBe("quickdraw")
        }
    })
})

// ── pickOpponent ─────────────────────────────────────────────────────────────

describe("pickOpponent", () => {
    beforeEach(() => {
        vi.restoreAllMocks()
    })

    it("returns a valid opponent def", () => {
        vi.spyOn(Math, "random").mockReturnValue(0.5)
        const opp = pickOpponent(1)
        expect(opp.name).toBeTruthy()
        expect(opp.units.length).toBeGreaterThan(0)
    })

    it("all opponent unit IDs exist in UNIT_MAP", () => {
        vi.spyOn(Math, "random").mockReturnValue(0.5)
        const opp = pickOpponent(3)
        for (const u of opp.units) {
            expect(UNIT_MAP.has(u.unitId)).toBe(true)
        }
    })

    it("opponent unit levels are within expected ranges", () => {
        vi.spyOn(Math, "random").mockReturnValue(0.5)
        for (let r = 1; r <= 5; r++) {
            const opp = pickOpponent(r)
            for (const u of opp.units) {
                expect(u.level).toBeGreaterThanOrEqual(1)
                expect(u.level).toBeLessThanOrEqual(3)
            }
        }
    })

    it("respects preferred faction", () => {
        vi.spyOn(Math, "random").mockReturnValue(0.5)
        const opp = pickOpponent(3, "clockwork")
        expect(opp.faction).toBe("clockwork")
    })
})

// ── pickBossOpponent ─────────────────────────────────────────────────────────

describe("pickBossOpponent", () => {
    beforeEach(() => {
        vi.restoreAllMocks()
    })

    it("returns a boss opponent", () => {
        vi.spyOn(Math, "random").mockReturnValue(0.5)
        const opp = pickBossOpponent(5)
        expect(opp.isBoss).toBe(true)
        expect(opp.bossId).toBeTruthy()
    })

    it("boss unit is in the lineup", () => {
        vi.spyOn(Math, "random").mockReturnValue(0.5)
        const opp = pickBossOpponent(5)
        const bossUnit = opp.units.find((u) => u.unitId === opp.bossId)
        expect(bossUnit).toBeDefined()
        expect(bossUnit!.level).toBe(3)
    })

    it("avoids last boss ID", () => {
        vi.spyOn(Math, "random").mockReturnValue(0)
        const opp1 = pickBossOpponent(5)
        const opp2 = pickBossOpponent(10, opp1.bossId)
        expect(opp2.bossId).not.toBe(opp1.bossId)
    })
})
