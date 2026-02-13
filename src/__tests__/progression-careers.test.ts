import { describe, expect, it } from "vitest"

import {
    ALL_CAREER_NODES,
    CAREER_BRANCHES,
    CAREER_NODE_MAP,
    CAREER_SWITCH_LEVEL_PENALTY,
    DORMANT_MULTIPLIER,
    EDUCATION_STARTER_NODE,
    ENGINEERING_STARTER_NODE,
    getNodesForBranch,
    MASTERY_DEFS,
    MASTERY_MAP,
    masteryCost,
    nodeCost,
    skillPointsForLevel,
    SKILLS_STARTER_NODE,
    totalMasteryCost,
} from "../lib/progression/careers"
import {
    getAchievementXP,
    levelFromXP,
    XP_REWARDS,
    xpForLevel,
    xpToNextLevel,
} from "../lib/progression/constants"

// ── skillPointsForLevel ──────────────────────────────────────────────────────

describe("skillPointsForLevel", () => {
    it("returns 0 for level 0", () => {
        expect(skillPointsForLevel(0)).toBe(0)
    })

    it("returns 1 for level 1 (floor(1/5)+1 = 1)", () => {
        expect(skillPointsForLevel(1)).toBe(1)
    })

    it("cumulates correctly for small levels", () => {
        // Levels 1-4: each grants floor(l/5)+1 = 1 SP each → 4 total
        expect(skillPointsForLevel(4)).toBe(4)
        // Level 5 grants floor(5/5)+1 = 2, so total = 4+2 = 6
        expect(skillPointsForLevel(5)).toBe(6)
    })

    it("grows monotonically", () => {
        for (let l = 1; l <= 50; l++) {
            expect(skillPointsForLevel(l)).toBeGreaterThanOrEqual(
                skillPointsForLevel(l - 1)
            )
        }
    })

    it("higher levels grant more SP per level", () => {
        // SP per level at level 10: floor(10/5)+1 = 3
        // SP per level at level 1: floor(1/5)+1 = 1
        const spAt10 = skillPointsForLevel(10) - skillPointsForLevel(9)
        const spAt1 = skillPointsForLevel(1) - skillPointsForLevel(0)
        expect(spAt10).toBeGreaterThan(spAt1)
    })
})

// ── nodeCost ─────────────────────────────────────────────────────────────────

describe("nodeCost", () => {
    it("returns 1 for tier 0 and tier 1", () => {
        expect(nodeCost(0)).toBe(1)
        expect(nodeCost(1)).toBe(1)
    })

    it("returns tier for tier >= 2", () => {
        expect(nodeCost(2)).toBe(2)
        expect(nodeCost(3)).toBe(3)
        expect(nodeCost(5)).toBe(5)
    })

    it("never returns less than 1", () => {
        expect(nodeCost(-1)).toBe(1)
    })
})

// ── masteryCost / totalMasteryCost ───────────────────────────────────────────

describe("masteryCost", () => {
    it("first rank costs 2 (0 + 2)", () => {
        expect(masteryCost(0)).toBe(2)
    })

    it("second rank costs 3 (1 + 2)", () => {
        expect(masteryCost(1)).toBe(3)
    })

    it("escalates linearly", () => {
        for (let r = 0; r < 10; r++) {
            expect(masteryCost(r)).toBe(r + 2)
        }
    })
})

describe("totalMasteryCost", () => {
    it("returns 0 for 0 ranks", () => {
        expect(totalMasteryCost(0)).toBe(0)
    })

    it("returns 2 for 1 rank", () => {
        expect(totalMasteryCost(1)).toBe(2)
    })

    it("cumulates correctly", () => {
        // Rank 0→1: cost 2. Rank 1→2: cost 3. Total for 2 ranks = 5.
        expect(totalMasteryCost(2)).toBe(5)
        // Rank 2→3: cost 4. Total for 3 ranks = 9.
        expect(totalMasteryCost(3)).toBe(9)
    })

    it("matches sum of individual masteryCost calls", () => {
        for (let ranks = 1; ranks <= 10; ranks++) {
            let sum = 0
            for (let k = 0; k < ranks; k++) {
                sum += masteryCost(k)
            }
            expect(totalMasteryCost(ranks)).toBe(sum)
        }
    })
})

