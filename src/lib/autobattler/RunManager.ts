import { type CombatBonuses, createCombatUnit, resolveCombat } from "./combat"
import { pickOpponent } from "./opponents"
import type { RunBuff } from "./runBuffs"
import {
    addRoundScrap,
    buyUnit,
    createInitialShopState,
    generateShopOffers,
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
    RunReward,
    RunState,
    ShopOffer,
} from "./types"
import { getUnitsForFaction } from "./units"

export const DEFAULT_TOTAL_ROUNDS = 5

type RunEventType =
    | "shopOpened"
    | "combatStarted"
    | "combatEnded"
    | "runCompleted"
    | "runLost"
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

    constructor(
        unlockedUnitIds: Set<string>,
        totalRounds: number = DEFAULT_TOTAL_ROUNDS,
        buffs: RunBuff[] = []
    ) {
        this.unlockedUnitIds = unlockedUnitIds

        let bonusScrap = 0
        for (const buff of buffs) {
            this.activeBuffs.add(buff.id)
            if (buff.id === "vc-funding") bonusScrap += 3
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

        this.state = {
            round: 1,
            totalRounds,
            scrap: this.shopState.scrap,
            lineup: [],
            bench: [],
            wins: 0,
            losses: 0,
            phase: "shop",
            runRewards: [],
        }
    }

    /** Check if a specific buff is active for this run */
    public hasBuff(buffId: string): boolean {
        return this.activeBuffs.has(buffId)
    }

    /** Add bonus scrap (e.g., from Foresight upgrades) */
    public addBonusScrap(amount: number): void {
        this.shopState.scrap += amount
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

    // ── Shop phase actions ───────────────────────────────────────────────────

    public buyUnit(offerIndex: number): boolean {
        if (this.state.phase !== "shop") return false
        const result = buyUnit(this.shopState, offerIndex)
        this.syncState()
        return result
    }

    public sellUnit(source: "lineup" | "bench", index: number): boolean {
        if (this.state.phase !== "shop" && this.state.phase !== "arrange")
            return false
        const result = sellUnit(this.shopState, source, index)
        this.syncState()
        return result
    }

    public reroll(): boolean {
        if (this.state.phase !== "shop") return false

        // Free reroll from soft-reroll buff
        if (this.freeRerolls > 0) {
            this.freeRerolls--
            this.shopState.offers = generateShopOffers(
                this.unlockedUnitIds,
                3 + this.extraShopSize
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
     * Execute combat for the current round. Returns the result.
     * Calling this also transitions to the reward phase.
     */
    public executeCombat(): CombatResult | null {
        if (this.state.phase !== "combat") return null

        const opponent = pickOpponent(this.state.round)
        const opponentUnits = opponent.units.map((u) =>
            createCombatUnit(u.unitId, u.level)
        )

        const playerUnits = this.shopState.lineup.map((u) =>
            createCombatUnit(u.unitDefId, u.level, this.combatBonuses)
        )

        if (this.hasBuff("bandwidth-armor")) {
            for (const unit of playerUnits) {
                unit.maxHP += 5
                unit.currentHP += 5
            }
        }
        if (this.hasBuff("email-rush") && this.state.round === 1) {
            for (const unit of playerUnits) {
                unit.currentATK += 2
            }
        }

        const result = resolveCombat(playerUnits, opponentUnits)
        this.lastCombatResult = result

        if (result.winner === "player") {
            this.state.wins++
        } else {
            this.state.losses++
        }

        this.emit("combatEnded", result)

        const rewards = this.generateRewards(result, opponent.faction)
        this.state.runRewards.push(...rewards)

        if (
            this.state.round >= this.state.totalRounds ||
            this.state.losses >= 3
        ) {
            this.state.phase = "finished"
            if (this.state.losses >= 3) {
                this.emit("runLost", { wins: this.state.wins })
            } else {
                this.emit("runCompleted", { wins: this.state.wins })
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

        // Ad Revenue buff: bonus thoughts per round
        if (this.hasBuff("ad-revenue")) {
            this.shopState.scrap += 2
        }

        if (this.hasBuff("soft-reroll")) {
            this.freeRerolls = 1
        }

        this.shopState.offers = generateShopOffers(
            this.unlockedUnitIds,
            3 + this.extraShopSize
        )
        this.state.phase = "shop"
        this.syncState()
        this.emit("shopOpened")
        return true
    }

    // ── Internal ─────────────────────────────────────────────────────────────

    private syncState(): void {
        this.state.scrap = this.shopState.scrap
        this.state.lineup = [...this.shopState.lineup]
        this.state.bench = [...this.shopState.bench]
    }

    private generateRewards(
        result: CombatResult,
        opponentFaction: FactionId
    ): RunReward[] {
        const rewards: RunReward[] = []

        if (result.winner === "player") {
            // XP reward
            rewards.push({
                type: "xp",
                description: "Combat victory XP",
                value: 15 + this.state.round * 5,
            })

            // Thought bonus
            rewards.push({
                type: "scrap",
                description: "Victory thoughts",
                value: 2,
            })
            this.shopState.scrap += 2

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
                description: `${commodityMap[opponentFaction]} commodity`,
                value: commodityMap[opponentFaction],
            })

            // Unit unlock: win vs a themed faction, unlock a random unowned unit
            if (opponentFaction !== "drifters") {
                const factionUnits = getUnitsForFaction(opponentFaction)
                const unowned = factionUnits.filter(
                    (u) => !this.unlockedUnitIds.has(u.id)
                )
                if (unowned.length > 0) {
                    const pick =
                        unowned[Math.floor(Math.random() * unowned.length)]
                    rewards.push({
                        type: "unit",
                        description: `Recruited ${pick.name}`,
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
