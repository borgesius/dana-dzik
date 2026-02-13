import { getPrestigeManager } from "../../lib/prestige/PrestigeManager"
import { type CombatBonuses, createCombatUnit, resolveCombat } from "./combat"
import {
    EVENT_CHANCE,
    EVENT_MAP,
    type EventDef,
    type EventOutcome,
    getRelicBuyCost,
    pickRandomEvent,
} from "./events"
import {
    BOSS_MODIFIER_MAP,
    getOpponentStatMultiplier,
    isBossRound,
    pickBossOpponent,
    pickOpponent,
} from "./opponents"
import {
    getUnlockedRelicDefs,
    RELIC_MAP,
    type RelicDef,
    rollRelicChoices,
} from "./relics"
import type { RunBuff } from "./runBuffs"
import {
    addRoundScrap,
    buyUnit,
    createInitialShopState,
    generateShopOffers,
    getMajorityLineupFaction,
    getSellRefund,
    moveBenchToLineup,
    moveLineupToBench,
    moveUnit,
    rerollShop,
    sellUnit,
    type ShopState,
    swapLineupPositions,
} from "./shop"
import type {
    BossId,
    CombatResult,
    CombatUnit,
    EventId,
    FactionId,
    OpponentDef,
    RelicId,
    RelicInstance,
    RunReward,
    RunState,
    RunSummary,
    ShopOffer,
    UnitId,
} from "./types"
import { getUnitsForFaction, UNIT_MAP } from "./units"

interface RunEventMap {
    shopOpened: undefined
    combatStarted: undefined
    combatEnded: CombatResult
    runEnded: undefined
    bossDefeated: { bossId: BossId; noUnitsLost: boolean }
    eventTriggered: { eventId: EventId }
    relicGained: { relicId: RelicId }
}

export class RunManager {
    private state: RunState
    private shopState: ShopState
    private unlockedUnitIds: Set<UnitId>
    private lastCombatResult: CombatResult | null = null
    private eventListeners = new Map<string, ((data: never) => void)[]>()

    /** Optional career/cross-system combat bonuses for the player */
    public combatBonuses: CombatBonuses = {}

    /** Active pre-run buffs purchased with commodities */
    private activeBuffs: Set<string> = new Set()

    /** Free rerolls remaining (from soft-reroll buff) */
    private freeRerolls: number = 0

    /** Extra shop size (from dom-expansion buff) */
    private extraShopSize: number = 0

    /** Pre-generated opponent for the current round (fixes double-generation) */
    private previewedOpponent: OpponentDef | null = null

    /** Last boss ID to avoid immediate repeats */
    private lastBossId: BossId | undefined = undefined

    // ── Relic state ──────────────────────────────────────────────────────────

    /** Relics held during this run */
    private heldRelics: RelicInstance[] = []

    /** Set of permanently unlocked relic IDs (from collection) */
    private unlockedRelicIds: Set<RelicId> = new Set()

    /** Bonus free rerolls from relics (resets each shop phase) */
    private relicFreeRerolls: number = 0

    /** Extra shop size from relics */
    private relicExtraShopSize: number = 0

    /** Whether the player bought anything this shop phase (for Maxwell's Demon) */
    private boughtThisShop: boolean = false

    /** Bonus free rerolls from events (used once, then cleared) */
    private eventFreeRerolls: number = 0

    /** Max lives (default 3, can be increased by relics) */
    private maxLives: number = 3

    // ── Run summary tracking ────────────────────────────────────────────────

    private totalScrapEarned: number = 0
    private totalScrapSpent: number = 0
    private unitsBought: number = 0
    private unitsSold: number = 0
    private bossesDefeated: BossId[] = []
    /** combatsSurvived tracks how many combats each unit (by unitDefId) has survived */
    private combatsSurvived: Map<UnitId, number> = new Map()
    /** Whether the front unit died in the most recent combat */
    private frontDiedInLastCombat: boolean = false

    constructor(
        unlockedUnitIds: Set<UnitId>,
        buffs: RunBuff[] = [],
        unlockedRelicIds?: Set<RelicId>
    ) {
        this.unlockedUnitIds = unlockedUnitIds
        if (unlockedRelicIds) {
            this.unlockedRelicIds = unlockedRelicIds
        }

        let bonusScrap = 0
        for (const buff of buffs) {
            this.activeBuffs.add(buff.id)
            if (buff.id === "vc-funding") bonusScrap += 5
            if (buff.id === "soft-reroll") this.freeRerolls = 1
            if (buff.id === "dom-expansion") this.extraShopSize = 1
        }

        this.shopState = createInitialShopState(unlockedUnitIds)
        if (bonusScrap > 0) this.shopState.scrap += bonusScrap

        // Regenerate shop with extra size if buff active
        if (this.extraShopSize > 0) {
            this.shopState.offers = generateShopOffers(
                unlockedUnitIds,
                3 + this.extraShopSize
            )
        }

        this.totalScrapEarned = this.shopState.scrap

        this.state = {
            round: 1,
            scrap: this.shopState.scrap,
            lineup: [],
            bench: [],
            wins: 0,
            losses: 0,
            phase: "shop",
            runRewards: [],
            isBossRound: false,
            relics: [],
        }

        // Pre-generate opponent for round 1
        this.generateOpponentPreview()
    }

