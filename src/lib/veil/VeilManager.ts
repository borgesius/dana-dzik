import { isCalmMode } from "../calmMode"
import { emitAppEvent } from "../events"
import type { VeilId, VeilSaveData } from "./types"
import { BOSS_VEIL } from "./types"

type VeilEventType = "veilTriggered" | "veilCompleted" | "veilFailed"
type VeilCallback = (data?: unknown) => void

let instance: VeilManager | null = null

export function getVeilManager(): VeilManager {
    if (!instance) {
        instance = new VeilManager()
    }
    return instance
}

/** Progression gates for each veil. Each requires the previous completed. */
interface VeilGate {
    minLevel: number
    minPrestigeCount?: number
    minAutobattlerWins?: number
    minBossesDefeated?: number
    requireSpiralOrPhase5?: boolean
}

const VEIL_GATES: Record<number, VeilGate> = {
    0: { minLevel: 5, minPrestigeCount: 1 },
    1: { minLevel: 10, minAutobattlerWins: 1 },
    2: { minLevel: 15, minBossesDefeated: 3 },
    3: { minLevel: 20, requireSpiralOrPhase5: true },
    // Veil 4 is deterministic, triggered from veil 3 dialogue
}

/** RNG chance per eligible market tick */
const VEIL_CHANCES: Record<number, number> = {
    0: 0.012,
    1: 0.008,
    2: 0.006,
    3: 0.004,
}

/** Cooldown between veil trigger attempts (ms) — prevents rapid re-triggering */
const TRIGGER_COOLDOWN_MS = 15_000

export class VeilManager {
    private completedVeils: Set<VeilId> = new Set()
    private unlockedVeils: Set<VeilId> = new Set()
    private attempts: Record<number, number> = {}
    private currentVeil: VeilId | null = null
    private active: boolean = false
    private lastTriggerAttempt: number = 0
    private onDirty: (() => void) | null = null
    private eventListeners: Map<VeilEventType, VeilCallback[]> = new Map()

    // ── External providers (set during wiring) ─────────────────────────────

    public levelProvider: (() => number) | null = null
    public prestigeCountProvider: (() => number) | null = null
    public autobattlerWinsProvider: (() => number) | null = null
    public bossesDefeatedProvider: (() => number) | null = null
    public spiralCompleteProvider: (() => boolean) | null = null
    public phase5UnlockedProvider: (() => boolean) | null = null

    /** Called by VeilOverlay when the player completes a cube run + dialogue */
    public onVeilComplete: ((veilId: VeilId) => void) | null = null
    /** Called to launch the overlay — set during init */
    public launchOverlay: ((veilId: VeilId, replay?: boolean) => void) | null =
        null

    // ── Events ─────────────────────────────────────────────────────────────

    public on(event: VeilEventType, callback: VeilCallback): void {
        if (!this.eventListeners.has(event)) {
            this.eventListeners.set(event, [])
        }
        this.eventListeners.get(event)?.push(callback)
    }

    private emit(event: VeilEventType, data?: unknown): void {
        this.eventListeners.get(event)?.forEach((cb) => cb(data))
    }

    // ── Dirty callback ─────────────────────────────────────────────────────

    public setDirtyCallback(fn: () => void): void {
        this.onDirty = fn
    }

    // ── Getters ─────────────────────────────────────────────────────────────

    public isActive(): boolean {
        return this.active
    }

    public getCurrentVeil(): VeilId | null {
        return this.currentVeil
    }

    public isVeilCompleted(id: VeilId): boolean {
        return this.completedVeils.has(id)
    }

    public isVeilUnlocked(id: VeilId): boolean {
        return this.unlockedVeils.has(id)
    }

    public getCompletedCount(): number {
        return this.completedVeils.size
    }

    public getAttempts(id: VeilId): number {
        return this.attempts[id] ?? 0
    }

    public getAllCompleted(): VeilId[] {
        return [...this.completedVeils] as VeilId[]
    }

    public getUnlockedVeils(): VeilId[] {
        return [...this.unlockedVeils] as VeilId[]
    }

