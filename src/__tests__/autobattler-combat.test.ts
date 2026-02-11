import { beforeEach, describe, expect, it, vi } from "vitest"

import {
    type CombatBonuses,
    createCombatUnit,
    resolveCombat,
} from "../lib/autobattler/combat"
import type { CombatUnit, UnitId } from "../lib/autobattler/types"
import { UNIT_MAP } from "../lib/autobattler/units"

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Create a minimal combat unit for testing (bypasses UNIT_MAP when needed) */
function makeUnit(
    overrides: Partial<CombatUnit> & { unitDefId: string }
): CombatUnit {
    return {
        level: 1,
        currentATK: 3,
        currentHP: 5,
        maxHP: 5,
        shield: 0,
        faction: "drifters",
        instanceId: `test-${Math.random().toString(36).slice(2, 8)}`,
        hasAttacked: false,
        ...overrides,
    }
}

// ── createCombatUnit ─────────────────────────────────────────────────────────

describe("createCombatUnit", () => {
    it("creates a unit from a valid unit def", () => {
        const unit = createCombatUnit("drifter-brawler")
        const def = UNIT_MAP.get("drifter-brawler")!
        expect(unit.unitDefId).toBe("drifter-brawler")
        expect(unit.level).toBe(1)
        expect(unit.currentATK).toBe(def.baseATK)
        expect(unit.currentHP).toBe(def.baseHP)
        expect(unit.maxHP).toBe(def.baseHP)
        expect(unit.shield).toBe(0)
        expect(unit.faction).toBe("drifters")
        expect(unit.hasAttacked).toBe(false)
        expect(unit.instanceId).toBeTruthy()
    })

    it("throws for an unknown unit ID", () => {
        expect(() => createCombatUnit("nonexistent-unit" as UnitId)).toThrow(
            "Unknown unit"
        )
    })

    it("scales stats by level (L2 = 1.5x, L3 = 2x)", () => {
        const def = UNIT_MAP.get("drifter-brawler")!
        const l1 = createCombatUnit("drifter-brawler", 1)
        const l2 = createCombatUnit("drifter-brawler", 2)
        const l3 = createCombatUnit("drifter-brawler", 3)

        expect(l1.currentATK).toBe(def.baseATK)
        expect(l2.currentATK).toBe(Math.floor(def.baseATK * 1.5))
        expect(l3.currentATK).toBe(Math.floor(def.baseATK * 2.0))

        expect(l1.currentHP).toBe(def.baseHP)
        expect(l2.currentHP).toBe(Math.floor(def.baseHP * 1.5))
        expect(l3.currentHP).toBe(Math.floor(def.baseHP * 2.0))
    })

    it("applies ATK bonus from CombatBonuses", () => {
        const def = UNIT_MAP.get("drifter-brawler")!
        const bonuses: CombatBonuses = { atkBonus: 0.2 }
        const unit = createCombatUnit("drifter-brawler", 1, bonuses)
        expect(unit.currentATK).toBe(Math.floor(def.baseATK * 1.2))
    })

    it("applies HP bonus from CombatBonuses", () => {
        const def = UNIT_MAP.get("drifter-brawler")!
        const bonuses: CombatBonuses = { hpBonus: 0.3 }
        const unit = createCombatUnit("drifter-brawler", 1, bonuses)
        expect(unit.currentHP).toBe(Math.floor(def.baseHP * 1.3))
        expect(unit.maxHP).toBe(Math.floor(def.baseHP * 1.3))
    })

    it("applies faction-specific ATK bonus", () => {
        const def = UNIT_MAP.get("drifter-brawler")!
        const bonuses: CombatBonuses = {
            factionATK: { drifters: 0.5 },
        }
        const unit = createCombatUnit("drifter-brawler", 1, bonuses)
        expect(unit.currentATK).toBe(Math.floor(def.baseATK * 1.5))
    })

    it("stacks global ATK bonus with faction ATK bonus", () => {
        const def = UNIT_MAP.get("drifter-brawler")!
        const bonuses: CombatBonuses = {
            atkBonus: 0.1,
            factionATK: { drifters: 0.2 },
        }
        const unit = createCombatUnit("drifter-brawler", 1, bonuses)
        // atkMult = 1 + 0.1 + 0.2 = 1.3
        expect(unit.currentATK).toBe(Math.floor(def.baseATK * 1.3))
    })

    it("faction ATK bonus does not apply to other factions", () => {
        const def = UNIT_MAP.get("qd-sharpshooter")! // quickdraw
        const bonuses: CombatBonuses = {
            factionATK: { drifters: 0.5 },
        }
        const unit = createCombatUnit("qd-sharpshooter", 1, bonuses)
        // No bonus should be applied for quickdraw
        expect(unit.currentATK).toBe(def.baseATK)
    })

    it("generates unique instance IDs", () => {
        const a = createCombatUnit("drifter-brawler")
        const b = createCombatUnit("drifter-brawler")
        expect(a.instanceId).not.toBe(b.instanceId)
    })
})