    /** Check if a specific buff is active for this run */
    public hasBuff(buffId: string): boolean {
        return this.activeBuffs.has(buffId)
    }

    /** Add bonus scrap (e.g., from Foresight upgrades) */
    public addBonusScrap(amount: number): void {
        this.shopState.scrap += amount
        this.totalScrapEarned += amount
        this.syncState()
    }

    // ── Events ───────────────────────────────────────────────────────────────

    public on<K extends keyof RunEventMap>(
        event: K,
        callback: RunEventMap[K] extends undefined
            ? () => void
            : (data: RunEventMap[K]) => void
    ): void {
        if (!this.eventListeners.has(event)) {
            this.eventListeners.set(event, [])
        }
        this.eventListeners.get(event)?.push(callback as (data: never) => void)
    }

    private emit<K extends keyof RunEventMap>(
        event: K,
        ...args: RunEventMap[K] extends undefined ? [] : [data: RunEventMap[K]]
    ): void {
        const data = args[0]
        this.eventListeners
            .get(event)
            ?.forEach((cb) => (cb as (data: unknown) => void)(data))
    }

    // ── State getters ────────────────────────────────────────────────────────

    public getState(): Readonly<RunState> {
        return {
            ...this.state,
            scrap: this.shopState.scrap,
            lineup: [...this.shopState.lineup],
            bench: [...this.shopState.bench],
        }
    }

    public getShopOffers(): ReadonlyArray<ShopOffer> {
        return this.shopState.offers
    }

    public getLastCombatResult(): CombatResult | null {
        return this.lastCombatResult
    }

    public isFinished(): boolean {
        return this.state.phase === "finished"
    }

    public getPreviewedOpponent(): OpponentDef | null {
        return this.previewedOpponent
    }

    public getHeldRelics(): ReadonlyArray<RelicInstance> {
        return this.heldRelics
    }

    public getMaxLives(): number {
        return this.maxLives
    }

    /** Whether the front-line unit died in the last combat (for unlock tracking) */
    public didFrontDieInLastCombat(): boolean {
        return this.frontDiedInLastCombat
    }

    // ── Relic management ─────────────────────────────────────────────────────

    /** Add a relic to the current run */
    public addRelic(relicId: RelicId): void {
        if (this.heldRelics.some((r) => r.relicId === relicId)) return
        this.heldRelics.push({ relicId, acquiredRound: this.state.round })
        this.state.relics = [...this.heldRelics]

        // Apply immediate persistent effects
        const def = RELIC_MAP.get(relicId)
        if (!def) return

        if (def.effect.type === "extraLife") {
            this.maxLives += def.effect.amount ?? 1
        }
        if (def.effect.type === "extraShopSlot") {
            this.relicExtraShopSize += def.effect.amount ?? 1
        }
        if (def.effect.type === "freeReroll") {
            this.relicFreeRerolls += def.effect.amount ?? 1
        }

        this.emit("relicGained", { relicId })
    }

    /** Remove a relic from the current run (for Socratic Method event) */
    public removeRandomRelic(): RelicId | null {
        if (this.heldRelics.length === 0) return null
        const idx = Math.floor(Math.random() * this.heldRelics.length)
        const removed = this.heldRelics.splice(idx, 1)[0]
        this.state.relics = [...this.heldRelics]
        return removed.relicId
    }

    /** Check if a specific relic is held this run */
    public hasRelic(relicId: RelicId): boolean {
        return this.heldRelics.some((r) => r.relicId === relicId)
    }

    /** Get the set of held relic IDs (for filtering choices) */
    public getHeldRelicIds(): Set<RelicId> {
        return new Set(this.heldRelics.map((r) => r.relicId))
    }

    /** Roll N relic choices from the unlocked pool, excluding already-held */
    public rollRelicChoices(count: number): RelicDef[] {
        const pool = getUnlockedRelicDefs(this.unlockedRelicIds)
        return rollRelicChoices(pool, count, this.getHeldRelicIds())
    }

    /** Set pending relic choices on the state (for boss relic pick UI) */
    public setPendingRelicChoices(relicIds: RelicId[]): void {
        this.state.pendingRelicChoices = relicIds
    }

