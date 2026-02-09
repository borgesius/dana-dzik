import { CATCHUP } from "../../config/balance"
import { isCalmMode } from "../calmMode"
import { type Employee, getEmployeeSalary } from "./employees"
import { OrgChart } from "./orgChart"
import {
    AUTOSCRIPT_TIER_BONUS,
    BATCH_ORDER_QUANTITY,
    BLOCK_ORDER_QUANTITY,
    BULK_ORDER_QUANTITY,
    COMMODITIES,
    type CommodityDef,
    type CommodityId,
    CORNER_MARKET_FLOAT,
    CORNER_MARKET_PRICE_BOOST,
    CORNER_MARKET_THRESHOLD,
    CREDIT_RATING_SCALE,
    type CreditFacilityState,
    type CreditRating,
    DAS_BASE_YIELD,
    DAS_DEFAULT_THRESHOLD,
    DAS_MAX_POSITIONS,
    DAS_MIN_QUANTITY,
    DAS_SAME_COMMODITY_DECAY,
    type DigitalAssetSecurity,
    EVENT_MAX_TICKS,
    EVENT_MIN_TICKS,
    FACTORIES,
    FACTORY_COST_SCALING,
    type FactoryDef,
    type FactoryId,
    type GameEventCallback,
    type GameEventType,
    type GameSnapshot,
    HARVEST_BASE_FRACTION,
    HARVEST_DOLLAR_CEILING,
    HARVEST_DOLLAR_FLOOR,
    HARVEST_PRICE_SENSITIVITY,
    HARVEST_UPGRADE_BONUS,
    type Holding,
    type InfluenceDef,
    type InfluenceId,
    INFLUENCES,
    type LimitOrder,
    MARGIN_CALL_THRESHOLD,
    MARKET_EVENTS,
    MARKET_YEAR_TICKS,
    type MarketEventDef,
    type MarketSaveData,
    type MarketState,
    MEAN_REVERSION_STRENGTH,
    PHASE_THRESHOLDS,
    POPUP_THRESHOLDS,
    PRICE_CEILING_FACTOR,
    PRICE_FLOOR_FACTOR,
    PRICE_HISTORY_LENGTH,
    RATING_DEGRADE_RATIO,
    RATING_DEGRADE_TICKS,
    RATING_DIVERSIFICATION_MIN,
    RATING_IMPROVE_RATIO,
    RATING_INTEREST_RATE,
    RATING_LEVERAGE_RATIO,
    RATING_NO_DEFAULT_WINDOW,
    RATING_REVIEW_INTERVAL,
    RATING_YIELD_MULT,
    SeededRng,
    STARTING_CASH,
    TICK_INTERVAL_MS,
    type TradeResult,
    type TrendDirection,
    type TrendScheduleSaveData,
    type TrendSegment,
    type UpgradeDef,
    type UpgradeId,
    UPGRADES,
} from "./types"

export class MarketEngine {
    private cash: number = STARTING_CASH
    private lifetimeEarnings: number = 0
    private holdings: Map<CommodityId, Holding> = new Map()
    private markets: Map<CommodityId, MarketState> = new Map()
    private factories: Map<FactoryId, number> = new Map()
    private ownedUpgrades: Set<UpgradeId> = new Set()
    private unlockedCommodities: Set<CommodityId> = new Set()
    private unlockedPhases: Set<number> = new Set([1])
    private influenceCooldowns: Map<InfluenceId, number> = new Map()
    private limitOrders: LimitOrder[] = []
    private currentNews: string = ""
    private upcomingEvent: MarketEventDef | null = null
    private upcomingEventCountdown: number = 0
    private popupLevel: number = 0
    private factoryTickCounters: Map<FactoryId, number> = new Map()
    private totalHarvests: number = 0

    private eventListeners: Map<GameEventType, GameEventCallback[]> = new Map()
    private tickInterval: ReturnType<typeof setInterval> | null = null
    private pumpDumpTimeout: ReturnType<typeof setTimeout> | null = null
    private ticksSinceEvent: number = 0
    private nextEventTicks: number = 0

    private rng: SeededRng

    /** Phase 5: HR org chart */
    private orgChart: OrgChart = new OrgChart()

    /** Phase 6: Structured Products Desk */
    private securities: DigitalAssetSecurity[] = []
    private creditRating: CreditRating = "C"
    private facility: CreditFacilityState = {
        outstandingDebt: 0,
        totalInterestPaid: 0,
    }
    private ticksSinceLastDefault: number = 999
    private ticksAboveDegradeRatio: number = 0
    private totalTickCount: number = 0
    private dasIdCounter: number = 0
    /** For margin-survivor achievement tracking. */
    private marginEventTick: number = -999
    private ratingAtMarginEvent: CreditRating = "C"

    /** Original duration of the currently active trend segment, per commodity. */
    private trendOriginalDuration: Map<CommodityId, number> = new Map()

    /**
     * Optional external bonus provider. Returns a multiplier for a given bonus type.
     * E.g. bonusProvider("factoryOutput") might return 0.15 for +15%.
     */
    public bonusProvider: ((type: string) => number) | null = null

    /**
     * Optional prestige provider for prestige-based modifiers.
     * Returns values keyed by modifier name.
     */
    public prestigeProvider: ((key: string) => number) | null = null

    /** Calm-mode slows the market tick rate by this factor. */
    private static readonly CALM_TICK_MULTIPLIER = 1.1

    constructor(seed?: number) {
        this.rng = new SeededRng(seed)
        this.initMarkets()
        this.initUnlockedCommodities()
        this.nextEventTicks = this.rng.nextInt(EVENT_MIN_TICKS, EVENT_MAX_TICKS)

        // Re-seat the tick interval when calm mode is toggled
        if (typeof document !== "undefined") {
            document.addEventListener("calm-mode:changed", () => {
                if (this.tickInterval) {
                    this.stop()
                    this.start()
                }
            })
        }
    }

    // -----------------------------------------------------------------------
    // Event system
    // -----------------------------------------------------------------------

    public on(event: GameEventType, callback: GameEventCallback): void {
        if (!this.eventListeners.has(event)) {
            this.eventListeners.set(event, [])
        }
        this.eventListeners.get(event)?.push(callback)
    }

    private emit(event: GameEventType, data?: unknown): void {
        this.eventListeners.get(event)?.forEach((cb) => cb(data))
    }

    /** Public emit for Phase 5 UI integration (employee events). */
    public emitEvent(event: GameEventType, data?: unknown): void {
        this.emit(event, data)
    }

    // -----------------------------------------------------------------------
    // Initialization
    // -----------------------------------------------------------------------

    private initMarkets(): void {
        for (const c of COMMODITIES) {
            const state: MarketState = {
                commodityId: c.id,
                price: c.basePrice,
                trend: "flat",
                trendStrength: 0,
                trendTicksRemaining: 0,
                priceHistory: [c.basePrice],
                influenceMultiplier: 0,
                influenceTicksRemaining: 0,
                trendQueue: [],
                trendHistory: [],
            }
            this.markets.set(c.id, state)

            // Pre-fill the trend queue with ~1 year of segments
            this.fillTrendQueue(c.id, c)

            // Pop the first segment as the initial active trend
            this.advanceTrendFromQueue(state, c)
        }
    }

    // -----------------------------------------------------------------------
    // Trend schedule helpers
    // -----------------------------------------------------------------------

    /**
     * Generate a single trend segment using the seeded RNG.
     * This mirrors the old assignNewTrend logic but returns a segment
     * instead of mutating state directly.
     */
    private generateTrendSegment(def: CommodityDef): TrendSegment {
        const r = this.rng.next()
        let trend: TrendDirection
        if (r < 0.35) {
            trend = "bull"
        } else if (r < 0.7) {
            trend = "bear"
        } else {
            trend = "flat"
        }
        const strength = 0.3 + this.rng.next() * 0.7
        const duration = this.rng.nextInt(def.trendMinTicks, def.trendMaxTicks)
        return { trend, strength, duration }
    }

    /**
     * Ensure the trend queue for a commodity contains at least
     * MARKET_YEAR_TICKS worth of total segment duration.
     */
    private fillTrendQueue(commodityId: CommodityId, def: CommodityDef): void {
        const state = this.markets.get(commodityId)
        if (!state) return

        let queuedTicks = 0
        for (const seg of state.trendQueue) {
            queuedTicks += seg.duration
        }

        while (queuedTicks < MARKET_YEAR_TICKS) {
            const seg = this.generateTrendSegment(def)
            state.trendQueue.push(seg)
            queuedTicks += seg.duration
        }
    }

