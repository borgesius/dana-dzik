import type {
    AbilityEffect,
    AbilityTrigger,
    CombatLogEntry,
    CombatResult,
    CombatUnit,
    FactionId,
    UnitDef,
} from "./types"
import { UNIT_MAP } from "./units"

const MAX_COMBAT_ROUNDS = 30
let nextInstanceId = 1

/** Optional stat bonus modifiers from career tree or other systems */
export interface CombatBonuses {
    atkBonus?: number // flat additive, e.g. 0.1 = +10%
    hpBonus?: number // flat additive, e.g. 0.1 = +10%
    /** Per-faction ATK bonuses (stacks with global atkBonus) */
    factionATK?: Partial<Record<FactionId, number>>
}

export function createCombatUnit(
    unitDefId: string,
    level: number = 1,
    bonuses?: CombatBonuses
): CombatUnit {
    const def = UNIT_MAP.get(unitDefId)
    if (!def) throw new Error(`Unknown unit: ${unitDefId}`)

    const levelMult = 1 + (level - 1) * 0.5 // 1x at L1, 1.5x at L2, 2x at L3
    const factionAtkBonus = bonuses?.factionATK?.[def.faction] ?? 0
    const atkMult = 1 + (bonuses?.atkBonus ?? 0) + factionAtkBonus
    const hpMult = 1 + (bonuses?.hpBonus ?? 0)
    const atk = Math.floor(def.baseATK * levelMult * atkMult)
    const hp = Math.floor(def.baseHP * levelMult * hpMult)

    return {
        unitDefId,
        level,
        currentATK: atk,
        currentHP: hp,
        maxHP: hp,
        shield: 0,
        faction: def.faction,
        instanceId: `unit-${nextInstanceId++}`,
        hasAttacked: false,
    }
}

function getUnitDef(unit: CombatUnit): UnitDef | undefined {
    return UNIT_MAP.get(unit.unitDefId)
}

function isAlive(unit: CombatUnit): boolean {
    return unit.currentHP > 0
}

function dealDamage(target: CombatUnit, amount: number): number {
    const shieldAbsorb = Math.min(target.shield, amount)
    target.shield -= shieldAbsorb
    const remaining = amount - shieldAbsorb
    target.currentHP -= remaining
    return remaining
}

/**
 * Pure function that resolves combat between two lineups.
 * Returns the full result including winner, survivors, and log.
 */