    /** Pick a relic from the pending choices */
    public pickPendingRelic(relicId: RelicId): boolean {
        const pending = this.state.pendingRelicChoices
        if (!pending || !pending.includes(relicId)) return false
        this.addRelic(relicId)
        this.state.pendingRelicChoices = undefined
        return true
    }

    // ── Shop phase actions ───────────────────────────────────────────────────

    public buyUnit(offerIndex: number): boolean {
        if (this.state.phase !== "shop") return false
        const offer = this.shopState.offers[offerIndex]
        if (!offer || offer.sold) return false
        const cost = offer.cost
        const result = buyUnit(this.shopState, offerIndex, this.combatBonuses)
        if (result) {
            this.unitsBought++
            this.totalScrapSpent += cost
            this.boughtThisShop = true
        }
        this.syncState()
        return result
    }

    public sellUnit(source: "lineup" | "bench", index: number): boolean {
        if (this.state.phase !== "shop" && this.state.phase !== "arrange")
            return false
        const list =
            source === "lineup" ? this.shopState.lineup : this.shopState.bench
        const unit = list[index]
        const result = sellUnit(this.shopState, source, index)
        if (result) {
            this.unitsSold++
            // Refund was already added to scrap by sellUnit
            if (unit) {
                this.totalScrapEarned += getSellRefund(unit)
            }
        }
        this.syncState()
        return result
    }

    public reroll(): boolean {
        if (this.state.phase !== "shop") return false

        const preferredFaction = getMajorityLineupFaction(this.shopState.lineup)
        const totalShopSize = 3 + this.extraShopSize + this.relicExtraShopSize

        // Free reroll from soft-reroll buff or relics or events
        const totalFreeRerolls =
            this.freeRerolls + this.relicFreeRerolls + this.eventFreeRerolls
        if (totalFreeRerolls > 0) {
            // Consume event rerolls first, then buff rerolls, then relic
            if (this.eventFreeRerolls > 0) {
                this.eventFreeRerolls--
            } else if (this.freeRerolls > 0) {
                this.freeRerolls--
            } else {
                this.relicFreeRerolls--
            }
            this.shopState.offers = generateShopOffers(
                this.unlockedUnitIds,
                totalShopSize,
                preferredFaction
            )
            this.syncState()
            return true
        }

        const result = rerollShop(this.shopState, this.unlockedUnitIds)
        this.syncState()
        return result
    }

    public moveUnit(
        from: "lineup" | "bench",
        fromIndex: number,
        to: "lineup" | "bench",
        toIndex: number
    ): boolean {
        if (this.state.phase !== "shop" && this.state.phase !== "arrange")
            return false
        const result = moveUnit(this.shopState, from, fromIndex, to, toIndex)
        this.syncState()
        return result
    }

    public swapLineup(indexA: number, indexB: number): boolean {
        if (this.state.phase !== "shop" && this.state.phase !== "arrange")
            return false
        const result = swapLineupPositions(this.shopState, indexA, indexB)
        this.syncState()
        return result
    }

    public benchToLineup(benchIndex: number, lineupIndex: number): boolean {
        if (this.state.phase !== "shop" && this.state.phase !== "arrange")
            return false
        const result = moveBenchToLineup(
            this.shopState,
            benchIndex,
            lineupIndex
        )
        this.syncState()
        return result
    }

    public lineupToBench(lineupIndex: number): boolean {
        if (this.state.phase !== "shop" && this.state.phase !== "arrange")
            return false
        const result = moveLineupToBench(this.shopState, lineupIndex)
        this.syncState()
        return result
    }

    // ── Phase transitions ────────────────────────────────────────────────────

    public readyForCombat(): boolean {
        if (this.state.phase !== "shop" && this.state.phase !== "arrange")
            return false
        if (this.shopState.lineup.length === 0) return false

        // Maxwell's Demon: gain scrap if nothing was bought this shop phase
        if (!this.boughtThisShop && this.hasRelic("maxwells-demon")) {
            const bonus = RELIC_MAP.get("maxwells-demon")?.effect.amount ?? 2
            this.shopState.scrap += bonus
            this.totalScrapEarned += bonus
        }

        this.state.phase = "combat"
        this.emit("combatStarted")
        return true
    }

