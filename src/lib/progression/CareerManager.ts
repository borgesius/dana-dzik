import { emitAppEvent } from "../events"
import { getPrestigeManager } from "../prestige/PrestigeManager"
import {
    type BonusType,
    CAREER_NODE_MAP,
    CAREER_SWITCH_LEVEL_PENALTY,
    DORMANT_MULTIPLIER,
    ENGINEERING_STARTER_NODE,
    MASTERY_MAP,
    masteryCost,
    nodeCost,
    skillPointsForLevel,
    SKILLS_STARTER_NODE,
    totalMasteryCost,
} from "./careers"
import { getProgressionManager } from "./ProgressionManager"
import type {
    CareerBranch,
    CareerHistoryEntry,
    ProgressionSaveData,
} from "./types"

type CareerEventType = "careerSelected" | "nodeUnlocked" | "careerSwitched"
type CareerCallback = (data?: unknown) => void

let instance: CareerManager | null = null

export function getCareerManager(): CareerManager {
    if (!instance) {
        instance = new CareerManager()
    }
    return instance
}

export class CareerManager {
    private activeCareer: CareerBranch | null = null
    private careerHistory: CareerHistoryEntry[] = []
    private unlockedNodes: Map<string, Set<string>> = new Map() // branch -> node IDs
    private educationNodes: Set<string> = new Set()
    private skillNodes: Set<string> = new Set()
    private masteryRanks: Map<string, number> = new Map() // masteryId -> rank count
    private onDirty: (() => void) | null = null
    private eventListeners: Map<CareerEventType, CareerCallback[]> = new Map()

    // ── Events ───────────────────────────────────────────────────────────────

    public on(event: CareerEventType, callback: CareerCallback): void {
        if (!this.eventListeners.has(event)) {
            this.eventListeners.set(event, [])
        }
        this.eventListeners.get(event)?.push(callback)
    }

    private emit(event: CareerEventType, data?: unknown): void {
        this.eventListeners.get(event)?.forEach((cb) => cb(data))
    }

    // ── Dirty callback ───────────────────────────────────────────────────────

    public setDirtyCallback(fn: () => void): void {
        this.onDirty = fn
    }

    // ── Default career ──────────────────────────────────────────────────────

    /**
     * Ensure the player has a career selected. On a fresh save, this
     * silently selects "engineering" so the resume starts with the real
     * Senior Software Engineer entry and no selection prompt is shown.
     */
    public ensureDefaultCareer(): void {
        if (this.activeCareer === null && this.careerHistory.length === 0) {
            this.selectCareer("engineering")
        }
    }

    // ── Career selection ─────────────────────────────────────────────────────

    /**
     * Number of distinct career branches the player has held.
     * Executive branch requires >= 2.
     */
    public getDistinctCareersHeld(): number {
        const branches = new Set(this.careerHistory.map((e) => e.branch))
        return branches.size
    }

    /** Whether the Executive branch is available (requires 2+ distinct careers). */
    public isExecutiveUnlocked(): boolean {
        return this.getDistinctCareersHeld() >= 2
    }

    public selectCareer(branch: CareerBranch): boolean {
        if (this.activeCareer !== null) return false // Use switchCareer instead

        // Executive branch gate
        if (branch === "executive" && !this.isExecutiveUnlocked()) return false

        this.activeCareer = branch
        this.careerHistory.push({
            branch,
            startedAt: Date.now(),
            endedAt: null,
        })

        if (!this.unlockedNodes.has(branch)) {
            this.unlockedNodes.set(branch, new Set())
        }

        this.emit("careerSelected", { branch })
        emitAppEvent("career:selected", { branch })
        this.onDirty?.()
        return true
    }

    public switchCareer(newBranch: CareerBranch): boolean {
        if (this.activeCareer === null) return false
        if (this.activeCareer === newBranch) return false

        // Executive branch gate
        if (newBranch === "executive" && !this.isExecutiveUnlocked())
            return false

        // End the current career
        const currentEntry = this.careerHistory.find(
            (e) => e.branch === this.activeCareer && e.endedAt === null
        )
        if (currentEntry) {
            currentEntry.endedAt = Date.now()
        }

        const progression = getProgressionManager()
        const penalty = Math.floor(
            progression.getLevel() * CAREER_SWITCH_LEVEL_PENALTY
        )
        if (penalty > 0) {
            // We don't actually reduce XP, just note the penalty for display
            // The penalty manifests as dormant skill points being less effective
        }

        this.activeCareer = newBranch
        this.careerHistory.push({
            branch: newBranch,
            startedAt: Date.now(),
            endedAt: null,
        })

        if (!this.unlockedNodes.has(newBranch)) {
            this.unlockedNodes.set(newBranch, new Set())
        }

        this.emit("careerSwitched", {
            from: currentEntry?.branch,
            to: newBranch,
        })
        emitAppEvent("career:switched", {
            from: currentEntry?.branch ?? "",
            to: newBranch,
        })
        this.onDirty?.()
        return true
    }

