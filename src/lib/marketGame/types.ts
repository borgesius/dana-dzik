export type { CommodityDef, CommodityId } from "./commodities"
export { COMMODITIES } from "./commodities"
export {
    BULK_ORDER_QUANTITY,
    CORNER_MARKET_FLOAT,
    CORNER_MARKET_PRICE_BOOST,
    CORNER_MARKET_THRESHOLD,
    EVENT_MAX_TICKS,
    EVENT_MIN_TICKS,
    HARVEST_AUTOSCRIPT_BONUS,
    HARVEST_BASE_FRACTION,
    HARVEST_UPGRADE_BONUS,
    MARKET_YEAR_TICKS,
    MEAN_REVERSION_STRENGTH,
    PHASE_THRESHOLDS,
    POPUP_THRESHOLDS,
    PRICE_CEILING_FACTOR,
    PRICE_FLOOR_FACTOR,
    PRICE_HISTORY_LENGTH,
    STARTING_CASH,
    TICK_INTERVAL_MS,
    TREND_MAX_TICKS,
    TREND_MIN_TICKS,
} from "./constants"
export type { EventEffect, MarketEventDef } from "./events"
export { MARKET_EVENTS } from "./events"
export type { FactoryDef, FactoryId } from "./factories"
export { FACTORIES, FACTORY_COST_SCALING } from "./factories"
export type { InfluenceDef, InfluenceId } from "./influences"
export { INFLUENCES } from "./influences"
export { SeededRng } from "./rng"
export type { UpgradeCategory, UpgradeDef, UpgradeId } from "./upgrades"
export { UPGRADES } from "./upgrades"

import type { CommodityId } from "./commodities"
import type { MarketEventDef } from "./events"
import type { FactoryId } from "./factories"
import type { InfluenceId } from "./influences"
import type { OrgChartSaveData } from "./orgChart"
import type { UpgradeId } from "./upgrades"

export type TrendDirection = "bull" | "bear" | "flat"

export interface TrendSegment {
    trend: TrendDirection
    strength: number
    duration: number
}

export interface MarketState {
    commodityId: CommodityId
    price: number
    trend: TrendDirection
    trendStrength: number
    trendTicksRemaining: number
    priceHistory: number[]
    influenceMultiplier: number
    influenceTicksRemaining: number
    trendQueue: TrendSegment[]
    trendHistory: TrendSegment[]
}

export interface Holding {
    quantity: number
    totalCost: number
}

export type GameEventType =
    | "moneyChanged"
    | "portfolioChanged"
    | "marketTick"
    | "phaseUnlocked"
    | "commodityUnlocked"
    | "upgradeAcquired"
    | "factoryDeployed"
    | "influenceExecuted"
    | "newsEvent"
    | "popupsActivate"
    | "tradeExecuted"
    | "limitOrderFilled"
    | "stateChanged"
    | "employeeHired"
    | "employeeFired"
    | "orgChartChanged"
    | "moraleEvent"
    // Clicker
    | "harvestExecuted"
    // Phase 6: Structured Products Desk
    | "dasCreated"
    | "dasDefaulted"
    | "dasUnwound"
    | "marginEvent"
    | "ratingChanged"
    | "debtChanged"

export type GameEventCallback = (data?: unknown) => void

export interface GameSnapshot {
    cash: number
    lifetimeEarnings: number
    holdings: Record<CommodityId, Holding>
    markets: Record<CommodityId, MarketState>
    factories: Record<FactoryId, number>
    ownedUpgrades: UpgradeId[]
    unlockedCommodities: CommodityId[]
    unlockedPhases: number[]
    influenceCooldowns: Record<InfluenceId, number>
    limitOrders: LimitOrder[]
    currentNews: string
    upcomingEvent: MarketEventDef | null
    popupLevel: number
}

export interface LimitOrder {
    commodityId: CommodityId
    targetPrice: number
    quantity: number
}

export interface TradeResult {
    commodityId: CommodityId
    action: "buy" | "sell"
    quantity: number
    pricePerUnit: number
    totalCost: number
}

// ── Phase 6: Structured Products Desk ────────────────────────────────────────

export type CreditRating = "F" | "D" | "C" | "B" | "A" | "AA" | "AAA"

export const CREDIT_RATING_SCALE: CreditRating[] = [
    "F",
    "D",
    "C",
    "B",
    "A",
    "AA",
    "AAA",
]