    /**
     * Execute combat for the current round using the previewed opponent.
     * Returns the result. Transitions to reward or finished phase.
     * Runs combat resolution in a Web Worker when available.
     */
    public executeCombat(): CombatResult | null {
        if (this.state.phase !== "combat") return null

        const opponent = this.previewedOpponent
        if (!opponent) return null

        const statMult = getOpponentStatMultiplier(this.state.round)
        const opponentBonuses: CombatBonuses =
            statMult > 1.0
                ? { atkBonus: statMult - 1, hpBonus: statMult - 1 }
                : {}

        const opponentUnits = opponent.units.map((u) => {
            // Boss units and regular units both get stat scaling
            return createCombatUnit(u.unitId, u.level, opponentBonuses)
        })

        // Apply boss-specific mechanics before combat
        if (opponent.isBoss && opponent.bossId === "boss-noumenon") {
            // Categorical Shield: boss starts with shield = 50% max HP
            const bossUnit = opponentUnits.find(
                (u) => u.unitDefId === "boss-noumenon"
            )
            if (bossUnit) {
                bossUnit.shield = Math.floor(bossUnit.maxHP * 0.5)
            }
        }

        // Apply boss modifier effects before combat
        if (opponent.isBoss && opponent.modifierId) {
            const mod = BOSS_MODIFIER_MAP.get(opponent.modifierId)
            if (mod) {
                const bossUnit = opponentUnits.find(
                    (u) => u.unitDefId === opponent.bossId
                )
                const escortUnits = opponentUnits.filter(
                    (u) => u.unitDefId !== opponent.bossId
                )

                switch (mod.id) {
                    // Generic modifiers
                    case "mod-enraged":
                        if (bossUnit) bossUnit.currentATK += 4
                        break
                    case "mod-fortified":
                        if (bossUnit) {
                            bossUnit.maxHP += 10
                            bossUnit.currentHP += 10
                        }
                        break
                    case "mod-inspiring":
                        for (const u of escortUnits) {
                            u.currentATK += 2
                        }
                        break
                    case "mod-armored":
                        if (bossUnit) {
                            bossUnit.shield = Math.floor(bossUnit.maxHP * 0.3)
                        }
                        break
                    // Faction modifiers
                    case "mod-first-blood":
                        // Dealt as pre-combat damage handled via stat: boss ATK+4 as proxy
                        // (actual combat-start damage is part of the boss ability system)
                        if (bossUnit) bossUnit.currentATK += 4
                        break
                    case "mod-aegis":
                        for (const u of opponentUnits) {
                            u.shield += 3
                        }
                        break
                    case "mod-overclocked":
                        if (bossUnit) {
                            bossUnit.currentATK += 3
                            bossUnit.maxHP += 3
                            bossUnit.currentHP += 3
                        }
                        break
                    case "mod-swarm-spawn":
                        // Summon two 2/2 Traces at the back of the lineup
                        for (let i = 0; i < 2; i++) {
                            const trace = createCombatUnit(
                                "bp-shade",
                                1,
                                opponentBonuses
                            )
                            trace.currentATK = 2
                            trace.currentHP = 2
                            trace.maxHP = 2
                            opponentUnits.push(trace)
                        }
                        break
                }
            }
        }

        const playerUnits = this.shopState.lineup.map((u) =>
            createCombatUnit(u.unitDefId, u.level, this.combatBonuses)
        )

        // ── Apply pre-run buff bonuses ───────────────────────────────────
        if (this.hasBuff("bandwidth-armor")) {
            for (const unit of playerUnits) {
                unit.maxHP += 5
                unit.currentHP += 5
            }
        }
        if (this.hasBuff("email-rush")) {
            for (const unit of playerUnits) {
                unit.currentATK += 1
            }
        }
        if (this.hasBuff("market-intel") && this.state.round === 1) {
            for (const unit of playerUnits) {
                unit.currentATK += 2
            }
        }

        // ── Apply relic pre-combat bonuses ───────────────────────────────
        this.applyRelicPreCombat(playerUnits)

        // Record front unit for tracking
        const frontUnitId = playerUnits[0]?.instanceId

        const result = resolveCombat(playerUnits, opponentUnits)
        this.lastCombatResult = result

        // Track whether front unit died
        this.frontDiedInLastCombat =
            !!frontUnitId &&
            !result.playerSurvivors.some((u) => u.instanceId === frontUnitId)

        // Draw counts as a loss
        if (result.winner === "player") {
            this.state.wins++
            // Track combat survival for best unit
            for (const survivor of result.playerSurvivors) {
                const key = survivor.unitDefId
                this.combatsSurvived.set(
                    key,
                    (this.combatsSurvived.get(key) ?? 0) + 1
                )
            }

            // Yi Jing Trigram: random unit gains permanent +1/+1 on victory
            if (this.hasRelic("yi-jing-trigram")) {
                const survivors = result.playerSurvivors
                if (survivors.length > 0) {
                    const idx = Math.floor(Math.random() * survivors.length)
                    const pick = survivors[idx]
                    const shopUnit = this.shopState.lineup.find(
                        (u) => u.unitDefId === pick.unitDefId
                    )
                    if (shopUnit) {
                        shopUnit.currentATK += 1
                        shopUnit.currentHP += 1
                        shopUnit.maxHP += 1
                    }
                }
            }
        } else {
            this.state.losses++

            // Amor Fati: bonus scrap after losing a combat
            if (this.hasRelic("amor-fati")) {
                const bonus = RELIC_MAP.get("amor-fati")?.effect.amount ?? 3
                this.shopState.scrap += bonus
                this.totalScrapEarned += bonus
            }
        }

        // Ibn Rushd's Mirror: heal survivors after combat
        if (this.hasRelic("ibn-rushds-mirror")) {
            const healAmt =
                RELIC_MAP.get("ibn-rushds-mirror")?.effect.amount ?? 3
            for (const unit of this.shopState.lineup) {
                unit.currentHP = Math.min(unit.maxHP, unit.currentHP + healAmt)
            }
        }

        this.emit("combatEnded", result)

        // Boss tracking
        if (opponent.isBoss && opponent.bossId && result.winner === "player") {
            this.bossesDefeated.push(opponent.bossId)
            this.lastBossId = opponent.bossId
            const noUnitsLost =
                result.playerSurvivors.length === playerUnits.length
            this.emit("bossDefeated", {
                bossId: opponent.bossId,
                noUnitsLost,
            })
        }

        const isBoss = opponent.isBoss ?? false
        const rewards = this.generateRewards(result, opponent.faction, isBoss)
        this.state.runRewards.push(...rewards)

        if (this.state.losses >= this.maxLives) {
            this.state.phase = "finished"
            this.emit("runEnded")
        } else {
            this.state.phase = "reward"
        }

        return result
    }

