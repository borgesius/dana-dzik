// ---------------------------------------------------------------------------
// Seeded RNG
// ---------------------------------------------------------------------------

export class SeededRng {
    private state: number

    constructor(seed?: number) {
        this.state = seed ?? (Math.random() * 2147483647) | 0
        if (this.state <= 0) this.state = 1
    }

    public next(): number {
        this.state = (this.state * 16807) % 2147483647
        return (this.state - 1) / 2147483646
    }

    public nextInt(min: number, max: number): number {
        return Math.floor(this.next() * (max - min + 1)) + min
    }
}

// ---------------------------------------------------------------------------
// Commodity
// ---------------------------------------------------------------------------

export type CommodityId = "EMAIL" | "ADS" | "DOM" | "BW" | "SOFT" | "VC"

export interface CommodityDef {
    id: CommodityId
    name: string
    description: string
    basePrice: number
    volatility: number
    unlockThreshold: number
}

export const COMMODITIES: CommodityDef[] = [
    {
        id: "EMAIL",
        name: "Email Databases",
        description: "Verified opt-in addresses. Updated daily.",
        basePrice: 0.05,
        volatility: 0.08,
        unlockThreshold: 0,
    },
    {
        id: "ADS",
        name: "Banner Impressions",
        description: "Premium 468x60 ad placements.",
        basePrice: 0.25,
        volatility: 0.065,
        unlockThreshold: 0,
    },
    {
        id: "DOM",
        name: ".com Domains",
        description: "Pre-registered premium domain names.",
        basePrice: 2.0,
        volatility: 0.05,
        unlockThreshold: 10,
    },
    {
        id: "BW",
        name: "Bandwidth",
        description: "Dedicated T1 line capacity. 1.544 Mbps.",
        basePrice: 8.0,
        volatility: 0.035,
        unlockThreshold: 50,
    },
    {
        id: "SOFT",
        name: "Software Licenses",
        description: "Enterprise volume licensing. Shrinkwrap ready.",
        basePrice: 25.0,
        volatility: 0.025,
        unlockThreshold: 250,
    },
    {
        id: "VC",
        name: "Venture Capital",
        description: "Pre-IPO investment securities. Limited availability.",
        basePrice: 100.0,
        volatility: 0.1,
        unlockThreshold: 2000,
    },
]

// ---------------------------------------------------------------------------
// Market state per commodity
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Portfolio
// ---------------------------------------------------------------------------

export interface Holding {
    quantity: number
    totalCost: number
}

// ---------------------------------------------------------------------------
// Factories
// ---------------------------------------------------------------------------

export type FactoryId =
    | "list-builder"
    | "banner-exchange"
    | "colocation-rack"
    | "offshore-dev"

export interface FactoryDef {
    id: FactoryId
    name: string
    description: string
    produces: CommodityId
    cost: number
    minOutput: number
    maxOutput: number
    ticksPerCycle: number
    conversionInput?: { commodity: CommodityId; quantity: number }
}

export const FACTORY_COST_SCALING = 1.15

export const FACTORIES: FactoryDef[] = [
    {
        id: "list-builder",
        name: "Automated List Builder",
        description:
            "Harvests verified email addresses 24/7. Results may vary.",
        produces: "EMAIL",
        cost: 3,
        minOutput: 0,
        maxOutput: 3,
        ticksPerCycle: 1,
    },
    {
        id: "banner-exchange",
        name: "Banner Exchange",
        description:
            "Rotating ad network. Impressions generated automatically.",
        produces: "ADS",
        cost: 8,
        minOutput: 0,
        maxOutput: 3,
        ticksPerCycle: 2,
        conversionInput: { commodity: "EMAIL", quantity: 5 },
    },
    {
        id: "colocation-rack",
        name: "Co-Location Rack",
        description: "Dedicated server hosting. Uptime not guaranteed.",
        produces: "BW",
        cost: 80,
        minOutput: 0,
        maxOutput: 1,
        ticksPerCycle: 3,
        conversionInput: { commodity: "ADS", quantity: 10 },
    },
    {
        id: "offshore-dev",
        name: "Offshore Dev Team",
        description: "24-hour development cycle. Quality assurance pending.",
        produces: "SOFT",
        cost: 200,
        minOutput: 0,
        maxOutput: 1,
        ticksPerCycle: 5,
        conversionInput: { commodity: "BW", quantity: 3 },
    },
]

// ---------------------------------------------------------------------------
// Upgrades
// ---------------------------------------------------------------------------

export type UpgradeId =
    | "bulk-orders"
    | "limit-orders"
    | "trend-analysis"
    | "cpu-overclock"
    | "quality-assurance"
    | "supply-chain"
    | "insider-newsletter"
    | "analyst-reports"
    | "moving-average"

export type UpgradeCategory = "trading" | "production" | "intelligence"

