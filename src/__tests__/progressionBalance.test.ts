import { describe, expect, it } from "vitest"

import {
    // Autobattler rewards
    AB_REWARDS,
    // Achievements
    ACHIEVEMENTS,
    // Career
    ALL_CAREER_NODES,
    ALL_UNITS,
    // Thresholds
    BALANCE_THRESHOLDS,
    BUFF_MIN_COST,
    calculateHindsight,
    // Phase 6: Structured Products Desk
    CREDIT_RATING_SCALE,
    DAS_BASE_YIELD,
    DAS_DEFAULT_THRESHOLD,
    DAS_SAME_COMMODITY_DECAY,
    DORMANT_MULTIPLIER,
    getAchievementXP,
    getBuffCost,
    HINDSIGHT_UPGRADES,
    // Autobattler economy
    INITIAL_SCRAP,
    MARGIN_CALL_THRESHOLD,
    // Prestige
    PRESTIGE_THRESHOLD,
    RATING_INTEREST_RATE,
    RATING_LEVERAGE_RATIO,
    RATING_YIELD_MULT,
    REROLL_COST,
    ROUND_PARAMS,
    RUN_BUFFS,
    SCRAP_PER_ROUND,
    SELL_REFUND_MULT,
    // Market
    STARTING_CASH,
    // XP / Progression
    XP_REWARDS,
    xpForLevel,
} from "../config/balance"

// ─────────────────────────────────────────────────────────────────────────────
// 1. XP Curve Sanity
// ─────────────────────────────────────────────────────────────────────────────

describe("XP curve sanity", () => {
    it("per-level XP deltas grow monotonically", () => {
        for (let level = 2; level <= 50; level++) {
            const delta = xpForLevel(level) - xpForLevel(level - 1)
            const prevDelta = xpForLevel(level - 1) - xpForLevel(level - 2)
            expect(delta).toBeGreaterThanOrEqual(prevDelta)
        }
    })

    it("level 1 achievable in under 10 autobattler rounds of XP", () => {
        // Best case: win every round → base 15 + round * 5
        const xpPerRound =
            AB_REWARDS.xpPerWinBase + 3 * AB_REWARDS.xpPerWinPerRound // avg round ~3
        const xpIn10Rounds = xpPerRound * 10
        expect(xpIn10Rounds).toBeGreaterThanOrEqual(xpForLevel(1))
    })

    it("level 50 requires substantial sustained play", () => {
        // Level 50 should require much more than a few runs
        const xp50 = xpForLevel(50)
        const avgRunXP =
            XP_REWARDS.autobattlerWin * 3 + XP_REWARDS.autobattlerRun
        expect(xp50 / avgRunXP).toBeGreaterThan(50)
    })
})

// ─────────────────────────────────────────────────────────────────────────────
// 2. Autobattler Economy
// ─────────────────────────────────────────────────────────────────────────────

describe("autobattler economy", () => {
    const cheapestUnit = Math.min(
        ...ALL_UNITS.filter((u) => u.shopCost > 0).map((u) => u.shopCost)
    )

    it("starting scrap affords >= 2 tier-1 units", () => {
        expect(INITIAL_SCRAP / cheapestUnit).toBeGreaterThanOrEqual(2)
    })

    it("per-round scrap affords >= 1 tier-1 unit", () => {
        expect(SCRAP_PER_ROUND).toBeGreaterThanOrEqual(cheapestUnit)
    })

    it("reroll cost is less than per-round income", () => {
        expect(REROLL_COST).toBeLessThan(SCRAP_PER_ROUND)
    })

    it("sell refund at L1 equals full shop cost", () => {
        expect(SELL_REFUND_MULT[0]).toBe(1)
    })

    it("sell refund scales: L3 > L2 > L1", () => {
        expect(SELL_REFUND_MULT[2]).toBeGreaterThan(SELL_REFUND_MULT[1])
        expect(SELL_REFUND_MULT[1]).toBeGreaterThan(SELL_REFUND_MULT[0])
    })

    it("base round params are defined for initial rounds", () => {
        expect(ROUND_PARAMS.length).toBeGreaterThanOrEqual(5)
    })
})

// ─────────────────────────────────────────────────────────────────────────────
// 3. Opponent Difficulty Scaling
// ─────────────────────────────────────────────────────────────────────────────