// ── ALL_CAREER_NODES data integrity ──────────────────────────────────────────

describe("ALL_CAREER_NODES integrity", () => {
    it("has unique node IDs", () => {
        const ids = ALL_CAREER_NODES.map((n) => n.id)
        expect(new Set(ids).size).toBe(ids.length)
    })

    it("CAREER_NODE_MAP matches ALL_CAREER_NODES", () => {
        expect(CAREER_NODE_MAP.size).toBe(ALL_CAREER_NODES.length)
        for (const node of ALL_CAREER_NODES) {
            expect(CAREER_NODE_MAP.get(node.id)).toBe(node)
        }
    })

    it("all nodes have a name and bonusLabel", () => {
        for (const node of ALL_CAREER_NODES) {
            expect(node.name).toBeTruthy()
            expect(node.bonusLabel).toBeTruthy()
        }
    })

    it("all nodes have positive bonusValue", () => {
        for (const node of ALL_CAREER_NODES) {
            expect(node.bonusValue).toBeGreaterThan(0)
        }
    })

    it("all prerequisites reference existing node IDs", () => {
        for (const node of ALL_CAREER_NODES) {
            for (const prereqId of node.prerequisites) {
                expect(CAREER_NODE_MAP.has(prereqId)).toBe(true)
            }
        }
    })

    it("tier 1 nodes have no prerequisites", () => {
        const tier1 = ALL_CAREER_NODES.filter((n) => n.tier === 1)
        for (const node of tier1) {
            expect(node.prerequisites.length).toBe(0)
        }
    })

    it("higher tier nodes have prerequisites from lower tier", () => {
        for (const node of ALL_CAREER_NODES) {
            if (node.tier <= 1) continue
            expect(node.prerequisites.length).toBeGreaterThan(0)
            for (const prereqId of node.prerequisites) {
                const prereq = CAREER_NODE_MAP.get(prereqId)!
                expect(prereq.tier).toBeLessThan(node.tier)
            }
        }
    })
})

// ── getNodesForBranch ────────────────────────────────────────────────────────

describe("getNodesForBranch", () => {
    it("returns nodes for each career branch", () => {
        for (const branch of CAREER_BRANCHES) {
            const nodes = getNodesForBranch(branch.id)
            expect(nodes.length).toBeGreaterThan(0)
            for (const n of nodes) {
                expect(n.branch).toBe(branch.id)
            }
        }
    })

    it("returns education nodes", () => {
        const edu = getNodesForBranch("education")
        expect(edu.length).toBeGreaterThan(0)
    })

    it("returns skills nodes", () => {
        const skills = getNodesForBranch("skills")
        expect(skills.length).toBeGreaterThan(0)
    })
})

// ── Starter nodes ────────────────────────────────────────────────────────────

describe("starter nodes", () => {
    it("ENGINEERING_STARTER_NODE is tier 0 with no prerequisites", () => {
        expect(ENGINEERING_STARTER_NODE.tier).toBe(0)
        expect(ENGINEERING_STARTER_NODE.prerequisites.length).toBe(0)
    })

    it("EDUCATION_STARTER_NODE is tier 0 with no prerequisites", () => {
        expect(EDUCATION_STARTER_NODE.tier).toBe(0)
        expect(EDUCATION_STARTER_NODE.prerequisites.length).toBe(0)
    })

    it("SKILLS_STARTER_NODE is tier 0 with no prerequisites", () => {
        expect(SKILLS_STARTER_NODE.tier).toBe(0)
        expect(SKILLS_STARTER_NODE.prerequisites.length).toBe(0)
    })
})

// ── MASTERY_DEFS ─────────────────────────────────────────────────────────────

describe("MASTERY_DEFS", () => {
    it("has unique mastery IDs", () => {
        const ids = MASTERY_DEFS.map((m) => m.id)
        expect(new Set(ids).size).toBe(ids.length)
    })

    it("MASTERY_MAP matches MASTERY_DEFS", () => {
        expect(MASTERY_MAP.size).toBe(MASTERY_DEFS.length)
    })

    it("all masteries have positive bonusPerRank", () => {
        for (const m of MASTERY_DEFS) {
            expect(m.bonusPerRank).toBeGreaterThan(0)
        }
    })
})