    /**
     * Advance to the next round (from reward phase).
     * May transition to "event" phase (~40% chance on non-boss rounds) or "shop".
     */
    public nextRound(): boolean {
        if (this.state.phase !== "reward") return false

        if (this.lastCombatResult?.winner === "player") {
            this.state.round++
        }

        addRoundScrap(this.shopState)
        this.totalScrapEarned += 3 // SCRAP_PER_ROUND

        // Ad Revenue buff: bonus thoughts per round
        if (this.hasBuff("ad-revenue")) {
            this.shopState.scrap += 1
            this.totalScrapEarned += 1
        }

        // Wuji relic: +scrap per round
        if (this.hasRelic("wuji")) {
            const bonus = RELIC_MAP.get("wuji")?.effect.amount ?? 1
            this.shopState.scrap += bonus
            this.totalScrapEarned += bonus
        }

        if (this.hasBuff("soft-reroll")) {
            this.freeRerolls = 1
        }

        // Reset per-shop relic rerolls
        this.relicFreeRerolls = 0
        for (const relic of this.heldRelics) {
            const def = RELIC_MAP.get(relic.relicId)
            if (def?.effect.type === "freeReroll") {
                this.relicFreeRerolls += def.effect.amount ?? 1
            }
        }

        // Reset buy tracker for Maxwell's Demon
        this.boughtThisShop = false

        // Roll for random event (~40% chance, not on boss rounds)
        if (!this.state.isBossRound && Math.random() < EVENT_CHANCE) {
            const event = this.rollEvent()
            if (event) {
                this.state.phase = "event"
                this.state.activeEvent = {
                    eventId: event.id,
                    choices: event.choices.map((c, i) => ({
                        choiceIndex: i,
                        label: c.labelKey,
                    })),
                }
                this.syncState()
                this.emit("eventTriggered", { eventId: event.id })
                return true
            }
        }

        this.transitionToShop()
        return true
    }

    /**
     * Resolve an event choice by index.
     */
    public resolveEvent(choiceIndex: number): boolean {
        if (this.state.phase !== "event") return false
        const activeEvent = this.state.activeEvent
        if (!activeEvent) return false

        const eventDef = EVENT_MAP.get(activeEvent.eventId)
        if (!eventDef) {
            this.state.activeEvent = undefined
            this.transitionToShop()
            return true
        }

        const choice = eventDef.choices[choiceIndex]
        if (!choice) {
            this.state.activeEvent = undefined
            this.transitionToShop()
            return true
        }

        // Apply each outcome in the choice
        for (const outcome of choice.outcomes) {
            this.applyEventOutcome(outcome)
        }

        this.state.activeEvent = undefined
        this.transitionToShop()
        return true
    }

    /**
     * Continue from event phase to shop phase (called after event resolution).
     */
    public continueToShop(): boolean {
        if (this.state.phase !== "event") return false
        this.state.activeEvent = undefined
        this.transitionToShop()
        return true
    }

