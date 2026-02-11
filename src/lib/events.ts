import type { BossId, FactionId, RelicId, UnitId } from "./autobattler/types"
import type { CosmeticType } from "./cosmetics/CosmeticManager"
import type { GlitchType } from "./glitchEffects"
import type { EmployeeType } from "./marketGame/employees"
import type { HindsightUpgradeId } from "./prestige/constants"
import type { ForesightUpgradeId } from "./prestige/ascension"
import type { CareerNodeId } from "./progression/careers"
import type { CareerBranch } from "./progression/types"
import type { RoutableWindow } from "../config/routing"
import type { Severity } from "./systemFileValidator"
import type { SystemEffect } from "./systemCrash/constants"
import type { VeilId } from "./veil/types"

export interface AppEventMap {
    "terminal:command": { command: string; raw: string }
    "terminal:open-window": { windowId: RoutableWindow }
    "terminal:file-saved": {
        filename: string
        path: string
        isNew: boolean
    }
    "explorer:open-terminal": { cwd: string; command: string }
    "pinball:gameover": {
        score: number
        highScore: number
        allTargetsHit: boolean
    }
    "welt:completed": undefined
    "welt:error": { type: "thermal" | "suffering" | "divide-by-zero" }
    "welt:exercises-tested": { passed: number; total: number }
    "welt:exercise-passed": { exercise: number }
    "welt:all-exercises-passed": undefined
    "grund:compiled": undefined
    "grund:executed": undefined
    "grund:ring-overflow": { pointer: number }
    "grund:ring-cycle": undefined
    "grund:ring-spin": undefined
    "freak:used": undefined
    "felix:editor": undefined
    "calm-mode:toggled": undefined
    "analytics:intent": { type: string }
    "qa:report-clicked": undefined
    "popup:bonus-claimed": undefined
    "popup:x-dismissed": { headline: string }
    "felix:message": undefined
    "session-cost:cost-1": undefined
    "session-cost:cost-2": undefined
    "session-cost:cost-3": undefined
    "session-cost:cost-4": undefined
    "session-cost:cost-5": undefined
    "session-cost:cost-6": undefined
    "session-cost:cost-7": undefined
    "system-file-modified": {
        filename: string
        severity: Severity
        broken: string[]
        values: Record<string, number>
    }
    "calm-mode:changed": { enabled: boolean }
    // Progression system events
    "prestige:triggered": { count: number; hindsight: number }
    "prestige:purchase": { upgradeId: HindsightUpgradeId }
    "prestige:ascension": { count: number; foresight: number }
    "prestige:foresight-purchase": { upgradeId: ForesightUpgradeId }
    "autobattler:run-complete": {
        majorityFaction?: FactionId
        losses: number
        lineupFactions: FactionId[]
        highestRound: number
        relicsCollected: number
    }
    "autobattler:boss-defeated": {
        bossId: BossId
        noUnitsLost: boolean
    }
    "autobattler:unit-unlocked": { unitId: UnitId }
    "autobattler:relic-unlocked": { relicId: RelicId }
    "autobattler:spiral-complete": undefined
    "career:selected": { branch: CareerBranch }
    "career:switched": { from: CareerBranch; to: CareerBranch }
    "career:node-unlocked": { nodeId: CareerNodeId }
    "progression:level-up": { level: number }
    "market:employee-hired": { type: EmployeeType }
    "market:employee-fired": { type: EmployeeType }
    "market:org-reorg": undefined
    "market:scrap-dividend": Record<string, never>
    "autobattler:faction-complete": { faction: FactionId }
    "cosmetic:unlocked": { type: CosmeticType; id: string }
    "cosmetic:changed": { type: CosmeticType; id: string }
    "glitch:triggered": { type: GlitchType }
    "system-crash:triggered": { effectType: SystemEffect }
    // Veil system events
    "veil:triggered": { veilId: VeilId }
    "veil:unlocked": { veilId: VeilId }
    "veil:completed": { veilId: VeilId; attempts: number }
    "veil:failed": { veilId: VeilId }
    "veil:boss-defeated": undefined
    // Network monitor events
    "netmon:opened": undefined
    "netmon:packet-expanded": undefined
    "netmon:unknown-host-filtered": undefined
    "netmon:nmap-run": undefined
}

export function emitAppEvent<K extends keyof AppEventMap>(
    name: K,
    ...args: AppEventMap[K] extends undefined ? [] : [detail: AppEventMap[K]]
): void {
    const detail = args[0]
    document.dispatchEvent(
        detail !== undefined
            ? new CustomEvent(name, { detail })
            : new CustomEvent(name)
    )
}

export function onAppEvent<K extends keyof AppEventMap>(
    name: K,
    handler: AppEventMap[K] extends undefined
        ? () => void
        : (detail: AppEventMap[K]) => void
): void {
    document.addEventListener(name, ((e: Event) => {
        const detail = (e as CustomEvent).detail as AppEventMap[K]
        if (detail !== undefined) {
            ;(handler as (detail: AppEventMap[K]) => void)(detail)
        } else {
            ;(handler as () => void)()
        }
    }) as EventListener)
}
