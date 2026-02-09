import { AchievementToast } from "../components/AchievementToast"
import { CosmeticToast } from "../components/CosmeticToast"
import { CursorTrail } from "../components/CursorTrail"
import { Desktop } from "../components/Desktop"
import { attachDevApi, DevPanel } from "../components/DevPanel"
import { LevelUpPopup } from "../components/LevelUpPopup"
import { PopupManager } from "../components/PopupManager"
import { setTerminalInit } from "../components/Terminal"
import { Widgets } from "../components/Widgets"
import { XPPopup } from "../components/XPPopup"
import { getDeployEnv } from "../config/environment"
import { getAchievementManager } from "../lib/achievements/AchievementManager"
import {
    wireAchievements,
    wireVeilAchievements,
} from "../lib/achievements/wiring"
import { createAudioManager } from "../lib/audio"
import { getCollectionManager } from "../lib/autobattler/CollectionManager"
import { recordBootEnd } from "../lib/bootTime"
import { isCalmMode } from "../lib/calmMode"
import { getCosmeticManager } from "../lib/cosmetics/CosmeticManager"
import { wireCosmeticUnlocks } from "../lib/cosmetics/wiring"
import { onAppEvent } from "../lib/events"
import { GlitchManager } from "../lib/glitchEffects"
import { getLocaleManager } from "../lib/localeManager"
import { getMarketGame } from "../lib/marketGame/MarketEngine"
import { getPrestigeManager } from "../lib/prestige/PrestigeManager"
import { getCareerManager } from "../lib/progression/CareerManager"
import { getProgressionManager } from "../lib/progression/ProgressionManager"
import { wireProgression } from "../lib/progression/wiring"
import { Router } from "../lib/router"
import { type SaveData, saveManager } from "../lib/saveManager"
import { SystemCrashHandler } from "../lib/systemCrash"
import { getSharedFilesystem } from "../lib/terminal/filesystemBuilder"
import { diffFilesystem } from "../lib/terminal/filesystemDiff"
import { getThemeManager } from "../lib/themeManager"
import { getVeilManager } from "../lib/veil/VeilManager"
import { requestResumeCareerTab } from "../lib/windowContent"
import { isRoutableWindow } from "./core"

export function initDesktop(app: HTMLElement): void {
    const achievements = getAchievementManager()
    const desktop = new Desktop(app)
    const windowManager = desktop.getWindowManager()

    wireAchievements(achievements, (cb) => {
        windowManager.onNewWindowOpen(cb)
    })
    wireVeilAchievements()
    new AchievementToast(achievements)
    new CosmeticToast()
    new LevelUpPopup()
    new XPPopup()

    wireProgression(getProgressionManager(), (cb) => {
        windowManager.onNewWindowOpen(cb)
    })

    wireCosmeticUnlocks()

    getThemeManager().on("themeChanged", () => saveManager.requestSave())
    getThemeManager().on("colorSchemeChanged", () => saveManager.requestSave())
    getLocaleManager().on("localeChanged", () => saveManager.requestSave())
    getMarketGame().on("tradeExecuted", () => saveManager.requestSave())
    getMarketGame().on("stateChanged", () => saveManager.requestSave())

    saveManager.registerGatherFn((): SaveData => {
        const pinballHighScore =
            parseInt(localStorage.getItem("pinball-high-score") || "0", 10) || 0

        return {
            version: 3,
            savedAt: Date.now(),
            game: getMarketGame().serialize(),
            pinball: { highScore: pinballHighScore },
            preferences: {
                theme: getThemeManager().getCurrentTheme(),
                colorScheme: getThemeManager().getColorScheme(),
                locale: getLocaleManager().getCurrentLocale(),
                calmMode: isCalmMode(),
            },
            filesystem: diffFilesystem(getSharedFilesystem()),
            achievements: achievements.serialize(),
            prestige: getPrestigeManager().serialize(),
            progression: {
                ...getProgressionManager().serialize(),
                ...getCareerManager().serialize(),
            },
            autobattler: getCollectionManager().serialize(),
            cosmetics: getCosmeticManager().serialize(),
            veil: getVeilManager().serialize(),
        }
    })

    const router = new Router((windowId) => {
        windowManager.openWindow(windowId)
        // /career route now opens the resume window — switch to career tab
        const route =
            window.location.hash.replace("#", "") || window.location.pathname
        if (route === "/career") {
            requestResumeCareerTab()
        }
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

    // ── Cosmetic system: apply active cosmetics via CSS classes on body ────
    const COSMETIC_CLASS_PREFIXES = [
        "wp-",
        "chrome-",
        "font-",
        "taskbar-",
        "anim-",
    ]

    const applyCosmetics = (): void => {
        const cm = getCosmeticManager()

        document.body.classList.forEach((cls) => {
            if (COSMETIC_CLASS_PREFIXES.some((p) => cls.startsWith(p))) {
                document.body.classList.remove(cls)
            }
        })

        const wpId = cm.getActive("wallpaper")
        if (wpId !== "default") {
            document.body.classList.add(`wp-${wpId}`)
        }

        const chromeId = cm.getActive("window-chrome")
        if (chromeId !== "default") {
            document.body.classList.add(`chrome-${chromeId}`)
        }

        const fontId = cm.getActive("system-font")
        if (fontId !== "default") {
            document.body.classList.add(`font-${fontId}`)
        }

        const taskbarId = cm.getActive("taskbar-style")
        if (taskbarId !== "default") {
            document.body.classList.add(`taskbar-${taskbarId}`)
        }

        const animId = cm.getActive("window-animation")
        if (animId !== "default") {
            document.body.classList.add(`anim-${animId}`)
        }
    }
    applyCosmetics()
    getCosmeticManager().onChange(() => applyCosmetics())
    new SystemCrashHandler()
    new Widgets(app)

    recordBootEnd()

    windowManager.onNewWindowOpen(() => {
        popupManager.onWindowOpen()
    })

    document.addEventListener("click", (e) => {
        const target = e.target as HTMLElement
        const link = target.closest("[data-open-window]")
        if (link) {
            e.preventDefault()
            const windowId = link.getAttribute("data-open-window")
            if (windowId && isRoutableWindow(windowId)) {
                windowManager.openWindow(windowId)
            }
        }
    })

    onAppEvent("terminal:file-saved", () => {
        saveManager.requestSave()
    })

    onAppEvent("terminal:open-window", (detail) => {
        const windowId = detail.windowId
        if (windowId && isRoutableWindow(String(windowId))) {
            windowManager.openWindow(windowId)
        }
    })

    onAppEvent("explorer:open-terminal", (detail) => {
        const { cwd, command } = detail
        setTerminalInit({ cwd, command })
        windowManager.closeWindow("terminal")
        windowManager.openWindow("terminal")
    })

    // ── Dev panel (development only) ────────────────────────────────────────
    if (getDeployEnv() === "development") {
        const devPanel = new DevPanel(windowManager)
        attachDevApi(devPanel, windowManager)
        window.__devPanel = devPanel
    }

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