    /** Common logic for entering shop phase */
    private transitionToShop(): void {
        const preferredFaction = getMajorityLineupFaction(this.shopState.lineup)
        const totalShopSize = 3 + this.extraShopSize + this.relicExtraShopSize
        this.shopState.offers = generateShopOffers(
            this.unlockedUnitIds,
            totalShopSize,
            preferredFaction
        )
        this.state.phase = "shop"

        // Pre-generate opponent for the new round
        this.generateOpponentPreview()

        this.syncState()
        this.emit("shopOpened")
    }

    // ── Run summary ─────────────────────────────────────────────────────────

    public getRunSummary(): RunSummary {
        const state = this.getState()
        const majorityFaction = this.getMajorityFaction()

        // Find best unit
        let bestUnit: { unitDefId: UnitId; combatsSurvived: number } | undefined
        let bestCount = 0
        for (const [unitDefId, count] of this.combatsSurvived) {
            if (count > bestCount) {
                bestCount = count
                bestUnit = { unitDefId, combatsSurvived: count }
            }
        }

        return {
            highestRound: state.round,
            losses: state.losses,
            bossesDefeated: [...this.bossesDefeated],
            majorityFaction,
            bestUnit,
            totalScrapEarned: this.totalScrapEarned,
            totalScrapSpent: this.totalScrapSpent,
            unitsBought: this.unitsBought,
            unitsSold: this.unitsSold,
            relicsCollected: this.heldRelics.map((r) => r.relicId),
        }
    }

    /** Determine the majority faction among the current lineup */
    private getMajorityFaction(): FactionId | undefined {
        const state = this.getState()
        const counts = new Map<FactionId, number>()
        for (const unit of state.lineup) {
            const def = UNIT_MAP.get(unit.unitDefId)
            if (def && def.faction !== "drifters") {
                counts.set(def.faction, (counts.get(def.faction) ?? 0) + 1)
            }
        }
        let bestFaction: FactionId | undefined
        let bestCount = 0
        for (const [faction, count] of counts) {
            if (count > bestCount) {
                bestCount = count
                bestFaction = faction
            }
        }
        if (bestFaction && bestCount > state.lineup.length / 2) {
            return bestFaction
        }
        return undefined
    }

    // ── Event helpers ─────────────────────────────────────────────────────────

    private rollEvent(): EventDef | null {
        const state = this.getState()
        return pickRandomEvent({
            lineupSize: state.lineup.length,
            benchSize: state.bench.length,
            scrap: state.scrap,
            relicCount: this.heldRelics.length,
            round: state.round,
        })
    }

