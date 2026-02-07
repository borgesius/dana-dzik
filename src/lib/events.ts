import type { RoutableWindow } from "../config/routing"

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
    "welt:error": { type: string }
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
    "felix:message": undefined
    "session-cost:big-spender": undefined
    "session-cost:whale": undefined
    "system-file-modified": {
        filename: string
        severity: string
        broken: string[]
        values: Record<string, number>
    }
    "calm-mode:changed": { enabled: boolean }
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
