import type { RoutableWindow } from "../../config/routing"
import { getAchievementManager } from "../achievements/AchievementManager"
import { ACHIEVEMENT_MAP } from "../achievements/definitions"
import { getCollectionManager } from "../autobattler/CollectionManager"
import { emitAppEvent, onAppEvent } from "../events"
import type { EmployeeType } from "../marketGame/employees"
import { getLocaleManager } from "../localeManager"
import { getMarketGame } from "../marketGame/MarketEngine"
import { getPrestigeManager } from "../prestige/PrestigeManager"
import { getThemeManager } from "../themeManager"
import { getVeilManager } from "../veil/VeilManager"
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
    wireVeilTrigger(mgr)
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

    const TRADE_XP_COOLDOWN_MS = 5_000
    let lastTradeXPTime = 0
    game.on("tradeExecuted", () => {
        const now = Date.now()
        if (now - lastTradeXPTime >= TRADE_XP_COOLDOWN_MS) {
            lastTradeXPTime = now
            mgr.addXP(XP_REWARDS.trade)
        }
    })

    game.on("phaseUnlocked", () => {
        mgr.addXP(XP_REWARDS.phaseUnlock)
    })
}

function wirePinball(mgr: ProgressionManager): void {
    onAppEvent("pinball:gameover", (detail) => {
        const { score } = detail

        if (score >= 5000 && !mgr.hasPinballThreshold(5000)) {
            mgr.addXP(XP_REWARDS.pinballScore5k)
            mgr.markPinballThreshold(5000)
        }
        if (score >= 25000 && !mgr.hasPinballThreshold(25000)) {
            mgr.addXP(XP_REWARDS.pinballScore25k)
            mgr.markPinballThreshold(25000)
        }
        if (score >= 100000 && !mgr.hasPinballThreshold(100000)) {
            mgr.addXP(XP_REWARDS.pinballScore100k)
            mgr.markPinballThreshold(100000)
        }
    })
}

function wireWelt(mgr: ProgressionManager): void {
    const CODING_XP_COOLDOWN_MS = 20_000
    let lastWeltXPTime = 0
    let lastGrundCompileXPTime = 0
    let lastGrundExecuteXPTime = 0

    onAppEvent("welt:completed", () => {
        const now = Date.now()
        if (now - lastWeltXPTime >= CODING_XP_COOLDOWN_MS) {
            lastWeltXPTime = now
            mgr.addXP(XP_REWARDS.weltProgram)
        }
    })

    onAppEvent("welt:exercise-passed", () => {
        mgr.addXP(XP_REWARDS.weltExercise)
    })

    onAppEvent("grund:compiled", () => {
        const now = Date.now()
        if (now - lastGrundCompileXPTime >= CODING_XP_COOLDOWN_MS) {
            lastGrundCompileXPTime = now
            mgr.addXP(XP_REWARDS.grundCompile)
        }
    })

    onAppEvent("grund:executed", () => {
        const now = Date.now()
        if (now - lastGrundExecuteXPTime >= CODING_XP_COOLDOWN_MS) {
            lastGrundExecuteXPTime = now
            mgr.addXP(XP_REWARDS.grundExecute)
        }
    })
}

function wireExploration(
    mgr: ProgressionManager,
    onNewWindowOpen: (cb: (windowId: RoutableWindow) => void) => void
): void {
    onNewWindowOpen((windowId: RoutableWindow) => {
        if (!mgr.hasSeenWindow(windowId)) {
            mgr.markWindowSeen(windowId)
            mgr.addXP(XP_REWARDS.windowOpen)
        }
    })

    getThemeManager().on("themeChanged", (data) => {
        if (!mgr.hasSeenTheme(data.theme)) {
            mgr.markThemeSeen(data.theme)
            mgr.addXP(XP_REWARDS.themeChange)
        }
    })

    getLocaleManager().on("localeChanged", (data) => {
        if (!mgr.hasSeenLocale(data.locale)) {
            mgr.markLocaleSeen(data.locale)
            mgr.addXP(XP_REWARDS.localeChange)
        }
    })
}

function wireSocial(mgr: ProgressionManager): void {
    const FELIX_XP_COOLDOWN_MS = 30_000
    let lastFelixXPTime = 0
    onAppEvent("felix:message", () => {
        const now = Date.now()
        if (now - lastFelixXPTime >= FELIX_XP_COOLDOWN_MS) {
            lastFelixXPTime = now
            mgr.addXP(XP_REWARDS.felixMessage)
        }
    })

    document.addEventListener("click", (e) => {
        const target = e.target as HTMLElement
        if (target.closest(".sign-btn") && !mgr.hasSignedGuestbook()) {
            mgr.markGuestbookSigned()
            mgr.addXP(XP_REWARDS.guestbookSign)
        }
    })
}

function wireAutobattler(mgr: ProgressionManager): void {
    onAppEvent("autobattler:run-complete", (detail) => {
        mgr.addXP(
            detail.highestRound >= 6
                ? XP_REWARDS.autobattlerWin
                : XP_REWARDS.autobattlerRun
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
    const commodities = ["EMAIL", "ADS", "LIVE", "DOM", "GLUE", "BW", "SOFT", "VC"] as const
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
                Math.floor(score / 2500) * 0.01 * (1 + pinballBonus)
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
        const cashReward = detail.highestRound >= 6 ? 0.5 : 0.1
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
        emitAppEvent("market:employee-hired", { type: data.type })
    })
    game.on("employeeFired", (data) => {
        emitAppEvent("market:employee-fired", { type: data.type })
    })
}

/**
 * Wire Phase 5 (HR) cross-system unlock conditions:
 * - First prestige completed
 * - Player level 8+
 * - Reached round 6+ in the autobattler (cleared first boss)
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
        const hasRound = collection.getHighestRound() >= 6

        if (hasPrestiged && hasLevel && hasRound) {
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

/**
 * Wire Veil trigger: check on each market tick if a veil should fire.
 * Also wire progression providers for gate checking.
 */
function wireVeilTrigger(mgr: ProgressionManager): void {
    const veil = getVeilManager()
    const game = getMarketGame()
    const prestige = getPrestigeManager()
    const collection = getCollectionManager()

    // Wire providers so VeilManager can check gates
    veil.levelProvider = (): number => mgr.getLevel()
    veil.prestigeCountProvider = (): number => prestige.getCount()
    veil.highestRoundProvider = (): number => collection.getHighestRound()
    veil.bossesDefeatedProvider = (): number =>
        collection.getTotalBossesDefeated()
    veil.spiralCompleteProvider = (): boolean => collection.isSpiralComplete()
    veil.phase5UnlockedProvider = (): boolean => game.isPhaseUnlocked(5)

    // Check trigger on each market tick
    game.on("marketTick", () => {
        const veilId = veil.checkTrigger()
        if (veilId !== null) {
            veil.triggerVeil(veilId)
        }
    })

    // XP reward for completing veils
    onAppEvent("veil:completed", () => {
        mgr.addXP(XP_REWARDS.phaseUnlock) // Reuse phase unlock XP (25)
    })
}
