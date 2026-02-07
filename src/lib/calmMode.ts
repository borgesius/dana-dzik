let calm = false

export function isCalmMode(): boolean {
    return calm
}

export function initCalmMode(initial: boolean): void {
    calm = initial
    if (calm) {
        document.dispatchEvent(
            new CustomEvent("calm-mode:changed", { detail: { enabled: true } })
        )
    }
}

export function setCalmMode(enabled: boolean): void {
    if (calm === enabled) return
    calm = enabled

    document.dispatchEvent(
        new CustomEvent("calm-mode:changed", { detail: { enabled } })
    )

    if (enabled) {
        document.dispatchEvent(new CustomEvent("calm-mode:toggled"))
    }
}