export function resolveCombat(
    playerLineup: CombatUnit[],
    opponentLineup: CombatUnit[]
): CombatResult {
    // Deep-clone lineups so we don't mutate originals
    const player = playerLineup.map((u) => ({ ...u }))
    const opponent = opponentLineup.map((u) => ({ ...u }))

    const log: CombatLogEntry[] = []
    const handledDeaths = new Set<string>()
    let round = 0

    // ── Combat start abilities ───────────────────────────────────────────
    triggerAbilities("combatStart", player, opponent, log, 0, "player")
    triggerAbilities("combatStart", opponent, player, log, 0, "opponent")

    processDeaths(player, opponent, log, 0, handledDeaths)

    while (
        player.filter(isAlive).length > 0 &&
        opponent.filter(isAlive).length > 0 &&
        round < MAX_COMBAT_ROUNDS
    ) {
        round++

        // ── Round start abilities ────────────────────────────────────────
        triggerAbilities("roundStart", player, opponent, log, round, "player")
        triggerAbilities("roundStart", opponent, player, log, round, "opponent")
        processDeaths(player, opponent, log, round, handledDeaths)

        if (
            player.filter(isAlive).length === 0 ||
            opponent.filter(isAlive).length === 0
        )
            break

        // ── Front-line clash ─────────────────────────────────────────────
        const pFront = player.find(isAlive)
        const oFront = opponent.find(isAlive)
        if (!pFront || !oFront) break

        // Player attacks first
        let pDmg = pFront.currentATK
        if (!pFront.hasAttacked) {
            triggerAbilities(
                "onFirstAttack",
                [pFront],
                opponent,
                log,
                round,
                "player"
            )
            const def = getUnitDef(pFront)
            if (
                def?.ability.trigger === "onFirstAttack" &&
                def.ability.effect.type === "doubleDamage"
            ) {
                pDmg *= 2
            }
            pFront.hasAttacked = true
        }
        const pDmgDealt = dealDamage(oFront, pDmg)
        log.push({
            round,
            description: `${pFront.unitDefId} attacks ${oFront.unitDefId} for ${pDmgDealt}`,
        })

        if (pDmgDealt > 0) {
            triggerAbilities(
                "onDealDamage",
                [pFront],
                opponent,
                log,
                round,
                "player"
            )
            triggerAbilities(
                "onTakeDamage",
                [oFront],
                player,
                log,
                round,
                "opponent"
            )
        }

        if (!isAlive(oFront)) {
            handleDeath(
                oFront,
                opponent,
                player,
                log,
                round,
                "opponent",
                handledDeaths
            )
            const newOFront = opponent.find(isAlive)
            if (newOFront) {
                triggerAbilities(
                    "onEnemyEnterFront",
                    player,
                    opponent,
                    log,
                    round,
                    "player"
                )
            }
        }

        // Opponent attacks (if still alive)
        const oAttacker = opponent.find(isAlive)
        const pTarget = player.find(isAlive)
        if (oAttacker && pTarget) {
            let oDmg = oAttacker.currentATK
            if (!oAttacker.hasAttacked) {
                triggerAbilities(
                    "onFirstAttack",
                    [oAttacker],
                    player,
                    log,
                    round,
                    "opponent"
                )
                const def = getUnitDef(oAttacker)
                if (
                    def?.ability.trigger === "onFirstAttack" &&
                    def.ability.effect.type === "doubleDamage"
                ) {
                    oDmg *= 2
                }
                oAttacker.hasAttacked = true
            }
            const oDmgDealt = dealDamage(pTarget, oDmg)
            log.push({
                round,
                description: `${oAttacker.unitDefId} attacks ${pTarget.unitDefId} for ${oDmgDealt}`,
            })

            if (oDmgDealt > 0) {
                triggerAbilities(
                    "onDealDamage",
                    [oAttacker],
                    player,
                    log,
                    round,
                    "opponent"
                )
                triggerAbilities(
                    "onTakeDamage",
                    [pTarget],
                    opponent,
                    log,
                    round,
                    "player"
                )
            }

            if (!isAlive(pTarget)) {
                handleDeath(
                    pTarget,
                    player,
                    opponent,
                    log,
                    round,
                    "player",
                    handledDeaths
                )
                const newPFront = player.find(isAlive)
                if (newPFront) {
                    triggerAbilities(
                        "onEnemyEnterFront",
                        opponent,
                        player,
                        log,
                        round,
                        "opponent"
                    )
                }
            }
        }

        processDeaths(player, opponent, log, round, handledDeaths)
    }

    const playerAlive = player.filter(isAlive)
    const opponentAlive = opponent.filter(isAlive)

    let winner: "player" | "opponent" | "draw"
    if (playerAlive.length > 0 && opponentAlive.length === 0) {
        winner = "player"
    } else if (opponentAlive.length > 0 && playerAlive.length === 0) {
        winner = "opponent"
    } else {
        winner = "draw"
    }

    return {
        winner,
        playerSurvivors: playerAlive,
        opponentSurvivors: opponentAlive,
        rounds: round,
        log,
    }
}

/** Count allies of a specific faction (excluding the owner) */
function countFactionAllies(
    owner: CombatUnit,
    allies: CombatUnit[],
    faction: FactionId
): number {
    return allies.filter(
        (a) => a !== owner && isAlive(a) && a.faction === faction
    ).length
}

