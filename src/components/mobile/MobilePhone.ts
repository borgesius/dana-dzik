import type { RoutableWindow } from "../../config/routing"
import { type ColorScheme, getThemeManager } from "../../lib/themeManager"
import { MobileAppView } from "./MobileAppView"
import { MobileHomeScreen } from "./MobileHomeScreen"
import { MobileLockScreen } from "./MobileLockScreen"

type PhoneState = "lock" | "home" | "app"

export class MobilePhone {
    private container: HTMLElement
    private element: HTMLElement
    private statusBar: HTMLElement
    private screenArea: HTMLElement
    private lockScreen: MobileLockScreen
    private homeScreen: MobileHomeScreen
    private appView: MobileAppView
    private state: PhoneState = "lock"
    private clockInterval: number | null = null
    private appOpenCallback: ((windowId: RoutableWindow) => void) | null = null

    constructor(container: HTMLElement) {
        this.container = container
        document.documentElement.classList.add("is-mobile")

        this.element = document.createElement("div")
        this.element.className = "mobile-phone scanlines"

        this.statusBar = this.createStatusBar()
        this.element.appendChild(this.statusBar)

        this.screenArea = document.createElement("div")
        this.screenArea.style.flex = "1"
        this.screenArea.style.display = "flex"
        this.screenArea.style.flexDirection = "column"
        this.screenArea.style.position = "relative"
        this.screenArea.style.overflow = "hidden"
        this.element.appendChild(this.screenArea)

        this.lockScreen = new MobileLockScreen(() => this.unlock())
        this.screenArea.appendChild(this.lockScreen.getElement())

        this.homeScreen = new MobileHomeScreen((windowId) =>
            this.openApp(windowId)
        )
        this.screenArea.appendChild(this.homeScreen.getElement())

        this.appView = new MobileAppView(() => this.closeApp())
        this.screenArea.appendChild(this.appView.getElement())

        this.container.appendChild(this.element)

        this.startClock()
    }

    private createStatusBar(): HTMLElement {
        const bar = document.createElement("div")
        bar.className = "ios-status-bar"

        const left = document.createElement("div")
        left.className = "ios-status-bar-left"

        const signalDots = document.createElement("div")
        signalDots.className = "ios-signal-dots"
        for (let i = 0; i < 5; i++) {
            const dot = document.createElement("div")
            dot.className = "ios-signal-dot"
            signalDots.appendChild(dot)
        }
        left.appendChild(signalDots)

        const carrier = document.createElement("span")
        carrier.className = "ios-carrier"
        carrier.textContent = "Pferd"
        left.appendChild(carrier)

        const wifi = document.createElement("span")
        wifi.className = "ios-wifi"
        wifi.textContent = "⌔"
        left.appendChild(wifi)

        const center = document.createElement("div")
        center.className = "ios-status-bar-center"
        center.id = "ios-clock"
        center.textContent = this.formatTime()

        const right = document.createElement("div")
        right.className = "ios-status-bar-right"

        const battery = document.createElement("div")
        battery.className = "ios-battery"

        const batteryIcon = document.createElement("div")
        batteryIcon.className = "ios-battery-icon"

        const batteryFill = document.createElement("div")
        batteryFill.className = "ios-battery-fill"
        batteryIcon.appendChild(batteryFill)

        battery.appendChild(batteryIcon)
        right.appendChild(battery)

        const schemeToggle = this.createMobileSchemeToggle()
        right.appendChild(schemeToggle)

        bar.appendChild(left)
        bar.appendChild(center)
        bar.appendChild(right)

        return bar
    }

    private createMobileSchemeToggle(): HTMLElement {
        const SCHEME_ICONS: Record<ColorScheme, string> = {
            light: "\u2600",
            dark: "\uD83C\uDF19",
            system: "\u25D1",
        }

        const SCHEME_ORDER: ColorScheme[] = ["light", "dark", "system"]
        const tm = getThemeManager()

        const btn = document.createElement("span")
        btn.className = "ios-scheme-toggle"
        btn.style.cursor = "pointer"
        btn.style.fontSize = "12px"
        btn.style.marginLeft = "6px"
        btn.textContent = SCHEME_ICONS[tm.getColorScheme()]

        btn.addEventListener("click", (e) => {
            e.stopPropagation()
            const current = tm.getColorScheme()
            const idx = SCHEME_ORDER.indexOf(current)
            const next = SCHEME_ORDER[(idx + 1) % SCHEME_ORDER.length]
            tm.setColorScheme(next)
            btn.textContent = SCHEME_ICONS[next]
        })

        return btn
    }

    private formatTime(): string {
        const now = new Date()
        let hours = now.getHours()
        const minutes = now.getMinutes().toString().padStart(2, "0")
        const ampm = hours >= 12 ? "PM" : "AM"
        hours = hours % 12 || 12
        return `${hours}:${minutes} ${ampm}`
    }

    private startClock(): void {
        this.clockInterval = window.setInterval(() => {
            const clock = document.getElementById("ios-clock")
            if (clock) {
                clock.textContent = this.formatTime()
            }
        }, 60_000)
    }

    private unlock(): void {
        this.state = "home"
        this.lockScreen.hide()
    }

    public openApp(windowId: RoutableWindow): void {
        this.state = "app"
        this.appView.show(windowId)
        if (this.appOpenCallback) {
            this.appOpenCallback(windowId)
        }
    }

    private closeApp(): void {
        this.state = "home"
        this.appView.hide()
    }

    public onAppOpen(callback: (windowId: RoutableWindow) => void): void {
        this.appOpenCallback = callback
    }

    public getActiveAppId(): string | null {
        if (this.state === "app") {
            return this.appView.getCurrentAppId()
        }
        return null
    }

    public getPopupContainer(): HTMLElement {
        return this.element
    }

    public destroy(): void {
        if (this.clockInterval) {
            window.clearInterval(this.clockInterval)
        }
    }
}