    // ── Skill points ─────────────────────────────────────────────────────────

    public getAvailableSkillPoints(): number {
        const level = getProgressionManager().getLevel()
        const totalPoints = skillPointsForLevel(level)
        const spentPoints = this.getSpentPoints()
        return Math.max(0, totalPoints - spentPoints)
    }

    private getSpentPoints(): number {
        let count = 0
        for (const nodes of this.unlockedNodes.values()) {
            for (const nodeId of nodes) {
                const def = CAREER_NODE_MAP.get(nodeId)
                count += def ? nodeCost(def.tier) : 1
            }
        }
        for (const nodeId of this.educationNodes) {
            const def = CAREER_NODE_MAP.get(nodeId)
            count += def ? nodeCost(def.tier) : 1
        }
        for (const nodeId of this.skillNodes) {
            const def = CAREER_NODE_MAP.get(nodeId)
            count += def ? nodeCost(def.tier) : 1
        }
        for (const ranks of this.masteryRanks.values()) {
            count += totalMasteryCost(ranks)
        }
        return count
    }

    // ── Node unlocking ───────────────────────────────────────────────────────

    public canUnlockNode(nodeId: string): boolean {
        const def = CAREER_NODE_MAP.get(nodeId)
        if (!def) return false

        if (this.getAvailableSkillPoints() < nodeCost(def.tier)) return false

        if (this.isNodeUnlocked(nodeId)) return false

        for (const preReq of def.prerequisites) {
            if (!this.isNodeUnlocked(preReq)) return false
        }

        // For career nodes, must be in the active career OR education/skills
        if (
            def.branch !== "education" &&
            def.branch !== "skills" &&
            def.branch !== this.activeCareer
        ) {
            return false
        }

        return true
    }

    public unlockNode(nodeId: string): boolean {
        if (!this.canUnlockNode(nodeId)) return false

        const def = CAREER_NODE_MAP.get(nodeId)!

        if (def.branch === "education") {
            this.educationNodes.add(nodeId)
        } else if (def.branch === "skills") {
            this.skillNodes.add(nodeId)
        } else {
            const nodes = this.unlockedNodes.get(def.branch) ?? new Set()
            nodes.add(nodeId)
            this.unlockedNodes.set(def.branch, nodes)
        }

        this.emit("nodeUnlocked", { nodeId, branch: def.branch })
        emitAppEvent("career:node-unlocked", { nodeId })
        this.onDirty?.()
        return true
    }

    public isNodeUnlocked(nodeId: string): boolean {
        const def = CAREER_NODE_MAP.get(nodeId)
        if (!def) return false

        if (def.branch === "education") {
            return this.educationNodes.has(nodeId)
        }
        if (def.branch === "skills") {
            return this.skillNodes.has(nodeId)
        }
        return this.unlockedNodes.get(def.branch)?.has(nodeId) ?? false
    }

    // ── Mastery system ─────────────────────────────────────────────────────

    public canPurchaseMastery(masteryId: string): boolean {
        const def = MASTERY_MAP.get(masteryId)
        if (!def) return false
        const current = this.masteryRanks.get(masteryId) ?? 0
        if (def.maxRanks > 0 && current >= def.maxRanks) return false
        if (this.getAvailableSkillPoints() < masteryCost(current)) return false
        return true
    }

    public purchaseMastery(masteryId: string): boolean {
        if (!this.canPurchaseMastery(masteryId)) return false
        const current = this.masteryRanks.get(masteryId) ?? 0
        this.masteryRanks.set(masteryId, current + 1)
        this.onDirty?.()
        return true
    }

    public getMasteryRank(masteryId: string): number {
        return this.masteryRanks.get(masteryId) ?? 0
    }

    public getTotalMasteryRanks(): number {
        let total = 0
        for (const r of this.masteryRanks.values()) total += r
        return total
    }

    // ── Bonus calculation ────────────────────────────────────────────────────

    /**
     * Get total bonus for a specific bonus type, considering dormant multiplier
     * for nodes in inactive career branches.
     */
    /** Effective dormant multiplier, reduced by switchPenaltyReduction bonuses.
     *  Career Tenure foresight upgrade raises the base from 0.5 to 0.95. */
    public getDormantMultiplier(): number {
        const reduction = this.getRawBonus("switchPenaltyReduction")
        const base = getPrestigeManager().hasCareerTenure()
            ? 0.95
            : DORMANT_MULTIPLIER
        return Math.max(0.1, base - reduction)
    }

