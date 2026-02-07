export type { CommodityDef, CommodityId } from "./commodities"
export { COMMODITIES } from "./commodities"
export {
    BULK_ORDER_QUANTITY,
    CORNER_MARKET_FLOAT,
    CORNER_MARKET_PRICE_BOOST,
    CORNER_MARKET_THRESHOLD,
    EVENT_MAX_TICKS,
    EVENT_MIN_TICKS,
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
import type { UpgradeId } from "./upgrades"

export type TrendDirection = "bull" | "bear" | "flat"

export interface MarketState {
    commodityId: CommodityId
    price: number
    trend: TrendDirection
    trendStrength: number
    trendTicksRemaining: number
    priceHistory: number[]
    influenceMultiplier: number
    influenceTicksRemaining: number
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
}
