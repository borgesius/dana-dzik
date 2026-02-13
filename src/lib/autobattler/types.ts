// ── Factions ─────────────────────────────────────────────────────────────────

export type FactionId =
    | "quickdraw"
    | "deputies"
    | "clockwork"
    | "prospectors"
    | "drifters"

/** Advantage cycle: each faction beats the next one in the array (wraps) */
export const FACTION_CYCLE: FactionId[] = [
    "quickdraw",
    "clockwork",
    "deputies",
    "prospectors",
]

/** Cross-aisle partners: non-adjacent factions that form bridge synergies */
export const CROSS_AISLE: Record<FactionId, FactionId> = {
    quickdraw: "deputies",
    deputies: "quickdraw",
    clockwork: "prospectors",
    prospectors: "clockwork",
    drifters: "drifters",
}

// ── Unit IDs ────────────────────────────────────────────────────────────────

export type UnitId =
    // Drifters
    | "drifter-brawler"
    | "drifter-scout"
    | "drifter-medic"
    | "drifter-heavy"
    // Existentialists (Quickdraw)
    | "qd-sharpshooter"
    | "qd-deadeye"
    | "qd-dynamiter"
    | "qd-outlaw"
    | "qd-kingpin"
    | "qd-rifler"
    | "qd-ambusher"
    | "qd-executioner"
    // Idealists (Deputies)
    | "dep-barricader"
    | "dep-marshal"
    | "dep-trapper"
    | "dep-warden"
    | "dep-judge"
    | "dep-sentinel"
    | "dep-field-medic"
    | "dep-fortress"
    // Rationalists (Clockwork)
    | "cw-accumulator"
    | "cw-gearsmith"
    | "cw-tesla-coil"
    | "cw-overcharger"
    | "cw-architect"
    | "cw-amplifier"
    | "cw-disruptor"
    | "cw-detonator"
    // Post-Structuralists (Prospectors)
    | "bp-tunneler"
    | "bp-foreman"
    | "bp-rattler"
    | "bp-necrominer"
    | "bp-patriarch"
    | "bp-revenant"
    | "bp-leech"
    | "bp-sovereign"
    // Tokens
    | "bp-shade"
    // Boss units
    | "boss-gadfly"
    | "boss-noumenon"
    | "boss-automaton"
    | "boss-simulacrum"
    | "boss-absurdist"
    | "boss-phenomenologist"
    | "boss-theodicist"
    | "boss-archivist"
    | "boss-sophist"
    | "boss-dean"
    | "boss-pedagogue"
    | "boss-empiricist"

// ── Boss IDs ────────────────────────────────────────────────────────────────

export type BossId =
    | "boss-gadfly"
    | "boss-noumenon"
    | "boss-automaton"
    | "boss-simulacrum"
    | "boss-absurdist"
    | "boss-phenomenologist"
    | "boss-theodicist"
    | "boss-archivist"
    | "boss-sophist"
    | "boss-dean"
    | "boss-pedagogue"
    | "boss-empiricist"

// ── Relic IDs ───────────────────────────────────────────────────────────────

export type RelicId =
    // Common
    | "aletheia"
    | "wuji"
    | "shoshin"
    | "golden-mean"
    | "ubuntu"
    | "amor-fati"
    // Rare
    | "uncarved-block"
    | "ibn-rushds-mirror"
    | "pratityasamutpada"
    | "maat"
    | "tabula-rasa"
    | "tetrapharmakos"
    | "yi-jing-trigram"
    // Legendary
    | "eternal-return"
    | "metempsychosis"
    | "wu-wei"
    | "philosophers-stone"
    | "indras-net"
    // Secret
    | "rubber-duck"
    | "loaded-dice"
    | "newtons-cradle"
    | "rosetta-stone"
    | "maxwells-demon"
    | "pandoras-box"

// ── Autobattler Event IDs ───────────────────────────────────────────────────

export type EventId =
    | "allegory-of-the-cave"
    | "trolley-problem"
    | "nirvana"
    | "zhuangzis-butterfly"
    | "pascals-wager"
    | "burning-library"
    | "garden-of-forking-paths"
    | "karma"
    | "memento-mori"
    | "the-agora"
    | "diogenes-lantern"
    | "socratic-method"

// ── Boss Modifier IDs ───────────────────────────────────────────────────────

export type BossModifierId =
    | "mod-enraged"
    | "mod-fortified"
    | "mod-inspiring"
    | "mod-armored"
    | "mod-first-blood"
    | "mod-aegis"
    | "mod-overclocked"
    | "mod-swarm-spawn"

// ── Ability triggers ─────────────────────────────────────────────────────────

