import { isCalmMode } from "./calmMode"
import { onAppEvent } from "./events"
import { FILE_EFFECTS, type SystemEffect } from "./systemCrash/constants"
import { triggerBSOD } from "./systemCrash/effects/bsod"
import { triggerClockHaywire } from "./systemCrash/effects/clockHaywire"
import { triggerDisplayCorruption } from "./systemCrash/effects/displayCorruption"
import { triggerMemoryFault } from "./systemCrash/effects/memoryFault"
import type { Severity } from "./systemFileValidator"

export class SystemCrashHandler {
    private effectActive = false

    constructor() {
        onAppEvent("system-file-modified", (detail) => {
            if (isCalmMode()) return
            const { filename, severity, broken, values } = detail
            const effect = FILE_EFFECTS[filename.toLowerCase()]
            if (!effect || this.effectActive) return
            if (severity === "none" || severity === "minor") return

            this.effectActive = true
            this.triggerEffect(effect, severity as Severity, broken, values)
        })
    }

    private triggerEffect(
        effect: SystemEffect,
        severity: Severity,
        broken: string[],
        values: Record<string, number>
    ): void {
        const onComplete = (): void => {
            this.effectActive = false
        }

        switch (effect) {
            case "bsod":
                triggerBSOD(onComplete)
                break
            case "display-corrupt":
                triggerDisplayCorruption(severity, broken, values, onComplete)
                break
            case "clock-haywire":
                triggerClockHaywire(severity, broken, values, onComplete)
                break
            case "memory-fault":
                triggerMemoryFault(
                    severity,
                    broken,
                    values,
                    onComplete,
                    (type) => this.playSound(type)
                )
                break
            case "restart":
                this.triggerRestart()
                break
        }
    }

    private triggerRestart(): void {
        const fadeOverlay = document.createElement("div")
        fadeOverlay.className = "crash-fade-overlay"
        document.body.appendChild(fadeOverlay)

        requestAnimationFrame(() => {
            fadeOverlay.classList.add("active")
        })

        setTimeout(() => {
            window.location.reload()
        }, 2000)
    }

    private playSound(type: string): void {
        const audioManager = (
            window as unknown as {
                audioManager?: {
                    playSound: (t: string) => void
                    playRandomPopup: () => void
                }
            }
        ).audioManager
        if (audioManager) {
            if (type === "popup") {
                audioManager.playRandomPopup()
            } else {
                audioManager.playSound(type)
            }
        }
    }
}