export interface UpgradeDef {
    id: UpgradeId
    name: string
    description: string
    category: UpgradeCategory
    cost: number
}

export const UPGRADES: UpgradeDef[] = [
    {
        id: "bulk-orders",
        name: "Bulk Order Processing",
        description: "Execute trades in quantities of 10.",
        category: "trading",
        cost: 20,
    },
    {
        id: "limit-orders",
        name: "Limit Order System",
        description: "Set a target price. Holdings sold automatically.",
        category: "trading",
        cost: 40,
    },
    {
        id: "trend-analysis",
        name: "Trend Analysis Package",
        description: "Directional indicators overlaid on price charts.",
        category: "trading",
        cost: 30,
    },
    {
        id: "cpu-overclock",
        name: "CPU Overclock",
        description: "Increase production cycle speed. May cause instability.",
        category: "production",
        cost: 50,
    },
    {
        id: "quality-assurance",
        name: "Quality Assurance",
        description: "Reduce output variance. Minimum yield guaranteed.",
        category: "production",
        cost: 60,
    },
    {
        id: "supply-chain",
        name: "Supply Chain Integration",
        description: "Convert surplus commodities into premium goods.",
        category: "production",
        cost: 80,
    },
    {
        id: "insider-newsletter",
        name: "Insider Newsletter",
        description:
            "Advance notice of market-moving events. 10 second lead time.",
        category: "intelligence",
        cost: 45,
    },
    {
        id: "analyst-reports",
        name: "Analyst Reports",
        description: "Numerical trend strength indicators.",
        category: "intelligence",
        cost: 35,
    },
    {
        id: "moving-average",
        name: "Moving Average Overlay",
        description: "Technical analysis tools for price chart.",
        category: "intelligence",
        cost: 25,
    },
]

// ---------------------------------------------------------------------------
// Market Influence
// ---------------------------------------------------------------------------

export type InfluenceId = "promo-campaign" | "negative-press" | "pump-and-dump"

export interface InfluenceDef {
    id: InfluenceId
    name: string
    description: string
    cashCost: number
    commodityCosts: Partial<Record<CommodityId, number>>
    priceEffect: number
    durationTicks: number
    cooldownMs: number
}

export const INFLUENCES: InfluenceDef[] = [
    {
        id: "promo-campaign",
        name: "Promotional Campaign",
        description: "Generate artificial demand for selected commodity.",
        cashCost: 25,
        commodityCosts: { ADS: 30 },
        priceEffect: 0.4,
        durationTicks: 12,
        cooldownMs: 90000,
    },
    {
        id: "negative-press",
        name: "Negative Press Release",
        description: "Temporarily depress market value of target commodity.",
        cashCost: 25,
        commodityCosts: { EMAIL: 15 },
        priceEffect: -0.3,
        durationTicks: 12,
        cooldownMs: 90000,
    },
    {
        id: "pump-and-dump",
        name: "Pump and Dump",
        description: "Coordinated price inflation with automated liquidation.",
        cashCost: 50,
        commodityCosts: { ADS: 20, EMAIL: 40 },
        priceEffect: 0.6,
        durationTicks: 6,
        cooldownMs: 180000,
    },
]

// ---------------------------------------------------------------------------
// Market cornering
// ---------------------------------------------------------------------------

export const CORNER_MARKET_FLOAT = 200
export const CORNER_MARKET_THRESHOLD = 0.5
export const CORNER_MARKET_PRICE_BOOST = 0.02

// ---------------------------------------------------------------------------
// News events
// ---------------------------------------------------------------------------

export type EventEffect = "bullish" | "bearish" | "flavor"

export interface MarketEventDef {
    text: string
    effect: EventEffect
    targetCommodity?: CommodityId
    magnitude?: number
}