    private applyEventOutcome(outcome: EventOutcome): void {
        switch (outcome.type) {
            case "gainRelic": {
                const pool = getUnlockedRelicDefs(this.unlockedRelicIds)
                let filtered = pool
                if (outcome.relicTier) {
                    filtered = pool.filter((r) => r.tier === outcome.relicTier)
                }
                const choices = rollRelicChoices(
                    filtered.length > 0 ? filtered : pool,
                    1,
                    this.getHeldRelicIds()
                )
                if (choices.length > 0) {
                    this.addRelic(choices[0].id)
                }
                break
            }
            case "gainScrap": {
                const amt = outcome.amount ?? 0
                this.shopState.scrap += amt
                this.totalScrapEarned += amt
                break
            }
            case "loseScrap": {
                const amt = Math.min(outcome.amount ?? 0, this.shopState.scrap)
                this.shopState.scrap -= amt
                break
            }
            case "sacrificeWeakest": {
                if (this.shopState.lineup.length > 1) {
                    let weakIdx = 0
                    let weakPower = Infinity
                    for (let i = 0; i < this.shopState.lineup.length; i++) {
                        const u = this.shopState.lineup[i]
                        const power = u.currentATK + u.currentHP
                        if (power < weakPower) {
                            weakPower = power
                            weakIdx = i
                        }
                    }
                    this.shopState.lineup.splice(weakIdx, 1)
                }
                break
            }
            case "allUnitsLoseHP": {
                const amt = outcome.amount ?? 0
                for (const u of this.shopState.lineup) {
                    u.currentHP = Math.max(1, u.currentHP - amt)
                    u.maxHP = Math.max(1, u.maxHP - amt)
                }
                break
            }
            case "frontUnitLoseHP": {
                const amt = outcome.amount ?? 0
                if (this.shopState.lineup.length > 0) {
                    const front = this.shopState.lineup[0]
                    front.currentHP = Math.max(1, front.currentHP - amt)
                    front.maxHP = Math.max(1, front.maxHP - amt)
                }
                break
            }
            case "allUnitsGainATK": {
                const amt = outcome.amount ?? 0
                for (const u of this.shopState.lineup) {
                    u.currentATK += amt
                }
                break
            }
            case "allUnitsGainHP": {
                const amt = outcome.amount ?? 0
                for (const u of this.shopState.lineup) {
                    u.currentHP += amt
                    u.maxHP += amt
                }
                break
            }
            case "strongestGainATK": {
                const amt = outcome.amount ?? 0
                let strongest = this.shopState.lineup[0]
                for (const u of this.shopState.lineup) {
                    if (u.currentATK > (strongest?.currentATK ?? 0)) {
                        strongest = u
                    }
                }
                if (strongest) strongest.currentATK += amt
                break
            }
            case "strongestLoseHP": {
                const amt = outcome.amount ?? 0
                let strongest = this.shopState.lineup[0]
                for (const u of this.shopState.lineup) {
                    if (u.currentATK > (strongest?.currentATK ?? 0)) {
                        strongest = u
                    }
                }
                if (strongest) {
                    strongest.currentHP = Math.max(1, strongest.currentHP - amt)
                    strongest.maxHP = Math.max(1, strongest.maxHP - amt)
                }
                break
            }
            case "swapAtkHp": {
                for (const u of this.shopState.lineup) {
                    const oldAtk = u.currentATK
                    u.currentATK = u.currentHP
                    u.currentHP = oldAtk
                    u.maxHP = oldAtk
                }
                break
            }
            case "gambleScrap": {
                if (Math.random() < 0.5) {
                    const bonus = this.shopState.scrap
                    this.shopState.scrap *= 2
                    this.totalScrapEarned += bonus
                } else {
                    this.shopState.scrap = Math.ceil(this.shopState.scrap / 2)
                }
                break
            }
            case "sellBench": {
                for (const u of this.shopState.bench) {
                    const refund = getSellRefund(u) * 2
                    this.shopState.scrap += refund
                    this.totalScrapEarned += refund
                    this.unitsSold++
                }
                this.shopState.bench = []
                break
            }
            case "freeRerolls": {
                this.eventFreeRerolls += outcome.amount ?? 0
                break
            }
            case "randomUnitGainATK": {
                const amt = outcome.amount ?? 1
                if (this.shopState.lineup.length > 0) {
                    const idx = Math.floor(
                        Math.random() * this.shopState.lineup.length
                    )
                    this.shopState.lineup[idx].currentATK += amt
                }
                break
            }
            case "removeRelic": {
                this.removeRandomRelic()
                break
            }
            case "buyRelic": {
                // Buy relic: check affordability, deduct scrap, add relic
                const tier = outcome.relicTier ?? "common"
                const cost = getRelicBuyCost(tier)
                if (this.shopState.scrap >= cost) {
                    this.shopState.scrap -= cost
                    this.totalScrapSpent += cost
                    const pool = getUnlockedRelicDefs(this.unlockedRelicIds)
                    const filtered = pool.filter((r) => r.tier === tier)
                    const choices = rollRelicChoices(
                        filtered.length > 0 ? filtered : pool,
                        1,
                        this.getHeldRelicIds()
                    )
                    if (choices.length > 0) {
                        this.addRelic(choices[0].id)
                    }
                }
                break
            }
            case "healAll": {
                for (const u of this.shopState.lineup) {
                    u.currentHP = u.maxHP
                }
                break
            }
        }
        this.syncState()
    }

    // ── Relic pre-combat application ────────────────────────────────────────

    private applyRelicPreCombat(playerUnits: CombatUnit[]): void {
        for (const relic of this.heldRelics) {
            const def = RELIC_MAP.get(relic.relicId)
            if (!def) continue

            switch (def.effect.type) {
                case "atkFront": {
                    // Aletheia: +ATK to front-line unit
                    if (playerUnits.length > 0) {
                        playerUnits[0].currentATK += def.effect.amount ?? 2
                    }
                    break
                }
                case "hpAll": {
                    // Golden Mean: +HP to all units
                    const amt = def.effect.amount ?? 4
                    for (const u of playerUnits) {
                        u.maxHP += amt
                        u.currentHP += amt
                    }
                    break
                }
                case "shieldAll": {
                    // Uncarved Block: all units start with shield
                    const amt = def.effect.amount ?? 3
                    for (const u of playerUnits) {
                        u.shield += amt
                    }
                    break
                }
                case "healCombatStart": {
                    // Tetrapharmakos: heal all units at combat start
                    const amt = def.effect.amount ?? 2
                    for (const u of playerUnits) {
                        u.currentHP = Math.min(u.maxHP, u.currentHP + amt)
                    }
                    break
                }
                case "tier1Boost": {
                    // Philosopher's Stone: buff tier 1 units
                    const amt = def.effect.amount ?? 3
                    for (const u of playerUnits) {
                        const unitDef = UNIT_MAP.get(u.unitDefId)
                        if (unitDef && unitDef.tier === 1) {
                            u.currentATK += amt
                            u.maxHP += amt
                            u.currentHP += amt
                        }
                    }
                    break
                }
                case "randomAllyAtkCombatStart": {
                    // Rubber Duck: random ally gains ATK before combat
                    if (playerUnits.length > 0) {
                        const idx = Math.floor(
                            Math.random() * playerUnits.length
                        )
                        playerUnits[idx].currentATK += def.effect.amount ?? 3
                    }
                    break
                }
                case "multiFactionBonus": {
                    // Maat: bonus stats when lineup has 2+ factions
                    const factions = new Set(playerUnits.map((u) => u.faction))
                    if (factions.size >= 2) {
                        const amt = def.effect.amount ?? 2
                        for (const u of playerUnits) {
                            u.currentATK += amt
                            u.maxHP += amt
                            u.currentHP += amt
                        }
                    }
                    break
                }
                // Other relic types are handled elsewhere (combat resolution, shop, etc.)
                default:
                    break
            }
        }
    }

