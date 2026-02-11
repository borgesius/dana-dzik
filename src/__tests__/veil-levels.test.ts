import { describe, expect, it } from "vitest"

import { BOSS_TAUNTS, LEVEL_CONFIGS } from "../lib/veil/levels"
import { VEIL_IDS } from "../lib/veil/types"

// ── LEVEL_CONFIGS integrity ──────────────────────────────────────────────────

describe("LEVEL_CONFIGS integrity", () => {
    it("has a config for every veil ID", () => {
        for (const id of VEIL_IDS) {
            expect(LEVEL_CONFIGS[id]).toBeDefined()
        }
    })

    it("each config has matching veilId", () => {
        for (const id of VEIL_IDS) {
            expect(LEVEL_CONFIGS[id].veilId).toBe(id)
        }
    })

    it("all configs have positive lanes", () => {
        for (const id of VEIL_IDS) {
            expect(LEVEL_CONFIGS[id].lanes).toBeGreaterThanOrEqual(3)
        }
    })

    it("all configs have positive survival seconds", () => {
        for (const id of VEIL_IDS) {
            expect(LEVEL_CONFIGS[id].survivalSeconds).toBeGreaterThan(0)
        }
    })

    it("survival time generally increases with level", () => {
        for (let i = 1; i < VEIL_IDS.length; i++) {
            const prev = LEVEL_CONFIGS[VEIL_IDS[i - 1]]
            const curr = LEVEL_CONFIGS[VEIL_IDS[i]]
            expect(curr.survivalSeconds).toBeGreaterThanOrEqual(
                prev.survivalSeconds
            )
        }
    })

    it("base speed increases with level", () => {
        for (let i = 1; i < VEIL_IDS.length; i++) {
            const prev = LEVEL_CONFIGS[VEIL_IDS[i - 1]]
            const curr = LEVEL_CONFIGS[VEIL_IDS[i]]
            expect(curr.baseSpeed).toBeGreaterThanOrEqual(prev.baseSpeed)
        }
    })

    it("all configs have valid speed multiplier (>= 1.0)", () => {
        for (const id of VEIL_IDS) {
            expect(LEVEL_CONFIGS[id].maxSpeedMultiplier).toBeGreaterThanOrEqual(
                1.0
            )
        }
    })

    it("spawn interval: base >= min", () => {
        for (const id of VEIL_IDS) {
            const cfg = LEVEL_CONFIGS[id]
            expect(cfg.baseSpawnInterval).toBeGreaterThanOrEqual(
                cfg.minSpawnInterval
            )
        }
    })

    it("all configs have at least one obstacle type", () => {
        for (const id of VEIL_IDS) {
            expect(LEVEL_CONFIGS[id].obstacleTypes.length).toBeGreaterThan(0)
        }
    })

    it("obstacle types grow with level (more types in harder levels)", () => {
        for (let i = 1; i < VEIL_IDS.length; i++) {
            const prev = LEVEL_CONFIGS[VEIL_IDS[i - 1]]
            const curr = LEVEL_CONFIGS[VEIL_IDS[i]]
            expect(curr.obstacleTypes.length).toBeGreaterThanOrEqual(
                prev.obstacleTypes.length
            )
        }
    })

    it("all configs have a theme", () => {
        for (const id of VEIL_IDS) {
            const theme = LEVEL_CONFIGS[id].theme
            expect(theme).toBeDefined()
            expect(theme.name).toBeTruthy()
            expect(theme.bgColor).toBeTruthy()
            expect(theme.playerColor).toBeTruthy()
            expect(theme.obstacleColors.length).toBeGreaterThan(0)
            expect(theme.cssClass).toBeTruthy()
        }
    })

    it("all themes have unique names", () => {
        const names = VEIL_IDS.map((id) => LEVEL_CONFIGS[id].theme.name)
        expect(new Set(names).size).toBe(names.length)
    })

    it("all configs have patterns array", () => {
        for (const id of VEIL_IDS) {
            expect(Array.isArray(LEVEL_CONFIGS[id].patterns)).toBe(true)
            expect(LEVEL_CONFIGS[id].patterns.length).toBeGreaterThan(0)
        }
    })

    it("pattern objects have an id", () => {
        for (const id of VEIL_IDS) {
            for (const pattern of LEVEL_CONFIGS[id].patterns) {
                expect(pattern.id).toBeTruthy()
            }
        }
    })

    it("patternChance is between 0 and 1", () => {
        for (const id of VEIL_IDS) {
            expect(LEVEL_CONFIGS[id].patternChance).toBeGreaterThanOrEqual(0)
            expect(LEVEL_CONFIGS[id].patternChance).toBeLessThanOrEqual(1)
        }
    })

    it("minDepthGap is positive", () => {
        for (const id of VEIL_IDS) {
            expect(LEVEL_CONFIGS[id].minDepthGap).toBeGreaterThan(0)
        }
    })

    it("difficulty features enabled progressively", () => {
        // Level 0 should be the easiest: no lane shift, no reverse, no taunts
        const l0 = LEVEL_CONFIGS[0]
        expect(l0.laneShift).toBe(false)
        expect(l0.reverseObstacles).toBe(false)
        expect(l0.taunts).toBe(false)
        expect(l0.glueWalls).toBe(false)

        // Final level should have all features enabled
        const l4 = LEVEL_CONFIGS[4]
        expect(l4.laneShift).toBe(true)
        expect(l4.reverseObstacles).toBe(true)
        expect(l4.taunts).toBe(true)
        expect(l4.glueWalls).toBe(true)
        expect(l4.depthDistortion).toBe(true)
    })
})

// ── BOSS_TAUNTS ──────────────────────────────────────────────────────────────

describe("BOSS_TAUNTS", () => {
    it("has at least 5 taunts", () => {
        expect(BOSS_TAUNTS.length).toBeGreaterThanOrEqual(5)
    })

    it("all taunts are non-empty strings", () => {
        for (const taunt of BOSS_TAUNTS) {
            expect(typeof taunt).toBe("string")
            expect(taunt.length).toBeGreaterThan(0)
        }
    })
})
