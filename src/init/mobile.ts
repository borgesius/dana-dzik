import { AchievementToast } from "../components/AchievementToast"
import { LevelUpPopup } from "../components/LevelUpPopup"
import { MobilePhone } from "../components/mobile/MobilePhone"
import { MobilePopupManager } from "../components/mobile/MobilePopupManager"
import { getAchievementManager } from "../lib/achievements/AchievementManager"
import { wireAchievements } from "../lib/achievements/wiring"
import { createAudioManager } from "../lib/audio"
import { getCollectionManager } from "../lib/autobattler/CollectionManager"
import { isCalmMode } from "../lib/calmMode"
import { getCosmeticManager } from "../lib/cosmetics/CosmeticManager"
import { wireCosmeticUnlocks } from "../lib/cosmetics/wiring"
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
import { isRoutableWindow } from "./core"

export function initMobile(app: HTMLElement): void {
    const achievements = getAchievementManager()
    const phone = new MobilePhone(app)

    wireAchievements(achievements, (cb) => {
        phone.onAppOpen(cb)
    })
    new AchievementToast(achievements)
    new LevelUpPopup()

    wireProgression(getProgressionManager(), (cb) => {
        phone.onAppOpen(cb)
    })

    wireCosmeticUnlocks()

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
        }
    })

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
            if (windowId && isRoutableWindow(windowId)) {
                phone.openApp(windowId)
            }
        }
    })
}
