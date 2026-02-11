import { log } from "@/core/Logger"

import type { BiorhythmReading, DivinationProfile, Familiar } from "./types"

type PetState = "walking" | "sleeping" | "reading" | "bouncing" | "sad" | "idle"

/**
 * A roaming desktop pet whose species and behavior are determined
 * by the latest deployment divination reading.
 */
export class DesktopPet {
    private el: HTMLElement
    private familiar: Familiar | null = null
    private biorhythm: BiorhythmReading | null = null
    private horoscopeText = ""

    private x = 100
    private direction: 1 | -1 = 1
    private state: PetState = "idle"
    private tickTimer: ReturnType<typeof setInterval> | null = null
    private stateTimer: ReturnType<typeof setTimeout> | null = null

    constructor() {
        this.el = document.createElement("div")
        this.el.className = "desktop-pet"
        this.el.style.display = "none"
        this.el.style.left = "100px"

        this.el.addEventListener("click", () => this.handleClick())
        document.addEventListener("mousemove", (e) => this.handleMouse(e))

        document.body.appendChild(this.el)

        void this.loadProfile()
    }

    public destroy(): void {
        if (this.tickTimer) clearInterval(this.tickTimer)
        if (this.stateTimer) clearTimeout(this.stateTimer)
        this.el.remove()
    }

    // ─── Data Loading ───────────────────────────────────────────────────

    private async loadProfile(): Promise<void> {
        try {
            const response = await fetch("/api/divination")
            if (!response.ok) return

            const result = (await response.json()) as {
                ok: boolean
                data?: DivinationProfile
            }
            if (!result.ok || !result.data) return

            this.familiar = result.data.familiar
            this.biorhythm = result.data.biorhythm
            this.horoscopeText = result.data.horoscope.horoscope

            this.spawn()
        } catch (err) {
            log.widgets("Desktop pet load error: %O", err)
        }
    }

    // ─── Spawning & Behavior Loop ───────────────────────────────────────

    private spawn(): void {
        if (!this.familiar) return

        this.el.style.display = "block"
        this.x = Math.floor(Math.random() * (window.innerWidth - 100)) + 50
        this.el.style.left = `${this.x}px`
        this.render()

        this.tickTimer = setInterval(() => this.tick(), 100)
        this.pickNextState() // test
    }

    private pickNextState(): void {
        if (!this.familiar || !this.biorhythm) return

        const bio = this.biorhythm
        const behavior = this.familiar.behavior
        const roll = Math.random() * 100

        // Weighted state selection based on biorhythm + familiar personality
        if (bio.physical.percentage < 25 || roll < behavior.sleepiness * 3) {
            this.setState("sleeping")
            this.scheduleNext(4000 + Math.random() * 6000)
        } else if (bio.emotional.percentage < 25) {
            this.setState("sad")
            this.scheduleNext(3000 + Math.random() * 4000)
        } else if (
            bio.intellectual.percentage > 70 &&
            roll < behavior.curiosity * 4
        ) {
            this.setState("reading")
            this.scheduleNext(3000 + Math.random() * 5000)
        } else if (bio.emotional.percentage > 75 && roll < 30) {
            this.setState("bouncing")
            this.scheduleNext(2000 + Math.random() * 3000)
        } else {
            this.setState("walking")
            this.scheduleNext(3000 + Math.random() * 5000)
        }
    }

    private scheduleNext(ms: number): void {
        if (this.stateTimer) clearTimeout(this.stateTimer)
        this.stateTimer = setTimeout(() => this.pickNextState(), ms)
    }

    private setState(state: PetState): void {
        this.state = state

        // Randomly flip direction when starting to walk
        if (state === "walking" && Math.random() < 0.3) {
            this.direction = this.direction === 1 ? -1 : 1
        }

        this.render()
    }

    // ─── Movement Tick ──────────────────────────────────────────────────

    private tick(): void {
        if (this.state !== "walking" || !this.familiar) return

        const speed =
            (this.familiar.behavior.speed / 10) *
            2 *
            (this.biorhythm
                ? 0.5 + this.biorhythm.physical.percentage / 100
                : 1)

        this.x += speed * this.direction

        // Bounce off edges
        const maxX = window.innerWidth - 40
        if (this.x > maxX) {
            this.x = maxX
            this.direction = -1
        } else if (this.x < 10) {
            this.x = 10
            this.direction = 1
        }

        this.el.style.left = `${this.x}px`
        this.updateFacing()
    }

    private updateFacing(): void {
        this.el.classList.toggle("facing-left", this.direction === -1)
    }

    // ─── Mouse Interaction ──────────────────────────────────────────────

    private handleMouse(e: MouseEvent): void {
        if (!this.familiar || this.state !== "walking") return

        const petRect = this.el.getBoundingClientRect()
        const petCenterX = petRect.left + petRect.width / 2
        const dist = Math.abs(e.clientX - petCenterX)

        if (dist < 100) {
            if (this.familiar.behavior.fleesCursor) {
                // Run away from cursor
                this.direction = e.clientX > petCenterX ? -1 : 1
            } else {
                // Move toward cursor
                this.direction = e.clientX > petCenterX ? 1 : -1
            }
            this.updateFacing()
        }
    }

    // ─── Click (show fortune) ───────────────────────────────────────────

    private handleClick(): void {
        // Tooltip is handled by CSS hover, but on click we could
        // do something extra -- like a little bounce
        const prev = this.state
        this.setState("bouncing")
        setTimeout(() => {
            if (this.state === "bouncing") this.setState(prev)
        }, 800)
    }

    // ─── Rendering ──────────────────────────────────────────────────────

    private render(): void {
        if (!this.familiar) return

        // Clear state classes
        this.el.className = "desktop-pet"
        this.el.classList.add(`state-${this.state}`)
        this.updateFacing()

        let extras = ""
        if (this.state === "sleeping") {
            extras = `<span class="pet-zzz">z</span>`
        } else if (this.state === "reading") {
            extras = `<span class="pet-book">📖</span>`
        }

        // Tooltip with horoscope fortune
        const fortune =
            this.horoscopeText.length > 80
                ? this.horoscopeText.slice(0, 77) + "..."
                : this.horoscopeText

        this.el.innerHTML = `
            ${this.familiar.emoji}
            ${extras}
            <div class="pet-tooltip">${fortune || "..."}</div>
        `
    }
}
