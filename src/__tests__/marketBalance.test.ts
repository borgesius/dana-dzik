import { describe, expect, it } from "vitest"

import { MarketEngine } from "../lib/marketGame/MarketEngine"
import {
    COMMODITIES,
    FACTORIES,
    FACTORY_COST_SCALING,
    PHASE_THRESHOLDS,
    STARTING_CASH,
    TICK_INTERVAL_MS,
} from "../lib/marketGame/types"

const SEED = 7777

describe("market balance", () => {
    describe("economy sanity", () => {
        it("starting cash matches STARTING_CASH constant", () => {
            const engine = new MarketEngine(SEED)
            expect(engine.getCash()).toBe(STARTING_CASH)
        })

        it("every commodity has a positive base price", () => {
            for (const c of COMMODITIES) {
                expect(c.basePrice).toBeGreaterThan(0)
            }
        })

        it("EMAIL is always available at start (threshold 0)", () => {
            const email = COMMODITIES.find((c) => c.id === "EMAIL")!
            expect(email.unlockThreshold).toBe(0)
        })

        it("ADS is always available at start (threshold 0)", () => {
            const ads = COMMODITIES.find((c) => c.id === "ADS")!
            expect(ads.unlockThreshold).toBe(0)
        })

        it("can afford at least one starting commodity", () => {
            const affordable = COMMODITIES.filter(
                (c) => c.unlockThreshold === 0 && c.basePrice <= STARTING_CASH
            )
            expect(affordable.length).toBeGreaterThan(0)
        })
    })

    describe("phase thresholds are correctly ordered", () => {
        it("factories < upgrades < influence", () => {
            expect(PHASE_THRESHOLDS.factories).toBeLessThan(
                PHASE_THRESHOLDS.upgrades
            )
            expect(PHASE_THRESHOLDS.upgrades).toBeLessThan(
                PHASE_THRESHOLDS.influence
            )
        })
    })

    describe("commodity unlock ordering", () => {
        it("commodities unlock in ascending threshold order", () => {
            const sorted = [...COMMODITIES].sort(
                (a, b) => a.unlockThreshold - b.unlockThreshold
            )
            for (let i = 1; i < sorted.length; i++) {
                expect(sorted[i].unlockThreshold).toBeGreaterThanOrEqual(
                    sorted[i - 1].unlockThreshold
                )
            }
        })
    })

    describe("factory cost scaling", () => {
        it("factory costs are ascending by tier", () => {
            const costs = FACTORIES.map((f) => f.cost)
            for (let i = 1; i < costs.length; i++) {
                expect(costs[i]).toBeGreaterThanOrEqual(costs[i - 1])
            }
        })

        it("cheapest factory is affordable shortly after phase 2 unlock", () => {
            const cheapest = Math.min(...FACTORIES.map((f) => f.cost))
            expect(cheapest).toBeLessThan(PHASE_THRESHOLDS.factories * 2)
        })

        it("cost scaling factor is reasonable (1.1-1.3)", () => {
            expect(FACTORY_COST_SCALING).toBeGreaterThanOrEqual(1.1)
            expect(FACTORY_COST_SCALING).toBeLessThanOrEqual(1.3)
        })

        it("5th purchase of cheapest factory is still affordable in mid-game", () => {
            const cheapest = Math.min(...FACTORIES.map((f) => f.cost))
            const fifthCost = cheapest * Math.pow(FACTORY_COST_SCALING, 4)
            expect(fifthCost).toBeLessThan(PHASE_THRESHOLDS.upgrades)
        })
    })

    describe("factory conversion inputs", () => {
        it("list-builder has no conversion input (lowest tier)", () => {
            const lb = FACTORIES.find((f) => f.id === "list-builder")!
            expect(lb.conversionInput).toBeUndefined()
        })

        it("conversion inputs reference valid commodity ids", () => {
            const validIds = new Set(COMMODITIES.map((c) => c.id))
            for (const f of FACTORIES) {
                if (f.conversionInput) {
                    expect(validIds.has(f.conversionInput.commodity)).toBe(true)
                }
            }
        })

        it("conversion inputs consume lower-tier commodities", () => {
            const tierOrder = FACTORIES.map((f) => f.produces)
            for (const f of FACTORIES) {
                if (f.conversionInput) {
                    const inputTier = tierOrder.indexOf(
                        f.conversionInput.commodity
                    )
                    const outputTier = tierOrder.indexOf(f.produces)
                    expect(inputTier).toBeLessThan(outputTier)
                }
            }
        })
    })

    describe("factory ROI tiers", () => {
        it("higher-tier factories have longer tick cycles", () => {
            const lb = FACTORIES.find((f) => f.id === "list-builder")!
            const be = FACTORIES.find((f) => f.id === "banner-exchange")!
            const cr = FACTORIES.find((f) => f.id === "colocation-rack")!
            const od = FACTORIES.find((f) => f.id === "offshore-dev")!

            expect(lb.ticksPerCycle).toBeLessThanOrEqual(be.ticksPerCycle)
            expect(be.ticksPerCycle).toBeLessThanOrEqual(cr.ticksPerCycle)
            expect(cr.ticksPerCycle).toBeLessThanOrEqual(od.ticksPerCycle)
        })
    })

    describe("progression pacing", () => {
        it("can reach factories phase within ~300 profitable trades", () => {
            const engine = new MarketEngine(SEED)
            let trades = 0
            const maxTrades = 300

            while (!engine.isPhaseUnlocked(2) && trades < maxTrades) {
                engine.tick()
                const result = engine.buy("EMAIL", 1)
                if (result) {
                    for (let i = 0; i < 3; i++) engine.tick()
                    engine.sell("EMAIL", 1)
                    trades++
                }
            }

            expect(engine.isPhaseUnlocked(2)).toBe(true)
        })

        it("factory income generates meaningful passive revenue", () => {
            const engine = new MarketEngine(SEED)
            engine.addBonus(PHASE_THRESHOLDS.factories + 10)
            engine.deployFactory("list-builder")

            for (let i = 0; i < 100; i++) {
                engine.tick()
            }

            const holding = engine.getHolding("EMAIL")
            expect(holding).not.toBeNull()
            expect(holding!.quantity).toBeGreaterThanOrEqual(5)
        })
    })

    describe("tick interval", () => {
        it("tick interval is reasonable (1-10 seconds)", () => {
            expect(TICK_INTERVAL_MS).toBeGreaterThanOrEqual(1000)
            expect(TICK_INTERVAL_MS).toBeLessThanOrEqual(10000)
        })
    })

    describe("volatility hierarchy", () => {
        it("EMAIL has the highest volatility", () => {
            const email = COMMODITIES.find((c) => c.id === "EMAIL")!
            const maxVol = Math.max(...COMMODITIES.map((c) => c.volatility))
            expect(email.volatility).toBe(maxVol)
        })

        it("all commodities have distinct volatility values", () => {
            const vols = COMMODITIES.map((c) => c.volatility)
            expect(new Set(vols).size).toBe(vols.length)
        })
    })
})
