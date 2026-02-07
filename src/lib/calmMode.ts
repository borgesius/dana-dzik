import { emitAppEvent } from "./events"

let calm = false

export function isCalmMode(): boolean {
    return calm
}

export function initCalmMode(initial: boolean): void {
    calm = initial
    if (calm) {
        emitAppEvent("calm-mode:changed", { enabled: true })
    }
}

export function setCalmMode(enabled: boolean): void {
    if (calm === enabled) return
    calm = enabled

    emitAppEvent("calm-mode:changed", { enabled })

    if (enabled) {
        emitAppEvent("calm-mode:toggled")
    }
}
