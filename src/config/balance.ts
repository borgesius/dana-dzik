/**
 * Centralized balance configuration.
 *
 * Re-exports all tunable constants from their source modules and defines
 * test-friendly threshold values for balance invariant assertions.
 */

// ── Progression / XP ─────────────────────────────────────────────────────────

export {
    getAchievementXP,
    levelFromXP,
    XP_REWARDS,
    xpForLevel,
    xpToNextLevel,
} from "../lib/progression/constants"

// ── Autobattler economy ──────────────────────────────────────────────────────

export type { RoundParams } from "../lib/autobattler/opponents"
export { ROUND_PARAMS } from "../lib/autobattler/opponents"
export {
    BUFF_MIN_COST,
    getBuffCost,
    RUN_BUFFS,
} from "../lib/autobattler/runBuffs"
export {
    BASE_LINE_SLOTS,
    INITIAL_SCRAP,
    REROLL_COST,
    SCRAP_PER_ROUND,
    SELL_REFUND_MULT,
    SHOP_SIZE,
} from "../lib/autobattler/shop"
export { ALL_UNITS, UNIT_MAP } from "../lib/autobattler/units"

// ── Prestige ─────────────────────────────────────────────────────────────────

export {
    calculateHindsight,
    HINDSIGHT_UPGRADES,
    PRESTIGE_THRESHOLD,
} from "../lib/prestige/constants"

// ── Career tree ──────────────────────────────────────────────────────────────

export {
    ALL_CAREER_NODES,
    CAREER_NODE_MAP,
    CAREER_SWITCH_LEVEL_PENALTY,
    DORMANT_MULTIPLIER,
} from "../lib/progression/careers"

// ── Market / Idler ───────────────────────────────────────────────────────────

export {
    PHASE_THRESHOLDS,
    STARTING_CASH,
    TICK_INTERVAL_MS,
} from "../lib/marketGame/types"
export { FACTORIES, FACTORY_COST_SCALING } from "../lib/marketGame/types"

// ── Phase 6: Structured Products Desk ────────────────────────────────────

export {
    CREDIT_RATING_SCALE,
    DAS_BASE_YIELD,
    DAS_DEFAULT_THRESHOLD,
    DAS_MAX_POSITIONS,
    DAS_MIN_QUANTITY,
    DAS_SAME_COMMODITY_DECAY,
    MARGIN_CALL_THRESHOLD,
    RATING_DEGRADE_RATIO,
    RATING_DEGRADE_TICKS,
    RATING_DIVERSIFICATION_MIN,
    RATING_IMPROVE_RATIO,
    RATING_INTEREST_RATE,
    RATING_LEVERAGE_RATIO,
    RATING_NO_DEFAULT_WINDOW,
    RATING_REVIEW_INTERVAL,
    RATING_YIELD_MULT,
} from "../lib/marketGame/types"

// ── Achievements ─────────────────────────────────────────────────────────────

export { ACHIEVEMENTS } from "../lib/achievements/definitions"

// ── Offline catchup ──────────────────────────────────────────────────────────

export const CATCHUP = {
    maxOfflineMs: 24 * 60 * 60 * 1000,
    fullEfficiencyMs: 12 * 60 * 60 * 1000,
    minOfflineMs: 30_000,
    productionEfficiency: 0.8,
    decayRate: 3,
} as const

// ── Autobattler run reward constants (from RunManager internals) ─────────

export const AB_REWARDS = {
    winBonusScrap: 2,
    maxLosses: 3,
    /** XP per win = base + round * perRound */
    xpPerWinBase: 15,
    xpPerWinPerRound: 5,
    consolationXP: 5,
    /** Level stat multiplier: L1=1x, L2=1.5x, L3=2x */
    levelStatMult: [1.0, 1.5, 2.0],
} as const

// ── Balance test thresholds ──────────────────────────────────────────────────

/**
 * Tunable thresholds for balance invariant tests.
 * Tests compare computed ratios / values against these to detect imbalances
 * while remaining flexible enough to adjust as design evolves.
 */
export const BALANCE_THRESHOLDS = {
    /** Max ratio of opponent stat budget to player affordable budget per round */
    maxOpponentBudgetRatio: 1.4,
    /** Minimum Hindsight earned at the first prestige threshold */
    minFirstPrestigeHindsight: 5,
    /** Max autobattler runs needed to earn 1 buff (commodity-wise) */
    maxRunsPerBuff: 8,
    /** Minimum fraction of a level's XP a single achievement should grant */
    minAchievementXPFraction: 0.005,
    /** Max stat ratio (ATK/HP) for any unit */
    maxAtkHpRatio: 4,
    /** Same-tier (ATK+HP)/cost must be within this factor of tier median */
    statCostVarianceFactor: 1.5,
} as const
