import { isCalmMode } from "./calmMode"
import type { Severity } from "./systemFileValidator"

type SystemEffect =
    | "bsod"
    | "display-corrupt"
    | "clock-haywire"
    | "memory-fault"
    | "restart"

const FILE_EFFECTS: Record<string, SystemEffect> = {
    "kernel.welt": "bsod",
    "display.welt": "display-corrupt",
    "clock.welt": "clock-haywire",
    "memory.welt": "memory-fault",
    "boot.welt": "restart",
}

interface CrashEventDetail {
    filename: string
    severity: Severity
    broken: string[]
    values: Record<string, number>
}

const HEAP_CORRUPTION_MESSAGES = [
    "HEAP CORRUPTION DETECTED",
    "HEAP CORRUPTION DETECTED at 0x00004A2F",
    "Double free in heap segment 3",
]

const PAGE_FAULT_MESSAGES = [
    "Page fault in non-paged area",
    "PAGE_FAULT_IN_NONPAGED_AREA (0x00000050)",
    "Invalid page table entry at 0x0000BEEF",
]

const HEAP_UNINIT_MESSAGES = [
    "Heap not initialized -- HEAP_READY not set",
    "Cannot allocate: heap manager offline",
    "Fatal: malloc called before HEAP_READY",
]

const GENERAL_MEMORY_MESSAGES = [
    "Not enough memory to complete this operation.",
    "Segmentation fault at 0x0000BEEF",
    "Stack overflow in DAS",
    "Fatal: cannot allocate 0 bytes",
    "General protection fault in module WELT.DLL",
    "Exception 0x80000002: ARRAY_BOUNDS_EXCEEDED",
    "IRQL_NOT_LESS_OR_EQUAL",
    "MEMORY_MANAGEMENT (0x0000001A)",
]

const BSOD_TEXT = `
   DAS (Ding an Sich)


   A fatal exception 0E has occurred at 0028:C0034B03 in
   VXD WELT(01) + 00010E36. The current application will
   be terminated.

   *  The system has been halted because modification of
      3:\\DAS\\kernel.welt has compromised
      the integrity of the kernel process scheduler.

   *  Press any key to restart your computer. You will
      lose any unsaved information in all applications.




                    Press any key to continue _`

export class SystemCrashHandler {
    private effectActive = false

    constructor() {
        document.addEventListener("system-file-modified", ((
            e: CustomEvent<CrashEventDetail>
        ) => {
            if (isCalmMode()) return
            const { filename, severity, broken, values } = e.detail
            const effect = FILE_EFFECTS[filename.toLowerCase()]
            if (!effect || this.effectActive) return
            if (severity === "none" || severity === "minor") return

            this.effectActive = true
            this.triggerEffect(effect, severity, broken, values)
        }) as EventListener)
    }

    private triggerEffect(
        effect: SystemEffect,
        severity: Severity,
        broken: string[],
        values: Record<string, number>
    ): void {
        switch (effect) {
            case "bsod":
                this.triggerBSOD()
                break
            case "display-corrupt":
                this.triggerDisplayCorruption(severity, broken, values)
                break
            case "clock-haywire":
                this.triggerClockHaywire(severity, broken, values)
                break
            case "memory-fault":
                this.triggerMemoryFault(severity, broken, values)
                break
            case "restart":
                this.triggerRestart()
                break
        }
    }

    private triggerBSOD(): void {
        setTimeout(() => {
            document.body.classList.add("crash-flicker")

            setTimeout(() => {
                document.body.classList.remove("crash-flicker")
                this.showBSODOverlay()
            }, 600)
        }, 800)
    }

    private showBSODOverlay(): void {
        const overlay = document.createElement("div")
        overlay.className = "bsod-overlay"

        const content = document.createElement("pre")
        content.className = "bsod-text"
        content.textContent = BSOD_TEXT
        overlay.appendChild(content)

        document.body.appendChild(overlay)

        requestAnimationFrame(() => {
            overlay.classList.add("active")
        })

        const handleKey = (): void => {
            document.removeEventListener("keydown", handleKey)
            overlay.removeEventListener("click", handleKey)
            window.location.reload()
        }
        document.addEventListener("keydown", handleKey)
        overlay.addEventListener("click", handleKey)
    }