export const MARKET_EVENTS: MarketEventDef[] = [
    // Bullish
    {
        text: "ADVISORY: Email database demand forecast revised upward for Q4",
        effect: "bullish",
        targetCommodity: "EMAIL",
        magnitude: 0.25,
    },
    {
        text: "REPORT: Independent analysts rate .com Domains a STRONG BUY",
        effect: "bullish",
        targetCommodity: "DOM",
        magnitude: 0.3,
    },
    {
        text: "BREAKING: Major corporation announces Bandwidth acquisition plan",
        effect: "bullish",
        targetCommodity: "BW",
        magnitude: 0.2,
    },
    {
        text: "PRESS RELEASE: Government contract awarded for Software procurement",
        effect: "bullish",
        targetCommodity: "SOFT",
        magnitude: 0.2,
    },
    {
        text: "NOTICE: Domain name registrations exceed 2 million. Supply limited.",
        effect: "bullish",
        targetCommodity: "DOM",
        magnitude: 0.2,
    },
    {
        text: "MARKET UPDATE: Bandwidth supply shortage reported by distributors",
        effect: "bullish",
        targetCommodity: "BW",
        magnitude: 0.25,
    },
    {
        text: "BULLETIN: Venture Capital fundraising up 200% quarter-over-quarter",
        effect: "bullish",
        targetCommodity: "VC",
        magnitude: 0.35,
    },
    {
        text: "ADVISORY: Email list quality standards tightened. Premium lists in demand.",
        effect: "bullish",
        targetCommodity: "EMAIL",
        magnitude: 0.2,
    },
    {
        text: "REPORT: Banner ad click-through rates surpass industry projections",
        effect: "bullish",
        targetCommodity: "ADS",
        magnitude: 0.25,
    },
    {
        text: "BREAKING: Y2K compliance drives enterprise software demand",
        effect: "bullish",
        targetCommodity: "SOFT",
        magnitude: 0.25,
    },
    // Bearish
    {
        text: "WARNING: Banner Impression oversupply detected in secondary markets",
        effect: "bearish",
        targetCommodity: "ADS",
        magnitude: 0.25,
    },
    {
        text: "NOTICE: Regulatory review announced for Venture Capital trading",
        effect: "bearish",
        targetCommodity: "VC",
        magnitude: 0.3,
    },
    {
        text: "ALERT: Software License quality concerns raised by industry watchdog",
        effect: "bearish",
        targetCommodity: "SOFT",
        magnitude: 0.2,
    },
    {
        text: "UPDATE: Major Bandwidth supplier announces price reduction",
        effect: "bearish",
        targetCommodity: "BW",
        magnitude: 0.2,
    },
    {
        text: "BULLETIN: Consumer demand for .com Domains below seasonal expectations",
        effect: "bearish",
        targetCommodity: "DOM",
        magnitude: 0.2,
    },
    {
        text: "ADVISORY: Email database accuracy rates under investigation",
        effect: "bearish",
        targetCommodity: "EMAIL",
        magnitude: 0.25,
    },
    {
        text: "REPORT: Banner ad click-through rates declining industry-wide",
        effect: "bearish",
        targetCommodity: "ADS",
        magnitude: 0.2,
    },
    {
        text: "WARNING: Offshore development firms under regulatory scrutiny",
        effect: "bearish",
        targetCommodity: "SOFT",
        magnitude: 0.15,
    },
    {
        text: "ALERT: Domain name speculation bubble concerns raised by analysts",
        effect: "bearish",
        targetCommodity: "DOM",
        magnitude: 0.25,
    },
    {
        text: "NOTICE: SEC opens inquiry into Venture Capital fund practices",
        effect: "bearish",
        targetCommodity: "VC",
        magnitude: 0.35,
    },
    // Flavor (no price effect)
    {
        text: "SYSTEM: Market terminal connection stable. 28.8 kbps.",
        effect: "flavor",
    },
    {
        text: "REMINDER: Past performance does not guarantee future results.",
        effect: "flavor",
    },
    {
        text: "NOTICE: Trading hours extended through midnight EST.",
        effect: "flavor",
    },
    {
        text: "SYSTEM: Price data refreshed. Connection OK.",
        effect: "flavor",
    },
    {
        text: "DISCLAIMER: This terminal is provided as-is. No warranty expressed or implied.",
        effect: "flavor",
    },
    {
        text: "TIP: Diversified portfolios reduce exposure to market volatility.",
        effect: "flavor",
    },
]

// ---------------------------------------------------------------------------
// Phase unlock thresholds
// ---------------------------------------------------------------------------

export const PHASE_THRESHOLDS = {
    factories: 5,
    upgrades: 150,
    influence: 750,
} as const

// ---------------------------------------------------------------------------
// Popup thresholds (adapted from old game)
// ---------------------------------------------------------------------------

export const POPUP_THRESHOLDS = [
    { threshold: 1, level: 1 },
    { threshold: 10, level: 2 },
    { threshold: 50, level: 3 },
]

// ---------------------------------------------------------------------------
// Timing constants
// ---------------------------------------------------------------------------

export const TICK_INTERVAL_MS = 2500
export const TREND_MIN_TICKS = 12
export const TREND_MAX_TICKS = 36
export const EVENT_MIN_TICKS = 8
export const EVENT_MAX_TICKS = 24
export const PRICE_HISTORY_LENGTH = 120
export const PRICE_FLOOR_FACTOR = 0.1
export const PRICE_CEILING_FACTOR = 20
export const MEAN_REVERSION_STRENGTH = 0.005

export const STARTING_CASH = 0.1
export const BULK_ORDER_QUANTITY = 10

// ---------------------------------------------------------------------------
// Event types for the engine
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Game state snapshot (for UI)
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Serializable save data (player progress only, not volatile market state)
// ---------------------------------------------------------------------------

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