    // ── Internal ─────────────────────────────────────────────────────────────

    private generateOpponentPreview(): void {
        const round = this.state.round
        if (isBossRound(round)) {
            this.previewedOpponent = pickBossOpponent(round, this.lastBossId)
            this.state.isBossRound = true
            this.state.currentBossId = this.previewedOpponent.bossId
        } else {
            this.previewedOpponent = pickOpponent(round)
            this.state.isBossRound = false
            this.state.currentBossId = undefined
        }
    }

    private syncState(): void {
        this.state.scrap = this.shopState.scrap
        this.state.lineup = [...this.shopState.lineup]
        this.state.bench = [...this.shopState.bench]
    }

    private generateRewards(
        result: CombatResult,
        opponentFaction: FactionId,
        isBoss: boolean
    ): RunReward[] {
        const rewards: RunReward[] = []
        const xpMultiplier = isBoss ? 2 : 1

        if (result.winner === "player") {
            // XP reward
            const xpAmount = (15 + this.state.round * 5) * xpMultiplier
            rewards.push({
                type: "xp",
                description: isBoss ? "Boss victory XP" : "Combat victory XP",
                value: xpAmount,
            })

            // Thought bonus
            const scrapBonus = isBoss ? 4 : 2
            rewards.push({
                type: "scrap",
                description: "Victory thoughts",
                value: scrapBonus,
            })
            this.shopState.scrap += scrapBonus
            this.totalScrapEarned += scrapBonus

            // Commodity reward based on opponent faction (boss uses premium tier)
            const commodityMap: Record<FactionId, string> = {
                quickdraw: "EMAIL",
                deputies: "BW",
                clockwork: "SOFT",
                prospectors: "ADS",
                drifters: "DOM",
            }
            const premiumCommodities = ["BW", "SOFT", "VC"] as const
            let commodityId: string
            if (isBoss) {
                commodityId =
                    premiumCommodities[
                        Math.floor(Math.random() * premiumCommodities.length)
                    ]
            } else {
                commodityId = commodityMap[opponentFaction]
            }
            const prestigeCount = getPrestigeManager().getCount()
            let quantity = 1 + Math.floor(prestigeCount / 3)
            if (getPrestigeManager().hasCrossPollination()) {
                quantity *= 2
            }
            rewards.push({
                type: "commodity",
                description: commodityId,
                value: commodityId,
                quantity,
            })

            // Unit unlock: win vs a themed faction, unlock a random unowned unit
            // Boss rounds guarantee a faction unit unlock
            if (opponentFaction !== "drifters") {
                const factionUnits = getUnitsForFaction(opponentFaction)
                const unowned = factionUnits.filter(
                    (u) => !this.unlockedUnitIds.has(u.id)
                )
                if (unowned.length > 0 && (isBoss || Math.random() < 0.7)) {
                    const pick =
                        unowned[Math.floor(Math.random() * unowned.length)]
                    rewards.push({
                        type: "unit",
                        description: pick.id,
                        value: pick.id,
                    })
                }
            }

            // Boss relic drop: offer a choice of 3 relics
            if (isBoss) {
                const choices = this.rollRelicChoices(3)
                if (choices.length > 0) {
                    this.setPendingRelicChoices(choices.map((c) => c.id))
                    rewards.push({
                        type: "relic",
                        description: "Boss relic choice",
                        value: choices.map((c) => c.id).join(","),
                    })
                }
            }
        } else {
            // Consolation XP
            rewards.push({
                type: "xp",
                description: "Participation XP",
                value: 5,
            })
        }

        return rewards
    }
}
