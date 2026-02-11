import { ROUTABLE_WINDOWS, type RoutableWindow } from "../config/routing"
import { setupErrorHandlers } from "../core/ErrorHandler"
import { getAchievementManager } from "../lib/achievements/AchievementManager"
import {
    getAbVariant,
    initCrashTracking,
    initPerfTracking,
    trackFunnelStep,
    trackPageview,
} from "../lib/analytics"
import { getCollectionManager } from "../lib/autobattler/CollectionManager"
import { setLineSlotProvider } from "../lib/autobattler/shop"
import { initCalmMode } from "../lib/calmMode"
import { getCosmeticManager } from "../lib/cosmetics/CosmeticManager"
import { getLocaleManager } from "../lib/localeManager"
import {
    getMarketGame,
    type OfflineSummary,
} from "../lib/marketGame/MarketEngine"
import { getPrestigeManager } from "../lib/prestige/PrestigeManager"
import { getCareerManager } from "../lib/progression/CareerManager"
import { getProgressionManager } from "../lib/progression/ProgressionManager"
import { saveManager } from "../lib/saveManager"
import {
    getSessionCostTracker,
    initSessionCostTracker,
} from "../lib/sessionCost"
import { getSharedFilesystem } from "../lib/terminal/filesystemBuilder"
import { patchFilesystem } from "../lib/terminal/filesystemDiff"
import { getThemeManager } from "../lib/themeManager"
import { getVeilManager } from "../lib/veil/VeilManager"
import { getVeilOverlay } from "../lib/veil/VeilOverlay"
import { VeilUnlockModal } from "../lib/veil/VeilUnlockModal"

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

    const cosmetics = getCosmeticManager()
    cosmetics.deserialize(savedData.cosmetics)
    cosmetics.setDirtyCallback(() => saveManager.requestSave())

    // Reconcile: if the cosmetic active theme differs from ThemeManager,
    // apply the cosmetic choice (it's the user-facing source of truth).
    const cosmeticTheme = cosmetics.getActive("theme")
    const tm = getThemeManager()
    if (cosmeticTheme && cosmeticTheme !== tm.getCurrentTheme()) {
        tm.setTheme(cosmeticTheme as Parameters<typeof tm.setTheme>[0])
    }

    const veil = getVeilManager()
    if (savedData.veil) {
        veil.deserialize(savedData.veil)
    }
    veil.setDirtyCallback(() => saveManager.requestSave())

    // Wire overlay launcher
    const overlay = getVeilOverlay()
    overlay.textResolver = (key: string): string => getLocaleManager().t(key)
    veil.launchOverlay = (veilId, replay): void =>
        overlay.launch(veilId, replay)

    // Wire unlock modal (listens for veil:unlocked events for veils 1-3)
    const unlockModal = new VeilUnlockModal()
    unlockModal.textResolver = (key: string): string =>
        getLocaleManager().t(key)

    // ── Cost tracker: restore lifetime data ─────────────────────────────────
    const costTracker = initSessionCostTracker()
    costTracker.deserialize(savedData.cost)
    costTracker.setDirtyCallback(() => saveManager.requestSave())

    // ── Wire cross-system bonus providers ────────────────────────────────────
    const marketGame = getMarketGame()
    marketGame.bonusProvider = (type: string): number => {
        const careerBonus = career.getBonus(type as never)
        const employeeBonus = marketGame.getEmployeeBonus(type)
        const veteransMult = prestige.getVeteransNetworkMultiplier()
        return careerBonus * veteransMult + employeeBonus
    }

    marketGame.prestigeProvider = (key: string): number => {
        switch (key) {
            case "phaseThresholdReduction":
                return prestige.getPhaseThresholdReduction()
            case "factoryCostScaling":
                return prestige.getFactoryCostScaling()
            case "productionSpeedMultiplier":
                return prestige.getProductionSpeedMultiplier()
            case "hiringDiscount":
                return prestige.getHiringDiscount()
            case "marketIntuition":
                return prestige.hasUpgrade("market-intuition") ? 1 : 0
            case "factoryMultiplier":
                return prestige.getFactoryMultiplier()
            case "cheaperFactories":
                return prestige.getCheaperFactoriesDiscount()
            case "insiderEdge":
                return prestige.hasInsiderEdge() ? 1 : 0
            case "offlineEfficiency":
                return prestige.getOfflineEfficiency()
            case "perpetualFactories":
                return prestige.hasPerpetualFactories() ? 1 : 0
            case "veteranRecruits":
                return prestige.hasVeteranRecruits() ? 1 : 0
            case "marketMemory":
                return prestige.hasMarketMemory() ? 1 : 0
            default:
                return 0
        }
    }

    // Dynamic autobattler line slots based on player level
    setLineSlotProvider(() => {
        const level = progression.getLevel()
        if (level >= 18) return 7
        if (level >= 10) return 6
        return 5
    })

    progression.xpBonusProvider = (): number => career.getBonus("xpRate")
    prestige.hindsightBonusProvider = (): number =>
        career.getBonus("hindsightRate")

    initCalmMode(savedData.preferences.calmMode ?? false)

    // ── Offline time catchup ─────────────────────────────────────────────
    if (savedData.savedAt) {
        const elapsed = Date.now() - savedData.savedAt
        if (elapsed > 30_000) {
            const summary = marketGame.offlineCatchup(elapsed)
            showOfflineSummary(summary)
        }
    }

    window.addEventListener("beforeunload", () => {
        saveManager.saveImmediate()
    })
}