    /**
     * Pop the next trend segment from the queue and apply it to the market
     * state. Pushes the completed segment to history (trimmed to ~1 year).
     */
    private advanceTrendFromQueue(state: MarketState, def: CommodityDef): void {
        // Push completed segment to history (if there was one active)
        if (this.trendOriginalDuration.has(state.commodityId)) {
            const origDuration =
                this.trendOriginalDuration.get(state.commodityId) ?? 0
            state.trendHistory.push({
                trend: state.trend,
                strength: state.trendStrength,
                duration: origDuration,
            })

            // Trim history to ~1 year of ticks
            let historyTicks = 0
            for (let i = state.trendHistory.length - 1; i >= 0; i--) {
                historyTicks += state.trendHistory[i].duration
                if (historyTicks > MARKET_YEAR_TICKS) {
                    state.trendHistory = state.trendHistory.slice(i)
                    break
                }
            }
        }

        // Pop the next segment from the queue
        const next = state.trendQueue.shift()
        if (!next) {
            // Fallback: generate on-the-fly if queue is empty
            const seg = this.generateTrendSegment(def)
            state.trend = seg.trend
            state.trendStrength = seg.strength
            state.trendTicksRemaining = seg.duration
            this.trendOriginalDuration.set(state.commodityId, seg.duration)
        } else {
            state.trend = next.trend
            state.trendStrength = next.strength
            state.trendTicksRemaining = next.duration
            this.trendOriginalDuration.set(state.commodityId, next.duration)
        }

        // Price correction: override trend direction at extreme prices
        const priceFraction = state.price / def.basePrice
        if (priceFraction > 5 && state.trend === "bull") {
            state.trend = "bear"
        } else if (priceFraction < 0.3 && state.trend === "bear") {
            state.trend = "bull"
        }

        // Refill the queue
        this.fillTrendQueue(state.commodityId, def)
    }

    private initUnlockedCommodities(): void {
        for (const c of COMMODITIES) {
            if (c.unlockThreshold === 0) {
                this.unlockedCommodities.add(c.id)
            }
        }
    }

    public start(): void {
        if (this.tickInterval) return
        const interval = isCalmMode()
            ? TICK_INTERVAL_MS * MarketEngine.CALM_TICK_MULTIPLIER
            : TICK_INTERVAL_MS
        this.tickInterval = setInterval(() => this.tick(), interval)
    }

    public stop(): void {
        if (this.tickInterval) {
            clearInterval(this.tickInterval)
            this.tickInterval = null
        }
        if (this.pumpDumpTimeout) {
            clearTimeout(this.pumpDumpTimeout)
            this.pumpDumpTimeout = null
        }
    }

    public destroy(): void {
        this.stop()
    }

    public tick(): void {
        this.totalTickCount++
        this.updatePrices()
        this.processFactories()
        this.processLimitOrders()
        this.processEvents()
        this.processCornerMarket()
        this.processSalaries()
        this.processPhase6()
        this.emit("marketTick")
    }

    private updatePrices(): void {
        for (const c of COMMODITIES) {
            const state = this.markets.get(c.id)
            if (!state) continue

            if (state.trendTicksRemaining <= 0) {
                this.assignNewTrend(state, c)
            }

            let drift = 0
            if (state.trend === "bull") {
                drift = state.trendStrength * c.volatility
            } else if (state.trend === "bear") {
                drift = -state.trendStrength * c.volatility
            }

            const trendVis = this.bonusProvider?.("trendVisibility") ?? 0
            const noiseMult = Math.max(0.2, 1 - trendVis)
            const noise =
                (this.rng.next() - 0.5) *
                2 *
                c.volatility *
                state.price *
                noiseMult
            const meanReversion =
                (c.basePrice - state.price) * MEAN_REVERSION_STRENGTH

            let influence = 0
            if (state.influenceTicksRemaining > 0) {
                influence = state.influenceMultiplier * state.price
                state.influenceTicksRemaining--
                if (state.influenceTicksRemaining === 0) {
                    state.influenceMultiplier = 0
                }
            }

            state.price +=
                drift * state.price + noise + meanReversion + influence

            const floor = c.basePrice * PRICE_FLOOR_FACTOR
            const ceiling = c.basePrice * PRICE_CEILING_FACTOR
            state.price = Math.max(floor, Math.min(ceiling, state.price))

            state.priceHistory.push(state.price)
            if (state.priceHistory.length > PRICE_HISTORY_LENGTH) {
                state.priceHistory.shift()
            }

            state.trendTicksRemaining--
        }
    }

    private assignNewTrend(state: MarketState, def: CommodityDef): void {
        this.advanceTrendFromQueue(state, def)
    }

    private processFactories(): void {
        if (!this.unlockedPhases.has(2)) return

        for (const fDef of FACTORIES) {
            const count = this.factories.get(fDef.id) ?? 0
            if (count === 0) continue

            const counter = (this.factoryTickCounters.get(fDef.id) ?? 0) + 1
            this.factoryTickCounters.set(fDef.id, counter)

            let overclockReduction = 0
            if (this.hasUpgrade("overclock-ii")) {
                overclockReduction = 2
            } else if (this.hasUpgrade("cpu-overclock")) {
                overclockReduction = 1
            }
            let effectiveCycle = Math.max(
                1,
                fDef.ticksPerCycle - overclockReduction
            )

            const speedMult =
                this.prestigeProvider?.("productionSpeedMultiplier") ?? 1
            if (speedMult > 1) {
                effectiveCycle = Math.max(
                    1,
                    Math.round(effectiveCycle / speedMult)
                )
            }

            if (counter < effectiveCycle) continue
            this.factoryTickCounters.set(fDef.id, 0)

            let totalProduced = 0
            for (let i = 0; i < count; i++) {
                let minOut = fDef.minOutput
                if (this.hasUpgrade("quality-assurance-ii")) {
                    minOut = Math.ceil(fDef.maxOutput * 0.5)
                } else if (this.hasUpgrade("quality-assurance")) {
                    minOut = Math.ceil(fDef.maxOutput * 0.25)
                }
                const produced = this.rng.nextInt(minOut, fDef.maxOutput)
                totalProduced += produced
            }

            if (this.hasUpgrade("supply-chain") && fDef.conversionInput) {
                const { commodity, quantity } = fDef.conversionInput
                const holding = this.holdings.get(commodity)
                if (holding && holding.quantity >= quantity) {
                    holding.totalCost -=
                        (holding.totalCost / holding.quantity) * quantity
                    holding.quantity -= quantity
                    totalProduced += 1
                    if (holding.quantity <= 0) {
                        this.holdings.delete(commodity)
                    }
                }
            }

            if (totalProduced > 0) {
                const factoryBonus = this.bonusProvider?.("factoryOutput") ?? 0
                if (factoryBonus > 0) {
                    totalProduced = Math.ceil(
                        totalProduced * (1 + factoryBonus)
                    )
                }
                const prestigeFactoryMult =
                    this.prestigeProvider?.("factoryMultiplier") ?? 1
                if (prestigeFactoryMult > 1) {
                    totalProduced = Math.ceil(
                        totalProduced * prestigeFactoryMult
                    )
                }
                this.addToHoldings(fDef.produces, totalProduced, 0)
                this.emit("portfolioChanged")
            }
        }
    }

    private processLimitOrders(): void {
        if (!this.hasUpgrade("limit-orders")) return
        if (this.limitOrders.length === 0) return

        const filled: number[] = []

        this.limitOrders.forEach((order, idx) => {
            const market = this.markets.get(order.commodityId)
            if (!market) return

            if (market.price >= order.targetPrice) {
                const holding = this.holdings.get(order.commodityId)
                if (!holding || holding.quantity < order.quantity) return

                const revenue = order.quantity * market.price
                this.cash += revenue
                this.lifetimeEarnings += revenue

                holding.quantity -= order.quantity
                holding.totalCost -=
                    (holding.totalCost / (holding.quantity + order.quantity)) *
                    order.quantity
                if (holding.quantity <= 0) {
                    this.holdings.delete(order.commodityId)
                }

                filled.push(idx)
                this.emit("limitOrderFilled", {
                    commodityId: order.commodityId,
                    quantity: order.quantity,
                    price: market.price,
                })
                this.emit("moneyChanged", this.cash)
                this.emit("portfolioChanged")
                this.checkUnlocks()
            }
        })

        for (let i = filled.length - 1; i >= 0; i--) {
            this.limitOrders.splice(filled[i], 1)
        }
    }

