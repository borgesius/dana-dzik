import "./styles/themes/_variables.css"
import "./styles/themes/win95.css"
import "./styles/themes/mac-classic.css"
import "./styles/themes/apple2.css"
import "./styles/themes/c64.css"
import "./styles/themes/color-schemes.css"
import "./styles/business-game.css"
import "./styles/content.css"
import "./styles/desktop.css"
import "./styles/effects.css"
import "./styles/pinball.css"
import "./styles/taskbar.css"
import "./styles/explorer.css"
import "./styles/terminal.css"
import "./styles/widgets.css"
import "./styles/windows.css"
import "./styles/mobile.css"

import { CursorTrail } from "./components/CursorTrail"
import { Desktop } from "./components/Desktop"
import { MobilePhone } from "./components/mobile/MobilePhone"
import { MobilePopupManager } from "./components/mobile/MobilePopupManager"
import { PopupManager } from "./components/PopupManager"
import { setTerminalInit } from "./components/Terminal"
import { Widgets } from "./components/Widgets"
import { setupErrorHandlers } from "./core/ErrorHandler"
import {
    getAbVariant,
    initPerfTracking,
    trackFunnelStep,
    trackPageview,
} from "./lib/analytics"
import { createAudioManager } from "./lib/audio"
import { GlitchManager } from "./lib/glitchEffects"
import { isMobile } from "./lib/isMobile"
import { getLocaleManager } from "./lib/localeManager"
import { Router } from "./lib/router"
import { SystemCrashHandler } from "./lib/systemCrash"
import { getThemeManager } from "./lib/themeManager"

setupErrorHandlers()
getThemeManager()
void getLocaleManager().init()
trackPageview()
trackFunnelStep("launched")
trackFunnelStep("boot_complete")
getAbVariant()
initPerfTracking()

const app = document.getElementById("app")
if (app) {
    if (isMobile()) {
        initMobile(app)
    } else {
        initDesktop(app)
    }
}

function initMobile(app: HTMLElement): void {
    const phone = new MobilePhone(app)

    const router = new Router((windowId) => {
        phone.openApp(windowId)
    })

    phone.onAppOpen((windowId) => {
        router.updateUrl(windowId)
    })

    router.init()

    const popupManager = new MobilePopupManager(phone.getPopupContainer())

    phone.onAppOpen(() => {
        popupManager.onWindowOpen()
    })

    createAudioManager()
    new GlitchManager()
    new SystemCrashHandler()

    document.addEventListener("click", (e) => {
        const target = e.target as HTMLElement
        const link = target.closest("[data-open-window]")
        if (link) {
            e.preventDefault()
            const windowId = link.getAttribute("data-open-window")
            if (windowId) {
                phone.openApp(windowId)
            }
        }
    })
}

function initDesktop(app: HTMLElement): void {
    const desktop = new Desktop(app)
    const windowManager = desktop.getWindowManager()

    const router = new Router((windowId) => {
        windowManager.openWindow(windowId)
    })

    windowManager.onWindowsChange(() => {
        const activeId = windowManager.getActiveWindowId()
        if (activeId) {
            router.updateUrl(activeId)
        }
    })

    router.init()

    const popupManager = new PopupManager(app)
    new CursorTrail()
    createAudioManager()
    new GlitchManager()
    new SystemCrashHandler()
    new Widgets(app)

    windowManager.onNewWindowOpen(() => {
        popupManager.onWindowOpen()
    })

    document.addEventListener("click", (e) => {
        const target = e.target as HTMLElement
        const link = target.closest("[data-open-window]")
        if (link) {
            e.preventDefault()
            const windowId = link.getAttribute("data-open-window")
            if (windowId) {
                windowManager.openWindow(windowId)
            }
        }
    })

    document.addEventListener("terminal:open-window", ((
        e: CustomEvent<{ windowId: string }>
    ) => {
        const windowId = e.detail.windowId
        if (windowId) {
            windowManager.openWindow(windowId)
        }
    }) as EventListener)

    document.addEventListener("explorer:open-terminal", ((
        e: CustomEvent<{ cwd: string; command: string }>
    ) => {
        const { cwd, command } = e.detail
        setTerminalInit({ cwd, command })
        windowManager.closeWindow("terminal")
        windowManager.openWindow("terminal")
    }) as EventListener)

    addFloatingGifs(desktop)
}

function addFloatingGifs(desktop: Desktop): void {
    const gifs = [
        { src: "/assets/gifs/fire.gif", x: 100, y: 200 },
        { src: "/assets/gifs/construction.gif", x: 700, y: 150 },
        { src: "/assets/gifs/email.gif", x: 500, y: 400 },
        { src: "/assets/gifs/globe.gif", x: 200, y: 500 },
        { src: "/assets/gifs/star.gif", x: 800, y: 300 },
    ]

    gifs.forEach(({ src, x, y }) => {
        desktop.addFloatingGif(src, x, y)
    })
}