function showOfflineSummary(summary: OfflineSummary): void {
    const hasProduction = Object.keys(summary.commoditiesProduced).length > 0
    const hasSalaries = summary.salariesPaid > 0
    if (!hasProduction && !hasSalaries) return

    const hours = Math.round((summary.elapsedMs / (60 * 60 * 1000)) * 10) / 10
    let html = `<div style="padding:12px;max-width:320px;font-family:var(--font-system,Geneva,sans-serif);font-size:12px">`
    html += `<strong>While you were away (${hours}h)...</strong><br><br>`

    if (hasProduction) {
        html += `<u>Factories produced:</u><br>`
        for (const [commodity, qty] of Object.entries(
            summary.commoditiesProduced
        )) {
            html += `&nbsp;&nbsp;${commodity}: +${qty}<br>`
        }
    }

    if (hasSalaries) {
        html += `<br><u>Salaries paid:</u> $${summary.salariesPaid.toFixed(2)}<br>`
    }

    if (summary.employeesFired > 0) {
        html += `<br><em>${summary.employeesFired} employee(s) laid off due to budget constraints.</em><br>`
    }

    html += `</div>`

    const overlay = document.createElement("div")
    overlay.style.cssText =
        "position:fixed;top:0;left:0;right:0;bottom:0;display:flex;align-items:center;justify-content:center;z-index:99999;background:rgba(0,0,0,0.3)"
    const box = document.createElement("div")
    box.style.cssText =
        "background:var(--color-window-bg,#fff);border:2px solid var(--color-window-border,#000);padding:8px;box-shadow:4px 4px 0 rgba(0,0,0,0.2);max-width:360px"
    box.innerHTML =
        html +
        `<div style="text-align:center;margin-top:8px"><button id="offline-dismiss" style="padding:4px 16px;cursor:pointer">OK</button></div>`
    overlay.appendChild(box)
    document.body.appendChild(overlay)
    document
        .getElementById("offline-dismiss")
        ?.addEventListener("click", () => {
            overlay.remove()
        })
}

export async function initServices(): Promise<void> {
    await getLocaleManager().init()

    // Cost tracker already initialized in initCore; just ensure it exists
    // for cases where initServices runs before initCore (shouldn't happen)
    if (!getSessionCostTracker()) {
        initSessionCostTracker()
    }

    trackPageview()
    trackFunnelStep("launched")
    trackFunnelStep("boot_complete")
    getAbVariant()
    initPerfTracking()
    initCrashTracking()
}