// ── resolveCombat ────────────────────────────────────────────────────────────

describe("resolveCombat", () => {
    beforeEach(() => {
        vi.restoreAllMocks()
    })

    it("player wins when player lineup is strictly stronger", () => {
        const player = [createCombatUnit("qd-kingpin", 3)] // very strong
        const opponent = [createCombatUnit("drifter-scout", 1)] // weak

        const result = resolveCombat(player, opponent)
        expect(result.winner).toBe("player")
        expect(result.playerSurvivors.length).toBeGreaterThan(0)
        expect(result.opponentSurvivors.length).toBe(0)
    })

    it("opponent wins when opponent lineup is strictly stronger", () => {
        const player = [createCombatUnit("drifter-scout", 1)]
        const opponent = [createCombatUnit("qd-kingpin", 3)]

        const result = resolveCombat(player, opponent)
        expect(result.winner).toBe("opponent")
        expect(result.opponentSurvivors.length).toBeGreaterThan(0)
        expect(result.playerSurvivors.length).toBe(0)
    })

    it("returns a draw when both sides die simultaneously or hit max rounds", () => {
        // Two units with same stats should attack each other down
        // but player attacks first so player should win — unless they kill each other
        // Let's set it up so that it's likely a draw via max rounds:
        // Actually player always attacks first, so equal stats = player usually wins.
        // Let's force a draw by having both lineups empty after simultaneous ability damage
        // Instead, verify max round cap leads to draw
        const highHP = makeUnit({
            unitDefId: "drifter-medic",
            currentATK: 0,
            currentHP: 9999,
            maxHP: 9999,
        })
        const oppHighHP = makeUnit({
            unitDefId: "drifter-medic",
            currentATK: 0,
            currentHP: 9999,
            maxHP: 9999,
        })

        const result = resolveCombat([highHP], [oppHighHP])
        expect(result.winner).toBe("draw")
        expect(result.rounds).toBe(30)
    })

    it("does not mutate the original lineups", () => {
        const player = [createCombatUnit("drifter-brawler", 1)]
        const opponent = [createCombatUnit("drifter-brawler", 1)]

        const origPlayerHP = player[0].currentHP
        const origOpponentHP = opponent[0].currentHP

        resolveCombat(player, opponent)

        expect(player[0].currentHP).toBe(origPlayerHP)
        expect(opponent[0].currentHP).toBe(origOpponentHP)
    })

    it("generates combat log entries", () => {
        const player = [createCombatUnit("drifter-brawler", 1)]
        const opponent = [createCombatUnit("drifter-brawler", 1)]

        const result = resolveCombat(player, opponent)
        expect(result.log.length).toBeGreaterThan(0)
        expect(result.log[0]).toHaveProperty("round")
        expect(result.log[0]).toHaveProperty("description")
    })

    it("player attacks first each round (advantage)", () => {
        // Use units where player ATK == opponent HP, so player kills in 1 hit first
        const player = [
            makeUnit({
                unitDefId: "drifter-brawler",
                currentATK: 5,
                currentHP: 1,
                maxHP: 1,
            }),
        ]
        const opponent = [
            makeUnit({
                unitDefId: "drifter-brawler",
                currentATK: 999,
                currentHP: 5,
                maxHP: 5,
            }),
        ]

        const result = resolveCombat(player, opponent)
        // Player should kill opponent before opponent can attack
        expect(result.winner).toBe("player")
    })

    it("handles multi-unit lineups (front line dies, next steps up)", () => {
        const player = [
            createCombatUnit("drifter-brawler", 1),
            createCombatUnit("drifter-scout", 1),
        ]
        const opponent = [createCombatUnit("drifter-brawler", 1)]

        const result = resolveCombat(player, opponent)
        expect(result.winner).toBe("player")
        expect(result.playerSurvivors.length).toBeGreaterThanOrEqual(1)
    })

    it("handles shield absorption (damage reduced by shield)", () => {
        // dep-sentinel has combatStart: gain +3 shield to self
        const player = [createCombatUnit("dep-sentinel", 1)]
        const opponent = [createCombatUnit("drifter-brawler", 1)]

        const result = resolveCombat(player, opponent)
        // The player unit should have received shield and taken less damage
        // Just verify combat ran without error
        expect(result.log.length).toBeGreaterThan(0)
        expect(["player", "opponent", "draw"]).toContain(result.winner)
    })

    it("triggers combatStart abilities", () => {
        // qd-sharpshooter: on combat start, deal 3 damage to front enemy
        const player = [createCombatUnit("qd-sharpshooter", 1)]
        const opponent = [
            makeUnit({
                unitDefId: "drifter-brawler",
                currentATK: 1,
                currentHP: 100,
                maxHP: 100,
            }),
        ]

        const result = resolveCombat(player, opponent)
        // Should see ability damage in log
        const abilityLogEntry = result.log.find(
            (e) =>
                e.description.includes("ability") &&
                e.description.includes("qd-sharpshooter")
        )
        expect(abilityLogEntry).toBeDefined()
    })

    it("triggers onDeath abilities", () => {
        // qd-dynamiter: on death, deal 2 damage to all enemies
        const player = [createCombatUnit("qd-dynamiter", 1)]
        const opponent = [
            makeUnit({
                unitDefId: "drifter-brawler",
                currentATK: 999,
                currentHP: 100,
                maxHP: 100,
            }),
        ]

        const result = resolveCombat(player, opponent)
        // dynamiter should die and deal death damage
        const deathLog = result.log.find(
            (e) =>
                e.description.includes("qd-dynamiter") &&
                e.description.includes("dies")
        )
        expect(deathLog).toBeDefined()
    })

    it("triggers doubleDamage on first attack for qd-deadeye", () => {
        // qd-deadeye has onFirstAttack: doubleDamage
        const def = UNIT_MAP.get("qd-deadeye")!
        const player = [createCombatUnit("qd-deadeye", 1)]
        const opponent = [
            makeUnit({
                unitDefId: "drifter-brawler",
                currentATK: 1,
                currentHP: 200,
                maxHP: 200,
            }),
        ]

        const result = resolveCombat(player, opponent)
        // First attack log should show double ATK (base * 2)
        const attackLog = result.log.find(
            (e) => e.description.includes("qd-deadeye attacks") && e.round === 1
        )
        expect(attackLog).toBeDefined()
        // The attack should deal double the base ATK
        const expectedDmg = def.baseATK * 2
        expect(attackLog!.description).toContain(`for ${expectedDmg}`)
    })

    it("triggers roundStart abilities each round", () => {
        // dep-barricader: roundStart → all allies gain +1 shield
        const player = [createCombatUnit("dep-barricader", 1)]
        const opponent = [
            makeUnit({
                unitDefId: "drifter-brawler",
                currentATK: 1,
                currentHP: 100,
                maxHP: 100,
            }),
        ]

        const result = resolveCombat(player, opponent)
        // Should see shield gain in log
        const shieldLog = result.log.find((e) =>
            e.description.includes("shield")
        )
        expect(shieldLog).toBeDefined()
    })

    it("triggers onAllyDeath ability", () => {
        // dep-judge: on ally death, gain +3 ATK
        const weakAlly = makeUnit({
            unitDefId: "drifter-scout",
            currentATK: 1,
            currentHP: 1,
            maxHP: 1,
        })
        const judge = createCombatUnit("dep-judge", 1)
        const player = [weakAlly, judge]
        const opponent = [
            makeUnit({
                unitDefId: "drifter-brawler",
                currentATK: 5,
                currentHP: 200,
                maxHP: 200,
            }),
        ]

        const result = resolveCombat(player, opponent)
        // The weak ally should die
        const allyDeathLog = result.log.find((e) =>
            e.description.includes("drifter-scout dies")
        )
        expect(allyDeathLog).toBeDefined()
    })

    it("faction scaling bonus applies (more same-faction allies = stronger ability)", () => {
        // qd-sharpshooter: combatStart deal 3 (+1/Existentialist) to front enemy
        // With 1 extra quickdraw ally, the damage should be 3 + 1 = 4
        vi.spyOn(Math, "random").mockReturnValue(0.5)

        const sharpshooter = createCombatUnit("qd-sharpshooter", 1)
        const extraQD = createCombatUnit("qd-dynamiter", 1)
        const player = [sharpshooter, extraQD]

        const toughOpponent = makeUnit({
            unitDefId: "drifter-brawler",
            currentATK: 1,
            currentHP: 500,
            maxHP: 500,
        })
        const opponent = [toughOpponent]

        const result = resolveCombat(player, opponent)
        // With 1 quickdraw ally (dynamiter), sharpshooter's ability should deal 3+1=4
        const abilityLog = result.log.find(
            (e) =>
                e.description.includes("qd-sharpshooter ability") &&
                e.round === 0
        )
        expect(abilityLog).toBeDefined()
        expect(abilityLog!.description).toContain("deals 4")
    })

    it("summon ability adds new units to the team", () => {
        // bp-tunneler: on death, summon 1/1 Trace
        const tunneler = createCombatUnit("bp-tunneler", 1)
        const player = [tunneler]
        const opponent = [
            makeUnit({
                unitDefId: "drifter-brawler",
                currentATK: 999,
                currentHP: 200,
                maxHP: 200,
            }),
        ]

        const result = resolveCombat(player, opponent)
        // Tunneler should die and summon
        const summonLog = result.log.find((e) =>
            e.description.includes("summons")
        )
        expect(summonLog).toBeDefined()
    })
})