    private triggerDisplayCorruption(
        severity: Severity,
        broken: string[],
        values: Record<string, number>
    ): void {
        const body = document.body
        const has = (key: string): boolean => broken.includes(key)

        if (severity === "critical") {
            this.runDisplayPhases(body, [
                { cls: "sys-corrupt-heavy", duration: 2000 },
                { cls: "sys-corrupt-tear", duration: 1500 },
                { cls: "sys-corrupt-color", duration: 3000 },
                { cls: "sys-corrupt-shake", duration: 2000 },
            ])
            return
        }

        const phases: Array<{ cls: string; duration: number }> = []

        if (has("resolution-width") || has("resolution-height")) {
            const scaleX =
                values["width"] !== undefined ? values["width"] / 640 : 1
            const scaleY =
                values["height"] !== undefined ? values["height"] / 480 : 1

            if (scaleX !== 1 || scaleY !== 1) {
                const clampedX = Math.max(0.3, Math.min(2.5, scaleX))
                const clampedY = Math.max(0.3, Math.min(2.5, scaleY))
                body.style.transform = `scale(${clampedX}, ${clampedY})`
                body.style.transformOrigin = "top left"

                setTimeout(() => {
                    body.style.transform = ""
                    body.style.transformOrigin = ""
                }, 12000)
            }

            phases.push({ cls: "sys-corrupt-shake", duration: 1500 })
        }

        if (has("color-depth")) {
            const depth = values["colorDepth"] ?? 0
            const saturation = Math.max(0, Math.min(500, (depth / 16) * 100))
            body.style.filter = `saturate(${saturation}%)`

            setTimeout(() => {
                body.style.filter = ""
            }, 12000)
        }

        if (has("refresh-rate")) {
            const rate = values["refreshRate"] ?? 0
            const flickerDuration =
                rate > 0 ? Math.max(500, 15000 / rate) : 3000
            phases.push({
                cls: "sys-corrupt-heavy",
                duration: Math.min(flickerDuration, 4000),
            })
        }

        if (has("palette-loop")) {
            phases.push({ cls: "sys-corrupt-color", duration: 3000 })
        }

        if (has("vsync-loop")) {
            phases.push({ cls: "sys-corrupt-tear", duration: 2000 })
        }

        if (phases.length === 0) {
            phases.push({ cls: "sys-corrupt-shake", duration: 1000 })
        }

        this.runDisplayPhases(body, phases)
    }

    private runDisplayPhases(
        body: HTMLElement,
        phases: Array<{ cls: string; duration: number }>
    ): void {
        let delay = 500
        for (const phase of phases) {
            setTimeout(() => {
                body.classList.add(phase.cls)
                setTimeout(() => {
                    body.classList.remove(phase.cls)
                }, phase.duration)
            }, delay)
            delay += phase.duration * 0.6
        }

        setTimeout(() => {
            body.classList.add("sys-corrupt-mild")
        }, delay)

        setTimeout(() => {
            body.classList.remove("sys-corrupt-mild")
            this.effectActive = false
        }, delay + 15000)
    }

    private triggerClockHaywire(
        severity: Severity,
        broken: string[],
        values: Record<string, number>
    ): void {
        const clock = document.querySelector(".tray-clock") as HTMLElement
        if (!clock) {
            this.effectActive = false
            return
        }

        const has = (key: string): boolean => broken.includes(key)

        if (severity === "critical") {
            this.runFullClockHaywire(clock)
            return
        }

        if (has("tick-rate")) {
            const tickRate = values["tickRate"] ?? 18
            const ratio = tickRate / 18
            this.runClockSpeedShift(clock, ratio)
            return
        }

        if (has("calibration-loop")) {
            this.runClockDrift(clock)
            return
        }

        if (has("rtc-sync")) {
            this.runClockFrozen(clock)
            return
        }

        if (has("pit-divisor")) {
            this.runClockJumpy(clock, values["pitDivisor"] ?? 65536)
            return
        }

        this.runFullClockHaywire(clock)
    }

