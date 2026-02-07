import { ROUTABLE_WINDOWS, type RoutableWindow } from "../config/routing"
import { setupErrorHandlers } from "../core/ErrorHandler"
import { getAchievementManager } from "../lib/achievements/AchievementManager"
import {
    getAbVariant,
    initPerfTracking,
    trackFunnelStep,
    trackPageview,
} from "../lib/analytics"
import { initCalmMode } from "../lib/calmMode"
import { getLocaleManager } from "../lib/localeManager"
import { getMarketGame } from "../lib/marketGame/MarketEngine"
import { getCollectionManager } from "../lib/autobattler/CollectionManager"
import { getPrestigeManager } from "../lib/prestige/PrestigeManager"
import { getCareerManager } from "../lib/progression/CareerManager"
import { getProgressionManager } from "../lib/progression/ProgressionManager"
import { saveManager } from "../lib/saveManager"
import {
    BIG_SPENDER_THRESHOLD,
    initSessionCostTracker,
    WHALE_THRESHOLD,
} from "../lib/sessionCost"
import { getSharedFilesystem } from "../lib/terminal/filesystemBuilder"
import { patchFilesystem } from "../lib/terminal/filesystemDiff"
import { getThemeManager } from "../lib/themeManager"

export function isRoutableWindow(id: string): id is RoutableWindow {
    return ROUTABLE_WINDOWS.includes(id as RoutableWindow)
}

export function initCore(): void {
    setupErrorHandlers()

    const savedData = saveManager.load()
    getThemeManager()

    if (
        savedData.filesystem &&
        (Object.keys(savedData.filesystem.modified).length > 0 ||
            Object.keys(savedData.filesystem.created).length > 0 ||
            savedData.filesystem.deleted.length > 0)
    ) {
        patchFilesystem(getSharedFilesystem(), savedData.filesystem)
    }

    if (savedData.game) {
        getMarketGame().loadState(savedData.game)
    }

    const achievements = getAchievementManager()
    achievements.deserialize(savedData.achievements)
    achievements.setDirtyCallback(() => saveManager.requestSave())

    const progression = getProgressionManager()
    progression.deserialize(savedData.progression)
    progression.setDirtyCallback(() => saveManager.requestSave())

    const prestige = getPrestigeManager()
    prestige.deserialize(savedData.prestige)
    prestige.setDirtyCallback(() => saveManager.requestSave())

    const collection = getCollectionManager()
    collection.deserialize(savedData.autobattler)
    collection.setDirtyCallback(() => saveManager.requestSave())

    const career = getCareerManager()
    career.deserialize(savedData.progression)
    career.setDirtyCallback(() => saveManager.requestSave())

    // ── Wire cross-system bonus providers ────────────────────────────────────
    const marketGame = getMarketGame()
    marketGame.bonusProvider = (type: string) => career.getBonus(type as never)

    progression.xpBonusProvider = () => career.getBonus("xpRate")
    prestige.hindsightBonusProvider = () => career.getBonus("hindsightRate")

    initCalmMode(savedData.preferences.calmMode ?? false)

    window.addEventListener("beforeunload", () => {
        saveManager.saveImmediate()
    })
}

export async function initServices(): Promise<void> {
    await getLocaleManager().init()

    initSessionCostTracker(BIG_SPENDER_THRESHOLD, WHALE_THRESHOLD)

    trackPageview()
    trackFunnelStep("launched")
    trackFunnelStep("boot_complete")
    getAbVariant()
    initPerfTracking()
}
