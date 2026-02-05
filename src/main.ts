import "./styles/content.css"
import "./styles/desktop.css"
import "./styles/effects.css"
import "./styles/taskbar.css"
import "./styles/widgets.css"
import "./styles/windows.css"

import { CursorTrail } from "./components/CursorTrail"
import { Desktop } from "./components/Desktop"
import { PopupManager } from "./components/PopupManager"
import { Widgets } from "./components/Widgets"
import { setupErrorHandlers } from "./core/ErrorHandler"
import { createAudioManager } from "./lib/audio"
import { GlitchManager } from "./lib/glitchEffects"
import { Router } from "./lib/router"
import { SafeMode } from "./lib/safeMode"

setupErrorHandlers()

const app = document.getElementById("app")
if (app) {
    const safeMode = new SafeMode()
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
    const cursorTrail = new CursorTrail()
    const audioManager = createAudioManager()
    new GlitchManager()
    new Widgets(app)

    safeMode.onChange((enabled) => {
        if (enabled) {
            popupManager.stop()
            cursorTrail.disable()
            audioManager.setEnabled(false)
        } else {
            popupManager.start()
            cursorTrail.enable()
            audioManager.setEnabled(true)
        }
    })

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