    private runFullClockHaywire(clock: HTMLElement): void {
        const glitchTimes = [
            "88:88:88",
            "??:?? AM",
            "25:61 PM",
            "-4:30 PM",
            "NaN:NaN",
            "\u221e:00 PM",
            "00:00:00",
            "99:99 AM",
            "12:00 AM PM",
            "3... 2... 1",
            "ERROR",
            "DESYNC",
            "\u2592\u2592:\u2592\u2592",
            "HELP",
            "1997",
        ]

        let ticks = 0
        const maxTicks = 80
        const interval = setInterval(() => {
            clock.textContent =
                glitchTimes[Math.floor(Math.random() * glitchTimes.length)]
            clock.classList.toggle("crash-clock-glitch", Math.random() > 0.5)
            ticks++

            if (ticks >= maxTicks) {
                clearInterval(interval)
                clock.classList.remove("crash-clock-glitch")
                clock.textContent = "??:?? AM"
                this.effectActive = false
            }
        }, 100)
    }

    private runClockSpeedShift(clock: HTMLElement, ratio: number): void {
        const clampedRatio = Math.max(0.1, Math.min(20, ratio))
        const intervalMs = Math.max(50, 1000 / clampedRatio)
        let elapsed = 0
        const baseTime = new Date()

        const interval = setInterval(() => {
            elapsed += intervalMs * clampedRatio
            const fakeTime = new Date(baseTime.getTime() + elapsed)
            clock.textContent = fakeTime.toLocaleTimeString("en-US", {
                hour: "numeric",
                minute: "2-digit",
                second: "2-digit",
                hour12: true,
            })
            clock.classList.toggle("crash-clock-glitch", Math.random() > 0.8)

            if (elapsed > 60000 * clampedRatio) {
                clearInterval(interval)
                clock.classList.remove("crash-clock-glitch")
                this.effectActive = false
            }
        }, intervalMs)
    }

    private runClockDrift(clock: HTMLElement): void {
        const glitchTimes = [
            "??:?? AM",
            "25:61 PM",
            "NaN:NaN",
            "ERROR",
            "DESYNC",
            "88:88",
        ]
        let ticks = 0
        const maxTicks = 40

        const interval = setInterval(() => {
            if (Math.random() > 0.4) {
                clock.textContent =
                    glitchTimes[Math.floor(Math.random() * glitchTimes.length)]
                clock.classList.add("crash-clock-glitch")
            } else {
                const now = new Date()
                clock.textContent = now.toLocaleTimeString("en-US", {
                    hour: "numeric",
                    minute: "2-digit",
                    hour12: true,
                })
                clock.classList.remove("crash-clock-glitch")
            }
            ticks++

            if (ticks >= maxTicks) {
                clearInterval(interval)
                clock.classList.remove("crash-clock-glitch")
                clock.textContent = "??:?? AM"
                this.effectActive = false
            }
        }, 200)
    }

    private runClockFrozen(clock: HTMLElement): void {
        const frozenTime = "12:00 AM"
        clock.textContent = frozenTime
        clock.classList.add("crash-clock-glitch")

        setTimeout(() => {
            clock.classList.remove("crash-clock-glitch")
            this.effectActive = false
        }, 15000)
    }

    private runClockJumpy(clock: HTMLElement, pitDivisor: number): void {
        const jumpMagnitude = Math.abs(pitDivisor - 65536) / 6553
        let ticks = 0
        const maxTicks = 50

        const interval = setInterval(() => {
            const now = new Date()
            const offset = (Math.random() - 0.5) * jumpMagnitude * 3600000
            const jumped = new Date(now.getTime() + offset)
            clock.textContent = jumped.toLocaleTimeString("en-US", {
                hour: "numeric",
                minute: "2-digit",
                hour12: true,
            })
            clock.classList.toggle("crash-clock-glitch", Math.random() > 0.6)
            ticks++

            if (ticks >= maxTicks) {
                clearInterval(interval)
                clock.classList.remove("crash-clock-glitch")
                this.effectActive = false
            }
        }, 150)
    }

