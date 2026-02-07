import { getLocaleManager, type LocaleId } from "./localeManager"
import { getThemeManager } from "./themeManager"

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

const THEME_GLITCH_CONFIG = {
    flashMinInterval: 30000,
    flashMaxInterval: 90000,
    fullSwitchChance: 0.2,
    flashDuration: { min: 200, max: 500 },
    transitionEffectDuration: 100,
}

const LOCALE_GLITCH_CONFIG = {
    flashMinInterval: 40000,
    flashMaxInterval: 120000,
    flashDuration: { min: 300, max: 700 },
    transitionEffectDuration: 150,
}

export class GlitchManager {
    private overlay: HTMLDivElement | null = null
    private localeRestoreTimeout: number | null = null

    constructor() {
        this.createOverlay()
        this.scheduleNextGlitch()
        this.scheduleNextThemeGlitch()
        this.scheduleNextLocaleGlitch()
    }

    private createOverlay(): void {
        this.overlay = document.createElement("div")
        this.overlay.className = "glitch-overlay"
        this.overlay.setAttribute("aria-hidden", "true")
        document.body.appendChild(this.overlay)
    }

    private scheduleNextGlitch(): void {
        const delay =
            GLITCH_CONFIG.minInterval +
            Math.random() *
                (GLITCH_CONFIG.maxInterval - GLITCH_CONFIG.minInterval)

        window.setTimeout(() => {
            this.triggerGlitch()
            this.scheduleNextGlitch()
        }, delay)
    }

    private scheduleNextThemeGlitch(): void {
        const delay =
            THEME_GLITCH_CONFIG.flashMinInterval +
            Math.random() *
                (THEME_GLITCH_CONFIG.flashMaxInterval -
                    THEME_GLITCH_CONFIG.flashMinInterval)

        window.setTimeout(() => {
            this.triggerThemeGlitch()
            this.scheduleNextThemeGlitch()
        }, delay)
    }

    private scheduleNextLocaleGlitch(): void {
        const delay =
            LOCALE_GLITCH_CONFIG.flashMinInterval +
            Math.random() *
                (LOCALE_GLITCH_CONFIG.flashMaxInterval -
                    LOCALE_GLITCH_CONFIG.flashMinInterval)

        window.setTimeout(() => {
            this.triggerLocaleGlitch()
            this.scheduleNextLocaleGlitch()
        }, delay)
    }

    private triggerThemeGlitch(): void {
        const tm = getThemeManager()
        const isFullSwitch =
            Math.random() < THEME_GLITCH_CONFIG.fullSwitchChance
        const targetTheme = tm.getRandomOtherTheme()

        if (isFullSwitch) {
            this.performFullThemeSwitch(targetTheme)
        } else {
            this.performMomentaryFlash(targetTheme)
        }
    }

    private performMomentaryFlash(targetTheme: string): void {
        const tm = getThemeManager()
        const flashDuration =
            THEME_GLITCH_CONFIG.flashDuration.min +
            Math.random() *
                (THEME_GLITCH_CONFIG.flashDuration.max -
                    THEME_GLITCH_CONFIG.flashDuration.min)

        this.applyGlitch(
            this.generateGlitchEvent(
                "noise",
                0.8,
                THEME_GLITCH_CONFIG.transitionEffectDuration
            )
        )
        this.applyGlitch(
            this.generateGlitchEvent(
                "tear",
                0.6,
                THEME_GLITCH_CONFIG.transitionEffectDuration
            )
        )

        setTimeout(() => {
            tm.setThemeTemporary(
                targetTheme as "win95" | "mac-classic" | "apple2" | "c64"
            )

            setTimeout(() => {
                this.applyGlitch(
                    this.generateGlitchEvent(
                        "colorSplit",
                        0.5,
                        THEME_GLITCH_CONFIG.transitionEffectDuration
                    )
                )
                tm.restoreTheme()
            }, flashDuration)
        }, THEME_GLITCH_CONFIG.transitionEffectDuration)
    }

    private performFullThemeSwitch(targetTheme: string): void {
        const tm = getThemeManager()

        this.applyGlitch(this.generateGlitchEvent("corruption", 1.0, 300))
        this.applyGlitch(this.generateGlitchEvent("tear", 0.9, 300))
        this.applyGlitch(this.generateGlitchEvent("noise", 1.0, 300))

        setTimeout(() => {
            tm.setTheme(
                targetTheme as "win95" | "mac-classic" | "apple2" | "c64"
            )
        }, 300)
    }

    private triggerLocaleGlitch(): void {
        const lm = getLocaleManager()
        const currentLocale = lm.getCurrentLocale()
        const allLocales = lm.getLocaleIds()
        const otherLocales = allLocales.filter((l) => l !== currentLocale)
        const targetLocale =
            otherLocales[Math.floor(Math.random() * otherLocales.length)]

        this.performMomentaryLocaleFlash(targetLocale, currentLocale)
    }

    private performMomentaryLocaleFlash(
        targetLocale: LocaleId,
        originalLocale: LocaleId
    ): void {
        const lm = getLocaleManager()
        const flashDuration =
            LOCALE_GLITCH_CONFIG.flashDuration.min +
            Math.random() *
                (LOCALE_GLITCH_CONFIG.flashDuration.max -
                    LOCALE_GLITCH_CONFIG.flashDuration.min)

        this.applyGlitch(
            this.generateGlitchEvent(
                "noise",
                0.6,
                LOCALE_GLITCH_CONFIG.transitionEffectDuration
            )
        )
        this.applyGlitch(
            this.generateGlitchEvent(
                "shift",
                0.5,
                LOCALE_GLITCH_CONFIG.transitionEffectDuration
            )
        )

        setTimeout(() => {
            void lm.setLocale(targetLocale)

            if (this.localeRestoreTimeout) {
                clearTimeout(this.localeRestoreTimeout)
            }

            this.localeRestoreTimeout = window.setTimeout(() => {
                this.applyGlitch(
                    this.generateGlitchEvent(
                        "colorSplit",
                        0.4,
                        LOCALE_GLITCH_CONFIG.transitionEffectDuration
                    )
                )
                void lm.setLocale(originalLocale)
                this.localeRestoreTimeout = null
            }, flashDuration)
        }, LOCALE_GLITCH_CONFIG.transitionEffectDuration)
    }

    private triggerGlitch(): void {
        const glitch = this.generateRandomGlitchEvent()
        this.applyGlitch(glitch)

        if (Math.random() < GLITCH_CONFIG.multiGlitchChance) {
            setTimeout(
                () => {
                    this.applyGlitch(this.generateRandomGlitchEvent())
                },
                50 + Math.random() * 100
            )
        }
    }

    private generateRandomGlitchEvent(): GlitchEvent {
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

    private generateGlitchEvent(
        type: GlitchType,
        intensity: number,
        duration: number
    ): GlitchEvent {
        return { type, intensity, duration }
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