    private processEvents(): void {
        this.ticksSinceEvent++

        if (this.upcomingEventCountdown > 0) {
            this.upcomingEventCountdown--
            if (this.upcomingEventCountdown === 0) {
                this.fireEvent(this.upcomingEvent!)
                this.upcomingEvent = null
            }
            return
        }

        if (this.ticksSinceEvent >= this.nextEventTicks) {
            const event = this.pickRandomEvent()
            if (event) {
                if (
                    this.hasUpgrade("insider-newsletter") &&
                    event.effect !== "flavor"
                ) {
                    this.upcomingEvent = event
                    this.upcomingEventCountdown = 4
                    this.currentNews = `UPCOMING: ${event.text}`
                    this.emit("newsEvent", {
                        text: this.currentNews,
                        upcoming: true,
                    })
                } else {
                    this.fireEvent(event)
                }
            }
            this.ticksSinceEvent = 0
            const hasInsiderEdge =
                (this.prestigeProvider?.("insiderEdge") ?? 0) > 0
            const maxTicks = hasInsiderEdge
                ? Math.floor(EVENT_MAX_TICKS * 0.7)
                : EVENT_MAX_TICKS
            this.nextEventTicks = this.rng.nextInt(EVENT_MIN_TICKS, maxTicks)
        }
    }

    private pickRandomEvent(): MarketEventDef | null {
        const unlocked = [...this.unlockedCommodities]
        const eligible = MARKET_EVENTS.filter(
            (e) =>
                e.effect === "flavor" ||
                (e.targetCommodity && unlocked.includes(e.targetCommodity))
        )
        if (eligible.length === 0) return null
        return eligible[Math.floor(this.rng.next() * eligible.length)]
    }

    private fireEvent(event: MarketEventDef): void {
        this.currentNews = event.text

        if (event.effect !== "flavor" && event.targetCommodity) {
            const state = this.markets.get(event.targetCommodity)
            if (state) {
                const magnitude = event.magnitude ?? 0.2
                if (event.effect === "bullish") {
                    state.price *= 1 + magnitude
                } else {
                    state.price *= 1 - magnitude
                }

                const def = COMMODITIES.find(
                    (c) => c.id === event.targetCommodity
                )
                if (def) {
                    const floor = def.basePrice * PRICE_FLOOR_FACTOR
                    const ceiling = def.basePrice * PRICE_CEILING_FACTOR
                    state.price = Math.max(
                        floor,
                        Math.min(ceiling, state.price)
                    )
                }
            }
        }

        this.emit("newsEvent", { text: event.text, upcoming: false })
    }

    private processCornerMarket(): void {
        for (const c of COMMODITIES) {
            const holding = this.holdings.get(c.id)
            if (!holding) continue

            if (
                holding.quantity >
                CORNER_MARKET_FLOAT * CORNER_MARKET_THRESHOLD
            ) {
                const state = this.markets.get(c.id)
                if (state) {
                    state.price *= 1 + CORNER_MARKET_PRICE_BOOST
                    const ceiling = c.basePrice * PRICE_CEILING_FACTOR
                    state.price = Math.min(ceiling, state.price)
                }
            }
        }
    }

    private processSalaries(): void {
        if (!this.unlockedPhases.has(5)) return

        this.orgChart.tickPool(this.getMaxCandidateLevel())

        if (this.orgChart.getEmployeeCount() === 0) return

        // Tenure ticking (raise demands)
        const tenureEvents = this.orgChart.tickTenure()
        for (const evt of tenureEvents) {
            this.emit("moraleEvent", evt)
        }

        // Morale ticking (burnout, chemistry, quit detection)
        const moraleEvents = this.orgChart.tickMorale()
        for (const evt of moraleEvents) {
            this.emit("moraleEvent", evt)
            if (evt.type === "quit") {
                this.emit("orgChartChanged")
            }
        }

        const totalSalary = this.orgChart.getTotalSalary()
        this.cash -= totalSalary

        // Graceful payroll shedding: if salary exceeds cash, shed most expensive
        while (this.cash < 0 && this.orgChart.getEmployeeCount() > 0) {
            const result = this.orgChart.fireMostExpensive()
            if (result) {
                const {
                    employee: fired,
                    wasVP,
                }: { employee: Employee; wasVP: boolean } = result
                this.emit("employeeFired", fired)
                this.emit("moraleEvent", {
                    type: "quit",
                    employeeName: fired.name,
                    message: `${fired.name} has been laid off due to budget constraints`,
                })
                // Refund this tick's salary since they were just let go
                const refund = getEmployeeSalary(fired) * (wasVP ? 1.5 : 1)
                this.cash += refund
            } else {
                break
            }
        }

        this.emit("moneyChanged", this.cash)
    }

    private getMaxCandidateLevel(): 1 | 2 | 3 {
        // Higher prestige/earnings -> better candidates
        if (this.lifetimeEarnings > 10000) return 3
        if (this.lifetimeEarnings > 500) return 2
        return 1
    }

    // -----------------------------------------------------------------------
    // Trading
    // -----------------------------------------------------------------------

    public buy(
        commodityId: CommodityId,
        quantity?: number
    ): TradeResult | null {
        if (!this.unlockedCommodities.has(commodityId)) return null

        const market = this.markets.get(commodityId)
        if (!market) return null

        const qty = quantity ?? this.getDefaultTradeQuantity()
        const totalCost = market.price * qty

        if (this.cash < totalCost) return null

        this.cash -= totalCost
        this.addToHoldings(commodityId, qty, totalCost)

        const result: TradeResult = {
            commodityId,
            action: "buy",
            quantity: qty,
            pricePerUnit: market.price,
            totalCost,
        }

        this.emit("tradeExecuted", result)
        this.emit("moneyChanged", this.cash)
        this.emit("portfolioChanged")
        return result
    }

    public sell(
        commodityId: CommodityId,
        quantity?: number
    ): TradeResult | null {
        const holding = this.holdings.get(commodityId)
        if (!holding || holding.quantity === 0) return null

        const market = this.markets.get(commodityId)
        if (!market) return null

        const qty = Math.min(
            quantity ?? this.getDefaultTradeQuantity(),
            holding.quantity
        )
        const tradeBonus = this.bonusProvider?.("tradeProfit") ?? 0
        const revenue = market.price * qty * (1 + tradeBonus)

        this.cash += revenue
        this.lifetimeEarnings += revenue

        const avgCost = holding.totalCost / holding.quantity
        holding.quantity -= qty
        holding.totalCost = holding.quantity * avgCost

        if (holding.quantity <= 0) {
            this.holdings.delete(commodityId)
        }

        const result: TradeResult = {
            commodityId,
            action: "sell",
            quantity: qty,
            pricePerUnit: market.price,
            totalCost: revenue,
        }

        this.emit("tradeExecuted", result)
        this.emit("moneyChanged", this.cash)
        this.emit("portfolioChanged")
        this.checkUnlocks()
        return result
    }

    public sellAll(commodityId: CommodityId): TradeResult | null {
        const holding = this.holdings.get(commodityId)
        if (!holding || holding.quantity === 0) return null
        return this.sell(commodityId, holding.quantity)
    }

    // -----------------------------------------------------------------------
    // Harvest (clicker)
    // -----------------------------------------------------------------------

    /** Per-commodity harvest upgrade IDs. */
    private static readonly HARVEST_UPGRADE_MAP: Record<
        CommodityId,
        UpgradeId
    > = {
        EMAIL: "harvest-email",
        ADS: "harvest-ads",
        DOM: "harvest-dom",
        BW: "harvest-bw",
        SOFT: "harvest-soft",
        VC: "harvest-vc",
    }

