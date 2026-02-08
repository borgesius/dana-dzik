import type { RoutableWindow } from "../../config/routing"
import { getAchievementManager } from "../achievements/AchievementManager"
import { ACHIEVEMENT_MAP } from "../achievements/definitions"
import { getCollectionManager } from "../autobattler/CollectionManager"
import { emitAppEvent, onAppEvent } from "../events"
import { getLocaleManager } from "../localeManager"
import { getMarketGame } from "../marketGame/MarketEngine"
import { getPrestigeManager } from "../prestige/PrestigeManager"
import { getThemeManager } from "../themeManager"
import { getCareerManager } from "./CareerManager"
import { getAchievementXP, XP_REWARDS } from "./constants"
import type { ProgressionManager } from "./ProgressionManager"

export function wireProgression(
    mgr: ProgressionManager,
    windowOpenCallback: (cb: (windowId: RoutableWindow) => void) => void
): void {
    wireMarketGame(mgr)
    wirePinball(mgr)
    wireWelt(mgr)
    wireExploration(mgr, windowOpenCallback)
    wireSocial(mgr)
    wireAchievements(mgr)
    wireAutobattler(mgr)
    wirePrestigeXP(mgr)
    wireCareerXP(mgr)
    wireCrossSystemHooks()
    wirePhase5Unlock(mgr)
    wirePhase6Unlock(mgr)
}

function wireAchievements(mgr: ProgressionManager): void {
    getAchievementManager().onEarned((id) => {
        const def = ACHIEVEMENT_MAP.get(id)
        const xp = getAchievementXP(def?.tier)
        mgr.addXP(xp)
    })
}

function wireMarketGame(mgr: ProgressionManager): void {
    const game = getMarketGame()

    game.on("tradeExecuted", () => {
        mgr.addXP(XP_REWARDS.trade)
    })

    game.on("phaseUnlocked", () => {
        mgr.addXP(XP_REWARDS.phaseUnlock)
    })
}

function wirePinball(mgr: ProgressionManager): void {
    // Track which thresholds have been awarded this session to avoid
    // double-awarding on repeat gameovers that report the same high score.
    const awardedThresholds = new Set<number>()

    onAppEvent("pinball:gameover", (detail) => {
        const { score } = detail

        if (score >= 1000 && !awardedThresholds.has(1000)) {
            mgr.addXP(XP_REWARDS.pinballScore1k)
            awardedThresholds.add(1000)
        }
        if (score >= 5000 && !awardedThresholds.has(5000)) {
            mgr.addXP(XP_REWARDS.pinballScore5k)
            awardedThresholds.add(5000)
        }
        if (score >= 10000 && !awardedThresholds.has(10000)) {
            mgr.addXP(XP_REWARDS.pinballScore10k)
            awardedThresholds.add(10000)
        }
    })
}

function wireWelt(mgr: ProgressionManager): void {
    onAppEvent("welt:completed", () => {
        mgr.addXP(XP_REWARDS.weltProgram)
    })

    onAppEvent("welt:exercise-passed", () => {
        mgr.addXP(XP_REWARDS.weltExercise)
    })

    onAppEvent("grund:compiled", () => {
        mgr.addXP(XP_REWARDS.grundCompile)
    })

    onAppEvent("grund:executed", () => {
        mgr.addXP(XP_REWARDS.grundExecute)
    })
}

function wireExploration(
    mgr: ProgressionManager,
    onNewWindowOpen: (cb: (windowId: RoutableWindow) => void) => void
): void {
    const openedWindows = new Set<string>()

    onNewWindowOpen((windowId: RoutableWindow) => {
        if (!openedWindows.has(windowId)) {
            openedWindows.add(windowId)
            mgr.addXP(XP_REWARDS.windowOpen)
        }
    })

    const triedThemes = new Set<string>()
    getThemeManager().on("themeChanged", (data) => {
        if (!triedThemes.has(data.theme)) {
            triedThemes.add(data.theme)
            mgr.addXP(XP_REWARDS.themeChange)
        }
    })

    const triedLocales = new Set<string>()
    getLocaleManager().on("localeChanged", (data) => {
        if (!triedLocales.has(data.locale)) {
            triedLocales.add(data.locale)
            mgr.addXP(XP_REWARDS.localeChange)
        }
    })
}

function wireSocial(mgr: ProgressionManager): void {
    onAppEvent("felix:message", () => {
        mgr.addXP(XP_REWARDS.felixMessage)
    })

    // Guestbook sign is handled via DOM click listener, similar to achievement
    // wiring. We use the same pattern to detect sign button clicks.
    let signed = false
    document.addEventListener("click", (e) => {
        const target = e.target as HTMLElement
        if (target.closest(".sign-btn") && !signed) {
            signed = true
            mgr.addXP(XP_REWARDS.guestbookSign)
        }
    })
}

function wireAutobattler(mgr: ProgressionManager): void {
    onAppEvent("autobattler:run-complete", (detail) => {
        mgr.addXP(
            detail.won ? XP_REWARDS.autobattlerWin : XP_REWARDS.autobattlerRun
        )
    })
    onAppEvent("autobattler:unit-unlocked", () => {
        mgr.addXP(XP_REWARDS.autobattlerCollectionMilestone)
    })
    onAppEvent("autobattler:spiral-complete", () => {
        mgr.addXP(XP_REWARDS.spiralProgress)
    })
}