    private triggerMemoryFault(
        severity: Severity,
        broken: string[],
        values: Record<string, number>
    ): void {
        const has = (key: string): boolean => broken.includes(key)
        let count: number
        let messages: string[]

        if (severity === "critical") {
            count = 8 + Math.floor(Math.random() * 4)
            messages = [
                ...HEAP_CORRUPTION_MESSAGES,
                ...PAGE_FAULT_MESSAGES,
                ...HEAP_UNINIT_MESSAGES,
                ...GENERAL_MEMORY_MESSAGES,
            ]
        } else {
            const bankCount = values["bankCount"] ?? 8
            count = Math.max(1, Math.min(12, bankCount))

            messages = [...GENERAL_MEMORY_MESSAGES]
            if (has("scan-loop")) messages.push(...HEAP_CORRUPTION_MESSAGES)
            if (has("page-table")) messages.push(...PAGE_FAULT_MESSAGES)
            if (has("heap-ready")) messages.push(...HEAP_UNINIT_MESSAGES)
        }

        this.spawnErrorPopups(count, messages)
    }

    private spawnErrorPopups(count: number, messages: string[]): void {
        let spawned = 0
        let zIndex = 95000

        const spawnNext = (): void => {
            if (spawned >= count) {
                this.effectActive = false
                return
            }

            const msg = messages[Math.floor(Math.random() * messages.length)]
            this.spawnErrorPopup(msg, zIndex++)
            spawned++

            setTimeout(spawnNext, 300 + Math.random() * 700)
        }

        setTimeout(spawnNext, 500)
    }

    private spawnErrorPopup(message: string, zIndex: number): void {
        const popup = document.createElement("div")
        popup.className = "system-error-popup"
        popup.style.zIndex = zIndex.toString()

        const maxX = window.innerWidth - 380
        const maxY = window.innerHeight - 180
        popup.style.left = `${60 + Math.random() * maxX}px`
        popup.style.top = `${60 + Math.random() * maxY}px`

        const titlebar = document.createElement("div")
        titlebar.className = "system-error-titlebar"
        titlebar.innerHTML = `<span>DAS</span><button class="system-error-close">\u00d7</button>`

        const body = document.createElement("div")
        body.className = "system-error-body"
        body.innerHTML = `<span class="system-error-icon">\u26d4</span><span>${message}</span>`

        const footer = document.createElement("div")
        footer.className = "system-error-footer"
        const okBtn = document.createElement("button")
        okBtn.textContent = "OK"
        okBtn.className = "system-error-ok"
        footer.appendChild(okBtn)

        popup.appendChild(titlebar)
        popup.appendChild(body)
        popup.appendChild(footer)
        document.body.appendChild(popup)

        const close = (): void => {
            popup.remove()
        }
        okBtn.addEventListener("click", close)
        titlebar
            .querySelector(".system-error-close")
            ?.addEventListener("click", close)

        this.makePopupDraggable(popup, titlebar)
        this.playSound("popup")
    }

    private makePopupDraggable(popup: HTMLElement, handle: HTMLElement): void {
        let dragging = false
        let offset = { x: 0, y: 0 }

        handle.addEventListener("mousedown", (e) => {
            if ((e.target as HTMLElement).closest(".system-error-close")) return
            dragging = true
            const rect = popup.getBoundingClientRect()
            offset = { x: e.clientX - rect.left, y: e.clientY - rect.top }
            popup.style.zIndex = "95100"
        })

        const onMove = (e: MouseEvent): void => {
            if (!dragging) return
            popup.style.left = `${e.clientX - offset.x}px`
            popup.style.top = `${e.clientY - offset.y}px`
        }

        const onUp = (): void => {
            dragging = false
        }

        document.addEventListener("mousemove", onMove)
        document.addEventListener("mouseup", onUp)
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
