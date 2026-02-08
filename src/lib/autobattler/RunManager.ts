import { type CombatBonuses, createCombatUnit, resolveCombat } from "./combat"
import {
    getOpponentStatMultiplier,
    isBossRound,
    pickBossOpponent,
    pickOpponent,
} from "./opponents"
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
    CombatResult,
    FactionId,
    OpponentDef,
    RunReward,
    RunState,
    RunSummary,
    ShopOffer,
} from "./types"
import { getUnitsForFaction, UNIT_MAP } from "./units"

/** Minimum combat wins to count a run as "won" */
export const WIN_THRESHOLD = 5

type RunEventType =
    | "shopOpened"
    | "combatStarted"
    | "combatEnded"
    | "runCompleted"
    | "runLost"
    | "bossDefeated"
type RunCallback = (data?: unknown) => void

export class RunManager {
    private state: RunState
    private shopState: ShopState
    private unlockedUnitIds: Set<string>
    private lastCombatResult: CombatResult | null = null
    private eventListeners: Map<RunEventType, RunCallback[]> = new Map()

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
    private lastBossId: string | undefined = undefined

    // ── Run summary tracking ────────────────────────────────────────────────

    private totalScrapEarned: number = 0
    private totalScrapSpent: number = 0
    private unitsBought: number = 0
    private unitsSold: number = 0
    private bossesDefeated: string[] = []
    /** combatsSurvived tracks how many combats each unit (by unitDefId) has survived */
    private combatsSurvived: Map<string, number> = new Map()

    constructor(unlockedUnitIds: Set<string>, buffs: RunBuff[] = []) {
        this.unlockedUnitIds = unlockedUnitIds

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

    public on(event: RunEventType, callback: RunCallback): void {
        if (!this.eventListeners.has(event)) {
            this.eventListeners.set(event, [])
        }
        this.eventListeners.get(event)?.push(callback)
    }

    private emit(event: RunEventType, data?: unknown): void {
        this.eventListeners.get(event)?.forEach((cb) => cb(data))
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

        // Free reroll from soft-reroll buff
        if (this.freeRerolls > 0) {
            this.freeRerolls--
            this.shopState.offers = generateShopOffers(
                this.unlockedUnitIds,
                3 + this.extraShopSize,
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

        this.state.phase = "combat"
        this.emit("combatStarted")
        return true
    }

    /**
     * Execute combat for the current round using the previewed opponent.
     * Returns the result. Transitions to reward or finished phase.
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

        const playerUnits = this.shopState.lineup.map((u) =>
            createCombatUnit(u.unitDefId, u.level, this.combatBonuses)
        )

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

        const result = resolveCombat(playerUnits, opponentUnits)
        this.lastCombatResult = result

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
        } else {
            this.state.losses++
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

        if (this.state.losses >= 3) {
            this.state.phase = "finished"
            const won = this.state.wins >= WIN_THRESHOLD
            if (won) {
                this.emit("runCompleted", { wins: this.state.wins })
            } else {
                this.emit("runLost", { wins: this.state.wins })
            }
        } else {
            this.state.phase = "reward"
        }

        return result
    }

    /**
     * Advance to the next round (from reward phase).
     */
    public nextRound(): boolean {
        if (this.state.phase !== "reward") return false

        this.state.round++
        addRoundScrap(this.shopState)
        this.totalScrapEarned += 3 // SCRAP_PER_ROUND

        // Ad Revenue buff: bonus thoughts per round
        if (this.hasBuff("ad-revenue")) {
            this.shopState.scrap += 1
            this.totalScrapEarned += 1
        }

        if (this.hasBuff("soft-reroll")) {
            this.freeRerolls = 1
        }

        const preferredFaction = getMajorityLineupFaction(this.shopState.lineup)
        this.shopState.offers = generateShopOffers(
            this.unlockedUnitIds,
            3 + this.extraShopSize,
            preferredFaction
        )
        this.state.phase = "shop"

        // Pre-generate opponent for the new round
        this.generateOpponentPreview()

        this.syncState()
        this.emit("shopOpened")
        return true
    }

    // ── Run summary ─────────────────────────────────────────────────────────

    public getRunSummary(): RunSummary {
        const state = this.getState()
        const majorityFaction = this.getMajorityFaction()

        // Find best unit
        let bestUnit: { unitDefId: string; combatsSurvived: number } | undefined
        let bestCount = 0
        for (const [unitDefId, count] of this.combatsSurvived) {
            if (count > bestCount) {
                bestCount = count
                bestUnit = { unitDefId, combatsSurvived: count }
            }
        }

        return {
            highestRound: state.round,
            wins: state.wins,
            losses: state.losses,
            bossesDefeated: [...this.bossesDefeated],
            majorityFaction,
            bestUnit,
            totalScrapEarned: this.totalScrapEarned,
            totalScrapSpent: this.totalScrapSpent,
            unitsBought: this.unitsBought,
            unitsSold: this.unitsSold,
        }
    }

    /** Determine the majority faction among the current lineup */
    private getMajorityFaction(): string | undefined {
        const state = this.getState()
        const counts = new Map<string, number>()
        for (const unit of state.lineup) {
            const def = UNIT_MAP.get(unit.unitDefId)
            if (def && def.faction !== "drifters") {
                counts.set(def.faction, (counts.get(def.faction) ?? 0) + 1)
            }
        }
        let bestFaction: string | undefined
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

            // Commodity reward based on opponent faction
            const commodityMap: Record<FactionId, string> = {
                quickdraw: "EMAIL",
                deputies: "BW",
                clockwork: "SOFT",
                prospectors: "ADS",
                drifters: "DOM",
            }
            rewards.push({
                type: "commodity",
                description: commodityMap[opponentFaction],
                value: commodityMap[opponentFaction],
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