function wirePrestigeXP(mgr: ProgressionManager): void {
    onAppEvent("prestige:triggered", () => {
        mgr.addXP(XP_REWARDS.prestige)
    })
}

function wireCareerXP(mgr: ProgressionManager): void {
    onAppEvent("career:switched", () => {
        mgr.addXP(XP_REWARDS.careerSwitch)
    })
}

/**
 * Minor cross-system hooks that connect disparate systems:
 * - WELT/GRUND exercise completions grant commodity stocks (+ career bonuses)
 * - Pinball high scores grant cash (+ career bonus)
 * - Popup bonuses scaled by career bonus
 * - Autobattler run rewards grant cash/commodities
 */
function wireCrossSystemHooks(): void {
    const game = getMarketGame()
    const career = getCareerManager()

    // WELT exercise pass -> grant commodity units, scaled by weltBonus
    const commodities = ["EMAIL", "ADS", "DOM", "BW", "SOFT", "VC"] as const
    onAppEvent("welt:exercise-passed", () => {
        const weltBonus = career.getBonus("weltBonus")
        const qty = Math.max(1, Math.ceil(1 * (1 + weltBonus)))
        const pick = commodities[Math.floor(Math.random() * commodities.length)]
        game.grantCommodity(pick, qty)
    })

    // GRUND program execution -> grant SOFT, scaled by grundBonus
    onAppEvent("grund:executed", () => {
        const grundBonus = career.getBonus("grundBonus")
        const qty = Math.max(1, Math.ceil(1 * (1 + grundBonus)))
        game.grantCommodity("SOFT", qty)
    })

    // Pinball high scores -> grant cash, scaled by pinballBonus
    onAppEvent("pinball:gameover", (detail) => {
        const { score } = detail
        if (score >= 1000) {
            const pinballBonus = career.getBonus("pinballBonus")
            const cashBonus =
                Math.floor(score / 500) * 0.01 * (1 + pinballBonus)
            game.addBonus(cashBonus)
        }
    })

    onAppEvent("popup:bonus-claimed", () => {
        const popupBonus = career.getBonus("popupBonus")
        if (popupBonus > 0) {
            game.addBonus(0.05 * popupBonus)
        }
    })

    // Autobattler run completion -> grant cash + commodities
    onAppEvent("autobattler:run-complete", (detail) => {
        const cashReward = detail.won ? 0.5 : 0.1
        game.addBonus(cashReward)
    })

    // Scrap Dividend: 5% chance on trade to emit scrap bonus event
    game.on("tradeExecuted", () => {
        const prestige = getPrestigeManager()
        if (prestige.hasScrapDividend() && Math.random() < 0.05) {
            emitAppEvent("market:scrap-dividend", {})
        }
    })

    // Relay MarketEngine employee events to app events
    game.on("employeeHired", (data) => {
        const emp = data as { type?: string }
        emitAppEvent("market:employee-hired", { type: emp?.type ?? "" })
    })
    game.on("employeeFired", (data) => {
        const emp = data as { type?: string }
        emitAppEvent("market:employee-fired", { type: emp?.type ?? "" })
    })
}

/**
 * Wire Phase 5 (HR) cross-system unlock conditions:
 * - First prestige completed
 * - Player level 8+
 * - 3+ autobattler run wins
 *
 * Also wire 3rd VP slot unlock: level 15 or 2nd prestige.
 */
function wirePhase5Unlock(mgr: ProgressionManager): void {
    const game = getMarketGame()

    const checkPhase5 = (): void => {
        if (game.isPhaseUnlocked(5)) return

        const prestige = getPrestigeManager()
        const collection = getCollectionManager()

        const hasPrestiged = prestige.getCount() >= 1
        const hasLevel = mgr.getLevel() >= 8
        const hasWins = collection.getWonRuns() >= 3

        if (hasPrestiged && hasLevel && hasWins) {
            game.unlockPhase(5)
        }
    }

    const checkThirdVP = (): void => {
        const orgChart = game.getOrgChart()
        if (orgChart.isThirdVPUnlocked()) return

        const prestige = getPrestigeManager()
        const hasLevel15 = mgr.getLevel() >= 15
        const hasPrestige2 = prestige.getCount() >= 2

        if (hasLevel15 || hasPrestige2) {
            orgChart.unlockThirdVP()
        }
    }

    // Listen for relevant events
    onAppEvent("prestige:triggered", () => {
        checkPhase5()
        checkThirdVP()
    })
    onAppEvent("progression:level-up", () => {
        checkPhase5()
        checkThirdVP()
    })
    onAppEvent("autobattler:run-complete", () => {
        checkPhase5()
    })

    // Also check on init (in case conditions are already met from save data)
    checkPhase5()
    checkThirdVP()
}

/**
 * Wire Phase 6 (Structured Products Desk) cross-system unlock:
 * - Prestige count >= 3
 * - Player level >= 15
 */
function wirePhase6Unlock(mgr: ProgressionManager): void {
    const game = getMarketGame()

    const checkPhase6 = (): void => {
        if (game.isPhaseUnlocked(6)) return

        const prestige = getPrestigeManager()
        const hasPrestige3 = prestige.getCount() >= 3
        const hasLevel15 = mgr.getLevel() >= 15

        if (hasPrestige3 && hasLevel15) {
            game.unlockPhase(6)
        }
    }

    onAppEvent("prestige:triggered", checkPhase6)
    onAppEvent("progression:level-up", checkPhase6)

    // Check on init
    checkPhase6()
}