    public getCompletedVeils(): VeilId[] {
        return [...this.completedVeils] as VeilId[]
    }

    /**
     * Whether the widget should be visible on the desktop.
     * True if the player has ever had a veil triggered (completed or unlocked).
     */
    public isWidgetVisible(): boolean {
        return this.completedVeils.size > 0 || this.unlockedVeils.size > 0
    }

    /**
     * Returns the next locked veil (not yet unlocked or completed).
     * Returns null if all veils are unlocked/completed.
     */
    public getNextLockedVeil(): VeilId | null {
        for (let i = 0; i <= 3; i++) {
            const id = i as VeilId
            if (!this.completedVeils.has(id) && !this.unlockedVeils.has(id)) {
                return id
            }
        }
        // Boss veil: show only if all pre-boss done and boss not completed
        if (
            this.completedVeils.has(0 as VeilId) &&
            this.completedVeils.has(1 as VeilId) &&
            this.completedVeils.has(2 as VeilId) &&
            this.completedVeils.has(3 as VeilId) &&
            !this.completedVeils.has(BOSS_VEIL)
        ) {
            return BOSS_VEIL
        }
        return null
    }

    // ── Next veil to trigger ───────────────────────────────────────────────

    public getNextVeilId(): VeilId | null {
        for (let i = 0; i <= 3; i++) {
            if (!this.completedVeils.has(i as VeilId)) {
                return i as VeilId
            }
        }
        // All pre-boss done but boss not done
        if (!this.completedVeils.has(BOSS_VEIL)) {
            return BOSS_VEIL
        }
        return null
    }

    // ── Gate checking ──────────────────────────────────────────────────────

    private meetsGate(veilId: VeilId): boolean {
        const gate = VEIL_GATES[veilId]
        if (!gate) return false

        const level = this.levelProvider?.() ?? 0
        if (level < gate.minLevel) return false

        if (
            gate.minPrestigeCount !== undefined &&
            (this.prestigeCountProvider?.() ?? 0) < gate.minPrestigeCount
        ) {
            return false
        }

        if (
            gate.minAutobattlerWins !== undefined &&
            (this.autobattlerWinsProvider?.() ?? 0) < gate.minAutobattlerWins
        ) {
            return false
        }

        if (
            gate.minBossesDefeated !== undefined &&
            (this.bossesDefeatedProvider?.() ?? 0) < gate.minBossesDefeated
        ) {
            return false
        }

        if (gate.requireSpiralOrPhase5) {
            const spiral = this.spiralCompleteProvider?.() ?? false
            const phase5 = this.phase5UnlockedProvider?.() ?? false
            if (!spiral && !phase5) return false
        }

        return true
    }

    // ── Trigger logic (called from market tick) ────────────────────────────

    /**
     * Checks if a veil should trigger. Called each market tick.
     *
     * For veil 0: returns the veil ID for immediate launch (ambush).
     * For veils 1-3: unlocks the veil and emits "veil:unlocked" (returns null).
     *   The unlock modal listens for that event and offers pierce-now / defer.
     */
    public checkTrigger(): VeilId | null {
        // Don't trigger if already active or all done
        if (this.active) return null

        const now = Date.now()
        if (now - this.lastTriggerAttempt < TRIGGER_COOLDOWN_MS) return null
        this.lastTriggerAttempt = now

        const nextId = this.getNextVeilId()
        if (nextId === null || nextId === BOSS_VEIL) return null

        // Skip veils already unlocked (waiting in widget)
        if (this.unlockedVeils.has(nextId)) return null

        // Previous veil must be completed (except veil 0)
        if (nextId > 0) {
            const prev = (nextId - 1) as VeilId
            if (!this.completedVeils.has(prev)) return null
        }

        if (!this.meetsGate(nextId)) return null

        // RNG roll
        const chance = VEIL_CHANCES[nextId] ?? 0
        if (Math.random() >= chance) return null

        // Calm mode: unlock into widget silently (no ambush, no modal)
        if (isCalmMode()) {
            this.unlockVeil(nextId)
            return null
        }

        // Veil 0: immediate ambush launch
        if (nextId === 0) {
            // Also mark as unlocked so the widget appears after exit
            this.unlockedVeils.add(nextId)
            this.onDirty?.()
            return nextId
        }

        // Veils 1-3: unlock and emit event (modal will handle launch choice)
        this.unlockVeil(nextId)
        return null
    }

