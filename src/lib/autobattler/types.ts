// ── Factions ─────────────────────────────────────────────────────────────────

export type FactionId =
    | "quickdraw"
    | "deputies"
    | "clockwork"
    | "prospectors"
    | "drifters"

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
    | { type: "damage"; target: "frontEnemy" | "backEnemy" | "randomEnemy" | "allEnemies"; amount: number }
    | { type: "buff"; target: "self" | "allAllies" | "randomAlly"; stat: "atk" | "hp" | "shield"; amount: number }
    | { type: "summon"; unitId: string; position: "front" | "back" }
    | { type: "doubleDamage" }
    | { type: "heal"; target: "self" | "allAllies"; amount: number }

export interface AbilityDef {
    trigger: AbilityTrigger
    effect: AbilityEffect
    description: string
}

// ── Unit definitions ─────────────────────────────────────────────────────────

export type UnitTier = 1 | 2 | 3

export interface UnitDef {
    id: string
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
    unitDefId: string
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

// ── Run state ────────────────────────────────────────────────────────────────

export interface RunState {
    round: number
    totalRounds: number
    scrap: number
    lineup: CombatUnit[]
    bench: CombatUnit[]
    wins: number
    losses: number
    phase: "shop" | "arrange" | "combat" | "reward" | "finished"
    runRewards: RunReward[]
}

export interface RunReward {
    type: "unit" | "buff" | "commodity" | "xp" | "scrap"
    description: string
    value: string | number
}

// ── Shop state ───────────────────────────────────────────────────────────────

export interface ShopOffer {
    unitDefId: string
    cost: number
    sold: boolean
}

// ── Opponent ─────────────────────────────────────────────────────────────────

export interface OpponentDef {
    name: string
    faction: FactionId
    units: { unitId: string; level: number }[]
}