describe("opponent difficulty scaling", () => {
    // Compute an estimate of opponent stat budget per round
    // vs what the player can afford at that point

    const avgFactionStats = ((): number => {
        const combatUnits = ALL_UNITS.filter((u) => u.shopCost > 0)
        const totalATK = combatUnits.reduce((s, u) => s + u.baseATK, 0)
        const totalHP = combatUnits.reduce((s, u) => s + u.baseHP, 0)
        return (totalATK + totalHP) / combatUnits.length
    })()

    const avgShopCost = ((): number => {
        const combatUnits = ALL_UNITS.filter((u) => u.shopCost > 0)
        return (
            combatUnits.reduce((s, u) => s + u.shopCost, 0) / combatUnits.length
        )
    })()

    it("opponent budget ratio stays within threshold for all rounds", () => {
        let cumulativePlayerScrap = INITIAL_SCRAP

        for (let r = 0; r < ROUND_PARAMS.length; r++) {
            const params = ROUND_PARAMS[r]

            // Opponent budget estimate: unitCount * avgStats * avgLevelMult
            const avgLevel = (params.levelRange[0] + params.levelRange[1]) / 2
            const levelMult =
                AB_REWARDS.levelStatMult[
                    Math.min(
                        Math.floor(avgLevel) - 1,
                        AB_REWARDS.levelStatMult.length - 1
                    )
                ]
            const opponentBudget =
                params.unitCount * avgFactionStats * levelMult

            // Player budget: how many stats can we afford?
            const affordableUnits = cumulativePlayerScrap / avgShopCost
            const playerBudget = affordableUnits * avgFactionStats

            if (playerBudget > 0) {
                const ratio = opponentBudget / playerBudget
                expect(ratio).toBeLessThanOrEqual(
                    BALANCE_THRESHOLDS.maxOpponentBudgetRatio
                )
            }

            // Next round: player gains more scrap (+ win bonus)
            cumulativePlayerScrap += SCRAP_PER_ROUND + AB_REWARDS.winBonusScrap
        }
    })
})

// ─────────────────────────────────────────────────────────────────────────────
// 4. Cross-System Reward Proportionality
// ─────────────────────────────────────────────────────────────────────────────

describe("cross-system reward proportionality", () => {
    it("autobattler buff minimum cost is achievable early game", () => {
        // Buff costs are wealth-scaled with a minimum of BUFF_MIN_COST units.
        // Verify the min cost is reachable within a few runs of winning commodities.
        const avgWinsPerRun = Math.ceil(8 * 0.6) // ~60% win rate over ~8 rounds avg run
        const commoditiesPerRun = avgWinsPerRun // 1 commodity per win
        const runsNeeded = Math.ceil(BUFF_MIN_COST / commoditiesPerRun)
        expect(runsNeeded).toBeLessThanOrEqual(
            BALANCE_THRESHOLDS.maxRunsPerBuff
        )
    })

    it("prestige XP is meaningful relative to XP curve at expected prestige level", () => {
        // At first prestige (lifetime ~5000), player is maybe level 5-10
        // 100 XP should be a non-trivial fraction of a level
        const midLevel = 7
        const levelXP = xpForLevel(midLevel + 1) - xpForLevel(midLevel)
        const prestigeXP = XP_REWARDS.prestige
        expect(prestigeXP / levelXP).toBeGreaterThan(0.05) // at least 5% of a level
    })

    it("autobattler win cash ($0.50 implied) is non-trivial vs starting cash", () => {
        // Win bonus scrap = 2, which feeds into the AB economy, not cash directly.
        // The commodity reward to market path: 1 commodity at base price
        // Just verify starting cash is small enough that rewards matter
        expect(STARTING_CASH).toBeLessThan(1)
    })
})

// ─────────────────────────────────────────────────────────────────────────────
// 5. Career Node Balance
// ─────────────────────────────────────────────────────────────────────────────

describe("career node balance", () => {
    it("all bonus values are positive and non-zero", () => {
        for (const node of ALL_CAREER_NODES) {
            expect(node.bonusValue).toBeGreaterThan(0)
        }
    })

    it("nodes at same tier have bonus magnitudes within 5x of each other", () => {
        const tiers = new Map<number, number[]>()
        for (const node of ALL_CAREER_NODES) {
            const arr = tiers.get(node.tier) ?? []
            arr.push(node.bonusValue)
            tiers.set(node.tier, arr)
        }

        for (const [, values] of tiers) {
            if (values.length < 2) continue
            const min = Math.min(...values)
            const max = Math.max(...values)
            expect(max / min).toBeLessThanOrEqual(5)
        }
    })

    it("dormant multiplier keeps bonuses above a meaningful threshold", () => {
        const minBonus = Math.min(...ALL_CAREER_NODES.map((n) => n.bonusValue))
        expect(minBonus * DORMANT_MULTIPLIER).toBeGreaterThan(0)
    })
})

// ─────────────────────────────────────────────────────────────────────────────
// 6. Prestige Economy
// ─────────────────────────────────────────────────────────────────────────────

