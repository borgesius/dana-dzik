import type { CommodityId } from "./commodities"

export type EventEffect =
    | "bullish"
    | "bearish"
    | "flavor"
    | "mega-bullish"
    | "mega-bearish"

export interface MarketEventDef {
    text: string
    effect: EventEffect
    targetCommodity?: CommodityId
    /** Additional commodities affected (for mega events). */
    secondaryCommodity?: CommodityId
    magnitude?: number
    /** Duration multiplier (events last longer/shorter). Default 1. */
    durationMultiplier?: number
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
    {
        text: "SYSTEM: Stable connection maintained. All systems operational.",
        effect: "flavor",
    },
    {
        text: "TIP: Strong bonds yield better returns.",
        effect: "flavor",
    },
    {
        text: "NOTICE: Adhesive futures trading volume up 15% quarter-over-quarter.",
        effect: "flavor",
    },

    // ── Livestock & Glue events ─────────────────────────────────────────────
    {
        text: "ADVISORY: Livestock futures surge on record export deal with Pacific Rim",
        effect: "bullish",
        targetCommodity: "LIVE",
        magnitude: 0.25,
    },
    {
        text: "REPORT: Cattle ranching subsidies expanded. Livestock supply costs drop.",
        effect: "bullish",
        targetCommodity: "LIVE",
        magnitude: 0.2,
    },
    {
        text: "BREAKING: Industrial adhesive demand booms amid construction surge",
        effect: "bullish",
        targetCommodity: "GLUE",
        magnitude: 0.25,
    },
    {
        text: "MARKET UPDATE: Glue stockpiles at historic lows. Buyers scramble.",
        effect: "bullish",
        targetCommodity: "GLUE",
        magnitude: 0.3,
    },
    {
        text: "WARNING: Mad cow scare tanks livestock markets across all exchanges",
        effect: "bearish",
        targetCommodity: "LIVE",
        magnitude: 0.3,
    },
    {
        text: "ALERT: Livestock feed costs spike. Ranchers report negative margins.",
        effect: "bearish",
        targetCommodity: "LIVE",
        magnitude: 0.2,
    },
    {
        text: "NOTICE: Synthetic alternatives threaten traditional glue market share",
        effect: "bearish",
        targetCommodity: "GLUE",
        magnitude: 0.25,
    },
    {
        text: "UPDATE: EPA regulations target rendering plant emissions. GLUE output falls.",
        effect: "bearish",
        targetCommodity: "GLUE",
        magnitude: 0.2,
    },

    // ── New bullish events ──────────────────────────────────────────────────
    {
        text: "BREAKING: Bandwidth infrastructure bill passes. ISP capacity doubled.",
        effect: "bullish",
        targetCommodity: "BW",
        magnitude: 0.35,
    },
    {
        text: "REPORT: VC-backed startups achieve record profitability ratios",
        effect: "bullish",
        targetCommodity: "VC",
        magnitude: 0.25,
    },
    {
        text: "ADVISORY: Enterprise software migration wave creates supply crunch",
        effect: "bullish",
        targetCommodity: "SOFT",
        magnitude: 0.3,
    },
    {
        text: "MARKET UPDATE: Premium .com domains appreciate 40% year-over-year",
        effect: "bullish",
        targetCommodity: "DOM",
        magnitude: 0.3,
    },
    {
        text: "BULLETIN: Programmatic ad exchanges report record CPM rates",
        effect: "bullish",
        targetCommodity: "ADS",
        magnitude: 0.2,
    },
    {
        text: "NOTICE: Email marketing ROI outpaces all digital channels",
        effect: "bullish",
        targetCommodity: "EMAIL",
        magnitude: 0.3,
    },
    {
        text: "REPORT: Bandwidth futures contract trading volume hits all-time high",
        effect: "bullish",
        targetCommodity: "BW",
        magnitude: 0.2,
    },

    // ── New bearish events ──────────────────────────────────────────────────
    {
        text: "ALERT: VC funding winter deepens. Series A deal volume plummets.",
        effect: "bearish",
        targetCommodity: "VC",
        magnitude: 0.3,
    },
    {
        text: "WARNING: Open-source alternatives eroding Software License demand",
        effect: "bearish",
        targetCommodity: "SOFT",
        magnitude: 0.25,
    },
    {
        text: "NOTICE: Bandwidth oversupply as fiber rollout accelerates globally",
        effect: "bearish",
        targetCommodity: "BW",
        magnitude: 0.25,
    },
    {
        text: "UPDATE: Ad blockers reach 60% market penetration. ADS inventory questioned.",
        effect: "bearish",
        targetCommodity: "ADS",
        magnitude: 0.3,
    },
    {
        text: "ADVISORY: ICANN policy changes flood market with new domain TLDs",
        effect: "bearish",
        targetCommodity: "DOM",
        magnitude: 0.2,
    },
    {
        text: "REPORT: CAN-SPAM enforcement action targets bulk email operators",
        effect: "bearish",
        targetCommodity: "EMAIL",
        magnitude: 0.3,
    },
    {
        text: "WARNING: Venture capital exits hit decade low. LP confidence shaken.",
        effect: "bearish",
        targetCommodity: "VC",
        magnitude: 0.25,
    },
    {
        text: "ALERT: Enterprise software budget freeze announced by Fortune 500 consortium",
        effect: "bearish",
        targetCommodity: "SOFT",
        magnitude: 0.2,
    },

    // ── Mega events (affect 2+ commodities) ─────────────────────────────────
    {
        text: "BREAKING: Dot-com boom declared. Tech sector rallies across all commodities.",
        effect: "mega-bullish",
        targetCommodity: "DOM",
        secondaryCommodity: "VC",
        magnitude: 0.4,
        durationMultiplier: 1.5,
    },
    {
        text: "CRISIS: Market-wide liquidity crunch. All trading desks report losses.",
        effect: "mega-bearish",
        targetCommodity: "VC",
        secondaryCommodity: "SOFT",
        magnitude: 0.35,
        durationMultiplier: 1.5,
    },
    {
        text: "BREAKING: Digital infrastructure spending surge. Bandwidth and Software soar.",
        effect: "mega-bullish",
        targetCommodity: "BW",
        secondaryCommodity: "SOFT",
        magnitude: 0.35,
        durationMultiplier: 1.3,
    },
    {
        text: "ALERT: Digital advertising recession. Ad and Email markets collapse together.",
        effect: "mega-bearish",
        targetCommodity: "ADS",
        secondaryCommodity: "EMAIL",
        magnitude: 0.3,
        durationMultiplier: 1.3,
    },
    {
        text: "BREAKING: Agricultural-industrial complex booms. Livestock and Glue markets rally.",
        effect: "mega-bullish",
        targetCommodity: "LIVE",
        secondaryCommodity: "GLUE",
        magnitude: 0.35,
        durationMultiplier: 1.3,
    },

    // ── More flavor events ──────────────────────────────────────────────────
    {
        text: "SYSTEM: Upgrading to 56k modem. Connection quality improving.",
        effect: "flavor",
    },
    {
        text: "TIP: The best time to invest was yesterday. The second best time is now.",
        effect: "flavor",
    },
    {
        text: "NOTICE: Market maker spread tightening initiative in effect.",
        effect: "flavor",
    },
    {
        text: "REMINDER: Always read the prospectus before investing.",
        effect: "flavor",
    },
]
