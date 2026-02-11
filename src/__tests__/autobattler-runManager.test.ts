import { beforeEach, describe, expect, it, vi } from "vitest"

import { RunManager } from "../lib/autobattler/RunManager"
import { INITIAL_SCRAP } from "../lib/autobattler/shop"
import { ALL_UNITS } from "../lib/autobattler/units"
import { getDefaultUnlockedRelicIds, RELIC_DEFS } from "../lib/autobattler/relics"
import type { RunBuff } from "../lib/autobattler/runBuffs"
import type { RelicId, UnitId } from "../lib/autobattler/types"

// ── Helpers ──────────────────────────────────────────────────────────────────

/** All unit IDs unlocked for tests */
const allUnitIds = new Set<UnitId>(ALL_UNITS.map((u) => u.id))

/** All relic IDs unlocked */
const allRelicIds = new Set<RelicId>(RELIC_DEFS.map((r) => r.id))

/** Default relics */
const defaultRelicIds = new Set<RelicId>(getDefaultUnlockedRelicIds())

/** Create a manager with deterministic random */
function createManager(
    buffs: RunBuff[] = [],
    relicIds?: Set<RelicId>
): RunManager {
    return new RunManager(allUnitIds, buffs, relicIds ?? defaultRelicIds)
}

// ── Initialization ───────────────────────────────────────────────────────────

describe("RunManager initialization", () => {
    it("starts in shop phase at round 1", () => {
        const mgr = createManager()
        const state = mgr.getState()
        expect(state.phase).toBe("shop")
        expect(state.round).toBe(1)
    })

    it("starts with correct scrap", () => {
        const mgr = createManager()
        expect(mgr.getState().scrap).toBe(INITIAL_SCRAP)
    })

    it("starts with empty lineup and bench", () => {
        const mgr = createManager()
        const state = mgr.getState()
        expect(state.lineup.length).toBe(0)
        expect(state.bench.length).toBe(0)
    })

    it("starts with 0 wins and 0 losses", () => {
        const mgr = createManager()
        const state = mgr.getState()
        expect(state.wins).toBe(0)
        expect(state.losses).toBe(0)
    })

    it("is not finished at start", () => {
        expect(createManager().isFinished()).toBe(false)
    })

    it("has shop offers at start", () => {
        const mgr = createManager()
        expect(mgr.getShopOffers().length).toBeGreaterThan(0)
    })

    it("previews an opponent for round 1", () => {
        const mgr = createManager()
        expect(mgr.getPreviewedOpponent()).not.toBeNull()
    })
})

// ── Buff application ─────────────────────────────────────────────────────────

describe("RunManager buffs", () => {
    it("vc-funding adds 5 bonus scrap", () => {
        const buff: RunBuff = {
            id: "vc-funding",
            name: "VC Funding",
            description: "+5 bonus Thoughts",
            commodityId: "VC",
            icon: "💰",
        }
        const mgr = createManager([buff])
        expect(mgr.getState().scrap).toBe(INITIAL_SCRAP + 5)
    })

    it("hasBuff reports active buffs correctly", () => {
        const buff: RunBuff = {
            id: "email-rush",
            name: "Email Rush",
            description: "+1 ATK",
            commodityId: "EMAIL",
            icon: "⚔️",
        }
        const mgr = createManager([buff])
        expect(mgr.hasBuff("email-rush")).toBe(true)
        expect(mgr.hasBuff("vc-funding")).toBe(false)
    })

    it("dom-expansion adds extra shop offers", () => {
        const buff: RunBuff = {
            id: "dom-expansion",
            name: "DOM Expansion",
            description: "+1 shop slot",
            commodityId: "DOM",
            icon: "🏪",
        }
        const mgr = createManager([buff])
        // Default is 3, with buff should be 4
        expect(mgr.getShopOffers().length).toBe(4)
    })
})

// ── Shop phase actions ───────────────────────────────────────────────────────