    /**
     * Compute how many units a single harvest click produces for a commodity.
     * Starts tiny (5% of harvestQuantity ≈ $0.10/click), scales up with
     * per-commodity upgrade (+45%) and autoscript tiers (+25/50/75%).
     *
     * Harvest quantity is also adjusted inversely with price so that $/click
     * stays roughly stable, but still rewards harvesting when a commodity is
     * up (≈75–125% of baseline $/click).
     */
    public getHarvestOutput(commodityId: CommodityId): number {
        let fraction = HARVEST_BASE_FRACTION

        const perAssetId = MarketEngine.HARVEST_UPGRADE_MAP[commodityId]
        if (perAssetId && this.ownedUpgrades.has(perAssetId)) {
            fraction += HARVEST_UPGRADE_BONUS
        }

        if (this.ownedUpgrades.has("autoscript-iii")) {
            fraction += AUTOSCRIPT_TIER_BONUS[2]
        } else if (this.ownedUpgrades.has("autoscript-ii")) {
            fraction += AUTOSCRIPT_TIER_BONUS[1]
        } else if (this.ownedUpgrades.has("autoscript-i")) {
            fraction += AUTOSCRIPT_TIER_BONUS[0]
        }

        const def = COMMODITIES.find((c) => c.id === commodityId)
        const harvestQty = def?.harvestQuantity ?? 1
        const baseOutput = harvestQty * fraction

        const basePrice = def?.basePrice ?? 1
        const currentPrice = this.getPrice(commodityId) || basePrice
        const priceRatio = currentPrice / basePrice

        const dollarMultiplier = Math.max(
            HARVEST_DOLLAR_FLOOR,
            Math.min(
                HARVEST_DOLLAR_CEILING,
                1 + (priceRatio - 1) * HARVEST_PRICE_SENSITIVITY
            )
        )

        return baseOutput * (dollarMultiplier / priceRatio)
    }

    /**
     * Fixed number of decimal places for displaying harvest output for a
     * commodity. Derived from the smallest expected output (base fraction of
     * harvestQuantity) so that at least 2 significant digits are always visible.
     */
    public getHarvestDecimals(commodityId: CommodityId): number {
        const def = COMMODITIES.find((c) => c.id === commodityId)
        const minOutput = (def?.harvestQuantity ?? 1) * HARVEST_BASE_FRACTION
        if (minOutput >= 1) return 2
        return Math.ceil(-Math.log10(minOutput)) + 1
    }

    /**
     * Harvest: generate free commodity units via click.
     * Returns the quantity produced, or 0 if the commodity is locked.
     */
    public harvest(commodityId: CommodityId): number {
        if (!this.unlockedCommodities.has(commodityId)) return 0

        const qty = this.getHarvestOutput(commodityId)
        this.addToHoldings(commodityId, qty, 0)
        this.totalHarvests++

        this.emit("harvestExecuted", { commodityId, quantity: qty })
        this.emit("portfolioChanged")
        return qty
    }

    public getTotalHarvests(): number {
        return this.totalHarvests
    }

    private addToHoldings(
        commodityId: CommodityId,
        quantity: number,
        cost: number
    ): void {
        const existing = this.holdings.get(commodityId)
        if (existing) {
            existing.quantity += quantity
            existing.totalCost += cost
        } else {
            this.holdings.set(commodityId, {
                quantity,
                totalCost: cost,
            })
        }
    }

    // -----------------------------------------------------------------------
    // Limit orders
    // -----------------------------------------------------------------------

    public addLimitOrder(
        commodityId: CommodityId,
        targetPrice: number,
        quantity: number
    ): boolean {
        if (!this.hasUpgrade("limit-orders")) return false
        const holding = this.holdings.get(commodityId)
        if (!holding || holding.quantity < quantity) return false

        this.limitOrders.push({ commodityId, targetPrice, quantity })
        this.emit("stateChanged")
        return true
    }

    public removeLimitOrder(index: number): void {
        if (index >= 0 && index < this.limitOrders.length) {
            this.limitOrders.splice(index, 1)
            this.emit("stateChanged")
        }
    }

    // -----------------------------------------------------------------------
    // Factories
    // -----------------------------------------------------------------------

    public getFactoryCost(factoryId: FactoryId): number {
        const def = FACTORIES.find((f) => f.id === factoryId)
        if (!def) return Infinity
        const owned = this.factories.get(factoryId) ?? 0
        const scaling =
            this.prestigeProvider?.("factoryCostScaling") ??
            FACTORY_COST_SCALING
        const discount = this.prestigeProvider?.("cheaperFactories") ?? 0
        return def.cost * Math.pow(scaling, owned) * (1 - discount)
    }

    public deployFactory(factoryId: FactoryId): boolean {
        if (!this.unlockedPhases.has(2)) return false

        const def = FACTORIES.find((f) => f.id === factoryId)
        if (!def) return false

        const cost = this.getFactoryCost(factoryId)
        if (this.cash < cost) return false

        this.cash -= cost
        this.factories.set(factoryId, (this.factories.get(factoryId) ?? 0) + 1)

        this.emit("factoryDeployed", { factoryId })
        this.emit("moneyChanged", this.cash)
        return true
    }

    // -----------------------------------------------------------------------
    // Upgrades
    // -----------------------------------------------------------------------

    public purchaseUpgrade(upgradeId: UpgradeId): boolean {
        if (!this.unlockedPhases.has(3)) return false

        const def = UPGRADES.find((u) => u.id === upgradeId)
        if (!def) return false
        if (this.ownedUpgrades.has(upgradeId)) return false
        if (this.cash < def.cost) return false

        this.cash -= def.cost
        this.ownedUpgrades.add(upgradeId)

        this.emit("upgradeAcquired", upgradeId)
        this.emit("moneyChanged", this.cash)
        return true
    }

    public hasUpgrade(upgradeId: UpgradeId): boolean {
        return this.ownedUpgrades.has(upgradeId)
    }

    /** Return the default trade quantity based on highest bulk-tier upgrade. */
    private getDefaultTradeQuantity(): number {
        if (this.hasUpgrade("block-trading")) return BLOCK_ORDER_QUANTITY
        if (this.hasUpgrade("bulk-orders")) return BULK_ORDER_QUANTITY
        if (this.hasUpgrade("batch-processing")) return BATCH_ORDER_QUANTITY
        return 1
    }

    // -----------------------------------------------------------------------
    // Market influence
    // -----------------------------------------------------------------------

    public executeInfluence(
        influenceId: InfluenceId,
        targetCommodity: CommodityId
    ): boolean {
        if (!this.unlockedPhases.has(4)) return false

        const def = INFLUENCES.find((i) => i.id === influenceId)
        if (!def) return false

        if (this.isInfluenceOnCooldown(influenceId)) return false
        if (this.cash < def.cashCost) return false

        for (const [cId, qty] of Object.entries(def.commodityCosts)) {
            const holding = this.holdings.get(cId as CommodityId)
            if (!holding || holding.quantity < qty) return false
        }

        this.cash -= def.cashCost
        for (const [cId, qty] of Object.entries(def.commodityCosts)) {
            const holding = this.holdings.get(cId as CommodityId)!
            const avgCost = holding.totalCost / holding.quantity
            holding.quantity -= qty
            holding.totalCost = holding.quantity * avgCost
            if (holding.quantity <= 0) {
                this.holdings.delete(cId as CommodityId)
            }
        }

        const market = this.markets.get(targetCommodity)
        if (market) {
            if (influenceId === "pump-and-dump") {
                market.influenceMultiplier = def.priceEffect / def.durationTicks
                market.influenceTicksRemaining = def.durationTicks

                const holding = this.holdings.get(targetCommodity)
                if (holding && holding.quantity > 0) {
                    const scheduledSellTick = Math.floor(
                        def.durationTicks * 0.8
                    )
                    this.pumpDumpTimeout = setTimeout(() => {
                        this.pumpDumpTimeout = null
                        this.sellAll(targetCommodity)
                    }, scheduledSellTick * TICK_INTERVAL_MS)
                }
            } else {
                market.influenceMultiplier = def.priceEffect / def.durationTicks
                market.influenceTicksRemaining = def.durationTicks
            }
        }

        this.influenceCooldowns.set(influenceId, Date.now() + def.cooldownMs)

        this.emit("influenceExecuted", { influenceId, targetCommodity })
        this.emit("moneyChanged", this.cash)
        this.emit("portfolioChanged")
        return true
    }

    public isInfluenceOnCooldown(influenceId: InfluenceId): boolean {
        const end = this.influenceCooldowns.get(influenceId)
        if (!end) return false
        return Date.now() < end
    }

    public getInfluenceCooldownRemaining(influenceId: InfluenceId): number {
        const end = this.influenceCooldowns.get(influenceId)
        if (!end) return 0
        return Math.max(0, end - Date.now())
    }