function triggerAbilities(
    trigger: AbilityTrigger,
    owners: CombatUnit[],
    enemies: CombatUnit[],
    log: CombatLogEntry[],
    round: number,
    side?: "player" | "opponent"
): void {
    for (const unit of owners) {
        if (!isAlive(unit)) continue
        const def = getUnitDef(unit)
        if (!def || def.ability.trigger !== trigger) continue

        applyAbility(def, unit, owners, enemies, log, round, side)

        // Trigger onAllyAbility for allies
        for (const ally of owners) {
            if (ally === unit || !isAlive(ally)) continue
            const allyDef = getUnitDef(ally)
            if (allyDef?.ability.trigger === "onAllyAbility") {
                applyAbility(allyDef, ally, owners, enemies, log, round, side)
            }
        }
    }
}

/**
 * Apply a unit's full ability: main effect (with faction scaling) + crossBonus.
 */
function applyAbility(
    def: UnitDef,
    owner: CombatUnit,
    allies: CombatUnit[],
    enemies: CombatUnit[],
    log: CombatLogEntry[],
    round: number,
    side?: "player" | "opponent"
): void {
    const sameFactionCount = countFactionAllies(owner, allies, owner.faction)

    applyEffect(def.ability.effect, owner, allies, enemies, log, round, side, {
        factionBonus: def.ability.factionBonus,
        sameFactionCount,
    })

    if (def.ability.crossBonus) {
        const cb = def.ability.crossBonus
        const crossCount = countFactionAllies(owner, allies, cb.faction)
        if (crossCount >= cb.minAllies) {
            applyEffect(cb.effect, owner, allies, enemies, log, round, side)
        }
    }
}

interface FactionScalingCtx {
    factionBonus?: { perAlly: number }
    sameFactionCount: number
}

function applyEffect(
    effect: AbilityEffect,
    owner: CombatUnit,
    allies: CombatUnit[],
    enemies: CombatUnit[],
    log: CombatLogEntry[],
    round: number,
    side?: "player" | "opponent",
    scaling?: FactionScalingCtx
): void {
    const bonus = scaling?.factionBonus
        ? scaling.sameFactionCount * scaling.factionBonus.perAlly
        : 0

    switch (effect.type) {
        case "damage": {
            const amount = effect.amount + bonus
            const targets = selectTargets(effect.target, enemies)
            for (const t of targets) {
                const dealt = dealDamage(t, amount)
                log.push({
                    round,
                    description: `${owner.unitDefId} ability deals ${dealt} to ${t.unitDefId}`,
                })
            }
            break
        }
        case "buff": {
            const amount = effect.amount + bonus
            const targets = selectBuffTargets(effect.target, owner, allies)
            for (const t of targets) {
                if (effect.stat === "atk") {
                    t.currentATK += amount
                    log.push({
                        round,
                        description: `${t.unitDefId} gains +${amount} ATK`,
                    })
                } else if (effect.stat === "hp") {
                    t.currentHP += amount
                    t.maxHP += amount
                    log.push({
                        round,
                        description: `${t.unitDefId} gains +${amount} HP`,
                    })
                } else if (effect.stat === "shield") {
                    t.shield += amount
                    log.push({
                        round,
                        description: `${t.unitDefId} gains +${amount} shield`,
                    })
                }
            }
            break
        }
        case "summon": {
            const summoned = createCombatUnit(effect.unitId, 1)
            if (effect.atkBonus) {
                summoned.currentATK += effect.atkBonus
            }
            if (effect.hpBonus) {
                summoned.currentHP += effect.hpBonus
                summoned.maxHP += effect.hpBonus
            }
            if (effect.position === "front") {
                allies.unshift(summoned)
            } else {
                allies.push(summoned)
            }
            const sideTag = side ? ` [${side}]` : ""
            log.push({
                round,
                description: `${owner.unitDefId} summons ${effect.unitId}${sideTag}`,
            })
            break
        }
        case "doubleDamage":
            // Handled inline in combat resolution
            break
        case "heal": {
            const amount = effect.amount + bonus
            const targets = selectBuffTargets(effect.target, owner, allies)
            for (const t of targets) {
                const healAmt = Math.min(amount, t.maxHP - t.currentHP)
                t.currentHP += healAmt
                if (healAmt > 0) {
                    log.push({
                        round,
                        description: `${owner.unitDefId} ability heals ${t.unitDefId} for ${healAmt}`,
                    })
                }
            }
            break
        }
    }
}