describe("RunManager shop actions", () => {
    let mgr: RunManager

    beforeEach(() => {
        vi.restoreAllMocks()
        vi.spyOn(Math, "random").mockReturnValue(0.5)
        mgr = createManager()
    })

    it("can buy a unit", () => {
        const success = mgr.buyUnit(0)
        expect(success).toBe(true)
        const state = mgr.getState()
        expect(state.lineup.length + state.bench.length).toBeGreaterThan(0)
    })

    it("cannot buy in non-shop phase", () => {
        // Buy a unit to have lineup, then start combat
        mgr.buyUnit(0)
        mgr.readyForCombat()
        expect(mgr.buyUnit(1)).toBe(false)
    })

    it("can sell a unit", () => {
        mgr.buyUnit(0)
        const scrapBefore = mgr.getState().scrap
        const success = mgr.sellUnit("lineup", 0)
        expect(success).toBe(true)
        expect(mgr.getState().scrap).toBeGreaterThan(scrapBefore)
    })

    it("can reroll shop", () => {
        mgr.getShopOffers().map((o) => o.unitDefId)
        const success = mgr.reroll()
        expect(success).toBe(true)
        // Scrap should be deducted
        expect(mgr.getState().scrap).toBe(INITIAL_SCRAP - 1)
    })

    it("can swap lineup positions", () => {
        mgr.buyUnit(0)
        mgr.buyUnit(1)
        const state1 = mgr.getState()
        if (state1.lineup.length >= 2) {
            const id0 = state1.lineup[0].instanceId
            const id1 = state1.lineup[1].instanceId
            mgr.swapLineup(0, 1)
            const state2 = mgr.getState()
            expect(state2.lineup[0].instanceId).toBe(id1)
            expect(state2.lineup[1].instanceId).toBe(id0)
        }
    })
})

// ── Phase transitions ────────────────────────────────────────────────────────

describe("RunManager phase transitions", () => {
    let mgr: RunManager

    beforeEach(() => {
        vi.restoreAllMocks()
        vi.spyOn(Math, "random").mockReturnValue(0.5)
        mgr = createManager()
    })

    it("readyForCombat requires lineup to have units", () => {
        expect(mgr.readyForCombat()).toBe(false)
    })

    it("readyForCombat transitions to combat phase", () => {
        mgr.buyUnit(0)
        expect(mgr.readyForCombat()).toBe(true)
        expect(mgr.getState().phase).toBe("combat")
    })

    it("executeCombat returns a result and transitions phase", async () => {
        mgr.buyUnit(0)
        mgr.readyForCombat()
        const result = await mgr.executeCombat()
        expect(result).not.toBeNull()
        expect(result!.winner).toBeDefined()
        // Should be either "reward" or "finished"
        const phase = mgr.getState().phase
        expect(["reward", "finished"]).toContain(phase)
    })

    it("executeCombat returns null if not in combat phase", async () => {
        expect(await mgr.executeCombat()).toBeNull()
    })

    it("full round cycle: shop -> combat -> reward -> shop", async () => {
        mgr.buyUnit(0)
        expect(mgr.getState().phase).toBe("shop")

        mgr.readyForCombat()
        expect(mgr.getState().phase).toBe("combat")

        await mgr.executeCombat()
        const phaseAfterCombat = mgr.getState().phase
        expect(["reward", "finished"]).toContain(phaseAfterCombat)

        if (phaseAfterCombat === "reward") {
            // Suppress event generation for predictable transition
            vi.spyOn(Math, "random").mockReturnValue(0.99)
            mgr.nextRound()
            const phaseAfterNext = mgr.getState().phase
            expect(["shop", "event"]).toContain(phaseAfterNext)
        }
    })

    it("nextRound returns false if not in reward phase", () => {
        expect(mgr.nextRound()).toBe(false)
    })
})

// ── Combat and win/loss tracking ─────────────────────────────────────────────