    // -----------------------------------------------------------------------
    // Unlock checking
    // -----------------------------------------------------------------------

    private checkUnlocks(): void {
        const earnings = this.lifetimeEarnings
        const thresholdReduction =
            this.prestigeProvider?.("phaseThresholdReduction") ?? 0
        const thresholdMult = 1 - thresholdReduction

        for (const c of COMMODITIES) {
            if (
                !this.unlockedCommodities.has(c.id) &&
                earnings >= c.unlockThreshold
            ) {
                this.unlockedCommodities.add(c.id)
                this.emit("commodityUnlocked", c.id)
            }
        }

        if (
            !this.unlockedPhases.has(2) &&
            earnings >= PHASE_THRESHOLDS.factories * thresholdMult
        ) {
            this.unlockedPhases.add(2)
            this.emit("phaseUnlocked", 2)
        }
        if (
            !this.unlockedPhases.has(3) &&
            earnings >= PHASE_THRESHOLDS.upgrades * thresholdMult
        ) {
            this.unlockedPhases.add(3)
            this.emit("phaseUnlocked", 3)
        }
        if (
            !this.unlockedPhases.has(4) &&
            earnings >= PHASE_THRESHOLDS.influence * thresholdMult
        ) {
            this.unlockedPhases.add(4)
            this.emit("phaseUnlocked", 4)
        }

        for (const { threshold, level } of POPUP_THRESHOLDS) {
            if (earnings >= threshold && this.popupLevel < level) {
                this.popupLevel = level
                this.emit("popupsActivate", level)
            }
        }
    }

    // -----------------------------------------------------------------------
    // Bonus (from popups)
    // -----------------------------------------------------------------------

    public addBonus(amount: number): void {
        this.cash += amount
        this.lifetimeEarnings += amount
        this.emit("moneyChanged", this.cash)
        this.checkUnlocks()
    }

    /**
     * Grant free commodity units (e.g. from WELT completions).
     * Cost basis is 0 so any sale is pure profit.
     */
    public grantCommodity(commodityId: CommodityId, quantity: number): void {
        this.addToHoldings(commodityId, quantity, 0)
        this.emit("portfolioChanged")
    }

    /** Dev-only: add cash directly */
    public devAddCash(amount: number): void {
        this.cash += amount
        if (amount > 0) this.lifetimeEarnings += amount
        this.emit("stateChanged")
    }

    /** Dev-only: unlock all phases */
    public devUnlockAllPhases(): void {
        for (let i = 1; i <= 6; i++) {
            this.unlockPhase(i)
        }
    }

    public getCash(): number {
        return this.cash
    }

    public getLifetimeEarnings(): number {
        return this.lifetimeEarnings
    }

    public getHolding(commodityId: CommodityId): Holding | null {
        return this.holdings.get(commodityId) ?? null
    }

    public getAllHoldings(): Map<CommodityId, Holding> {
        return new Map(this.holdings)
    }

    public getMarketState(commodityId: CommodityId): MarketState | null {
        return this.markets.get(commodityId) ?? null
    }

    public getPrice(commodityId: CommodityId): number {
        return this.markets.get(commodityId)?.price ?? 0
    }

    public getPriceHistory(commodityId: CommodityId): number[] {
        return [...(this.markets.get(commodityId)?.priceHistory ?? [])]
    }

    public getTrend(commodityId: CommodityId): TrendDirection | null {
        return this.markets.get(commodityId)?.trend ?? null
    }

    public getTrendStrength(commodityId: CommodityId): number {
        return this.markets.get(commodityId)?.trendStrength ?? 0
    }

    public getFactoryCount(factoryId: FactoryId): number {
        return this.factories.get(factoryId) ?? 0
    }

    public getOwnedUpgrades(): UpgradeId[] {
        return [...this.ownedUpgrades]
    }

    public getUnlockedCommodities(): CommodityId[] {
        return [...this.unlockedCommodities]
    }

    public isPhaseUnlocked(phase: number): boolean {
        return this.unlockedPhases.has(phase)
    }

    /** Externally unlock a phase (for cross-system gates like Phase 5). */
    public unlockPhase(phase: number): void {
        if (this.unlockedPhases.has(phase)) return
        this.unlockedPhases.add(phase)
        this.emit("phaseUnlocked", phase)
    }

    public getMaxUnlockedPhase(): number {
        return Math.max(...this.unlockedPhases)
    }

    // -----------------------------------------------------------------------
    // Phase 5: HR / Org chart
    // -----------------------------------------------------------------------

    public getOrgChart(): OrgChart {
        return this.orgChart
    }

    /**
     * Get aggregated employee bonuses. These are added on top of career
     * bonuses via the bonusProvider callback.
     */
    public getEmployeeBonus(type: string): number {
        if (!this.unlockedPhases.has(5)) return 0
        return this.orgChart.calculateBonuses().get(type) ?? 0
    }

    public getLimitOrders(): LimitOrder[] {
        return [...this.limitOrders]
    }

    public getCurrentNews(): string {
        return this.currentNews
    }

    public getUpcomingEvent(): MarketEventDef | null {
        return this.upcomingEvent
    }

    public getMovingAverage(
        commodityId: CommodityId,
        period: number = 20
    ): number[] {
        if (!this.hasUpgrade("moving-average")) return []
        const history = this.markets.get(commodityId)?.priceHistory ?? []
        if (history.length < period) return []

        const result: number[] = []
        for (let i = period - 1; i < history.length; i++) {
            let sum = 0
            for (let j = i - period + 1; j <= i; j++) {
                sum += history[j]
            }
            result.push(sum / period)
        }
        return result
    }

    public canShowTrend(): boolean {
        return (
            this.hasUpgrade("trend-analysis") ||
            (this.prestigeProvider?.("marketIntuition") ?? 0) > 0
        )
    }

    public canShowTrendStrength(): boolean {
        return this.hasUpgrade("analyst-reports")
    }

    public canShowTrendDuration(): boolean {
        return this.hasUpgrade("confidential-tip")
    }

    public getTrendTicksRemaining(commodityId: CommodityId): number {
        return this.markets.get(commodityId)?.trendTicksRemaining ?? 0
    }

    public canShowPriceTarget(): boolean {
        return this.hasUpgrade("material-advantage")
    }

    public getPriceTarget(commodityId: CommodityId): number | null {
        const state = this.markets.get(commodityId)
        if (!state) return null
        const def = COMMODITIES.find((c) => c.id === commodityId)
        if (!def) return null

        let direction = 0
        if (state.trend === "bull") direction = 1
        else if (state.trend === "bear") direction = -1

        const driftPerTick =
            direction * state.trendStrength * def.volatility * state.price
        const estimatedDrift = driftPerTick * state.trendTicksRemaining

        let target = state.price + estimatedDrift
        const floor = def.basePrice * PRICE_FLOOR_FACTOR
        const ceiling = def.basePrice * PRICE_CEILING_FACTOR
        target = Math.max(floor, Math.min(ceiling, target))

        return target
    }

    // ── Forecasting accessors (queue-based) ─────────────────────────────────

    /** Whether the "next trend" arrow should appear (seasonal-forecast upgrade). */
    public canShowNextTrend(): boolean {
        return (
            this.hasUpgrade("seasonal-forecast") ||
            (this.prestigeProvider?.("insiderEdge") ?? 0) > 0
        )
    }

    /** Direction of the very next trend segment in the queue. */
    public getNextTrendDirection(
        commodityId: CommodityId
    ): TrendDirection | null {
        const state = this.markets.get(commodityId)
        if (!state || state.trendQueue.length === 0) return null
        return state.trendQueue[0].trend
    }

    /** Whether the full forecast bar should appear (insider-calendar upgrade). */
    public canShowTrendForecast(): boolean {
        return this.hasUpgrade("insider-calendar")
    }

    /**
     * Return the upcoming trend queue (shallow copy) for rendering in the
     * forecast bar. Each segment includes direction, strength, and duration.
     */
    public getTrendForecast(commodityId: CommodityId): TrendSegment[] {
        const state = this.markets.get(commodityId)
        if (!state) return []
        return state.trendQueue.map((s) => ({ ...s }))
    }

