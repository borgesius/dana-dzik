import {
    BULK_ORDER_QUANTITY,
    COMMODITIES,
    type CommodityDef,
    type CommodityId,
    CORNER_MARKET_FLOAT,
    CORNER_MARKET_PRICE_BOOST,
    CORNER_MARKET_THRESHOLD,
    EVENT_MAX_TICKS,
    EVENT_MIN_TICKS,
    FACTORIES,
    FACTORY_COST_SCALING,
    type FactoryDef,
    type FactoryId,
    type GameEventCallback,
    type GameEventType,
    type GameSnapshot,
    type Holding,
    type InfluenceDef,
    type InfluenceId,
    INFLUENCES,
    type LimitOrder,
    MARKET_EVENTS,
    type MarketEventDef,
    type MarketState,
    MEAN_REVERSION_STRENGTH,
    PHASE_THRESHOLDS,
    POPUP_THRESHOLDS,
    PRICE_CEILING_FACTOR,
    PRICE_FLOOR_FACTOR,
    PRICE_HISTORY_LENGTH,
    SeededRng,
    STARTING_CASH,
    TICK_INTERVAL_MS,
    type TradeResult,
    TREND_MAX_TICKS,
    TREND_MIN_TICKS,
    type TrendDirection,
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

    private eventListeners: Map<GameEventType, GameEventCallback[]> = new Map()
    private tickInterval: ReturnType<typeof setInterval> | null = null
    private ticksSinceEvent: number = 0
    private nextEventTicks: number = 0

    private rng: SeededRng

    constructor(seed?: number) {
        this.rng = new SeededRng(seed)
        this.initMarkets()
        this.initUnlockedCommodities()
        this.nextEventTicks = this.rng.nextInt(EVENT_MIN_TICKS, EVENT_MAX_TICKS)
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

    // -----------------------------------------------------------------------
    // Initialization
    // -----------------------------------------------------------------------

    private initMarkets(): void {
        for (const c of COMMODITIES) {
            const trendTicks = this.rng.nextInt(
                TREND_MIN_TICKS,
                TREND_MAX_TICKS
            )
            this.markets.set(c.id, {
                commodityId: c.id,
                price: c.basePrice,
                trend: "flat",
                trendStrength: 0,
                trendTicksRemaining: trendTicks,
                priceHistory: [c.basePrice],
                influenceMultiplier: 0,
                influenceTicksRemaining: 0,
            })
        }
    }

    private initUnlockedCommodities(): void {
        for (const c of COMMODITIES) {
            if (c.unlockThreshold === 0) {
                this.unlockedCommodities.add(c.id)
            }
        }
    }

    // -----------------------------------------------------------------------
    // Start / stop
    // -----------------------------------------------------------------------

    public start(): void {
        if (this.tickInterval) return
        this.tickInterval = setInterval(() => this.tick(), TICK_INTERVAL_MS)
    }

    public stop(): void {
        if (this.tickInterval) {
            clearInterval(this.tickInterval)
            this.tickInterval = null
        }
    }

    public destroy(): void {
        this.stop()
    }

    // -----------------------------------------------------------------------
    // Tick
    // -----------------------------------------------------------------------

    public tick(): void {
        this.updatePrices()
        this.processFactories()
        this.processLimitOrders()
        this.processEvents()
        this.processCornerMarket()
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

            const noise =
                (this.rng.next() - 0.5) * 2 * c.volatility * state.price
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
        const r = this.rng.next()
        if (r < 0.35) {
            state.trend = "bull"
        } else if (r < 0.7) {
            state.trend = "bear"
        } else {
            state.trend = "flat"
        }
        state.trendStrength = 0.3 + this.rng.next() * 0.7
        state.trendTicksRemaining = this.rng.nextInt(
            TREND_MIN_TICKS,
            TREND_MAX_TICKS
        )

        const priceFraction = state.price / def.basePrice
        if (priceFraction > 5 && state.trend === "bull") {
            state.trend = "bear"
        } else if (priceFraction < 0.3 && state.trend === "bear") {
            state.trend = "bull"
        }
    }

    private processFactories(): void {
        if (!this.unlockedPhases.has(2)) return

        for (const fDef of FACTORIES) {
            const count = this.factories.get(fDef.id) ?? 0
            if (count === 0) continue

            const counter = (this.factoryTickCounters.get(fDef.id) ?? 0) + 1
            this.factoryTickCounters.set(fDef.id, counter)

            const effectiveCycle = this.hasUpgrade("cpu-overclock")
                ? Math.max(1, fDef.ticksPerCycle - 1)
                : fDef.ticksPerCycle

            if (counter < effectiveCycle) continue
            this.factoryTickCounters.set(fDef.id, 0)

            let totalProduced = 0
            for (let i = 0; i < count; i++) {
                const minOut = this.hasUpgrade("quality-assurance")
                    ? Math.ceil(fDef.maxOutput * 0.4)
                    : fDef.minOutput
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
            this.nextEventTicks = this.rng.nextInt(
                EVENT_MIN_TICKS,
                EVENT_MAX_TICKS
            )
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

        const qty =
            quantity ??
            (this.hasUpgrade("bulk-orders") ? BULK_ORDER_QUANTITY : 1)
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
            quantity ??
                (this.hasUpgrade("bulk-orders") ? BULK_ORDER_QUANTITY : 1),
            holding.quantity
        )
        const revenue = market.price * qty

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
        return def.cost * Math.pow(FACTORY_COST_SCALING, owned)
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
                    setTimeout(() => {
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
            earnings >= PHASE_THRESHOLDS.factories
        ) {
            this.unlockedPhases.add(2)
            this.emit("phaseUnlocked", 2)
        }
        if (
            !this.unlockedPhases.has(3) &&
            earnings >= PHASE_THRESHOLDS.upgrades
        ) {
            this.unlockedPhases.add(3)
            this.emit("phaseUnlocked", 3)
        }
        if (
            !this.unlockedPhases.has(4) &&
            earnings >= PHASE_THRESHOLDS.influence
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

    // -----------------------------------------------------------------------
    // Getters
    // -----------------------------------------------------------------------

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

    public getMaxUnlockedPhase(): number {
        return Math.max(...this.unlockedPhases)
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
        return this.hasUpgrade("trend-analysis")
    }

    public canShowTrendStrength(): boolean {
        return this.hasUpgrade("analyst-reports")
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
            marketsRecord[k] = { ...v, priceHistory: [...v.priceHistory] }
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
}