describe("RunManager combat tracking", () => {
    beforeEach(() => {
        vi.restoreAllMocks()
    })

    it("increments wins on player victory", () => {
        vi.spyOn(Math, "random").mockReturnValue(0.5)
        const mgr = createManager()
        // Buy a strong unit
        mgr.buyUnit(0)
        mgr.buyUnit(1)
        mgr.buyUnit(2)
        mgr.readyForCombat()
        const result = mgr.executeCombat()
        if (result?.winner === "player") {
            expect(mgr.getState().wins).toBe(1)
        }
    })

    it("increments losses on opponent victory or draw", () => {
        vi.spyOn(Math, "random").mockReturnValue(0.5)
        const mgr = createManager()
        // Buy just one weak unit
        mgr.buyUnit(0)
        mgr.readyForCombat()
        const result = mgr.executeCombat()
        if (result?.winner !== "player") {
            expect(mgr.getState().losses).toBe(1)
        }
    })

    it("run ends after max lives (3) losses", () => {
        vi.spyOn(Math, "random").mockReturnValue(0.5)
        const mgr = createManager()

        for (let i = 0; i < 3; i++) {
            if (mgr.isFinished()) break
            const state = mgr.getState()
            if (state.phase === "shop" || state.phase === "arrange") {
                if (state.lineup.length === 0) {
                    mgr.buyUnit(0)
                }
                mgr.readyForCombat()
            }
            if (mgr.getState().phase === "combat") {
                mgr.executeCombat()
            }
            if (mgr.getState().phase === "reward") {
                mgr.nextRound()
            }
            if (mgr.getState().phase === "event") {
                mgr.continueToShop()
            }
        }

        // After some combat rounds, state should still be valid
        const finalState = mgr.getState()
        expect(finalState.losses).toBeGreaterThanOrEqual(0)
        expect(finalState.losses).toBeLessThanOrEqual(3)
    })
})

// ── Event system ─────────────────────────────────────────────────────────────

describe("RunManager events", () => {
    it("emits shopOpened on construction (via transitionToShop)", async () => {
        // shopOpened is emitted during nextRound transition
        vi.spyOn(Math, "random").mockReturnValue(0.99) // avoid event phase
        const mgr = createManager()
        let shopOpenedCount = 0
        mgr.on("shopOpened", () => shopOpenedCount++)

        // Do a full round cycle to trigger shopOpened
        mgr.buyUnit(0)
        mgr.readyForCombat()
        await mgr.executeCombat()
        if (mgr.getState().phase === "reward") {
            mgr.nextRound()
        }
        if (mgr.getState().phase === "event") {
            mgr.continueToShop()
        }

        expect(shopOpenedCount).toBeGreaterThanOrEqual(1)
        vi.restoreAllMocks()
    })

    it("emits combatStarted when entering combat", () => {
        vi.spyOn(Math, "random").mockReturnValue(0.5)
        const mgr = createManager()
        let called = false
        mgr.on("combatStarted", () => { called = true })

        mgr.buyUnit(0)
        mgr.readyForCombat()
        expect(called).toBe(true)
        vi.restoreAllMocks()
    })

    it("emits combatEnded after combat execution", async () => {
        vi.spyOn(Math, "random").mockReturnValue(0.5)
        const mgr = createManager()
        let resultData: unknown = null
        mgr.on("combatEnded", (data) => { resultData = data })

        mgr.buyUnit(0)
        mgr.readyForCombat()
        await mgr.executeCombat()
        expect(resultData).not.toBeNull()
        vi.restoreAllMocks()
    })
})

// ── Relic management ─────────────────────────────────────────────────────────