describe("prestige economy", () => {
    it("first prestige yields >= minFirstPrestigeHindsight", () => {
        const hindsight = calculateHindsight(PRESTIGE_THRESHOLD)
        expect(hindsight).toBeGreaterThanOrEqual(
            BALANCE_THRESHOLDS.minFirstPrestigeHindsight
        )
    })

    it("every shop item is affordable within 5 prestiges", () => {
        // 5 prestiges at threshold should give ~35 hindsight total
        const hindsightPer = calculateHindsight(PRESTIGE_THRESHOLD)
        const totalHindsight = hindsightPer * 5

        for (const upgrade of HINDSIGHT_UPGRADES) {
            expect(upgrade.cost).toBeLessThanOrEqual(totalHindsight)
        }
    })

    it("prestige threshold is achievable (>= 50x starting cash)", () => {
        expect(PRESTIGE_THRESHOLD).toBeGreaterThanOrEqual(STARTING_CASH * 50)
    })
})

// ─────────────────────────────────────────────────────────────────────────────
// 7. Achievement Pacing
// ─────────────────────────────────────────────────────────────────────────────

describe("achievement pacing", () => {
    it("all tiered groups have strictly increasing tier numbers", () => {
        const groups = new Map<string, number[]>()
        for (const ach of ACHIEVEMENTS) {
            if (ach.tieredGroup && ach.tier != null) {
                const arr = groups.get(ach.tieredGroup) ?? []
                arr.push(ach.tier)
                groups.set(ach.tieredGroup, arr)
            }
        }

        for (const [, tiers] of groups) {
            const sorted = [...tiers].sort((a, b) => a - b)
            for (let i = 1; i < sorted.length; i++) {
                expect(sorted[i]).toBeGreaterThan(sorted[i - 1])
            }
        }
    })

    it("XP per tier level increases strictly", () => {
        const tiers = [1, 2, 3, 4, 5]
        for (let i = 1; i < tiers.length; i++) {
            expect(getAchievementXP(tiers[i])).toBeGreaterThan(
                getAchievementXP(tiers[i - 1])
            )
        }
    })

    it("each achievement XP is a meaningful fraction of a level", () => {
        const level5XP = xpForLevel(6) - xpForLevel(5)
        const baseXP = getAchievementXP()
        expect(baseXP / level5XP).toBeGreaterThanOrEqual(
            BALANCE_THRESHOLDS.minAchievementXPFraction
        )
    })
})

// ─────────────────────────────────────────────────────────────────────────────
// 8. Unit Stat Efficiency
// ─────────────────────────────────────────────────────────────────────────────

describe("unit stat efficiency", () => {
    const combatUnits = ALL_UNITS.filter((u) => u.shopCost > 0)

    it("no unit has ATK > HP * maxAtkHpRatio", () => {
        for (const unit of combatUnits) {
            expect(unit.baseATK).toBeLessThanOrEqual(
                unit.baseHP * BALANCE_THRESHOLDS.maxAtkHpRatio
            )
        }
    })

    it("within each tier, (ATK+HP)/cost is within factor of tier median", () => {
        const tiers = new Map<number, { name: string; efficiency: number }[]>()
        for (const unit of combatUnits) {
            const eff = (unit.baseATK + unit.baseHP) / unit.shopCost
            const arr = tiers.get(unit.tier) ?? []
            arr.push({ name: unit.id, efficiency: eff })
            tiers.set(unit.tier, arr)
        }

        for (const [, units] of tiers) {
            if (units.length < 2) continue
            const efficiencies = units.map((u) => u.efficiency)
            const sorted = [...efficiencies].sort((a, b) => a - b)
            const median = sorted[Math.floor(sorted.length / 2)]

            for (const u of units) {
                const ratio =
                    u.efficiency > median
                        ? u.efficiency / median
                        : median / u.efficiency
                expect(ratio - 1).toBeLessThanOrEqual(
                    BALANCE_THRESHOLDS.statCostVarianceFactor
                )
            }
        }
    })
})

// ─────────────────────────────────────────────────────────────────────────────
// 9. Pre-Run Buff Uniformity
// ─────────────────────────────────────────────────────────────────────────────

describe("pre-run buff wealth-scaled costs", () => {
    it("buff cost scales with net worth", () => {
        const lowCost = getBuffCost(10, 0.25) // early game
        const highCost = getBuffCost(50000, 0.25) // late game
        expect(highCost).toBeGreaterThan(lowCost)
    })

    it("buff cost has a minimum floor", () => {
        const cost = getBuffCost(0, 0.25) // zero net worth
        expect(cost).toBe(BUFF_MIN_COST)
    })

    it("all buffs have a commodity assigned", () => {
        for (const buff of RUN_BUFFS) {
            expect(buff.commodityId).toBeTruthy()
        }
    })
})

// ─────────────────────────────────────────────────────────────────────────────
// 10. Phase 6: Structured Products Desk Balance
// ─────────────────────────────────────────────────────────────────────────────

