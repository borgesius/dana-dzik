import type { BossId, FactionId, RelicId } from "./types"

// ── Relic types ──────────────────────────────────────────────────────────────

export type RelicTier = "common" | "rare" | "legendary" | "secret"

export type RelicEffectType =
    | "atkFront" // +ATK to front-line unit at combat start
    | "scrapPerRound" // +scrap each round
    | "freeReroll" // +free rerolls per shop phase
    | "hpAll" // +HP to all units at combat start
    | "onAllyDeathAtkAll" // allies gain ATK when an ally dies
    | "scrapOnLoss" // bonus scrap after losing a combat
    | "shieldAll" // all units start combat with shield
    | "healAfterCombat" // heal survivors after combat
    | "onAbilityAtkAlly" // random ally gains ATK when an ability fires
    | "multiFactionBonus" // bonus stats when lineup has 2+ factions
    | "extraShopSlot" // shop offers +1 extra unit
    | "healCombatStart" // heal all units at combat start
    | "permanentGrowth" // random unit gains permanent +1/+1 on victory
    | "extraLife" // +1 extra life before run ends
    | "resummonOnDeath" // chance to resummon dead unit
    | "passiveRoundDamage" // deal damage to all enemies each combat round
    | "tier1Boost" // buff all tier 1 units
    | "factionBonusPlus" // faction bonuses count +1 extra ally
    | "randomAllyAtkCombatStart" // random ally gains ATK before combat
    | "majorityFactionReroll" // rerolls weighted to majority faction
    | "inheritAtkOnFrontDeath" // next unit inherits ATK when front dies
    | "reduceBridgeRequirement" // cross-faction bridge needs 1 fewer ally
    | "scrapOnSkipBuy" // gain scrap when buying nothing in shop
    | "startWithRelicsMinusLife" // start run with relics but fewer lives

export interface RelicEffect {
    type: RelicEffectType
    amount?: number
    /** Chance (0-1) for probabilistic effects like resummon */
    chance?: number
}

export interface RelicUnlockCondition {
    type:
        | "default"
        | "reachRound"
        | "defeatAnyBoss"
        | "defeatBoss"
        | "completeFaction"
        | "multiFactionWin"
        | "completedRuns"
        | "totalUnitsBought"
        | "frontDiedAndWin"
        | "allFactionsInLineup"
        | "lowSpendRun"
        | "holdNRelics"
        | "majorityDriftersRound"
        | "allBossesSingleRun"
    round?: number
    bossId?: BossId
    faction?: FactionId
    count?: number
}

export interface RelicDef {
    id: RelicId
    tier: RelicTier
    effect: RelicEffect
    unlockCondition: RelicUnlockCondition
}

// ── Relic catalog ────────────────────────────────────────────────────────────

