import { CubeRunner } from "./CubeRunner"
import { DialogueManager } from "./DialogueManager"
import { LEVEL_CONFIGS } from "./levels"
import type { VeilId } from "./types"
import { getVeilManager } from "./VeilManager"

const TRANSITION_IN_MS = 2000
const TRANSITION_OUT_MS = 1500
const WIN_PAUSE_MS = 800
const REPLAY_FLASH_MS = 1200

export class VeilOverlay {
    private overlay: HTMLElement | null = null
    private veilId: VeilId = 0
    private runner: CubeRunner | null = null
    private dialogueMgr: DialogueManager | null = null
    private canvas: HTMLCanvasElement | null = null
    private dialogueContainer: HTMLElement | null = null
    private retryContainer: HTMLElement | null = null
    private replay: boolean = false

    /** Text resolver for localization */
    public textResolver: ((key: string) => string) | null = null

    public launch(veilId: VeilId, replay?: boolean): void {
        this.veilId = veilId
        this.replay = replay ?? false

        const config = LEVEL_CONFIGS[veilId]

        // Create overlay
        this.overlay = document.createElement("div")
        this.overlay.className = `veil-overlay ${config.theme.cssClass}`
        document.body.appendChild(this.overlay)

        // Set CSS custom properties for per-level theming
        this.overlay.style.setProperty(
            "--veil-intensity",
            String(config.theme.vignetteIntensity)
        )
        this.overlay.style.setProperty(
            "--veil-player-color",
            config.theme.playerColor
        )
        this.overlay.style.setProperty("--veil-bg-color", config.theme.bgColor)

        // Static transition layer
        const staticLayer = document.createElement("div")
        staticLayer.className = "veil-static-layer"
        this.overlay.appendChild(staticLayer)

        // Force reflow then activate
        void this.overlay.offsetHeight
        this.overlay.classList.add("veil-active")

        // Boss mode visual treatment
        if (veilId === 4) {
            this.overlay.classList.add("veil-boss-mode")
        }

        // Prevent body scroll
        document.body.style.overflow = "hidden"

        // After transition, start the runner
        setTimeout(() => {
            staticLayer.remove()
            this.startRunner()
        }, TRANSITION_IN_MS)
    }

    private startRunner(): void {
        if (!this.overlay) return

        const mgr = getVeilManager()
        mgr.recordAttempt(this.veilId)

        // Create canvas
        this.canvas = document.createElement("canvas")
        this.canvas.className = "veil-canvas"
        this.overlay.appendChild(this.canvas)

        // Create runner
        const config = LEVEL_CONFIGS[this.veilId]
        this.runner = new CubeRunner(this.canvas, config, this.veilId === 4)

        this.runner.onWin = (): void => {
            setTimeout(() => {
                this.onRunnerWin()
            }, WIN_PAUSE_MS)
        }

        this.runner.onDeath = (): void => {
            const mgr = getVeilManager()
            mgr.failVeil(this.veilId)
            setTimeout(() => {
                this.showRetryPrompt()
            }, 1200) // slightly longer to let death particles play
        }

        // Fade in canvas
        requestAnimationFrame(() => {
            this.canvas?.classList.add("veil-canvas-active")
        })

        this.runner.start()
    }

    private onRunnerWin(): void {
        if (!this.overlay) return

        // Clean up runner
        this.runner?.destroy()
        this.runner = null
        this.canvas?.remove()
        this.canvas = null

        // Replay mode: skip dialogue, show brief flash and dismiss
        if (this.replay) {
            this.showReplayFlash()
            return
        }

        // Start dialogue
        this.dialogueContainer = document.createElement("div")
        this.dialogueContainer.className = "veil-dialogue-container"
        this.overlay.appendChild(this.dialogueContainer)

        this.dialogueMgr = new DialogueManager(this.dialogueContainer)
        this.dialogueMgr.textResolver = this.textResolver

        this.dialogueMgr.onComplete = (): void => {
            this.onDialogueComplete()
        }

        this.dialogueMgr.onTriggerBoss = (): void => {
            this.onDialogueTriggerBoss()
        }

        // Fade in
        requestAnimationFrame(() => {
            this.dialogueContainer?.classList.add("veil-dialogue-active")
        })

        this.dialogueMgr.start(this.veilId)
    }

    private showReplayFlash(): void {
        if (!this.overlay) return

        const flash = document.createElement("div")
        flash.className = "veil-replay-flash"
        flash.textContent = this.resolveText("veil.widget.pierced")
        this.overlay.appendChild(flash)

        requestAnimationFrame(() => {
            flash.classList.add("veil-replay-flash-active")
        })

        setTimeout(() => {
            const mgr = getVeilManager()
            mgr.dismissVeil()
            this.dismiss()
        }, REPLAY_FLASH_MS)
    }

    private onDialogueComplete(): void {
        const mgr = getVeilManager()
        mgr.completeVeil(this.veilId)
        this.dismiss()
    }

    private onDialogueTriggerBoss(): void {
        const mgr = getVeilManager()
        mgr.completeVeil(this.veilId)

        this.dialogueMgr?.destroy()
        this.dialogueMgr = null
        this.dialogueContainer?.remove()
        this.dialogueContainer = null

        setTimeout(() => {
            this.dismiss()
            setTimeout(() => {
                mgr.triggerBossVeil()
            }, 500)
        }, 300)
    }

    private showRetryPrompt(): void {
        if (!this.overlay) return

        // Remove canvas
        this.runner?.destroy()
        this.runner = null
        this.canvas?.remove()
        this.canvas = null

        // Show retry UI
        this.retryContainer = document.createElement("div")
        this.retryContainer.className = "veil-retry"

        const title = document.createElement("div")
        title.className = "veil-retry-title"
        title.textContent = this.resolveText("veil.retry.title")
        this.retryContainer.appendChild(title)

        const buttons = document.createElement("div")
        buttons.className = "veil-retry-buttons"

        const retryBtn = document.createElement("button")
        retryBtn.className = "veil-retry-btn veil-btn-retry"
        retryBtn.textContent = this.resolveText("veil.retry.retry")
        retryBtn.addEventListener("click", () => {
            this.retryContainer?.remove()
            this.retryContainer = null
            this.startRunner()
        })
        buttons.appendChild(retryBtn)

        const exitBtn = document.createElement("button")
        exitBtn.className = "veil-retry-btn veil-btn-exit"
        exitBtn.textContent = this.resolveText("veil.retry.dismiss")
        exitBtn.addEventListener("click", () => {
            const mgr = getVeilManager()
            mgr.dismissVeil()
            this.dismiss()
        })
        buttons.appendChild(exitBtn)

        this.retryContainer.appendChild(buttons)
        this.overlay.appendChild(this.retryContainer)

        requestAnimationFrame(() => {
            this.retryContainer?.classList.add("veil-retry-active")
        })
    }

    private dismiss(): void {
        if (!this.overlay) return

        this.runner?.destroy()
        this.runner = null
        this.dialogueMgr?.destroy()
        this.dialogueMgr = null

        this.overlay.classList.add("veil-exit")

        setTimeout(() => {
            this.overlay?.remove()
            this.overlay = null
            document.body.style.overflow = ""
        }, TRANSITION_OUT_MS)
    }

    private resolveText(key: string): string {
        return this.textResolver?.(key) ?? key
    }
}

// ── Singleton overlay instance ──────────────────────────────────────────────

let overlayInstance: VeilOverlay | null = null

export function getVeilOverlay(): VeilOverlay {
    if (!overlayInstance) {
        overlayInstance = new VeilOverlay()
    }
    return overlayInstance
}
