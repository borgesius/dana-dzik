type GlitchType =
    | "shift"
    | "colorSplit"
    | "invert"
    | "noise"
    | "scanlineJump"
    | "freeze"
    | "tear"
    | "corruption"

interface GlitchEvent {
    type: GlitchType
    duration: number
    intensity: number
}

const GLITCH_CONFIG = {
    minInterval: 3000,
    maxInterval: 15000,
    minDuration: 50,
    maxDuration: 300,
    multiGlitchChance: 0.3,
}

export class GlitchManager {
    private active = true
    private glitchTimeout: number | null = null
    private overlay: HTMLDivElement | null = null

    constructor() {
        this.createOverlay()
        this.scheduleNextGlitch()
    }

    private createOverlay(): void {
        this.overlay = document.createElement("div")
        this.overlay.className = "glitch-overlay"
        this.overlay.setAttribute("aria-hidden", "true")
        document.body.appendChild(this.overlay)
    }

    private scheduleNextGlitch(): void {
        if (!this.active) return

        const delay =
            GLITCH_CONFIG.minInterval +
            Math.random() *
                (GLITCH_CONFIG.maxInterval - GLITCH_CONFIG.minInterval)

        this.glitchTimeout = window.setTimeout(() => {
            this.triggerGlitch()
            this.scheduleNextGlitch()
        }, delay)
    }

    private triggerGlitch(): void {
        if (!this.active) return

        const glitch = this.generateGlitchEvent()
        this.applyGlitch(glitch)

        if (Math.random() < GLITCH_CONFIG.multiGlitchChance) {
            setTimeout(
                () => {
                    if (this.active) {
                        this.applyGlitch(this.generateGlitchEvent())
                    }
                },
                50 + Math.random() * 100
            )
        }
    }

    private generateGlitchEvent(): GlitchEvent {
        const types: GlitchType[] = [
            "shift",
            "colorSplit",
            "invert",
            "noise",
            "scanlineJump",
            "freeze",
            "tear",
            "corruption",
        ]

        return {
            type: types[Math.floor(Math.random() * types.length)],
            duration:
                GLITCH_CONFIG.minDuration +
                Math.random() *
                    (GLITCH_CONFIG.maxDuration - GLITCH_CONFIG.minDuration),
            intensity: 0.3 + Math.random() * 0.7,
        }
    }

    private applyGlitch(glitch: GlitchEvent): void {
        const body = document.body
        const desktop = document.querySelector(".desktop-area") as HTMLElement

        switch (glitch.type) {
            case "shift":
                this.applyShift(body, glitch)
                break
            case "colorSplit":
                this.applyColorSplit(body, glitch)
                break
            case "invert":
                this.applyInvert(body, glitch)
                break
            case "noise":
                this.applyNoise(glitch)
                break
            case "scanlineJump":
                this.applyScanlineJump(desktop, glitch)
                break
            case "freeze":
                this.applyFreeze(body, glitch)
                break
            case "tear":
                this.applyTear(glitch)
                break
            case "corruption":
                this.applyCorruption(body, glitch)
                break
        }
    }

    private applyShift(el: HTMLElement, glitch: GlitchEvent): void {
        const x = (Math.random() - 0.5) * 10 * glitch.intensity
        const y = (Math.random() - 0.5) * 5 * glitch.intensity
        el.style.transform = `translate(${x}px, ${y}px)`

        setTimeout(() => {
            el.style.transform = ""
        }, glitch.duration)
    }

    private applyColorSplit(el: HTMLElement, glitch: GlitchEvent): void {
        const offset = Math.round(3 * glitch.intensity)
        el.style.textShadow = `${offset}px 0 rgba(255,0,0,0.7), ${-offset}px 0 rgba(0,255,255,0.7)`

        setTimeout(() => {
            el.style.textShadow = ""
        }, glitch.duration)
    }

    private applyInvert(el: HTMLElement, glitch: GlitchEvent): void {
        el.style.filter = `invert(${glitch.intensity * 0.3})`

        setTimeout(() => {
            el.style.filter = ""
        }, glitch.duration * 0.5)
    }

    private applyNoise(glitch: GlitchEvent): void {
        if (!this.overlay) return

        this.overlay.style.opacity = String(glitch.intensity * 0.15)
        this.overlay.classList.add("noise-active")

        setTimeout(() => {
            if (this.overlay) {
                this.overlay.style.opacity = "0"
                this.overlay.classList.remove("noise-active")
            }
        }, glitch.duration)
    }

    private applyScanlineJump(
        el: HTMLElement | null,
        glitch: GlitchEvent
    ): void {
        if (!el) return

        const jumpY = Math.round((Math.random() - 0.5) * 20 * glitch.intensity)
        el.style.transform = `translateY(${jumpY}px) skewX(${glitch.intensity * 2}deg)`

        setTimeout(() => {
            el.style.transform = ""
        }, glitch.duration * 0.3)
    }

    private applyFreeze(_el: HTMLElement, glitch: GlitchEvent): void {
        document.body.classList.add("glitch-freeze")

        setTimeout(() => {
            document.body.classList.remove("glitch-freeze")
        }, glitch.duration * 2)
    }

    private applyTear(glitch: GlitchEvent): void {
        if (!this.overlay) return

        const tearCount = Math.floor(2 + Math.random() * 3)
        const tears: HTMLDivElement[] = []

        for (let i = 0; i < tearCount; i++) {
            const tear = document.createElement("div")
            tear.className = "glitch-tear"
            tear.style.top = `${Math.random() * 100}%`
            tear.style.height = `${2 + Math.random() * 8}px`
            tear.style.transform = `translateX(${(Math.random() - 0.5) * 40 * glitch.intensity}px)`
            this.overlay.appendChild(tear)
            tears.push(tear)
        }

        setTimeout(() => {
            tears.forEach((t) => t.remove())
        }, glitch.duration)
    }

    private applyCorruption(el: HTMLElement, glitch: GlitchEvent): void {
        const hue = Math.random() * 360
        el.style.filter = `hue-rotate(${hue}deg) saturate(${1 + glitch.intensity})`

        setTimeout(() => {
            el.style.filter = ""
        }, glitch.duration * 0.5)
    }

}
