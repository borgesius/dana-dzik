import type {
    AbilityEffect,
    AbilityTrigger,
    CombatLogEntry,
    CombatResult,
    CombatUnit,
    UnitDef,
} from "./types"
import { UNIT_MAP } from "./units"

const MAX_COMBAT_ROUNDS = 30
let nextInstanceId = 1

/** Optional stat bonus modifiers from career tree or other systems */
export interface CombatBonuses {
    atkBonus?: number // flat additive, e.g. 0.1 = +10%
    hpBonus?: number // flat additive, e.g. 0.1 = +10%
}

export function createCombatUnit(
    unitDefId: string,
    level: number = 1,
    bonuses?: CombatBonuses
): CombatUnit {
    const def = UNIT_MAP.get(unitDefId)
    if (!def) throw new Error(`Unknown unit: ${unitDefId}`)

    const levelMult = 1 + (level - 1) * 0.5 // 1x at L1, 1.5x at L2, 2x at L3
    const atkMult = 1 + (bonuses?.atkBonus ?? 0)
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
    let round = 0

    // ── Combat start abilities ───────────────────────────────────────────
    triggerAbilities("combatStart", player, opponent, log, 0)
    triggerAbilities("combatStart", opponent, player, log, 0)

    // Clean up dead from combat start
    removeDeadUnits(player, opponent, log, 0)
    removeDeadUnits(opponent, player, log, 0)

    while (
        player.filter(isAlive).length > 0 &&
        opponent.filter(isAlive).length > 0 &&
        round < MAX_COMBAT_ROUNDS
    ) {
        round++

        // ── Round start abilities ────────────────────────────────────────
        triggerAbilities("roundStart", player, opponent, log, round)
        triggerAbilities("roundStart", opponent, player, log, round)
        removeDeadUnits(player, opponent, log, round)
        removeDeadUnits(opponent, player, log, round)

        if (player.filter(isAlive).length === 0 || opponent.filter(isAlive).length === 0) break

        // ── Front-line clash ─────────────────────────────────────────────
        const pFront = player.find(isAlive)
        const oFront = opponent.find(isAlive)
        if (!pFront || !oFront) break

        // Player attacks first
        let pDmg = pFront.currentATK
        if (!pFront.hasAttacked) {
            triggerAbilities("onFirstAttack", [pFront], opponent, log, round)
            const def = getUnitDef(pFront)
            if (def?.ability.trigger === "onFirstAttack" && def.ability.effect.type === "doubleDamage") {
                pDmg *= 2
            }
            pFront.hasAttacked = true
        }
        const pDmgDealt = dealDamage(oFront, pDmg)
        log.push({ round, description: `${pFront.unitDefId} attacks ${oFront.unitDefId} for ${pDmgDealt}` })

        if (pDmgDealt > 0) {
            triggerAbilities("onDealDamage", [pFront], opponent, log, round)
            triggerAbilities("onTakeDamage", [oFront], player, log, round)
        }

        // Check if opponent front died
        if (!isAlive(oFront)) {
            handleDeath(oFront, opponent, player, log, round)
            // Trigger onEnemyEnterFront for the player
            const newOFront = opponent.find(isAlive)
            if (newOFront) {
                triggerAbilities("onEnemyEnterFront", player, opponent, log, round)
            }
        }

        // Opponent attacks (if still alive)
        const oAttacker = opponent.find(isAlive)
        const pTarget = player.find(isAlive)
        if (oAttacker && pTarget) {
            let oDmg = oAttacker.currentATK
            if (!oAttacker.hasAttacked) {
                triggerAbilities("onFirstAttack", [oAttacker], player, log, round)
                const def = getUnitDef(oAttacker)
                if (def?.ability.trigger === "onFirstAttack" && def.ability.effect.type === "doubleDamage") {
                    oDmg *= 2
                }
                oAttacker.hasAttacked = true
            }
            const oDmgDealt = dealDamage(pTarget, oDmg)
            log.push({ round, description: `${oAttacker.unitDefId} attacks ${pTarget.unitDefId} for ${oDmgDealt}` })

            if (oDmgDealt > 0) {
                triggerAbilities("onDealDamage", [oAttacker], player, log, round)
                triggerAbilities("onTakeDamage", [pTarget], opponent, log, round)
            }

            if (!isAlive(pTarget)) {
                handleDeath(pTarget, player, opponent, log, round)
                const newPFront = player.find(isAlive)
                if (newPFront) {
                    triggerAbilities("onEnemyEnterFront", opponent, player, log, round)
                }
            }
        }

        // Clean up any remaining deaths from ability triggers
        removeDeadUnits(player, opponent, log, round)
        removeDeadUnits(opponent, player, log, round)
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

function triggerAbilities(
    trigger: AbilityTrigger,
    owners: CombatUnit[],
    enemies: CombatUnit[],
    log: CombatLogEntry[],
    round: number
): void {
    for (const unit of owners) {
        if (!isAlive(unit)) continue
        const def = getUnitDef(unit)
        if (!def || def.ability.trigger !== trigger) continue

        applyEffect(def.ability.effect, unit, owners, enemies, log, round)

        // Trigger onAllyAbility for allies
        for (const ally of owners) {
            if (ally === unit || !isAlive(ally)) continue
            const allyDef = getUnitDef(ally)
            if (allyDef?.ability.trigger === "onAllyAbility") {
                applyEffect(allyDef.ability.effect, ally, owners, enemies, log, round)
            }
        }
    }
}

function applyEffect(
    effect: AbilityEffect,
    owner: CombatUnit,
    allies: CombatUnit[],
    enemies: CombatUnit[],
    log: CombatLogEntry[],
    round: number
): void {
    switch (effect.type) {
        case "damage": {
            const targets = selectTargets(effect.target, enemies)
            for (const t of targets) {
                dealDamage(t, effect.amount)
                log.push({ round, description: `${owner.unitDefId} ability deals ${effect.amount} to ${t.unitDefId}` })
            }
            break
        }
        case "buff": {
            const targets = selectBuffTargets(effect.target, owner, allies)
            for (const t of targets) {
                if (effect.stat === "atk") t.currentATK += effect.amount
                else if (effect.stat === "hp") {
                    t.currentHP += effect.amount
                    t.maxHP += effect.amount
                } else if (effect.stat === "shield") {
                    t.shield += effect.amount
                }
            }
            break
        }
        case "summon": {
            const summoned = createCombatUnit(effect.unitId, 1)
            if (effect.position === "front") {
                allies.unshift(summoned)
            } else {
                allies.push(summoned)
            }
            log.push({ round, description: `${owner.unitDefId} summons ${effect.unitId}` })
            break
        }
        case "doubleDamage":
            // Handled inline in combat resolution
            break
        case "heal": {
            const targets = selectBuffTargets(effect.target, owner, allies)
            for (const t of targets) {
                const healAmt = Math.min(effect.amount, t.maxHP - t.currentHP)
                t.currentHP += healAmt
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
    round: number
): void {
    log.push({ round, description: `${deadUnit.unitDefId} dies` })

    // Trigger onDeath
    const def = getUnitDef(deadUnit)
    if (def?.ability.trigger === "onDeath") {
        applyEffect(def.ability.effect, deadUnit, ownTeam, enemyTeam, log, round)
    }

    // Trigger onAllyDeath for teammates
    for (const ally of ownTeam) {
        if (ally === deadUnit || !isAlive(ally)) continue
        const allyDef = getUnitDef(ally)
        if (allyDef?.ability.trigger === "onAllyDeath") {
            applyEffect(allyDef.ability.effect, ally, ownTeam, enemyTeam, log, round)
        }
    }
}

function removeDeadUnits(
    team: CombatUnit[],
    _enemies: CombatUnit[],
    _log: CombatLogEntry[],
    _round: number
): void {
    let i = 0
    while (i < team.length) {
        if (!isAlive(team[i]) && team[i].currentHP <= 0) {
            const dead = team[i]
            // Only handle death if it hasn't been handled yet
            if (dead.currentHP < 0) {
                dead.currentHP = 0
            }
            team.splice(i, 1)
        } else {
            i++
        }
    }
}