    public getSnapshot(): GameSnapshot {
        const holdingsRecord: Record<CommodityId, Holding> = {} as Record<
            CommodityId,
            Holding
        >
        for (const [k, v] of this.holdings) {
            holdingsRecord[k] = { ...v }
        }

        const marketsRecord: Record<CommodityId, MarketState> = {} as Record<
            CommodityId,
            MarketState
        >
        for (const [k, v] of this.markets) {
            // Exclude trendQueue and trendHistory from snapshot to keep it lightweight
            marketsRecord[k] = {
                ...v,
                priceHistory: [...v.priceHistory],
                trendQueue: [],
                trendHistory: [],
            }
        }

        const factoriesRecord: Record<FactoryId, number> = {} as Record<
            FactoryId,
            number
        >
        for (const [k, v] of this.factories) {
            factoriesRecord[k] = v
        }

        const cooldownsRecord: Record<InfluenceId, number> = {} as Record<
            InfluenceId,
            number
        >
        for (const [k, v] of this.influenceCooldowns) {
            cooldownsRecord[k] = v
        }

        return {
            cash: this.cash,
            lifetimeEarnings: this.lifetimeEarnings,
            holdings: holdingsRecord,
            markets: marketsRecord,
            factories: factoriesRecord,
            ownedUpgrades: [...this.ownedUpgrades],
            unlockedCommodities: [...this.unlockedCommodities],
            unlockedPhases: [...this.unlockedPhases],
            influenceCooldowns: cooldownsRecord,
            limitOrders: this.limitOrders.map((o) => ({ ...o })),
            currentNews: this.currentNews,
            upcomingEvent: this.upcomingEvent,
            popupLevel: this.popupLevel,
        }
    }

    // -----------------------------------------------------------------------
    // Phase 6: Structured Products Desk
    // -----------------------------------------------------------------------

    private processPhase6(): void {
        if (!this.unlockedPhases.has(6)) return

        this.ticksSinceLastDefault++

        // ── DAS yield + default check ────────────────────────────────────
        let anyDefaulted = false
        for (const das of this.securities) {
            if (das.status !== "performing") continue

            const currentPrice = this.markets.get(das.commodityId)?.price ?? 0

            // Default check
            if (
                currentPrice <
                das.securitizationPrice * DAS_DEFAULT_THRESHOLD
            ) {
                das.status = "defaulted"
                anyDefaulted = true
                this.ticksSinceLastDefault = 0
                this.emit("dasDefaulted", {
                    dasId: das.id,
                    commodityId: das.commodityId,
                })
                continue
            }

            // Yield: baseYield * lockedQty * currentPrice * ratingMult * decay
            const sameCount = this.securities.filter(
                (s) =>
                    s.commodityId === das.commodityId &&
                    s.status === "performing" &&
                    s.id !== das.id
            ).length
            const decay = Math.pow(DAS_SAME_COMMODITY_DECAY, sameCount)
            const yieldAmount =
                DAS_BASE_YIELD *
                das.lockedQuantity *
                currentPrice *
                RATING_YIELD_MULT[this.creditRating] *
                decay

            this.cash += yieldAmount
            this.lifetimeEarnings += yieldAmount
        }

        // Remove defaulted DAS (collateral lost)
        if (anyDefaulted) {
            this.securities = this.securities.filter(
                (s) => s.status !== "defaulted"
            )
            // Default immediately drops rating
            this.adjustRating(-1)
            this.emit("portfolioChanged")
            this.emit("moneyChanged", this.cash)
        }

        // ── Interest on debt ─────────────────────────────────────────────
        if (this.facility.outstandingDebt > 0) {
            const interest =
                this.facility.outstandingDebt *
                RATING_INTEREST_RATE[this.creditRating]
            this.facility.outstandingDebt += interest
            this.facility.totalInterestPaid += interest
            this.cash -= interest
        }

        // ── Margin call check ────────────────────────────────────────────
        if (this.facility.outstandingDebt > 0) {
            const portfolioVal = this.calculatePortfolioValue()
            if (
                portfolioVal > 0 &&
                this.facility.outstandingDebt / portfolioVal >
                    MARGIN_CALL_THRESHOLD
            ) {
                this.fireMarginEvent()
            }
        }

        // ── Credit rating review (every N ticks) ─────────────────────────
        if (this.totalTickCount % RATING_REVIEW_INTERVAL === 0) {
            this.reviewCreditRating()
        }

        // Emit money change from yield/interest
        if (this.securities.some((s) => s.status === "performing")) {
            this.emit("moneyChanged", this.cash)
        }
    }

    private fireMarginEvent(): void {
        // Record for achievement tracking
        this.marginEventTick = this.totalTickCount
        this.ratingAtMarginEvent = this.creditRating

        // Force-liquidate lowest-value DAS
        const performing = this.securities.filter(
            (s) => s.status === "performing"
        )
        if (performing.length > 0) {
            performing.sort((a, b) => {
                const aVal =
                    a.lockedQuantity *
                    (this.markets.get(a.commodityId)?.price ?? 0)
                const bVal =
                    b.lockedQuantity *
                    (this.markets.get(b.commodityId)?.price ?? 0)
                return aVal - bVal
            })
            const victim = performing[0]
            victim.status = "defaulted"
            this.securities = this.securities.filter(
                (s) => s.status !== "defaulted"
            )
        }
        // Note: if no DAS to liquidate, debt persists at punishing rate.
        // Does NOT cascade into payroll or other systems.

        this.adjustRating(-1)
        this.emit("marginEvent", {
            debt: this.facility.outstandingDebt,
            rating: this.creditRating,
        })
        this.emit("portfolioChanged")
    }

    private reviewCreditRating(): void {
        const portfolioVal = this.calculatePortfolioValue()
        const debtRatio =
            portfolioVal > 0 ? this.facility.outstandingDebt / portfolioVal : 0

        // Check degradation from sustained high ratio
        if (debtRatio > RATING_DEGRADE_RATIO) {
            this.ticksAboveDegradeRatio += RATING_REVIEW_INTERVAL
            if (this.ticksAboveDegradeRatio >= RATING_DEGRADE_TICKS) {
                this.adjustRating(-1)
                this.ticksAboveDegradeRatio = 0
            }
        } else {
            this.ticksAboveDegradeRatio = 0
        }

        // Check improvement: low ratio + no recent defaults + diversified
        if (debtRatio < RATING_IMPROVE_RATIO) {
            if (this.ticksSinceLastDefault >= RATING_NO_DEFAULT_WINDOW) {
                const performingCommodities = new Set(
                    this.securities
                        .filter((s) => s.status === "performing")
                        .map((s) => s.commodityId)
                )
                if (performingCommodities.size >= RATING_DIVERSIFICATION_MIN) {
                    this.adjustRating(1)
                }
            }
        }
    }

    private adjustRating(delta: number): void {
        const idx = CREDIT_RATING_SCALE.indexOf(this.creditRating)
        const newIdx = Math.max(
            0,
            Math.min(CREDIT_RATING_SCALE.length - 1, idx + delta)
        )
        const newRating = CREDIT_RATING_SCALE[newIdx]
        if (newRating !== this.creditRating) {
            this.creditRating = newRating
            this.emit("ratingChanged", {
                rating: this.creditRating,
                direction: delta > 0 ? "upgrade" : "downgrade",
            })
        }
    }

    /**
     * Total net worth: cash + holdings at market price + performing securities.
     * Use this as a cross-system "wealth scale" metric.
     */
    public getNetWorth(): number {
        return this.calculatePortfolioValue()
    }

    public calculatePortfolioValue(): number {
        let value = Math.max(0, this.cash)

        for (const [cId, holding] of this.holdings) {
            const price = this.markets.get(cId)?.price ?? 0
            value += holding.quantity * price
        }

        for (const das of this.securities) {
            if (das.status !== "performing") continue
            const price = this.markets.get(das.commodityId)?.price ?? 0
            value += das.lockedQuantity * price
        }

        return value
    }

    // ── Securitize ───────────────────────────────────────────────────────

