import { describe, expect, it } from "vitest"

import { MarketEngine } from "../lib/marketGame/MarketEngine"
import { COMMODITIES } from "../lib/marketGame/types"

const SEED = 12345

describe("market simulation", () => {
    describe("price bounds", () => {
        it("prices never go below 10% of base price", () => {
            const engine = new MarketEngine(SEED)
            engine.addBonus(10000)

            for (let i = 0; i < 5000; i++) {
                engine.tick()
            }

            for (const c of COMMODITIES) {
                const history = engine.getPriceHistory(c.id)
                const minAllowed = c.basePrice * 0.1
                for (const price of history) {
                    expect(price).toBeGreaterThanOrEqual(minAllowed)
                }
            }
        })

        it("prices never go above 15x base price under normal conditions", () => {
            const engine = new MarketEngine(SEED)
            engine.addBonus(10000)

            for (let i = 0; i < 2000; i++) {
                engine.tick()
            }

            for (const c of COMMODITIES) {
                const history = engine.getPriceHistory(c.id)
                const maxAllowed = c.basePrice * 20
                for (const price of history) {
                    expect(price).toBeLessThanOrEqual(maxAllowed)
                }
            }
        })

        it("prices are always positive", () => {
            const engine = new MarketEngine(SEED)
            engine.addBonus(10000)

            for (let i = 0; i < 5000; i++) {
                engine.tick()
            }

            for (const c of COMMODITIES) {
                const history = engine.getPriceHistory(c.id)
                for (const price of history) {
                    expect(price).toBeGreaterThan(0)
                }
            }
        })
    })

    describe("volatility ranking", () => {
        it("EMAIL has the highest configured volatility among all commodities", () => {
            const email = COMMODITIES.find((c) => c.id === "EMAIL")!
            for (const c of COMMODITIES) {
                if (c.id === "EMAIL") continue
                expect(email.volatility).toBeGreaterThan(c.volatility)
            }
        })

        it("SOFT has lower volatility than EMAIL", () => {
            const soft = COMMODITIES.find((c) => c.id === "SOFT")!
            const email = COMMODITIES.find((c) => c.id === "EMAIL")!
            expect(soft.volatility).toBeLessThan(email.volatility)
        })
    })

    describe("trends", () => {
        it("trends change over time", () => {
            const engine = new MarketEngine(SEED)
            engine.addBonus(10000)

            const trends = new Set<string>()
            for (let i = 0; i < 1000; i++) {
                engine.tick()
                const trend = engine.getTrend("EMAIL")
                if (trend) trends.add(trend)
            }

            expect(trends.size).toBeGreaterThan(1)
        })
    })

    describe("mean reversion", () => {
        it("prices tend back toward base price over many ticks", () => {
            const engine = new MarketEngine(SEED)
            engine.addBonus(10000)

            for (let i = 0; i < 5000; i++) {
                engine.tick()
            }

            for (const c of COMMODITIES) {
                if (c.unlockThreshold > 10000) continue
                const price = engine.getPrice(c.id)
                expect(price).toBeGreaterThan(c.basePrice * 0.2)
                expect(price).toBeLessThan(c.basePrice * 10)
            }
        })
    })

    describe("deterministic with seed", () => {
        it("produces identical sequences with same seed", () => {
            const engine1 = new MarketEngine(42)
            const engine2 = new MarketEngine(42)

            engine1.addBonus(100)
            engine2.addBonus(100)

            for (let i = 0; i < 200; i++) {
                engine1.tick()
                engine2.tick()
            }

            for (const c of COMMODITIES.filter(
                (c) => c.unlockThreshold <= 100
            )) {
                const h1 = engine1.getPriceHistory(c.id)
                const h2 = engine2.getPriceHistory(c.id)
                expect(h1).toEqual(h2)
            }
        })

        it("produces different sequences with different seeds", () => {
            const engine1 = new MarketEngine(1)
            const engine2 = new MarketEngine(2)

            for (let i = 0; i < 100; i++) {
                engine1.tick()
                engine2.tick()
            }

            const h1 = engine1.getPriceHistory("EMAIL")
            const h2 = engine2.getPriceHistory("EMAIL")
            expect(h1).not.toEqual(h2)
        })
    })
})
