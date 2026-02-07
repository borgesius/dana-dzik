import { type CombatBonuses, createCombatUnit, resolveCombat } from "./combat"
import { pickOpponent } from "./opponents"
import {
    addRoundScrap,
    buyUnit,
    createInitialShopState,
    generateShopOffers,
    moveUnit,
    rerollShop,
    sellUnit,
    type ShopState,
} from "./shop"
import type { CombatResult, FactionId, RunReward, RunState, ShopOffer } from "./types"

const DEFAULT_TOTAL_ROUNDS = 5

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

    constructor(unlockedUnitIds: Set<string>, totalRounds: number = DEFAULT_TOTAL_ROUNDS) {
        this.unlockedUnitIds = unlockedUnitIds
        this.shopState = createInitialShopState(unlockedUnitIds)

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
        if (this.state.phase !== "shop" && this.state.phase !== "arrange") return false
        const result = sellUnit(this.shopState, source, index)
        this.syncState()
        return result
    }

    public reroll(): boolean {
        if (this.state.phase !== "shop") return false
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
        if (this.state.phase !== "shop" && this.state.phase !== "arrange") return false
        const result = moveUnit(this.shopState, from, fromIndex, to, toIndex)
        this.syncState()
        return result
    }

    // ── Phase transitions ────────────────────────────────────────────────────

    public readyForCombat(): boolean {
        if (this.state.phase !== "shop" && this.state.phase !== "arrange") return false
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

        // Create fresh lineup copies (with full HP + career bonuses)
        const playerUnits = this.shopState.lineup.map((u) =>
            createCombatUnit(u.unitDefId, u.level, this.combatBonuses)
        )

        const result = resolveCombat(playerUnits, opponentUnits)
        this.lastCombatResult = result

        if (result.winner === "player") {
            this.state.wins++
        } else {
            this.state.losses++
        }

        this.emit("combatEnded", result)

        // Generate rewards
        const rewards = this.generateRewards(result, opponent.faction)
        this.state.runRewards.push(...rewards)

        // Check if run is complete
        if (this.state.round >= this.state.totalRounds || this.state.losses >= 3) {
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
        this.shopState.offers = generateShopOffers(this.unlockedUnitIds)
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

            // Scrap bonus
            rewards.push({
                type: "scrap",
                description: "Victory scrap",
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