    public securitize(
        commodityId: CommodityId,
        quantity: number
    ): string | null {
        if (!this.unlockedPhases.has(6)) return null
        if (quantity < DAS_MIN_QUANTITY) return null

        const performing = this.securities.filter(
            (s) => s.status === "performing"
        )
        if (performing.length >= DAS_MAX_POSITIONS) return null

        const holding = this.holdings.get(commodityId)
        if (!holding || holding.quantity < quantity) return null

        const currentPrice = this.markets.get(commodityId)?.price ?? 0
        if (currentPrice <= 0) return null

        const avgCost = holding.totalCost / holding.quantity
        holding.quantity -= quantity
        holding.totalCost = holding.quantity * avgCost
        if (holding.quantity <= 0) {
            this.holdings.delete(commodityId)
        }

        const dasId = `DAS-${String(this.dasIdCounter++).padStart(4, "0")}`
        this.securities.push({
            id: dasId,
            commodityId,
            lockedQuantity: quantity,
            securitizationPrice: currentPrice,
            createdAtTick: this.totalTickCount,
            status: "performing",
        })

        this.emit("dasCreated", { dasId, commodityId, quantity })
        this.emit("portfolioChanged")
        return dasId
    }

    public unwindDAS(dasId: string): boolean {
        const idx = this.securities.findIndex(
            (s) => s.id === dasId && s.status === "performing"
        )
        if (idx === -1) return false

        const das = this.securities[idx]
        this.addToHoldings(das.commodityId, das.lockedQuantity, 0)
        this.securities.splice(idx, 1)

        this.emit("dasUnwound", { dasId, commodityId: das.commodityId })
        this.emit("portfolioChanged")
        return true
    }

    // ── Credit Facility ──────────────────────────────────────────────────

    public borrow(amount: number): boolean {
        if (!this.unlockedPhases.has(6)) return false
        if (amount <= 0) return false

        const portfolioVal = this.calculatePortfolioValue()
        const maxBorrow =
            portfolioVal * RATING_LEVERAGE_RATIO[this.creditRating]
        const available = maxBorrow - this.facility.outstandingDebt

        if (amount > available) return false

        this.facility.outstandingDebt += amount
        this.cash += amount

        this.emit("debtChanged", {
            debt: this.facility.outstandingDebt,
            borrowed: amount,
        })
        this.emit("moneyChanged", this.cash)
        return true
    }

    public repay(amount: number): boolean {
        if (amount <= 0) return false
        if (this.facility.outstandingDebt <= 0) return false

        const repayAmount = Math.min(
            amount,
            this.facility.outstandingDebt,
            this.cash
        )
        if (repayAmount <= 0) return false

        this.cash -= repayAmount
        this.facility.outstandingDebt -= repayAmount

        if (this.facility.outstandingDebt < 0.001) {
            this.facility.outstandingDebt = 0
        }

        this.emit("debtChanged", {
            debt: this.facility.outstandingDebt,
            repaid: repayAmount,
        })
        this.emit("moneyChanged", this.cash)
        return true
    }

    // ── Desk getters ─────────────────────────────────────────────────────

    public getSecurities(): DigitalAssetSecurity[] {
        return this.securities.filter((s) => s.status === "performing")
    }

    public getCreditRating(): CreditRating {
        return this.creditRating
    }

    public getDebt(): number {
        return this.facility.outstandingDebt
    }

    public getBorrowCapacity(): number {
        const portfolioVal = this.calculatePortfolioValue()
        return Math.max(
            0,
            portfolioVal * RATING_LEVERAGE_RATIO[this.creditRating] -
                this.facility.outstandingDebt
        )
    }

    public getDASYieldPerTick(): number {
        let total = 0
        const performing = this.securities.filter(
            (s) => s.status === "performing"
        )
        for (const das of performing) {
            const currentPrice = this.markets.get(das.commodityId)?.price ?? 0
            const sameCount = performing.filter(
                (s) => s.commodityId === das.commodityId && s.id !== das.id
            ).length
            const decay = Math.pow(DAS_SAME_COMMODITY_DECAY, sameCount)
            total +=
                DAS_BASE_YIELD *
                das.lockedQuantity *
                currentPrice *
                RATING_YIELD_MULT[this.creditRating] *
                decay
        }
        return total
    }

    public getInterestPerTick(): number {
        if (this.facility.outstandingDebt <= 0) return 0
        return (
            this.facility.outstandingDebt *
            RATING_INTEREST_RATE[this.creditRating]
        )
    }

    public getTicksSinceMarginEvent(): number {
        return this.totalTickCount - this.marginEventTick
    }

    public getRatingAtMarginEvent(): CreditRating {
        return this.ratingAtMarginEvent
    }

    public serialize(): MarketSaveData {
        const holdingsRecord: Record<string, Holding> = {}
        for (const [k, v] of this.holdings) {
            holdingsRecord[k] = { ...v }
        }

        const factoriesRecord: Record<string, number> = {}
        for (const [k, v] of this.factories) {
            factoriesRecord[k] = v
        }

        // Build trend schedules per commodity
        const trendSchedules: Record<string, TrendScheduleSaveData> = {}
        for (const [id, state] of this.markets) {
            const origDuration =
                this.trendOriginalDuration.get(id) ?? state.trendTicksRemaining
            const ticksElapsed = origDuration - state.trendTicksRemaining
            trendSchedules[id] = {
                queue: state.trendQueue.map((s) => ({ ...s })),
                history: state.trendHistory.map((s) => ({ ...s })),
                currentSegment: {
                    trend: state.trend,
                    strength: state.trendStrength,
                    duration: origDuration,
                },
                currentTicksElapsed: ticksElapsed,
            }
        }

        return {
            cash: this.cash,
            lifetimeEarnings: this.lifetimeEarnings,
            holdings: holdingsRecord,
            factories: factoriesRecord,
            ownedUpgrades: [...this.ownedUpgrades],
            unlockedCommodities: [...this.unlockedCommodities],
            unlockedPhases: [...this.unlockedPhases],
            limitOrders: this.limitOrders.map((o) => ({ ...o })),
            popupLevel: this.popupLevel,
            totalHarvests: this.totalHarvests,
            orgChart: this.orgChart.serialize(),
            desk: {
                securities: this.securities.map((s) => ({ ...s })),
                creditRating: this.creditRating,
                facility: { ...this.facility },
                ticksSinceLastDefault: this.ticksSinceLastDefault,
                ticksAboveDegradeRatio: this.ticksAboveDegradeRatio,
                marginEventTick: this.marginEventTick,
                ratingAtMarginEvent: this.ratingAtMarginEvent,
            },
            trendSchedules,
        }
    }

    public loadState(data: MarketSaveData): void {
        this.cash = data.cash
        this.lifetimeEarnings = data.lifetimeEarnings

        this.holdings.clear()
        for (const [k, v] of Object.entries(data.holdings)) {
            this.holdings.set(k as CommodityId, { ...v })
        }

        this.factories.clear()
        for (const [k, v] of Object.entries(data.factories)) {
            this.factories.set(k as FactoryId, v)
        }

        this.ownedUpgrades = new Set(data.ownedUpgrades)
        this.unlockedCommodities = new Set(data.unlockedCommodities)
        this.unlockedPhases = new Set(data.unlockedPhases)
        this.limitOrders = data.limitOrders.map((o) => ({ ...o }))
        this.popupLevel = data.popupLevel
        this.totalHarvests = data.totalHarvests ?? 0

        // Restore org chart if present
        if (data.orgChart) {
            this.orgChart.deserialize(data.orgChart)
        }

        // Restore Phase 6: Structured Products Desk
        if (data.desk) {
            this.securities = data.desk.securities.map((s) => ({ ...s }))
            this.creditRating = data.desk.creditRating ?? "C"
            this.facility = { ...data.desk.facility }
            this.ticksSinceLastDefault = data.desk.ticksSinceLastDefault ?? 999
            this.ticksAboveDegradeRatio = data.desk.ticksAboveDegradeRatio ?? 0
            this.marginEventTick = data.desk.marginEventTick ?? -999
            this.ratingAtMarginEvent = data.desk.ratingAtMarginEvent ?? "C"
            // Restore DAS ID counter
            this.dasIdCounter = this.securities.length
        } else {
            // Clean slate (legacy save or first load)
            this.securities = []
            this.creditRating = "C"
            this.facility = { outstandingDebt: 0, totalInterestPaid: 0 }
            this.ticksSinceLastDefault = 999
            this.ticksAboveDegradeRatio = 0
            this.dasIdCounter = 0
        }

        // Restore trend schedules (if present)
        if (data.trendSchedules) {
            for (const [id, schedule] of Object.entries(data.trendSchedules)) {
                const state = this.markets.get(id as CommodityId)
                if (!state) continue

                state.trendQueue = schedule.queue.map((s) => ({ ...s }))
                state.trendHistory = schedule.history.map((s) => ({ ...s }))

                // Restore the active segment from save data
                state.trend = schedule.currentSegment.trend
                state.trendStrength = schedule.currentSegment.strength
                state.trendTicksRemaining =
                    schedule.currentSegment.duration -
                    schedule.currentTicksElapsed
                this.trendOriginalDuration.set(
                    id as CommodityId,
                    schedule.currentSegment.duration
                )
            }
        } else {
            // Legacy save: generate fresh queues for all markets
            for (const c of COMMODITIES) {
                const state = this.markets.get(c.id)
                if (!state) continue
                state.trendQueue = []
                state.trendHistory = []
                this.trendOriginalDuration.set(c.id, state.trendTicksRemaining)
                this.fillTrendQueue(c.id, c)
            }
        }

        this.emit("moneyChanged", this.cash)
        this.emit("portfolioChanged")
        this.emit("stateChanged")
    }