/** Digital Asset Security: commodity units locked to generate passive yield. */
export interface DigitalAssetSecurity {
    id: string
    commodityId: CommodityId
    lockedQuantity: number
    /** Price at time of securitization (default threshold = 50% of this). */
    securitizationPrice: number
    /** Tick when created (for tracking). */
    createdAtTick: number
    /** Status: performing = yielding, defaulted = dead. */
    status: "performing" | "defaulted"
}

export const PHASE_6_GATE = { prestigeCount: 3, level: 15 } as const

/** Base yield per unit per tick (before rating multiplier). */
export const DAS_BASE_YIELD = 0.002
/** Yield diminishes by this factor for each additional DAS of the same commodity. */
export const DAS_SAME_COMMODITY_DECAY = 0.7
/** DAS defaults when commodity price drops below this fraction of securitization price. */
export const DAS_DEFAULT_THRESHOLD = 0.5
/** Max active DAS positions (base; can be expanded via prestige/ascension). */
export const DAS_MAX_POSITIONS = 8
/** Min commodity units to securitize. */
export const DAS_MIN_QUANTITY = 10

/** Credit rating -> DAS yield multiplier. */
export const RATING_YIELD_MULT: Record<CreditRating, number> = {
    F: 0.5,
    D: 0.65,
    C: 1.0,
    B: 1.2,
    A: 1.5,
    AA: 1.75,
    AAA: 2.0,
}

/** Credit rating -> max leverage ratio (borrow limit = portfolioValue * ratio). */
export const RATING_LEVERAGE_RATIO: Record<CreditRating, number> = {
    F: 0.3,
    D: 0.4,
    C: 0.5,
    B: 0.6,
    A: 0.8,
    AA: 1.0,
    AAA: 1.2,
}

/** Credit rating -> interest rate per tick (as a decimal fraction). */
export const RATING_INTEREST_RATE: Record<CreditRating, number> = {
    F: 0.0015,
    D: 0.001,
    C: 0.0005,
    B: 0.0004,
    A: 0.0002,
    AA: 0.00015,
    AAA: 0.0001,
}

/** Margin call fires when debt / portfolioValue exceeds this. */
export const MARGIN_CALL_THRESHOLD = 0.9
/** Rating review happens every N ticks. */
export const RATING_REVIEW_INTERVAL = 50
/** Debt-to-asset ratio below this improves rating. */
export const RATING_IMPROVE_RATIO = 0.3
/** Debt-to-asset ratio above this for 50+ ticks degrades rating. */
export const RATING_DEGRADE_RATIO = 0.6
/** Ticks of high-ratio before degradation. */
export const RATING_DEGRADE_TICKS = 50
/** No defaults in this many ticks = eligible for upgrade. */
export const RATING_NO_DEFAULT_WINDOW = 200
/** DAS across this many commodity types = diversified for rating upgrade. */
export const RATING_DIVERSIFICATION_MIN = 3

export interface CreditFacilityState {
    outstandingDebt: number
    totalInterestPaid: number
}

export interface DeskSaveData {
    securities: DigitalAssetSecurity[]
    creditRating: CreditRating
    facility: CreditFacilityState
    ticksSinceLastDefault: number
    ticksAboveDegradeRatio: number
    /** For margin-survivor achievement tracking. */
    marginEventTick: number
    ratingAtMarginEvent: CreditRating
}

export interface TrendScheduleSaveData {
    queue: TrendSegment[]
    history: TrendSegment[]
    /** The currently active segment (partially consumed). */
    currentSegment: TrendSegment
    /** How many ticks have elapsed in the current segment. */
    currentTicksElapsed: number
}

export interface MarketSaveData {
    cash: number
    lifetimeEarnings: number
    holdings: Record<string, Holding>
    factories: Record<string, number>
    ownedUpgrades: UpgradeId[]
    unlockedCommodities: CommodityId[]
    unlockedPhases: number[]
    limitOrders: LimitOrder[]
    popupLevel: number
    /** Total harvest clicks (for achievements / stats) */
    totalHarvests?: number
    /** Phase 5: HR org chart data (optional for backward compat) */
    orgChart?: OrgChartSaveData
    /** Phase 6: Structured Products Desk */
    desk?: DeskSaveData
    /** Pre-generated trend schedules per commodity (deterministic across save/load). */
    trendSchedules?: Record<string, TrendScheduleSaveData>
    // Legacy Phase 6 fields (ignored on load, kept for migration safety)
    ipoHistory?: unknown[]
    indexFunds?: unknown[]
    shortPositions?: unknown[]
    ipoUsedThisPrestige?: boolean
}
