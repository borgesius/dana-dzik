export const CORNER_MARKET_FLOAT = 200
export const CORNER_MARKET_THRESHOLD = 0.5
export const CORNER_MARKET_PRICE_BOOST = 0.02

export const PHASE_THRESHOLDS = {
    factories: 3,
    upgrades: 250,
    influence: 1500,
} as const

export const POPUP_THRESHOLDS = [
    { threshold: 1, level: 1 },
    { threshold: 10, level: 2 },
    { threshold: 50, level: 3 },
]

export const TICK_INTERVAL_MS = 2500
export const TREND_MIN_TICKS = 12
export const TREND_MAX_TICKS = 36
export const EVENT_MIN_TICKS = 8
export const EVENT_MAX_TICKS = 24
export const PRICE_HISTORY_LENGTH = 500
export const PRICE_FLOOR_FACTOR = 0.1
export const PRICE_CEILING_FACTOR = 20
export const MEAN_REVERSION_STRENGTH = 0.005

export const STARTING_CASH = 0.1
export const BULK_ORDER_QUANTITY = 10

/** Fraction of harvestQuantity produced per click at each upgrade tier. */
export const HARVEST_BASE_FRACTION = 0.05
export const HARVEST_UPGRADE_BONUS = 0.45
export const HARVEST_AUTOSCRIPT_BONUS = 0.5