    // ── Unlocking a veil ───────────────────────────────────────────────────

    /**
     * Marks a veil as unlocked (available to play from widget or modal).
     * Emits "veil:unlocked" so the modal and widget can react.
     */
    public unlockVeil(id: VeilId): void {
        if (this.unlockedVeils.has(id) || this.completedVeils.has(id)) return

        this.unlockedVeils.add(id)
        emitAppEvent("veil:unlocked", { veilId: id })
        this.onDirty?.()
    }

    // ── Triggering a veil ──────────────────────────────────────────────────

    public triggerVeil(id: VeilId): void {
        if (this.active) return

        this.active = true
        this.currentVeil = id
        this.emit("veilTriggered", { veilId: id })
        emitAppEvent("veil:triggered", { veilId: id })

        this.launchOverlay?.(id)
    }

    /**
     * Launch an unlocked veil from the widget or modal.
     * Validates the veil is actually available.
     */
    public launchVeil(id: VeilId): void {
        if (this.active) return
        if (!this.unlockedVeils.has(id) && !this.completedVeils.has(id)) return

        this.triggerVeil(id)
    }

    /**
     * Launch a completed veil in replay mode (cube run only, no dialogue on win).
     */
    public launchReplay(id: VeilId): void {
        if (this.active) return
        if (!this.completedVeils.has(id)) return

        this.active = true
        this.currentVeil = id
        this.emit("veilTriggered", { veilId: id })
        emitAppEvent("veil:triggered", { veilId: id })

        this.launchOverlay?.(id, true)
    }

    /**
     * Trigger the boss veil directly (called from veil 3 dialogue).
     */
    public triggerBossVeil(): void {
        if (this.completedVeils.has(BOSS_VEIL)) return
        // Ensure all pre-boss veils are done
        for (let i = 0; i <= 3; i++) {
            if (!this.completedVeils.has(i as VeilId)) return
        }
        this.triggerVeil(BOSS_VEIL)
    }

    // ── Recording results ──────────────────────────────────────────────────

    public recordAttempt(id: VeilId): void {
        this.attempts[id] = (this.attempts[id] ?? 0) + 1
    }

    public completeVeil(id: VeilId): void {
        this.completedVeils.add(id)
        this.unlockedVeils.delete(id)
        this.active = false
        this.currentVeil = null

        const attempts = this.attempts[id] ?? 1
        this.emit("veilCompleted", { veilId: id, attempts })
        emitAppEvent("veil:completed", { veilId: id, attempts })

        if (id === BOSS_VEIL) {
            emitAppEvent("veil:boss-defeated")
        }

        this.onDirty?.()
    }

    public failVeil(id: VeilId): void {
        this.emit("veilFailed", { veilId: id })
        emitAppEvent("veil:failed", { veilId: id })
    }

    /**
     * Called when player exits the overlay (dismiss, not retry).
     */
    public dismissVeil(): void {
        this.active = false
        this.currentVeil = null
    }

    // ── Serialization ──────────────────────────────────────────────────────

    public serialize(): VeilSaveData {
        return {
            completed: [...this.completedVeils],
            attempts: { ...this.attempts },
            unlocked: [...this.unlockedVeils],
        }
    }

    public deserialize(data: VeilSaveData): void {
        this.completedVeils.clear()
        this.unlockedVeils.clear()
        this.attempts = {}

        if (data.completed) {
            for (const id of data.completed) {
                this.completedVeils.add(id as VeilId)
            }
        }

        if (data.unlocked) {
            for (const id of data.unlocked) {
                this.unlockedVeils.add(id as VeilId)
            }
        }

        if (data.attempts) {
            for (const [k, v] of Object.entries(data.attempts)) {
                this.attempts[Number(k)] = v
            }
        }
    }
}
