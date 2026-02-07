import type { RoutableWindow } from "../../config/routing"
import { getAchievementManager } from "../achievements/AchievementManager"
import { onAppEvent } from "../events"
import { getLocaleManager } from "../localeManager"
import { getMarketGame } from "../marketGame/MarketEngine"
import { getThemeManager } from "../themeManager"
import { XP_REWARDS } from "./constants"
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
    wireCrossSystemHooks()
}

function wireAchievements(mgr: ProgressionManager): void {
    getAchievementManager().onEarned(() => {
        mgr.addXP(XP_REWARDS.achievementEarned)
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

/**
 * Minor cross-system hooks that connect disparate systems:
 * - WELT/GRUND exercise completions grant commodity stocks
 * - Pinball high scores grant cash
 * - Autobattler run rewards grant cash/commodities
 */
function wireCrossSystemHooks(): void {
    const game = getMarketGame()

    // WELT exercise pass -> grant 1 random commodity unit
    const commodities = ["EMAIL", "ADS", "DOM", "BW", "SOFT", "VC"] as const
    onAppEvent("welt:exercise-passed", () => {
        const pick = commodities[Math.floor(Math.random() * commodities.length)]
        game.grantCommodity(pick, 1)
    })

    // GRUND program execution -> grant 1 SOFT
    onAppEvent("grund:executed", () => {
        game.grantCommodity("SOFT", 1)
    })

    // Pinball high scores -> grant cash
    onAppEvent("pinball:gameover", (detail) => {
        const { score } = detail
        if (score >= 1000) {
            const cashBonus = Math.floor(score / 500) * 0.01
            game.addBonus(cashBonus)
        }
    })

    // Autobattler run completion -> grant cash + commodities
    onAppEvent("autobattler:run-complete", (detail) => {
        const cashReward = detail.won ? 0.5 : 0.1
        game.addBonus(cashReward)
    })
}
