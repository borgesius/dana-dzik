import { isCalmMode } from "./calmMode"
import { getCosmeticManager } from "./cosmetics/CosmeticManager"
import { emitAppEvent } from "./events"
import { getLocaleManager, type LocaleId } from "./localeManager"
import { getThemeManager, type ThemeId } from "./themeManager"

type GlitchType =
    | "shift"
    | "colorSplit"
    | "invert"
    | "noise"
    | "scanlineJump"
    | "freeze"
    | "tear"
    | "corruption"
    | "pixelate"

interface GlitchEvent {
    type: GlitchType
    duration: number
    intensity: number
}

const GLITCH_CONFIG = {
    minInterval: 15000,
    maxInterval: 45000,
    minDuration: 50,
    maxDuration: 300,
    multiGlitchChance: 0.1,
}

const THEME_GLITCH_CONFIG = {
    flashMinInterval: 90000,
    flashMaxInterval: 300000,
    fullSwitchChance: 0.2,
    flashDuration: { min: 200, max: 500 },
    transitionEffectDuration: 100,
}

const LOCALE_GLITCH_CONFIG = {
    flashMinInterval: 120000,
    flashMaxInterval: 360000,
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

    private getGlitchThemePool(): ThemeId[] {
        const tm = getThemeManager()
        const current = tm.getCurrentTheme()
        const unlocked = getCosmeticManager().getUnlockedForType("theme")
        return unlocked.filter((id) => id !== current) as ThemeId[]
    }

    private triggerThemeGlitch(): void {
        if (isCalmMode()) return
        const isFullSwitch =
            Math.random() < THEME_GLITCH_CONFIG.fullSwitchChance
        const pool = this.getGlitchThemePool()
        if (pool.length === 0) return
        const targetTheme = pool[Math.floor(Math.random() * pool.length)]

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
        if (isCalmMode()) return
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
        if (isCalmMode()) return
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
        const type: GlitchType =
            Math.random() < 0.01
                ? "pixelate"
                : (
                      [
                          "shift",
                          "colorSplit",
                          "invert",
                          "noise",
                          "scanlineJump",
                          "freeze",
                          "tear",
                          "corruption",
                      ] as GlitchType[]
                  )[Math.floor(Math.random() * 8)]

        return {
            type,
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
        emitAppEvent("glitch:triggered", { type: glitch.type })
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
            case "pixelate":
                this.applyPixelate(body, glitch)
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

    private applyPixelate(el: HTMLElement, glitch: GlitchEvent): void {
        const pixelSize = Math.round(4 + glitch.intensity * 12)

        let svg = document.getElementById(
            "glitch-pixelate-svg"
        ) as SVGSVGElement | null
        if (!svg) {
            svg = document.createElementNS("http://www.w3.org/2000/svg", "svg")
            svg.id = "glitch-pixelate-svg"
            svg.setAttribute("width", "0")
            svg.setAttribute("height", "0")
            svg.style.position = "absolute"
            document.body.appendChild(svg)
        }

        const half = Math.round(pixelSize / 2)
        svg.innerHTML = `
            <filter id="glitch-pixelate">
                <feFlood x="${half}" y="${half}" height="1" width="1"/>
                <feComposite width="${pixelSize}" height="${pixelSize}"/>
                <feTile result="a"/>
                <feComposite in="SourceGraphic" in2="a" operator="in"/>
                <feMorphology operator="dilate" radius="${half}"/>
            </filter>
        `

        el.style.filter = "url(#glitch-pixelate)"

        setTimeout(() => {
            el.style.filter = ""
        }, glitch.duration)
    }
}
