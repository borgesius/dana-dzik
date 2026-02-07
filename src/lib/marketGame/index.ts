import { MarketEngine } from "./MarketEngine"

export type { ChartOptions } from "./ChartRenderer"
export { ChartRenderer } from "./ChartRenderer"
export { MarketEngine } from "./MarketEngine"
export type {
    CommodityDef,
    CommodityId,
    FactoryDef,
    FactoryId,
    GameEventCallback,
    GameEventType,
    GameSnapshot,
    Holding,
    InfluenceDef,
    InfluenceId,
    LimitOrder,
    MarketEventDef,
    MarketSaveData,
    MarketState,
    TradeResult,
    TrendDirection,
    UpgradeCategory,
    UpgradeDef,
    UpgradeId,
} from "./types"
export {
    BULK_ORDER_QUANTITY,
    COMMODITIES,
    CORNER_MARKET_FLOAT,
    CORNER_MARKET_THRESHOLD,
    FACTORIES,
    FACTORY_COST_SCALING,
    INFLUENCES,
    MARKET_EVENTS,
    PHASE_THRESHOLDS,
    POPUP_THRESHOLDS,
    SeededRng,
    STARTING_CASH,
    TICK_INTERVAL_MS,
    UPGRADES,
} from "./types"

let gameInstance: MarketEngine | null = null

export function getMarketGame(): MarketEngine {
    if (!gameInstance) {
        gameInstance = new MarketEngine()
        gameInstance.start()
    }
    return gameInstance
}