export const RELIC_DEFS: RelicDef[] = [
    // ── Common (6) ──────────────────────────────────────────────────────────
    {
        id: "aletheia",
        tier: "common",
        effect: { type: "atkFront", amount: 2 },
        unlockCondition: { type: "default" },
    },
    {
        id: "wuji",
        tier: "common",
        effect: { type: "scrapPerRound", amount: 1 },
        unlockCondition: { type: "default" },
    },
    {
        id: "shoshin",
        tier: "common",
        effect: { type: "freeReroll", amount: 1 },
        unlockCondition: { type: "default" },
    },
    {
        id: "golden-mean",
        tier: "common",
        effect: { type: "hpAll", amount: 4 },
        unlockCondition: { type: "default" },
    },
    {
        id: "ubuntu",
        tier: "common",
        effect: { type: "onAllyDeathAtkAll", amount: 1 },
        unlockCondition: { type: "reachRound", round: 4 },
    },
    {
        id: "amor-fati",
        tier: "common",
        effect: { type: "scrapOnLoss", amount: 3 },
        unlockCondition: { type: "reachRound", round: 6 },
    },

    // ── Rare (7) ────────────────────────────────────────────────────────────
    {
        id: "uncarved-block",
        tier: "rare",
        effect: { type: "shieldAll", amount: 3 },
        unlockCondition: { type: "defeatAnyBoss" },
    },
    {
        id: "ibn-rushds-mirror",
        tier: "rare",
        effect: { type: "healAfterCombat", amount: 3 },
        unlockCondition: { type: "reachRound", round: 10 },
    },
    {
        id: "pratityasamutpada",
        tier: "rare",
        effect: { type: "onAbilityAtkAlly", amount: 1 },
        unlockCondition: { type: "defeatBoss", bossId: "boss-automaton" },
    },
    {
        id: "maat",
        tier: "rare",
        effect: { type: "multiFactionBonus", amount: 2 },
        unlockCondition: { type: "multiFactionWin", count: 3 },
    },
    {
        id: "tabula-rasa",
        tier: "rare",
        effect: { type: "extraShopSlot", amount: 1 },
        unlockCondition: { type: "defeatBoss", bossId: "boss-noumenon" },
    },
    {
        id: "tetrapharmakos",
        tier: "rare",
        effect: { type: "healCombatStart", amount: 2 },
        unlockCondition: { type: "completeFaction", faction: "deputies" },
    },
    {
        id: "yi-jing-trigram",
        tier: "rare",
        effect: { type: "permanentGrowth", amount: 1 },
        unlockCondition: { type: "completeFaction", faction: "clockwork" },
    },

    // ── Legendary (5) ───────────────────────────────────────────────────────
    {
        id: "eternal-return",
        tier: "legendary",
        effect: { type: "extraLife", amount: 1 },
        unlockCondition: { type: "reachRound", round: 20 },
    },
    {
        id: "metempsychosis",
        tier: "legendary",
        effect: { type: "resummonOnDeath", chance: 0.25 },
        unlockCondition: { type: "completeFaction", faction: "prospectors" },
    },
    {
        id: "wu-wei",
        tier: "legendary",
        effect: { type: "passiveRoundDamage", amount: 1 },
        unlockCondition: { type: "completeFaction", faction: "quickdraw" },
    },
    {
        id: "philosophers-stone",
        tier: "legendary",
        effect: { type: "tier1Boost", amount: 3 },
        unlockCondition: { type: "majorityDriftersRound", round: 15 },
    },
    {
        id: "indras-net",
        tier: "legendary",
        effect: { type: "factionBonusPlus", amount: 1 },
        unlockCondition: { type: "allBossesSingleRun" },
    },

    // ── Secret / Fun (6) ────────────────────────────────────────────────────
    {
        id: "rubber-duck",
        tier: "secret",
        effect: { type: "randomAllyAtkCombatStart", amount: 3 },
        unlockCondition: { type: "completedRuns", count: 20 },
    },
    {
        id: "loaded-dice",
        tier: "secret",
        effect: { type: "majorityFactionReroll" },
        unlockCondition: { type: "totalUnitsBought", count: 50 },
    },
    {
        id: "newtons-cradle",
        tier: "secret",
        effect: { type: "inheritAtkOnFrontDeath", amount: 50 },
        unlockCondition: { type: "frontDiedAndWin" },
    },
    {
        id: "rosetta-stone",
        tier: "secret",
        effect: { type: "reduceBridgeRequirement", amount: 1 },
        unlockCondition: { type: "allFactionsInLineup" },
    },
    {
        id: "maxwells-demon",
        tier: "secret",
        effect: { type: "scrapOnSkipBuy", amount: 2 },
        unlockCondition: { type: "lowSpendRun", count: 20 },
    },
    {
        id: "pandoras-box",
        tier: "secret",
        effect: { type: "startWithRelicsMinusLife", amount: 2 },
        unlockCondition: { type: "holdNRelics", count: 6 },
    },
]

export const RELIC_MAP: ReadonlyMap<RelicId, RelicDef> = new Map(
    RELIC_DEFS.map((r) => [r.id, r])
)

// ── Helper functions ─────────────────────────────────────────────────────────

/** Filter the catalog to only relics the player has permanently unlocked */
export function getUnlockedRelicDefs(unlockedRelicIds: Set<RelicId>): RelicDef[] {
    return RELIC_DEFS.filter((r) => unlockedRelicIds.has(r.id))
}

/** Pick `count` random relics from a pool, avoiding duplicates and already-held relics */
export function rollRelicChoices(
    pool: RelicDef[],
    count: number,
    heldRelicIds: Set<RelicId> = new Set()
): RelicDef[] {
    const available = pool.filter((r) => !heldRelicIds.has(r.id))
    const shuffled = [...available].sort(() => Math.random() - 0.5)
    return shuffled.slice(0, count)
}

/** Get all relic IDs that should be unlocked by default */
export function getDefaultUnlockedRelicIds(): RelicId[] {
    return RELIC_DEFS.filter((r) => r.unlockCondition.type === "default").map(
        (r) => r.id
    )
}

/**
 * Check how many relics of a given tier exist in total.
 */
export function getRelicCountByTier(tier: RelicTier): number {
    return RELIC_DEFS.filter((r) => r.tier === tier).length
}