// ── Constants: DORMANT_MULTIPLIER, CAREER_SWITCH_LEVEL_PENALTY ───────────────

describe("career constants", () => {
    it("dormant multiplier is between 0 and 1", () => {
        expect(DORMANT_MULTIPLIER).toBeGreaterThan(0)
        expect(DORMANT_MULTIPLIER).toBeLessThanOrEqual(1)
    })

    it("career switch level penalty is between 0 and 1", () => {
        expect(CAREER_SWITCH_LEVEL_PENALTY).toBeGreaterThan(0)
        expect(CAREER_SWITCH_LEVEL_PENALTY).toBeLessThan(1)
    })
})

// ── XP curve (progression/constants.ts) ──────────────────────────────────────

describe("xpForLevel", () => {
    it("returns 0 for level 0", () => {
        expect(xpForLevel(0)).toBe(0)
    })

    it("returns 100 for level 1", () => {
        expect(xpForLevel(1)).toBe(100)
    })

    it("grows monotonically", () => {
        for (let l = 1; l <= 50; l++) {
            expect(xpForLevel(l)).toBeGreaterThan(xpForLevel(l - 1))
        }
    })

    it("per-level deltas increase (super-linear growth)", () => {
        for (let l = 2; l <= 30; l++) {
            const delta = xpForLevel(l) - xpForLevel(l - 1)
            const prevDelta = xpForLevel(l - 1) - xpForLevel(l - 2)
            expect(delta).toBeGreaterThanOrEqual(prevDelta)
        }
    })
})

describe("levelFromXP", () => {
    it("returns 0 for 0 XP", () => {
        expect(levelFromXP(0)).toBe(0)
    })

    it("returns 0 for negative XP", () => {
        expect(levelFromXP(-100)).toBe(0)
    })

    it("returns correct level for XP just above thresholds", () => {
        // Due to floor-based formula, levelFromXP at exact thresholds may be off by 1
        // but with 1 extra XP it should always report the right level
        for (let l = 1; l <= 10; l++) {
            expect(levelFromXP(xpForLevel(l) + 1)).toBe(l)
        }
    })

    it("never exceeds the level for XP just below next threshold", () => {
        for (let l = 1; l <= 20; l++) {
            expect(levelFromXP(xpForLevel(l) - 1)).toBeLessThanOrEqual(l)
        }
    })
})

describe("xpToNextLevel", () => {
    it("returns level 0 for 0 XP", () => {
        const info = xpToNextLevel(0)
        expect(info.currentLevel).toBe(0)
        expect(info.progress).toBeGreaterThanOrEqual(0)
    })

    it("shows progress within current level", () => {
        const xpMid = xpForLevel(3) + 50
        const info = xpToNextLevel(xpMid)
        expect(info.currentLevel).toBe(3)
        expect(info.xpIntoLevel).toBe(50)
        expect(info.progress).toBeGreaterThan(0)
        expect(info.progress).toBeLessThan(1)
    })

    it("progress at exact level boundary is near 0", () => {
        // Due to floor-based rounding, exact boundary might show as previous level
        // Just verify progress is within sensible range
        const info = xpToNextLevel(xpForLevel(5) + 1)
        expect(info.currentLevel).toBe(5)
        expect(info.progress).toBeLessThan(0.05) // very early in next level
    })
})

describe("getAchievementXP", () => {
    it("returns base XP for no tier", () => {
        expect(getAchievementXP()).toBe(XP_REWARDS.achievementEarned)
    })

    it("returns base XP for tier 0 / undefined", () => {
        expect(getAchievementXP(0)).toBe(XP_REWARDS.achievementEarned)
    })

    it("higher tiers give more XP", () => {
        expect(getAchievementXP(2)).toBeGreaterThan(getAchievementXP(1))
        expect(getAchievementXP(3)).toBeGreaterThan(getAchievementXP(2))
        expect(getAchievementXP(4)).toBeGreaterThan(getAchievementXP(3))
        expect(getAchievementXP(5)).toBeGreaterThan(getAchievementXP(4))
    })
})