function selectTargets(
    target: "frontEnemy" | "backEnemy" | "randomEnemy" | "allEnemies",
    enemies: CombatUnit[]
): CombatUnit[] {
    const alive = enemies.filter(isAlive)
    if (alive.length === 0) return []

    switch (target) {
        case "frontEnemy":
            return [alive[0]]
        case "backEnemy":
            return [alive[alive.length - 1]]
        case "randomEnemy":
            return [alive[Math.floor(Math.random() * alive.length)]]
        case "allEnemies":
            return alive
    }
}

function selectBuffTargets(
    target: "self" | "allAllies" | "randomAlly",
    owner: CombatUnit,
    allies: CombatUnit[]
): CombatUnit[] {
    switch (target) {
        case "self":
            return [owner]
        case "allAllies":
            return allies.filter(isAlive)
        case "randomAlly": {
            const alive = allies.filter((a) => isAlive(a) && a !== owner)
            return alive.length > 0
                ? [alive[Math.floor(Math.random() * alive.length)]]
                : [owner]
        }
    }
}

function handleDeath(
    deadUnit: CombatUnit,
    ownTeam: CombatUnit[],
    enemyTeam: CombatUnit[],
    log: CombatLogEntry[],
    round: number,
    side: "player" | "opponent" | undefined,
    handledDeaths: Set<string>
): void {
    if (handledDeaths.has(deadUnit.instanceId)) return
    handledDeaths.add(deadUnit.instanceId)

    log.push({ round, description: `${deadUnit.unitDefId} dies` })

    // Trigger onDeath (with faction scaling + cross bonus)
    const def = getUnitDef(deadUnit)
    if (def?.ability.trigger === "onDeath") {
        applyAbility(def, deadUnit, ownTeam, enemyTeam, log, round, side)
    }

    // Trigger onAllyDeath for teammates (with faction scaling + cross bonus)
    for (const ally of ownTeam) {
        if (ally === deadUnit || !isAlive(ally)) continue
        const allyDef = getUnitDef(ally)
        if (allyDef?.ability.trigger === "onAllyDeath") {
            applyAbility(allyDef, ally, ownTeam, enemyTeam, log, round, side)
        }
    }
}

/**
 * After an ability phase (combatStart / roundStart / attack chain), find dead
 * units on both teams whose deaths haven't been handled yet, fire their
 * onDeath / onAllyDeath chains, then remove them. Loops until no new deaths
 * occur so chain reactions resolve fully.
 */
function processDeaths(
    player: CombatUnit[],
    opponent: CombatUnit[],
    log: CombatLogEntry[],
    round: number,
    handledDeaths: Set<string>
): void {
    let hadDeaths = true
    while (hadDeaths) {
        hadDeaths = false

        // Collect unhandled dead from each team (snapshot before mutating)
        const deadPlayers = player.filter(
            (u) => !isAlive(u) && !handledDeaths.has(u.instanceId)
        )
        const deadOpponents = opponent.filter(
            (u) => !isAlive(u) && !handledDeaths.has(u.instanceId)
        )

        for (const dead of deadPlayers) {
            handleDeath(
                dead,
                player,
                opponent,
                log,
                round,
                "player",
                handledDeaths
            )
            hadDeaths = true
        }
        for (const dead of deadOpponents) {
            handleDeath(
                dead,
                opponent,
                player,
                log,
                round,
                "opponent",
                handledDeaths
            )
            hadDeaths = true
        }

        // Splice all dead units out of both teams
        spliceDeadUnits(player)
        spliceDeadUnits(opponent)
    }
}

/** Remove dead units from a team array (no side-effects). */
function spliceDeadUnits(team: CombatUnit[]): void {
    for (let i = team.length - 1; i >= 0; i--) {
        if (!isAlive(team[i])) {
            if (team[i].currentHP < 0) team[i].currentHP = 0
            team.splice(i, 1)
        }
    }
}