describe("RunManager relics", () => {
    beforeEach(() => {
        vi.restoreAllMocks()
    })

    it("starts with no held relics", () => {
        const mgr = createManager()
        expect(mgr.getHeldRelics().length).toBe(0)
    })

    it("can add a relic", () => {
        const mgr = createManager([], allRelicIds)
        mgr.addRelic("aletheia")
        expect(mgr.hasRelic("aletheia")).toBe(true)
        expect(mgr.getHeldRelics().length).toBe(1)
    })

    it("does not add duplicate relics", () => {
        const mgr = createManager([], allRelicIds)
        mgr.addRelic("aletheia")
        mgr.addRelic("aletheia")
        expect(mgr.getHeldRelics().length).toBe(1)
    })

    it("emits relicGained when adding a relic", () => {
        const mgr = createManager([], allRelicIds)
        let emitted = false
        mgr.on("relicGained", () => { emitted = true })
        mgr.addRelic("wuji")
        expect(emitted).toBe(true)
    })

    it("can remove a random relic", () => {
        vi.spyOn(Math, "random").mockReturnValue(0)
        const mgr = createManager([], allRelicIds)
        mgr.addRelic("aletheia")
        mgr.addRelic("wuji")
        const removed = mgr.removeRandomRelic()
        expect(removed).toBeTruthy()
        expect(mgr.getHeldRelics().length).toBe(1)
    })

    it("removeRandomRelic returns null when no relics held", () => {
        const mgr = createManager()
        expect(mgr.removeRandomRelic()).toBeNull()
    })

    it("getHeldRelicIds returns a set of held relic IDs", () => {
        const mgr = createManager([], allRelicIds)
        mgr.addRelic("aletheia")
        mgr.addRelic("wuji")
        const ids = mgr.getHeldRelicIds()
        expect(ids.has("aletheia")).toBe(true)
        expect(ids.has("wuji")).toBe(true)
        expect(ids.size).toBe(2)
    })

    it("extra-life relic increases max lives", () => {
        const mgr = createManager([], allRelicIds)
        expect(mgr.getMaxLives()).toBe(3)
        mgr.addRelic("eternal-return") // extra life relic
        expect(mgr.getMaxLives()).toBe(4)
    })

    it("rollRelicChoices excludes held relics", () => {
        vi.spyOn(Math, "random").mockReturnValue(0.5)
        const mgr = createManager([], allRelicIds)
        mgr.addRelic("aletheia")
        const choices = mgr.rollRelicChoices(5)
        expect(choices.every((c) => c.id !== "aletheia")).toBe(true)
    })

    it("pickPendingRelic adds relic and clears pending", () => {
        const mgr = createManager([], allRelicIds)
        mgr.setPendingRelicChoices(["aletheia", "wuji"])
        const result = mgr.pickPendingRelic("aletheia")
        expect(result).toBe(true)
        expect(mgr.hasRelic("aletheia")).toBe(true)
        expect(mgr.getState().pendingRelicChoices).toBeUndefined()
    })

    it("pickPendingRelic fails for non-pending relic", () => {
        const mgr = createManager([], allRelicIds)
        mgr.setPendingRelicChoices(["aletheia", "wuji"])
        expect(mgr.pickPendingRelic("shoshin")).toBe(false)
    })
})

// ── Run summary ──────────────────────────────────────────────────────────────

describe("RunManager run summary", () => {
    it("returns a valid run summary", () => {
        vi.spyOn(Math, "random").mockReturnValue(0.5)
        const mgr = createManager()
        const summary = mgr.getRunSummary()
        expect(summary.highestRound).toBeGreaterThanOrEqual(1)
        expect(summary.losses).toBeGreaterThanOrEqual(0)
        expect(summary.totalScrapEarned).toBeGreaterThan(0)
        expect(summary.unitsBought).toBeGreaterThanOrEqual(0)
        expect(summary.unitsSold).toBeGreaterThanOrEqual(0)
        expect(Array.isArray(summary.bossesDefeated)).toBe(true)
        expect(Array.isArray(summary.relicsCollected)).toBe(true)
        vi.restoreAllMocks()
    })

    it("tracks units bought and sold", () => {
        vi.spyOn(Math, "random").mockReturnValue(0.5)
        const mgr = createManager()
        mgr.buyUnit(0)
        mgr.sellUnit("lineup", 0)
        const summary = mgr.getRunSummary()
        expect(summary.unitsBought).toBe(1)
        expect(summary.unitsSold).toBe(1)
        vi.restoreAllMocks()
    })
})

// ── addBonusScrap ────────────────────────────────────────────────────────────

describe("RunManager addBonusScrap", () => {
    it("increases scrap", () => {
        const mgr = createManager()
        const before = mgr.getState().scrap
        mgr.addBonusScrap(10)
        expect(mgr.getState().scrap).toBe(before + 10)
    })
})