    // -----------------------------------------------------------------------
    // Prestige reset
    // -----------------------------------------------------------------------

    public resetForPrestige(
        startingCash: number,
        startingPhases: number[]
    ): void {
        this.stop()

        // Check Foresight upgrade flags before clearing state
        const keepOneFactory =
            (this.prestigeProvider?.("perpetualFactories") ?? 0) > 0
        const seedEmployee =
            (this.prestigeProvider?.("veteranRecruits") ?? 0) > 0
        const grantRandomUpgrade =
            (this.prestigeProvider?.("marketMemory") ?? 0) > 0

        this.cash = startingCash
        this.lifetimeEarnings = 0
        this.holdings.clear()

        // Perpetual Factories: keep 1 of each factory type you owned
        if (keepOneFactory) {
            const preserved = new Map<FactoryId, number>()
            for (const fDef of FACTORIES) {
                if ((this.factories.get(fDef.id) ?? 0) > 0) {
                    preserved.set(fDef.id, 1)
                }
            }
            this.factories = preserved
        } else {
            this.factories.clear()
        }

        this.factoryTickCounters.clear()
        this.ownedUpgrades.clear()

        // Market Memory: grant 1 random upgrade after clearing
        if (grantRandomUpgrade && UPGRADES.length > 0) {
            const randomUpgrade =
                UPGRADES[Math.floor(Math.random() * UPGRADES.length)]
            this.ownedUpgrades.add(randomUpgrade.id)
        }

        this.limitOrders = []
        this.popupLevel = 0
        this.currentNews = ""
        this.upcomingEvent = null
        this.upcomingEventCountdown = 0
        this.ticksSinceEvent = 0
        this.nextEventTicks = this.rng.nextInt(EVENT_MIN_TICKS, EVENT_MAX_TICKS)

        this.unlockedPhases = new Set(startingPhases)
        this.unlockedCommodities.clear()
        this.initUnlockedCommodities()
        this.initMarkets()
        this.influenceCooldowns.clear()
        this.orgChart.reset()

        // Veteran Recruits: seed 1 random employee after reset
        if (seedEmployee && this.orgChart.getCandidatePool().length > 0) {
            this.orgChart.hireToFirstAvailable(0)
        }

        // Reset Phase 6: Structured Products Desk
        this.securities = []
        this.creditRating = "C"
        this.facility = { outstandingDebt: 0, totalInterestPaid: 0 }
        this.ticksSinceLastDefault = 999
        this.ticksAboveDegradeRatio = 0
        this.dasIdCounter = 0
        this.marginEventTick = -999
        this.ratingAtMarginEvent = "C"

        this.emit("moneyChanged", this.cash)
        this.emit("portfolioChanged")
        this.emit("stateChanged")

        this.start()
    }

    // -----------------------------------------------------------------------
    // Static data accessors
    // -----------------------------------------------------------------------

    public static getCommodities(): CommodityDef[] {
        return COMMODITIES
    }

    public static getFactories(): FactoryDef[] {
        return FACTORIES
    }

    public static getUpgrades(): UpgradeDef[] {
        return UPGRADES
    }

    public static getInfluences(): InfluenceDef[] {
        return INFLUENCES
    }

    // -----------------------------------------------------------------------
    // Offline time catchup
    // -----------------------------------------------------------------------

    public offlineCatchup(elapsedMs: number): OfflineSummary {
        const clampedMs = Math.max(0, Math.min(elapsedMs, CATCHUP.maxOfflineMs))
        const ticks = Math.floor(clampedMs / TICK_INTERVAL_MS)
        const effectiveTicks = MarketEngine.computeEffectiveTicks(clampedMs)

        const commoditiesProduced: Record<string, number> = {}
        let salariesPaid = 0
        let employeesFired = 0

        // ── Simplified factory production (efficiency from prestige) ──
        const offlineEfficiency =
            this.prestigeProvider?.("offlineEfficiency") ?? 0.8
        if (this.unlockedPhases.has(2)) {
            for (const fDef of FACTORIES) {
                const count = this.factories.get(fDef.id) ?? 0
                if (count === 0) continue

                const effectiveCycle = fDef.ticksPerCycle
                const cycleCount = Math.floor(effectiveTicks / effectiveCycle)
                if (cycleCount === 0) continue

                const avgOutput = (fDef.minOutput + fDef.maxOutput) / 2
                const totalProduced = Math.floor(
                    cycleCount * avgOutput * offlineEfficiency * count
                )

                if (totalProduced > 0) {
                    this.addToHoldings(fDef.produces, totalProduced, 0)
                    commoditiesProduced[fDef.produces] =
                        (commoditiesProduced[fDef.produces] ?? 0) +
                        totalProduced
                }
            }
        }

        // ── Salary drain (full rate, no org chart bonuses) ──
        if (
            this.unlockedPhases.has(5) &&
            this.orgChart.getEmployeeCount() > 0
        ) {
            const totalSalaryPerTick = this.orgChart.getTotalSalary()
            const totalSalary = totalSalaryPerTick * ticks
            salariesPaid = totalSalary
            this.cash -= totalSalary

            while (this.cash < 0 && this.orgChart.getEmployeeCount() > 0) {
                const result = this.orgChart.fireMostExpensive()
                if (result) {
                    employeesFired++
                } else {
                    break
                }
            }
        }

        if (Object.keys(commoditiesProduced).length > 0 || salariesPaid > 0) {
            this.emit("portfolioChanged")
            this.emit("moneyChanged", this.cash)
            if (employeesFired > 0) {
                this.emit("orgChartChanged")
            }
        }

        return {
            ticks,
            elapsedMs: clampedMs,
            commoditiesProduced,
            salariesPaid,
            employeesFired,
        }
    }

    /**
     * Computes effective ticks accounting for time-based decay.
     * Full efficiency for the first 12 hours, then combined
     * exponential + linear decay from 12–24h reaching zero at 24h.
     *
     * Decay function for t > 12h: (1 - p) * e^(-k*p)
     * where p = (t - 12h) / 12h, k = CATCHUP.decayRate
     */
    public static computeEffectiveTicks(clampedMs: number): number {
        if (clampedMs <= CATCHUP.fullEfficiencyMs) {
            return Math.floor(clampedMs / TICK_INTERVAL_MS)
        }

        const fullTicks = Math.floor(
            CATCHUP.fullEfficiencyMs / TICK_INTERVAL_MS
        )
        const decayMs = clampedMs - CATCHUP.fullEfficiencyMs
        const decayDurationMs = CATCHUP.maxOfflineMs - CATCHUP.fullEfficiencyMs
        const CHUNKS = 100
        const chunkMs = decayMs / CHUNKS

        let effectiveDecayMs = 0
        for (let i = 0; i < CHUNKS; i++) {
            const midpointMs = (i + 0.5) * chunkMs
            const p = midpointMs / decayDurationMs
            const efficiency = (1 - p) * Math.exp(-CATCHUP.decayRate * p)
            effectiveDecayMs += chunkMs * efficiency
        }

        return fullTicks + Math.floor(effectiveDecayMs / TICK_INTERVAL_MS)
    }
}

export interface OfflineSummary {
    ticks: number
    elapsedMs: number
    commoditiesProduced: Record<string, number>
    salariesPaid: number
    employeesFired: number
}

let gameInstance: MarketEngine | null = null

export function getMarketGame(): MarketEngine {
    if (!gameInstance) {
        gameInstance = new MarketEngine()
        gameInstance.start()
    }
    return gameInstance
}
