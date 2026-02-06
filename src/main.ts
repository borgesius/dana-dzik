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

import { CursorTrail } from "./components/CursorTrail"
import { Desktop } from "./components/Desktop"
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
import { Router } from "./lib/router"

setupErrorHandlers()
trackPageview()
trackFunnelStep("launched")
trackFunnelStep("boot_complete")
getAbVariant()
initPerfTracking()

const app = document.getElementById("app")
if (app) {
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
