import type { CommodityId } from "./commodities"

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