    /** Get raw bonus total (without dormancy consideration) for a type. Used for switchPenaltyReduction. */
    private getRawBonus(bonusType: BonusType): number {
        let total = 0
        for (const nodeId of this.educationNodes) {
            const def = CAREER_NODE_MAP.get(nodeId)
            if (def && def.bonusType === bonusType) {
                total += def.bonusValue
            }
        }
        for (const nodeId of this.skillNodes) {
            const def = CAREER_NODE_MAP.get(nodeId)
            if (def && def.bonusType === bonusType) {
                total += def.bonusValue
            }
        }
        return total
    }

    public getBonus(bonusType: BonusType): number {
        let total = 0
        const dormantMult = this.getDormantMultiplier()

        for (const [branch, nodes] of this.unlockedNodes) {
            const isDormant = branch !== this.activeCareer
            const multiplier = isDormant ? dormantMult : 1

            for (const nodeId of nodes) {
                const def = CAREER_NODE_MAP.get(nodeId)
                if (def && def.bonusType === bonusType) {
                    total += def.bonusValue * multiplier
                }
            }
        }

        // Education nodes are always at full power
        for (const nodeId of this.educationNodes) {
            const def = CAREER_NODE_MAP.get(nodeId)
            if (def && def.bonusType === bonusType) {
                total += def.bonusValue
            }
        }

        // Skill nodes are always at full power
        for (const nodeId of this.skillNodes) {
            const def = CAREER_NODE_MAP.get(nodeId)
            if (def && def.bonusType === bonusType) {
                total += def.bonusValue
            }
        }

        // Mastery bonuses
        for (const [masteryId, ranks] of this.masteryRanks) {
            const mDef = MASTERY_MAP.get(masteryId)
            if (mDef && mDef.bonusType === bonusType) {
                total += mDef.bonusPerRank * ranks
            }
        }

        // Passive bonus from starting role (Senior SWE at Volley).
        // The player already holds this position, so its bonus is free.
        if (
            ENGINEERING_STARTER_NODE.bonusType === bonusType &&
            this.careerHistory.some((e) => e.branch === "engineering")
        ) {
            total += ENGINEERING_STARTER_NODE.bonusValue
        }

        // Passive bonus from base skills (always active).
        if (SKILLS_STARTER_NODE.bonusType === bonusType) {
            total += SKILLS_STARTER_NODE.bonusValue
        }

        return total
    }

    // ── Getters ──────────────────────────────────────────────────────────────

    public getActiveCareer(): CareerBranch | null {
        return this.activeCareer
    }

    public getCareerHistory(): CareerHistoryEntry[] {
        return [...this.careerHistory]
    }

    public getUnlockedNodesForBranch(
        branch: CareerBranch | "education" | "skills"
    ): string[] {
        if (branch === "education") {
            return [...this.educationNodes]
        }
        if (branch === "skills") {
            return [...this.skillNodes]
        }
        return [...(this.unlockedNodes.get(branch) ?? [])]
    }

    // ── Serialization ────────────────────────────────────────────────────────

    public serialize(): Partial<ProgressionSaveData> {
        const skillPoints: ProgressionSaveData["skillPoints"] = {}

        for (const [branch, nodes] of this.unlockedNodes) {
            skillPoints[branch] = {
                invested: nodes.size,
                dormant: branch !== this.activeCareer,
                unlockedNodes: [...nodes],
            }
        }

        const masteryRanks: Record<string, number> = {}
        for (const [id, count] of this.masteryRanks) {
            if (count > 0) masteryRanks[id] = count
        }

        return {
            activeCareer: this.activeCareer,
            careerHistory: this.careerHistory,
            skillPoints,
            educationNodes: [...this.educationNodes],
            skillNodes: [...this.skillNodes],
            masteryRanks,
        }
    }

    public deserialize(data: ProgressionSaveData): void {
        this.activeCareer = data.activeCareer ?? null
        this.careerHistory = data.careerHistory ?? []
        this.unlockedNodes.clear()
        this.educationNodes.clear()
        this.skillNodes.clear()

        if (data.skillPoints) {
            for (const [branch, spData] of Object.entries(data.skillPoints)) {
                const nodes = new Set(spData.unlockedNodes ?? [])
                // Migration: eng-senior was removed from the unlockable tree;
                // its bonus is now applied passively. Drop it so it doesn't
                // count as a spent skill point in old saves.
                nodes.delete("eng-senior")
                this.unlockedNodes.set(branch, nodes)
            }
        }

        if (data.educationNodes) {
            for (const nodeId of data.educationNodes) {
                this.educationNodes.add(nodeId)
            }
        }

        if (data.skillNodes) {
            for (const nodeId of data.skillNodes) {
                this.skillNodes.add(nodeId)
            }
        }

        this.masteryRanks.clear()
        if (data.masteryRanks) {
            for (const [id, count] of Object.entries(data.masteryRanks)) {
                if (count > 0) this.masteryRanks.set(id, count)
            }
        }

        // Ensure a career is always selected (fresh saves start as engineering)
        this.ensureDefaultCareer()
    }
}