describe("structured products desk balance", () => {
    it("credit rating scale is monotonically ordered F -> AAA (7 notches)", () => {
        expect(CREDIT_RATING_SCALE).toEqual([
            "F",
            "D",
            "C",
            "B",
            "A",
            "AA",
            "AAA",
        ])
        expect(CREDIT_RATING_SCALE.length).toBe(7)
    })

    it("yield multiplier increases monotonically with rating", () => {
        for (let i = 1; i < CREDIT_RATING_SCALE.length; i++) {
            const prev = RATING_YIELD_MULT[CREDIT_RATING_SCALE[i - 1]]
            const curr = RATING_YIELD_MULT[CREDIT_RATING_SCALE[i]]
            expect(curr).toBeGreaterThan(prev)
        }
    })

    it("leverage ratio increases monotonically with rating", () => {
        for (let i = 1; i < CREDIT_RATING_SCALE.length; i++) {
            const prev = RATING_LEVERAGE_RATIO[CREDIT_RATING_SCALE[i - 1]]
            const curr = RATING_LEVERAGE_RATIO[CREDIT_RATING_SCALE[i]]
            expect(curr).toBeGreaterThan(prev)
        }
    })

    it("interest rate decreases monotonically with rating", () => {
        for (let i = 1; i < CREDIT_RATING_SCALE.length; i++) {
            const prev = RATING_INTEREST_RATE[CREDIT_RATING_SCALE[i - 1]]
            const curr = RATING_INTEREST_RATE[CREDIT_RATING_SCALE[i]]
            expect(curr).toBeLessThan(prev)
        }
    })

    it("AAA yield mult is at most 4x of F yield mult (bounded spread)", () => {
        const ratio = RATING_YIELD_MULT["AAA"] / RATING_YIELD_MULT["F"]
        expect(ratio).toBeLessThanOrEqual(4)
        expect(ratio).toBeGreaterThanOrEqual(2)
    })

    it("AAA leverage allows meaningful borrowing but not infinite", () => {
        expect(RATING_LEVERAGE_RATIO["AAA"]).toBeGreaterThan(1.0)
        expect(RATING_LEVERAGE_RATIO["AAA"]).toBeLessThanOrEqual(2.0)
    })

    it("F leverage is restrictive but non-zero", () => {
        expect(RATING_LEVERAGE_RATIO["F"]).toBeGreaterThan(0)
        expect(RATING_LEVERAGE_RATIO["F"]).toBeLessThanOrEqual(0.5)
    })

    it("margin call threshold is between 0.8 and 0.95", () => {
        expect(MARGIN_CALL_THRESHOLD).toBeGreaterThanOrEqual(0.8)
        expect(MARGIN_CALL_THRESHOLD).toBeLessThanOrEqual(0.95)
    })

    it("DAS default threshold is between 0.3 and 0.7", () => {
        expect(DAS_DEFAULT_THRESHOLD).toBeGreaterThanOrEqual(0.3)
        expect(DAS_DEFAULT_THRESHOLD).toBeLessThanOrEqual(0.7)
    })

    it("DAS same-commodity decay makes mono-securitization unprofitable by 4th DAS", () => {
        // After 3 same-commodity DAS, yield should be < 50% of base
        const decay3 = Math.pow(DAS_SAME_COMMODITY_DECAY, 3)
        expect(decay3).toBeLessThan(0.5)
    })

    it("DAS base yield at C rating produces reasonable income", () => {
        // 50 units of EMAIL ($0.05) at C rating (1.0x) should yield a small but nonzero amount
        const yieldPerTick = DAS_BASE_YIELD * 50 * 0.05 * RATING_YIELD_MULT["C"]
        expect(yieldPerTick).toBeGreaterThan(0)
        // Should be small relative to starting cash (not game-breaking)
        expect(yieldPerTick).toBeLessThan(0.1)
    })

    it("interest at F rate is punishing but not instantly lethal", () => {
        // $100 debt at F rate: how many ticks to double?
        const rate = RATING_INTEREST_RATE["F"]
        const ticksToDouble = Math.ceil(Math.log(2) / Math.log(1 + rate))
        // Should take at least 400 ticks (~16 minutes) to double
        expect(ticksToDouble).toBeGreaterThan(400)
        // But not more than 2000 ticks (~80 minutes)
        expect(ticksToDouble).toBeLessThan(2000)
    })

    it("interest at AAA rate is cheap enough to be useful", () => {
        // $100 debt at AAA rate: how many ticks to double?
        const rate = RATING_INTEREST_RATE["AAA"]
        const ticksToDouble = Math.ceil(Math.log(2) / Math.log(1 + rate))
        // Should take at least 5000 ticks to double
        expect(ticksToDouble).toBeGreaterThan(5000)
    })
})