export type AbilityTrigger =
    | "combatStart"
    | "onFirstAttack"
    | "onTakeDamage"
    | "onDeath"
    | "onAllyDeath"
    | "roundStart"
    | "onDealDamage"
    | "onAllyAbility"
    | "onEnemyEnterFront"

export type AbilityEffect =
    | {
          type: "damage"
          target: "frontEnemy" | "backEnemy" | "randomEnemy" | "allEnemies"
          amount: number
      }
    | {
          type: "buff"
          target: "self" | "allAllies" | "randomAlly"
          stat: "atk" | "hp" | "shield"
          amount: number
      }
    | {
          type: "summon"
          unitId: UnitId
          position: "front" | "back"
          atkBonus?: number
          hpBonus?: number
      }
    | { type: "doubleDamage" }
    | { type: "heal"; target: "self" | "allAllies"; amount: number }

export interface AbilityDef {
    trigger: AbilityTrigger
    effect: AbilityEffect
    description: string
    /** Same-faction scaling: the effect's numeric amount increases per same-faction ally */
    factionBonus?: {
        perAlly: number
    }
    /** Cross-aisle bridge: bonus effect when cross-faction allies are present */
    crossBonus?: {
        faction: FactionId
        minAllies: number
        effect: AbilityEffect
        description: string
    }
}

// ── Unit definitions ─────────────────────────────────────────────────────────

export type UnitTier = 1 | 2 | 3

export interface UnitDef {
    id: UnitId
    name: string
    faction: FactionId
    tier: UnitTier
    baseATK: number
    baseHP: number
    ability: AbilityDef
    /** Scrap cost in the shop */
    shopCost: number
}

// ── Combat state ─────────────────────────────────────────────────────────────

export interface CombatUnit {
    unitDefId: UnitId
    level: number // 1-3 (combine to level up)
    currentATK: number
    currentHP: number
    maxHP: number
    shield: number
    faction: FactionId
    /** Unique instance ID for tracking during combat */
    instanceId: string
    /** Set to true after the first attack (for first-attack triggers) */
    hasAttacked: boolean
}

export interface CombatResult {
    winner: "player" | "opponent" | "draw"
    playerSurvivors: CombatUnit[]
    opponentSurvivors: CombatUnit[]
    rounds: number
    log: CombatLogEntry[]
}

export interface CombatLogEntry {
    round: number
    description: string
}

// ── Relics ───────────────────────────────────────────────────────────────────

export interface RelicInstance {
    relicId: RelicId
    /** Round the relic was acquired */
    acquiredRound: number
}

// ── Events ───────────────────────────────────────────────────────────────────

export interface EventInstance {
    eventId: EventId
    /** Pre-rolled choices for this event presentation */
    choices: EventChoiceInstance[]
}

export interface EventChoiceInstance {
    choiceIndex: number
    label: string
}

// ── Run state ────────────────────────────────────────────────────────────────

export interface RunState {
    round: number
    scrap: number
    lineup: CombatUnit[]
    bench: CombatUnit[]
    wins: number
    losses: number
    phase: "shop" | "arrange" | "combat" | "reward" | "event" | "finished"
    runRewards: RunReward[]
    /** Whether the current round is a boss round */
    isBossRound: boolean
    /** ID of the current boss (if boss round) */
    currentBossId?: BossId
    /** Relics held during this run */
    relics: RelicInstance[]
    /** Active event being presented (if in event phase) */
    activeEvent?: EventInstance
    /** Pending relic choice from boss kill (pick 1 of N) */
    pendingRelicChoices?: RelicId[]
}

export interface RunReward {
    type: "unit" | "buff" | "commodity" | "xp" | "scrap" | "relic"
    description: string
    value: string | number
    /** Quantity for commodity rewards (used when present; otherwise consumer computes) */
    quantity?: number
}

// ── Shop state ───────────────────────────────────────────────────────────────

export interface ShopOffer {
    unitDefId: UnitId
    cost: number
    sold: boolean
}

// ── Opponent ─────────────────────────────────────────────────────────────────

export interface OpponentDef {
    name: string
    faction: FactionId
    units: { unitId: UnitId; level: number }[]
    /** If this is a boss opponent */
    isBoss?: boolean
    /** Boss identifier for tracking */
    bossId?: BossId
    /** Random modifier applied to this boss encounter */
    modifierId?: BossModifierId
}

// ── Run summary ─────────────────────────────────────────────────────────────

export interface RunSummary {
    highestRound: number
    losses: number
    bossesDefeated: BossId[]
    majorityFaction?: FactionId
    bestUnit?: { unitDefId: UnitId; combatsSurvived: number }
    totalScrapEarned: number
    totalScrapSpent: number
    unitsBought: number
    unitsSold: number
    relicsCollected: RelicId[]
}
