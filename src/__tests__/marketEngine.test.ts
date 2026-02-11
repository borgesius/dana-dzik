import { beforeEach, describe, expect, it, vi } from "vitest"

import { MarketEngine } from "../lib/marketGame/MarketEngine"
import {
    CAPITAL_GAINS_BONUS,
    COMMODITIES,
    FACTORIES,
    FACTORY_COST_SCALING,
    INFLUENCES,
    PHASE_THRESHOLDS,
    UPGRADES,
} from "../lib/marketGame/types"

const SEED = 42

describe("MarketEngine", () => {
    let engine: MarketEngine

    beforeEach(() => {
        vi.restoreAllMocks()
        engine = new MarketEngine(SEED)
    })

    describe("initialization", () => {
        it("starts with correct cash", () => {
            expect(engine.getCash()).toBeCloseTo(0.1)
        })

        it("starts with EMAIL and ADS unlocked", () => {
            const unlocked = engine.getUnlockedCommodities()
            expect(unlocked).toContain("EMAIL")
            expect(unlocked).toContain("ADS")
        })

        it("starts with only phase 1 unlocked", () => {
            expect(engine.isPhaseUnlocked(1)).toBe(true)
            expect(engine.isPhaseUnlocked(2)).toBe(false)
            expect(engine.isPhaseUnlocked(3)).toBe(false)
            expect(engine.isPhaseUnlocked(4)).toBe(false)
        })

        it("starts with no holdings", () => {
            const holdings = engine.getAllHoldings()
            expect(holdings.size).toBe(0)
        })

        it("starts with market prices near base prices", () => {
            for (const c of COMMODITIES) {
                if (c.unlockThreshold === 0) {
                    const price = engine.getPrice(c.id)
                    expect(price).toBe(c.basePrice)
                }
            }
        })
    })

    describe("portfolio - buy", () => {
        it("buys commodity and deducts cash", () => {
            const priceBefore = engine.getPrice("EMAIL")
            const result = engine.buy("EMAIL", 1)

            expect(result).not.toBeNull()
            expect(result!.action).toBe("buy")
            expect(result!.quantity).toBe(1)
            expect(engine.getCash()).toBeCloseTo(0.1 - priceBefore)

            const holding = engine.getHolding("EMAIL")
            expect(holding).not.toBeNull()
            expect(holding!.quantity).toBe(1)
        })

        it("cannot buy what you cannot afford", () => {
            const result = engine.buy("ADS", 100)
            expect(result).toBeNull()
        })

        it("cannot buy unlocked commodity", () => {
            const result = engine.buy("DOM", 1)
            expect(result).toBeNull()
        })

        it("tracks average cost basis correctly", () => {
            engine.addBonus(1)
            engine.buy("EMAIL", 1)
            engine.tick()
            engine.buy("EMAIL", 1)

            const holding = engine.getHolding("EMAIL")
            expect(holding).not.toBeNull()
            expect(holding!.quantity).toBe(2)
            expect(holding!.totalCost).toBeGreaterThan(0)
        })
    })

    describe("portfolio - sell", () => {
        it("sells commodity and adds cash", () => {
            engine.buy("EMAIL", 1)
            const cashAfterBuy = engine.getCash()
            const result = engine.sell("EMAIL", 1)

            expect(result).not.toBeNull()
            expect(result!.action).toBe("sell")
            expect(engine.getCash()).toBeGreaterThan(cashAfterBuy)
        })

        it("cannot sell what you don't own", () => {
            const result = engine.sell("EMAIL", 1)
            expect(result).toBeNull()
        })

        it("cannot sell more than you have", () => {
            engine.buy("EMAIL", 1)
            const result = engine.sell("EMAIL", 5)
            expect(result).not.toBeNull()
            expect(result!.quantity).toBe(1)
        })

        it("removes holding when selling all", () => {
            engine.buy("EMAIL", 1)
            engine.sellAll("EMAIL")
            expect(engine.getHolding("EMAIL")).toBeNull()
        })

        it("increases lifetime earnings on sell", () => {
            engine.buy("EMAIL", 1)
            engine.sell("EMAIL", 1)
            expect(engine.getLifetimeEarnings()).toBeGreaterThan(0)
        })
    })

    describe("factories", () => {
        beforeEach(() => {
            engine.addBonus(20)
        })

        it("cannot deploy factory before phase 2 unlock", () => {
            const eng2 = new MarketEngine(SEED)
            expect(eng2.deployFactory("list-builder")).toBe(false)
        })

        it("deploys factory and deducts cost", () => {
            const cashBefore = engine.getCash()
            const factoryDef = FACTORIES.find((f) => f.id === "list-builder")!
            const result = engine.deployFactory("list-builder")

            expect(result).toBe(true)
            expect(engine.getCash()).toBeCloseTo(cashBefore - factoryDef.cost)
            expect(engine.getFactoryCount("list-builder")).toBe(1)
        })

        it("stacks multiple factories", () => {
            engine.deployFactory("list-builder")
            engine.deployFactory("list-builder")
            expect(engine.getFactoryCount("list-builder")).toBe(2)
        })

        it("produces commodities on tick", () => {
            engine.deployFactory("list-builder")

            for (let i = 0; i < 20; i++) {
                engine.tick()
            }

            const holding = engine.getHolding("EMAIL")
            expect(holding).not.toBeNull()
            expect(holding!.quantity).toBeGreaterThan(0)
        })

        it("production stays within bounds over many ticks", () => {
            engine.deployFactory("list-builder")

            let totalProduced = 0
            for (let i = 0; i < 1000; i++) {
                const before = engine.getHolding("EMAIL")?.quantity ?? 0
                engine.tick()
                const after = engine.getHolding("EMAIL")?.quantity ?? 0
                const produced = after - before
                totalProduced += produced
                expect(produced).toBeGreaterThanOrEqual(0)
                expect(produced).toBeLessThanOrEqual(3)
            }
            expect(totalProduced).toBeGreaterThan(0)
        })

        it("cannot deploy factory you cannot afford", () => {
            const eng2 = new MarketEngine(SEED)
            eng2.addBonus(PHASE_THRESHOLDS.factories)
            expect(eng2.deployFactory("colocation-rack")).toBe(false)
        })

        it("applies cost scaling on repeated purchases", () => {
            const baseCost = FACTORIES.find(
                (f) => f.id === "list-builder"
            )!.cost

            expect(engine.getFactoryCost("list-builder")).toBeCloseTo(baseCost)
            engine.deployFactory("list-builder")
            expect(engine.getFactoryCost("list-builder")).toBeCloseTo(
                baseCost * FACTORY_COST_SCALING
            )
            engine.deployFactory("list-builder")
            expect(engine.getFactoryCost("list-builder")).toBeCloseTo(
                baseCost * Math.pow(FACTORY_COST_SCALING, 2)
            )
        })

        it("cost scaling is per factory type", () => {
            engine.deployFactory("list-builder")
            engine.deployFactory("list-builder")

            const bannerBase = FACTORIES.find(
                (f) => f.id === "banner-exchange"
            )!.cost
            expect(engine.getFactoryCost("banner-exchange")).toBeCloseTo(
                bannerBase
            )
        })
    })

    describe("upgrades", () => {
        beforeEach(() => {
            engine.addBonus(PHASE_THRESHOLDS.upgrades)
        })

        it("cannot purchase upgrade before phase 3 unlock", () => {
            const eng2 = new MarketEngine(SEED)
            eng2.addBonus(10)
            expect(eng2.purchaseUpgrade("bulk-orders")).toBe(false)
        })

        it("purchases upgrade and deducts cost", () => {
            const cashBefore = engine.getCash()
            const upgradeDef = UPGRADES.find((u) => u.id === "bulk-orders")!
            const result = engine.purchaseUpgrade("bulk-orders")

            expect(result).toBe(true)
            expect(engine.getCash()).toBeCloseTo(cashBefore - upgradeDef.cost)
            expect(engine.hasUpgrade("bulk-orders")).toBe(true)
        })

        it("cannot buy same upgrade twice", () => {
            engine.purchaseUpgrade("bulk-orders")
            expect(engine.purchaseUpgrade("bulk-orders")).toBe(false)
        })

        it("cannot buy upgrade you cannot afford", () => {
            const eng2 = new MarketEngine(SEED)
            eng2.addBonus(PHASE_THRESHOLDS.upgrades)
            eng2.purchaseUpgrade("supply-chain")
            eng2.purchaseUpgrade("quality-assurance")
            eng2.purchaseUpgrade("bulk-orders")
            eng2.purchaseUpgrade("cpu-overclock")
            expect(eng2.purchaseUpgrade("insider-newsletter")).toBe(false)
        })
    })

    describe("supply chain conversion", () => {
        beforeEach(() => {
            engine.addBonus(1000)
            engine.purchaseUpgrade("supply-chain")
        })

        it("banner-exchange converts EMAIL to bonus ADS", () => {
            engine.deployFactory("banner-exchange")

            engine.buy("EMAIL", 10)

            const emailBefore = engine.getHolding("EMAIL")?.quantity ?? 0
            for (let i = 0; i < 100; i++) engine.tick()

            const emailAfter = engine.getHolding("EMAIL")?.quantity ?? 0
            expect(emailAfter).toBeLessThan(emailBefore)
        })

        it("does not convert without supply-chain upgrade", () => {
            const eng2 = new MarketEngine(SEED)
            eng2.addBonus(500)
            eng2.deployFactory("banner-exchange")

            eng2.buy("EMAIL", 10)
            const emailBefore = eng2.getHolding("EMAIL")?.quantity ?? 0

            for (let i = 0; i < 100; i++) eng2.tick()

            const emailAfter = eng2.getHolding("EMAIL")?.quantity ?? 0
            expect(emailAfter).toBe(emailBefore)
        })

        it("does not convert when insufficient input commodity", () => {
            engine.deployFactory("banner-exchange")

            const adsBefore = engine.getHolding("ADS")?.quantity ?? 0
            for (let i = 0; i < 5; i++) engine.tick()
            const adsAfter = engine.getHolding("ADS")?.quantity ?? 0

            expect(adsAfter).toBeGreaterThanOrEqual(adsBefore)
        })
    })

    describe("market influence", () => {
        beforeEach(() => {
            engine.addBonus(1000)
            engine.deployFactory("list-builder")
            engine.deployFactory("banner-exchange")
            for (let i = 0; i < 100; i++) engine.tick()
        })

        it("cannot execute influence before phase 4 unlock", () => {
            const eng2 = new MarketEngine(SEED)
            eng2.addBonus(100)
            expect(eng2.executeInfluence("negative-press", "EMAIL")).toBe(false)
        })

        it("executes negative press and deducts cash", () => {
            const cashBefore = engine.getCash()
            const result = engine.executeInfluence("negative-press", "EMAIL")

            if (result) {
                const infDef = INFLUENCES.find(
                    (i) => i.id === "negative-press"
                )!
                expect(engine.getCash()).toBeCloseTo(
                    cashBefore - infDef.cashCost
                )
            }
        })

        it("respects cooldowns", () => {
            const first = engine.executeInfluence("negative-press", "EMAIL")
            if (first) {
                expect(engine.isInfluenceOnCooldown("negative-press")).toBe(
                    true
                )
                expect(engine.executeInfluence("negative-press", "EMAIL")).toBe(
                    false
                )
            }
        })

        it("cannot execute without required commodity resources", () => {
            const eng2 = new MarketEngine(SEED)
            eng2.addBonus(1000)
            expect(eng2.executeInfluence("promo-campaign", "EMAIL")).toBe(false)
        })
    })

    describe("phase unlocks", () => {
        it("unlocks phase 2 at correct threshold", () => {
            let unlocked = false
            engine.on("phaseUnlocked", (data) => {
                if (data === 2) unlocked = true
            })

            engine.addBonus(PHASE_THRESHOLDS.factories)
            expect(unlocked).toBe(true)
            expect(engine.isPhaseUnlocked(2)).toBe(true)
        })

        it("unlocks phase 3 at correct threshold", () => {
            let unlocked = false
            engine.on("phaseUnlocked", (data) => {
                if (data === 3) unlocked = true
            })

            engine.addBonus(PHASE_THRESHOLDS.upgrades)
            expect(unlocked).toBe(true)
            expect(engine.isPhaseUnlocked(3)).toBe(true)
        })

        it("unlocks phase 4 at correct threshold", () => {
            let unlocked = false
            engine.on("phaseUnlocked", (data) => {
                if (data === 4) unlocked = true
            })

            engine.addBonus(PHASE_THRESHOLDS.influence)
            expect(unlocked).toBe(true)
            expect(engine.isPhaseUnlocked(4)).toBe(true)
        })

        it("unlocks commodities at correct thresholds", () => {
            const events: string[] = []
            engine.on("commodityUnlocked", (data) => {
                events.push(data as string)
            })

            engine.addBonus(2500)
            for (const c of COMMODITIES) {
                if (c.unlockThreshold <= 2500) {
                    expect(engine.getUnlockedCommodities()).toContain(c.id)
                }
            }
        })
    })

    describe("event system", () => {
        it("on/emit works correctly", () => {
            let called = false
            engine.on("moneyChanged", () => {
                called = true
            })
            engine.addBonus(1)
            expect(called).toBe(true)
        })

        it("emits marketTick on tick", () => {
            let ticked = false
            engine.on("marketTick", () => {
                ticked = true
            })
            engine.tick()
            expect(ticked).toBe(true)
        })

        it("emits tradeExecuted on buy", () => {
            let result: unknown = null
            engine.on("tradeExecuted", (data) => {
                result = data
            })
            engine.buy("EMAIL", 1)
            expect(result).not.toBeNull()
        })
    })

    describe("data constants", () => {
        it("has 8 commodities", () => {
            expect(COMMODITIES.length).toBe(8)
        })

        it("has 6 factories", () => {
            expect(FACTORIES.length).toBe(6)
        })

        it("has 28 upgrades", () => {
            expect(UPGRADES.length).toBe(28)
        })

        it("has 3 influences", () => {
            expect(INFLUENCES.length).toBe(3)
        })
    })

    describe("snapshot", () => {
        it("returns complete snapshot", () => {
            engine.addBonus(5)
            engine.buy("EMAIL", 2)
            const snap = engine.getSnapshot()

            expect(snap.cash).toBeGreaterThan(0)
            expect(snap.lifetimeEarnings).toBeGreaterThan(0)
            expect(snap.unlockedPhases).toContain(1)
            expect(snap.unlockedCommodities).toContain("EMAIL")
        })
    })

    // ── purchasedQuantity tracking ────────────────────────────────────────
    describe("purchasedQuantity tracking", () => {
        it("buying sets purchasedQuantity", () => {
            engine.addBonus(5)
            engine.buy("EMAIL", 10)

            const holding = engine.getHolding("EMAIL")
            expect(holding).not.toBeNull()
            expect(holding!.purchasedQuantity).toBe(10)
        })

        it("harvesting does not increase purchasedQuantity", () => {
            engine.harvest("EMAIL")
            engine.harvest("EMAIL")

            const holding = engine.getHolding("EMAIL")
            expect(holding).not.toBeNull()
            expect(holding!.purchasedQuantity).toBe(0)
            expect(holding!.quantity).toBeGreaterThan(0)
        })

        it("mixed buy + harvest tracks purchased portion correctly", () => {
            engine.addBonus(5)
            engine.buy("EMAIL", 10)
            engine.harvest("EMAIL")

            const holding = engine.getHolding("EMAIL")
            expect(holding).not.toBeNull()
            expect(holding!.purchasedQuantity).toBe(10)
            expect(holding!.quantity).toBeGreaterThan(10)
        })

        it("selling reduces purchasedQuantity proportionally", () => {
            engine.addBonus(5)
            engine.buy("EMAIL", 10)
            engine.harvest("EMAIL") // adds some harvested units

            const holdingBefore = engine.getHolding("EMAIL")!
            const totalBefore = holdingBefore.quantity
            const purchasedBefore = holdingBefore.purchasedQuantity

            // Sell half of total
            const halfQty = Math.floor(totalBefore / 2)
            engine.sell("EMAIL", halfQty)

            const holdingAfter = engine.getHolding("EMAIL")
            expect(holdingAfter).not.toBeNull()
            // purchasedQuantity should shrink proportionally
            const expectedPurchased =
                purchasedBefore - purchasedBefore * (halfQty / totalBefore)
            expect(holdingAfter!.purchasedQuantity).toBeCloseTo(
                expectedPurchased,
                4
            )
        })

        it("selling all removes holding including purchasedQuantity", () => {
            engine.addBonus(5)
            engine.buy("EMAIL", 10)
            engine.sellAll("EMAIL")

            expect(engine.getHolding("EMAIL")).toBeNull()
        })
    })

    // ── Capital gains bonus ──────────────────────────────────────────────
    describe("capital gains bonus", () => {
        it("selling purchased stock at a profit yields more than base revenue", () => {
            engine.addBonus(10)
            const buyPrice = engine.getPrice("EMAIL")
            engine.buy("EMAIL", 50)

            // Advance time to let price rise
            for (let i = 0; i < 50; i++) engine.tick()

            const sellPrice = engine.getPrice("EMAIL")
            if (sellPrice > buyPrice) {
                const cashBefore = engine.getCash()
                engine.sell("EMAIL", 50)
                const cashAfter = engine.getCash()
                const revenue = cashAfter - cashBefore

                // Base revenue without any bonus would be sellPrice * 50
                // Capital gains bonus adds CAPITAL_GAINS_BONUS * profit portion
                const baseRevenue = sellPrice * 50
                const profit = (sellPrice - buyPrice) * 50
                const expectedBonus = profit * CAPITAL_GAINS_BONUS
                // Revenue should be at least baseRevenue + some bonus
                expect(revenue).toBeGreaterThanOrEqual(baseRevenue)
                if (profit > 0) {
                    expect(revenue).toBeCloseTo(
                        baseRevenue + expectedBonus,
                        2
                    )
                }
            }
        })

        it("selling harvested-only stock gets no capital gains bonus", () => {
            // Harvest some EMAIL (free, purchasedQuantity = 0)
            for (let i = 0; i < 10; i++) engine.harvest("EMAIL")

            const holding = engine.getHolding("EMAIL")!
            expect(holding.purchasedQuantity).toBe(0)

            const cashBefore = engine.getCash()
            const sellPrice = engine.getPrice("EMAIL")
            const qty = holding.quantity
            engine.sellAll("EMAIL")
            const cashAfter = engine.getCash()
            const revenue = cashAfter - cashBefore

            // With no purchased units, no capital gains bonus applies
            // Revenue = sellPrice * qty * (1 + tradeBonus)
            // tradeBonus is 0 by default
            expect(revenue).toBeCloseTo(sellPrice * qty, 4)
        })

        it("selling at a loss yields no capital gains bonus", () => {
            engine.addBonus(100)

            // Buy at current price
            const buyPrice = engine.getPrice("EMAIL")
            engine.buy("EMAIL", 100)

            // Force a lower price by advancing time
            for (let i = 0; i < 200; i++) engine.tick()

            const sellPrice = engine.getPrice("EMAIL")
            if (sellPrice < buyPrice) {
                const cashBefore = engine.getCash()
                engine.sell("EMAIL", 100)
                const cashAfter = engine.getCash()
                const revenue = cashAfter - cashBefore

                // No bonus when at a loss: revenue = sellPrice * qty
                expect(revenue).toBeCloseTo(sellPrice * 100, 2)
            }
        })
    })
})
