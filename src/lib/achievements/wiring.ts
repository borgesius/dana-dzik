import { ROUTABLE_WINDOWS, type RoutableWindow } from "../../config/routing"
import { onAppEvent } from "../events"
import { getLocaleManager } from "../localeManager"
import { getMarketGame } from "../marketGame/MarketEngine"
import {
    COMMODITIES,
    type CommodityId,
    CORNER_MARKET_FLOAT,
    CORNER_MARKET_THRESHOLD,
    FACTORIES,
    TICK_INTERVAL_MS,
    type TradeResult,
    UPGRADES,
} from "../marketGame/types"
import { FORESIGHT_UPGRADES } from "../prestige/ascension"
import { HINDSIGHT_UPGRADES } from "../prestige/constants"
import { getPrestigeManager } from "../prestige/PrestigeManager"
import { getCareerManager } from "../progression/CareerManager"
import { getNodesForBranch } from "../progression/careers"
import { FILE_EFFECTS } from "../systemCrash/constants"
import { getThemeManager } from "../themeManager"
import {
    type AchievementManager,
    getAchievementManager,
} from "./AchievementManager"
import type { CounterKey } from "./types"

const TOURIST_WINDOWS: RoutableWindow[] = [
    "about",
    "projects",
    "resume",
    "links",
]

// Shared flag: true while the achievements window is the most recently opened
let achievementsWindowOpen = false

export function wireAchievements(
    mgr: AchievementManager,
    windowOpenCallback: (cb: (windowId: RoutableWindow) => void) => void
): void {
    wireWindowManager(mgr, windowOpenCallback)
    wireMetaAchievements(mgr)
    wireThemeManager(mgr)
    wireLocaleManager(mgr)
    wireMarketGame(mgr)
    wireTerminalEvents(mgr)
    wirePinballEvents(mgr)
    wirePopupEvents(mgr)
    wireFelixEvents(mgr)
    wireGuestbookEvents(mgr)
    wireLinkEvents(mgr)
    wireWeltEvents(mgr)
    wireCalmMode(mgr)
    wireGlitchEvents(mgr)
    wireSystemCrashEvents(mgr)
    wireSessionTimer(mgr)
    wireSessionCost(mgr)
    wireQAReports(mgr)
    wireProgressionEvents(mgr)
}

// ── Lunar helpers ────────────────────────────────────────────────────────
const SYNODIC_PERIOD = 29.53058770576
// Reference new moon: Jan 6, 2000 18:14 UTC
const NEW_MOON_REF = Date.UTC(2000, 0, 6, 18, 14, 0)

type LunarPhase =
    | "new-moon"
    | "waxing-crescent"
    | "first-quarter"
    | "waxing-gibbous"
    | "full-moon"
    | "waning-gibbous"
    | "last-quarter"
    | "waning-crescent"

const LUNAR_PHASES: LunarPhase[] = [
    "new-moon",
    "waxing-crescent",
    "first-quarter",
    "waxing-gibbous",
    "full-moon",
    "waning-gibbous",
    "last-quarter",
    "waning-crescent",
]

function getLunarPhase(date: Date = new Date()): LunarPhase {
    const msPerDay = 86400000
    const daysSinceRef = (date.getTime() - NEW_MOON_REF) / msPerDay
    const cyclePosition =
        ((daysSinceRef % SYNODIC_PERIOD) + SYNODIC_PERIOD) % SYNODIC_PERIOD
    const phaseIndex = Math.floor((cyclePosition / SYNODIC_PERIOD) * 8) % 8
    return LUNAR_PHASES[phaseIndex]
}

// ── Window manager wiring ────────────────────────────────────────────────

function wireWindowManager(
    mgr: AchievementManager,
    onNewWindowOpen: (cb: (windowId: RoutableWindow) => void) => void
): void {
    onNewWindowOpen((windowId: RoutableWindow) => {
        const count = mgr.addToSet("windows-opened", windowId)

        if (count >= ROUTABLE_WINDOWS.length) {
            mgr.earn("explorer")
        }

        const touristAll = TOURIST_WINDOWS.every((id) =>
            mgr.setHas("windows-opened", id)
        )
        if (touristAll) {
            mgr.earn("tourist")
        }

        if (windowId === "guestbook") {
            mgr.earn("guest")
        }

        // ── Meta: achievements window opens ──────────────────────────────
        if (windowId === "achievements") {
            achievementsWindowOpen = true

            // Introspection tiered group
            const opens = mgr.incrementCounter("achievements-opened")
            if (opens >= 1) mgr.earn("self-assessment")
            if (opens >= 10) mgr.earn("performance-review")
            if (opens >= 50) mgr.earn("observer-effect")
            if (opens >= 200) mgr.earn("the-unexamined-life")

            // Time/date novelties
            const now = new Date()
            const hour = now.getHours()
            if (hour >= 0 && hour < 5) mgr.earn("graveyard-shift")

            // Lunar cycle
            const phase = getLunarPhase(now)
            mgr.earn(phase)

            // Spoofable environment
            if (now.getFullYear() < 2000) mgr.earn("time-traveler")
            if (now.getFullYear() === 1968) mgr.earn("year-to-remember")
            const year = now.getFullYear()
            if (year >= 1990 && year <= 1999) mgr.earn("negative-timestamp")

            const ua = navigator.userAgent.toLowerCase()
            if (ua.includes("netscape") || ua.includes("navigator")) {
                mgr.earn("netscape-navigator")
            }

            if (window.screen.width <= 640) mgr.earn("640k-enough")

            if (navigator.language.toLowerCase().startsWith("la")) {
                mgr.earn("lingua-franca")
            }

            const nav = navigator as unknown as Record<string, unknown>
            const conn = nav.connection as
                | { effectiveType?: string }
                | undefined
            if (conn?.effectiveType === "2g") mgr.earn("dial-up-connection")

            // ── Major Arcana (window-open triggers) ──────────────────────
            // II - The High Priestess: new moon + midnight-5am
            if (phase === "new-moon" && hour >= 0 && hour < 5) {
                mgr.earn("arcana-priestess")
            }

            // XII - The Hanged Man: 4+ commodities in bear market + owns intel upgrade
            const game = getMarketGame()
            let bearCount = 0
            for (const c of COMMODITIES) {
                const ms = game.getMarketState(c.id)
                if (ms && ms.trend === "bear") bearCount++
            }
            const hasIntel = UPGRADES.some(
                (u) => u.category === "intelligence" && game.hasUpgrade(u.id)
            )
            if (bearCount >= 4 && hasIntel) mgr.earn("arcana-hanged")

            // XVII - The Star: all unlocked commodities trending bull
            const unlocked = game.getUnlockedCommodities()
            if (unlocked.length > 0) {
                const allBull = unlocked.every((cid) => {
                    const ms = game.getMarketState(cid)
                    return ms && ms.trend === "bull"
                })
                if (allBull) mgr.earn("arcana-star")
            }

            // XIX - The Sun: weekend between 10am-2pm
            const dayOfWeek = now.getDay()
            if (
                (dayOfWeek === 0 || dayOfWeek === 6) &&
                hour >= 10 &&
                hour < 14
            ) {
                mgr.earn("arcana-sun")
            }
        } else {
            achievementsWindowOpen = false
        }
    })
}

// ── Meta achievements (earned milestones + recursive) ────────────────────

function wireMetaAchievements(mgr: AchievementManager): void {
    mgr.onEarned(() => {
        // Collector tiered group: total achievements earned
        const total = mgr.getEarnedCount()
        if (total >= 10) mgr.earn("participation-trophy")
        if (total >= 25) mgr.earn("overachiever")
        if (total >= 50) mgr.earn("completionist")
        if (total >= 100) mgr.earn("herculean")
        if (total >= 150) mgr.earn("promethean")
        if (total >= 200) mgr.earn("sisyphean")

        // Recursive: earn an achievement while viewing the achievements window
        if (achievementsWindowOpen) mgr.earn("achievement-achievement")

        // ── Major Arcana (meta triggers) ─────────────────────────────
        // XVIII - The Moon: earn all 8 lunar cycle achievements
        const lunarIds = LUNAR_PHASES as readonly string[]
        if (lunarIds.every((id) => mgr.hasEarned(id as never))) {
            mgr.earn("arcana-moon")
        }

        // XX - Judgement: earn 75 total achievements
        if (total >= 75) mgr.earn("arcana-judgement")

        // XXI - The World: earn all other 21 Major Arcana
        const arcanaIds = [
            "arcana-fool",
            "arcana-magician",
            "arcana-priestess",
            "arcana-empress",
            "arcana-emperor",
            "arcana-hierophant",
            "arcana-lovers",
            "arcana-chariot",
            "arcana-strength",
            "arcana-hermit",
            "arcana-fortune",
            "arcana-justice",
            "arcana-hanged",
            "arcana-death",
            "arcana-temperance",
            "arcana-devil",
            "arcana-tower",
            "arcana-star",
            "arcana-moon",
            "arcana-sun",
            "arcana-judgement",
        ] as const
        if (arcanaIds.every((id) => mgr.hasEarned(id))) {
            mgr.earn("arcana-world")
        }
    })
}

function wireThemeManager(mgr: AchievementManager): void {
    const tm = getThemeManager()

    tm.on("themeChanged", (data) => {
        const count = mgr.addToSet("themes-tried", data.theme)
        if (count >= 4) {
            mgr.earn("interior-decorator")
        }
    })

    tm.on("colorSchemeChanged", (data) => {
        if (data.colorScheme === "dark") {
            mgr.earn("dark-mode")
        }
    })
}

function wireLocaleManager(mgr: AchievementManager): void {
    const lm = getLocaleManager()

    lm.on("localeChanged", (data) => {
        const count = mgr.addToSet("languages-tried", data.locale)
        if (count >= 4) {
            mgr.earn("polyglot")
        }
    })
}

function wireMarketGame(mgr: AchievementManager): void {
    const game = getMarketGame()

    // "Three Ways" session tracking
    let hasTraded = false
    let hasHarvested = false
    let hasFactory = false
    const checkThreeWays = (): void => {
        if (hasTraded && hasHarvested && hasFactory) {
            mgr.earn("three-ways")
        }
    }

    game.on("tradeExecuted", (data) => {
        hasTraded = true
        checkThreeWays()
        const trade = data as TradeResult
        mgr.incrementCounter("trades")
        mgr.earn("first-trade")

        if (trade.action === "buy") {
            const market = game.getMarketState(trade.commodityId)
            if (market && market.trend === "bear") {
                mgr.earn("fire-sale")
            }
        }

        if (trade.action === "sell") {
            const def = COMMODITIES.find((c) => c.id === trade.commodityId)
            if (def && trade.pricePerUnit >= def.basePrice * 5) {
                mgr.earn("first-out-the-door")
            }
        }

        const allHeld = COMMODITIES.every((c) => {
            const h = game.getHolding(c.id)
            return h !== null && h.quantity > 0
        })
        if (allHeld) {
            mgr.earn("who-are-we-selling-to")
        }

        if (trade.action === "buy") {
            const holding = game.getHolding(trade.commodityId)
            if (
                holding &&
                holding.quantity > CORNER_MARKET_FLOAT * CORNER_MARKET_THRESHOLD
            ) {
                mgr.earn("could-be-wrong")
            }
        }

        const earnings = game.getLifetimeEarnings()
        if (earnings >= 1) mgr.earn("penny-trader")
        if (earnings >= 10) mgr.earn("small-business")
        if (earnings >= 100) mgr.earn("going-concern")
        if (earnings >= 1000) mgr.earn("dot-com-darling")
        if (earnings >= 10000) mgr.earn("irrational-exuberance")

        // X - Wheel of Fortune: 500+ lifetime trades
        if (mgr.getCounter("trades") >= 500) mgr.earn("arcana-fortune")

        // XI - Justice: all 6 commodities held within 20% of each other
        const holdings = COMMODITIES.map((c) => game.getHolding(c.id))
        const allHaveQty = holdings.every((h) => h !== null && h.quantity > 0)
        if (allHaveQty) {
            const qtys = holdings.map((h) => h!.quantity)
            const avg = qtys.reduce((a, b) => a + b, 0) / qtys.length
            if (avg > 0 && qtys.every((q) => Math.abs(q - avg) <= avg * 0.2)) {
                mgr.earn("arcana-justice")
            }
        }
    })

    game.on("phaseUnlocked", (data) => {
        const phase = data as number
        if (phase >= 2) mgr.earn("phase-2")
        if (phase >= 3) mgr.earn("phase-3")
        if (phase >= 4) mgr.earn("phase-4")
    })

    game.on("commodityUnlocked", () => {
        if (game.getUnlockedCommodities().length >= COMMODITIES.length) {
            mgr.earn("all-commodities")
        }
    })

    game.on("upgradeAcquired", () => {
        const owned = game.getOwnedUpgrades().length
        if (owned === 1) mgr.earn("arcana-magician")
        if (owned >= UPGRADES.length) mgr.earn("wasnt-brains")
    })

    game.on("factoryDeployed", () => {
        mgr.earn("factory-floor")
        hasFactory = true
        checkThreeWays()

        const allDeployed = FACTORIES.every(
            (f) => game.getFactoryCount(f.id) > 0
        )
        if (allDeployed) {
            mgr.earn("industrialist")
        }

        let total = 0
        for (const f of FACTORIES) {
            total += game.getFactoryCount(f.id)
        }
        if (total >= 5) mgr.earn("assembly-line")
        if (total >= 10) mgr.earn("arcana-empress")
    })

    game.on("influenceExecuted", (data) => {
        const { influenceId } = data as { influenceId: string }
        const count = mgr.addToSet("influences-used", influenceId)
        if (count >= 3) {
            mgr.earn("speak-to-a-retriever")
        }
    })

    game.on("limitOrderFilled", () => {
        mgr.earn("limit-filled")
    })

    // Autoclicker detection state
    const recentClicks: number[] = []
    const AUTOCLICKER_WINDOW_MS = 2000
    const AUTOCLICKER_THRESHOLD = 20

    game.on("harvestExecuted", (data) => {
        hasHarvested = true
        checkThreeWays()

        const harvests = game.getTotalHarvests()

        // Global tiers
        if (harvests >= 100) mgr.earn("harvest-100")
        if (harvests >= 1000) mgr.earn("harvest-1000")
        if (harvests >= 10000) mgr.earn("harvest-10000")
        if (harvests >= 50000) mgr.earn("harvest-50000")
        if (harvests >= 100000) mgr.earn("harvest-100000")

        // Per-commodity tracking
        const { commodityId } = data as { commodityId: CommodityId }
        const counterKey = `harvest-${commodityId}` as CounterKey
        const count = mgr.incrementCounter(counterKey)
        if (count >= 500) {
            if (commodityId === "EMAIL") mgr.earn("harvest-email-500")
            if (commodityId === "ADS") mgr.earn("harvest-ads-500")
            if (commodityId === "DOM") mgr.earn("harvest-dom-500")
            if (commodityId === "BW") mgr.earn("harvest-bw-500")
            if (commodityId === "SOFT") mgr.earn("harvest-soft-500")
            if (commodityId === "VC") mgr.earn("harvest-vc-500")
        }

        // Autoclicker detection: 20+ clicks in 2 seconds
        const now = Date.now()
        recentClicks.push(now)
        // Trim old clicks outside the window
        while (
            recentClicks.length > 0 &&
            recentClicks[0] < now - AUTOCLICKER_WINDOW_MS
        ) {
            recentClicks.shift()
        }
        if (recentClicks.length >= AUTOCLICKER_THRESHOLD) {
            mgr.earn("definitely-not-a-bot")
        }
    })
}

function wireTerminalEvents(mgr: AchievementManager): void {
    onAppEvent("terminal:command", (detail) => {
        mgr.earn("hacker")

        const cmd = detail.command.toLowerCase()

        if (cmd === "sl") {
            mgr.earn("choo-choo")
        }

        if (cmd === "cd") {
            const count = mgr.incrementCounter("directories-visited")
            if (count >= 5) {
                mgr.earn("navigator")
            }
        }

        if (cmd === "welt") {
            mgr.earn("programmer")
        }

        if (cmd === "cat" || cmd === "type") {
            const raw = detail.raw.toLowerCase()
            if (raw.includes("syslog")) {
                mgr.earn("syslog")
            }
            if (raw.includes("manual")) {
                mgr.earn("readme")
            }
        }

        if (cmd === "cd") {
            const raw = detail.raw.toLowerCase()
            if (raw.includes("das")) {
                mgr.earn("archivist")
            }
        }

        if (cmd === "ls" || cmd === "dir") mgr.earn("ls-user")
        if (cmd === "tree") mgr.earn("tree-hugger")
        if (cmd === "pwd") mgr.earn("you-are-here")
        if (cmd === "open") mgr.earn("open-sesame")
        if (cmd === "edit") mgr.earn("red-pen")
        if (cmd === "clear" || cmd === "cls") mgr.earn("clean-desk")
        if (cmd === "whoami") mgr.earn("self-aware")
        if (cmd === "help") mgr.earn("rtfm")
        if (cmd === "touch") mgr.earn("from-nothing")
        if (cmd === "mkdir") mgr.earn("empty-room")
        if (cmd === "rm" || cmd === "del") mgr.earn("shredder")
        if (cmd === "mv" || cmd === "ren" || cmd === "rename")
            mgr.earn("witness-protection")
    })

    onAppEvent("terminal:file-saved", () => {
        mgr.earn("author")
    })
}

function wirePinballEvents(mgr: AchievementManager): void {
    onAppEvent("pinball:gameover", (detail) => {
        const { score, allTargetsHit } = detail

        if (score >= 5000) mgr.earn("pinball-wizard")
        if (score >= 15000) mgr.earn("high-roller")
        if (score >= 50000) mgr.earn("bounty-hunter")
        if (score >= 150000) mgr.earn("dead-eye")
        if (score >= 500000) mgr.earn("most-wanted")
        if (allTargetsHit) mgr.earn("target-practice")
    })
}

function wirePopupEvents(mgr: AchievementManager): void {
    onAppEvent("popup:bonus-claimed", () => {
        const count = mgr.incrementCounter("bonus-popups-claimed")
        if (count >= 5) {
            mgr.earn("popup-enjoyer")
        }
    })

    onAppEvent("popup:x-dismissed", (detail) => {
        if (detail.headline === "Disk Usage Advisory") {
            mgr.earn("beyond-the-binary")
        }
    })
}

function wireFelixEvents(mgr: AchievementManager): void {
    onAppEvent("felix:message", () => {
        mgr.earn("meow")
        const count = mgr.incrementCounter("felix-messages")
        if (count >= 5) {
            mgr.earn("cat-person")
        }
    })
}

function wireGuestbookEvents(mgr: AchievementManager): void {
    document.addEventListener("click", (e) => {
        const target = e.target as HTMLElement
        if (target.closest(".sign-btn")) {
            mgr.earn("signed")
        }
    })
}

function wireLinkEvents(mgr: AchievementManager): void {
    document.addEventListener("click", (e) => {
        const target = e.target as HTMLElement
        const link = target.closest(".link-btn")
        if (!link) return

        if (link.classList.contains("repo")) mgr.earn("open-source")
        if (link.classList.contains("github")) mgr.earn("connections")
        if (link.classList.contains("linkedin")) mgr.earn("link-and-build")
        if (link.classList.contains("email")) mgr.earn("sliding-into-dms")
    })
}

function wireWeltEvents(mgr: AchievementManager): void {
    onAppEvent("welt:completed", () => {
        mgr.earn("programmer")
    })

    onAppEvent("welt:exercises-tested", (detail) => {
        if (detail.passed >= 1) mgr.earn("welt-beginner")
        if (detail.passed >= 3) mgr.earn("welt-intermediate")
        if (detail.passed >= 5) mgr.earn("welt-advanced")
        if (detail.passed >= 7) mgr.earn("erlosung")
    })

    onAppEvent("welt:all-exercises-passed", () => {
        mgr.earn("erlosung")
    })

    onAppEvent("welt:exercise-passed", (detail) => {
        if (detail.exercise === 6) mgr.earn("welt-master")
        if (detail.exercise === 7) mgr.earn("nibelung")
    })

    onAppEvent("welt:error", (detail) => {
        switch (detail.type) {
            case "thermal":
                mgr.earn("thermal-protection")
                break
            case "suffering":
                mgr.earn("suffering")
                break
        }
    })

    onAppEvent("grund:compiled", () => {
        mgr.earn("grund-compiled")
        const compiles = mgr.incrementCounter("grund-compiles")
        if (compiles >= 10) mgr.earn("arcana-hierophant")
    })

    onAppEvent("grund:executed", () => {
        mgr.earn("grund-executed")
    })

    onAppEvent("grund:ring-overflow", () => {
        mgr.earn("ring-overflow")
    })

    onAppEvent("grund:ring-cycle", () => {
        mgr.earn("ring-cycle")
    })

    onAppEvent("grund:ring-spin", () => {
        mgr.earn("ring-spin")
    })

    onAppEvent("freak:used", () => {
        mgr.earn("freakgpt")
    })

    onAppEvent("felix:editor", () => {
        mgr.earn("keyboard-cat")
    })
}

function wireGlitchEvents(mgr: AchievementManager): void {
    onAppEvent("glitch:triggered", (detail) => {
        if (detail.type === "colorSplit") mgr.earn("seein-double")
    })
}

const EFFECT_ACHIEVEMENT_MAP: Record<string, string> = {
    bsod: "bsod-trigger",
    "display-corrupt": "display-glitch",
    "clock-haywire": "clock-glitch",
    "memory-fault": "memory-glitch",
    restart: "restart-glitch",
}

function wireSystemCrashEvents(mgr: AchievementManager): void {
    onAppEvent("system-file-modified", (detail) => {
        const { filename, severity } = detail
        if (severity === "none" || severity === "minor") return

        const effect = FILE_EFFECTS[filename.toLowerCase()]
        if (!effect) return

        const achievementId = EFFECT_ACHIEVEMENT_MAP[effect]
        if (achievementId) {
            mgr.earn(achievementId as never)
        }
    })
}

function wireCalmMode(mgr: AchievementManager): void {
    onAppEvent("calm-mode:toggled", () => {
        mgr.earn("calm-mode")
    })
}

function wireSessionTimer(mgr: AchievementManager): void {
    setTimeout(
        () => {
            mgr.earn("y2k-survivor")
        },
        30 * 60 * 1000
    )

    // IX - The Hermit: 45-minute session
    setTimeout(
        () => {
            mgr.earn("arcana-hermit")
        },
        45 * 60 * 1000
    )
}

function wireSessionCost(mgr: AchievementManager): void {
    onAppEvent("session-cost:big-spender", () => {
        mgr.earn("big-spender")
    })
    onAppEvent("session-cost:whale", () => {
        mgr.earn("whale")
    })
    onAppEvent("session-cost:leviathan", () => {
        mgr.earn("leviathan")
    })
}

function wireQAReports(mgr: AchievementManager): void {
    onAppEvent("qa:report-clicked", () => {
        mgr.earn("qa-inspector")
    })
}

function wireProgressionEvents(mgr: AchievementManager): void {
    // ── Prestige achievements ────────────────────────────────────────────
    onAppEvent("prestige:triggered", (detail) => {
        mgr.earn("ive-been-wrong")
        if (detail.count >= 5) {
            mgr.earn("doesnt-matter-what-floor")
        }
        if (detail.hindsight >= 50) {
            mgr.earn("tell-them-theyll-be-ok")
        }

        // 0 - The Fool: prestige with 0 hindsight upgrades purchased
        const prestige = getPrestigeManager()
        const noUpgrades = HINDSIGHT_UPGRADES.every(
            (u) => prestige.getUpgradePurchaseCount(u.id) === 0
        )
        if (noUpgrades) mgr.earn("arcana-fool")

        // XIII - Death: prestige for the 3rd time
        if (detail.count >= 3) mgr.earn("arcana-death")
    })

    onAppEvent("prestige:purchase", () => {
        mgr.earn("hindsight-shopper")

        const prestige = getPrestigeManager()
        const allBought = HINDSIGHT_UPGRADES.every(
            (u) => prestige.getUpgradePurchaseCount(u.id) >= u.maxPurchases
        )
        if (allBought) mgr.earn("pieces-of-paper")
    })

    // ── Ascension achievements ──────────────────────────────────────────
    onAppEvent("prestige:ascension", (detail) => {
        mgr.earn("through-the-looking-glass")
        if (detail.count >= 3) mgr.earn("eternal-return")
        if (detail.count >= 5) mgr.earn("samsara")
        if (detail.foresight >= 10) mgr.earn("windfall")
    })

    onAppEvent("prestige:foresight-purchase", () => {
        mgr.earn("foresight-shopper")

        const prestige = getPrestigeManager()
        const allForesight = FORESIGHT_UPGRADES.every(
            (u) => prestige.getForesightUpgradeCount(u.id) >= u.maxPurchases
        )
        if (allForesight) mgr.earn("oracle-of-delphi")
    })

    // ── Autobattler achievements ─────────────────────────────────────────
    onAppEvent("autobattler:run-complete", (detail) => {
        mgr.earn("first-draft")

        const clearedBoss = detail.highestRound >= 6

        if (clearedBoss) {
            mgr.earn("greenhorn")
        }

        // Escalation milestones
        if (detail.highestRound >= 10) mgr.earn("tenure-track")
        if (detail.highestRound >= 15) mgr.earn("associate-prof")
        if (detail.highestRound >= 20) mgr.earn("full-prof")
        if (detail.highestRound >= 25) mgr.earn("endowed-chair")

        // Composition achievements require clearing the first boss
        if (clearedBoss) {
            // VI - The Lovers: exactly 2 distinct factions
            const distinctFactions = new Set(
                detail.lineupFactions.filter((f) => f !== "drifters")
            )
            if (distinctFactions.size === 2) mgr.earn("arcana-lovers")

            // ── Concept achievements ──────────────────────────────────────
            const locale = getLocaleManager().getCurrentLocale()

            if (detail.majorityFaction === "prospectors" && locale === "fr") {
                mgr.earn("la-pensee-francaise")
            }
            if (detail.majorityFaction === "deputies" && locale === "de") {
                mgr.earn("der-deutsche-idealismus")
            }

            // Perfect run (0 losses)
            if (detail.losses === 0) {
                mgr.earn("amor-fati")
            }

            // All 4 factions in lineup
            const mainFactions = detail.lineupFactions.filter(
                (f) => f !== "drifters"
            )
            if (new Set(mainFactions).size >= 4) {
                mgr.earn("continental-breakfast")
            }

            // Only empiricists
            if (
                detail.lineupFactions.length > 0 &&
                detail.lineupFactions.every((f) => f === "drifters")
            ) {
                mgr.earn("independent-study")
            }

            // Survey course (reach round 6+ with each faction as majority)
            if (detail.majorityFaction) {
                const factionCount = mgr.addToSet(
                    "factions-won-with",
                    detail.majorityFaction
                )
                if (factionCount >= 4) mgr.earn("survey-course")
            }

            // Bridge synergy achievements
            const factionSet = new Set(detail.lineupFactions)
            if (factionSet.has("quickdraw") && factionSet.has("deputies")) {
                mgr.earn("revaluation-of-all-values")
            }
            if (factionSet.has("clockwork") && factionSet.has("prospectors")) {
                mgr.earn("expressionism-in-philosophy")
            }
        }
    })

    // ── Boss defeat achievements ────────────────────────────────────────
    onAppEvent("autobattler:boss-defeated", (detail) => {
        // First boss
        mgr.earn("dissertation-defense")

        // Perfect boss (no units lost)
        if (detail.noUnitsLost) {
            mgr.earn("summa-cum-laude")
            // VII - The Chariot: flawless boss victory
            mgr.earn("arcana-chariot")
        }

        // All 4 bosses (use addToSet to track unique boss IDs)
        const uniqueCount = mgr.addToSet("bosses-defeated", detail.bossId)
        if (uniqueCount >= 4) {
            mgr.earn("comprehensive-exams")
        }
    })

    onAppEvent("autobattler:unit-unlocked", () => {
        mgr.earn("faction-recruit")
    })

    onAppEvent("autobattler:spiral-complete", () => {
        mgr.earn("full-spiral")
    })

    // ── Level / Rank achievements ────────────────────────────────────────
    onAppEvent("progression:level-up", (detail) => {
        if (detail.level >= 5) mgr.earn("level-5")
        if (detail.level >= 10) mgr.earn("level-10")
        if (detail.level >= 20) mgr.earn("level-20")
        if (detail.level >= 35) mgr.earn("level-35")
        if (detail.level >= 50) mgr.earn("level-50")

        // IV - The Emperor: reach level 20
        if (detail.level >= 20) mgr.earn("arcana-emperor")
    })

    // ── Phase 5 / 6 achievement ─────────────────────────────────────────
    getMarketGame().on("phaseUnlocked", (data) => {
        const phase = data as number
        if (phase >= 5) mgr.earn("phase-5")
        if (phase >= 6) mgr.earn("phase-6")
    })

    // ── Phase 6: Structured Products Desk achievements ───────────────────
    wirePhase6Achievements(mgr)

    // ── Career achievements ──────────────────────────────────────────────
    let careerSwitchCount = 0
    onAppEvent("career:switched", () => {
        mgr.earn("career-switcher")
        careerSwitchCount++
        if (careerSwitchCount >= 5) mgr.earn("serial-pivoter")

        // Executive branch gate achievement
        const career = getCareerManager()

        if (career.isExecutiveUnlocked()) {
            mgr.earn("executive-material")
        }
    })

    let nodesUnlocked = 0
    onAppEvent("career:node-unlocked", () => {
        mgr.earn("career-starter")
        nodesUnlocked++
        if (nodesUnlocked >= 5) mgr.earn("skill-tree-novice")
        if (nodesUnlocked >= 15) mgr.earn("skill-tree-master")

        const career = getCareerManager()
        const branches = [
            "engineering",
            "trading",
            "growth",
            "executive",
        ] as const
        for (const branch of branches) {
            const branchNodes = getNodesForBranch(branch)
            const allUnlocked = branchNodes.every((n) =>
                career.isNodeUnlocked(n.id)
            )
            if (allUnlocked && branchNodes.length >= 5) {
                mgr.earn("overqualified")
                break
            }
        }
    })

    // ── HR / Phase 5 achievements ────────────────────────────────────────
    const TRANSITION_PLAN_TICKS = 10 // PLACEHOLDER: needs tuning
    let lastFireTimestamp = 0

    let totalHires = 0
    onAppEvent("market:employee-hired", () => {
        mgr.earn("that-ones-a-person")
        totalHires++
        if (totalHires >= 9) mgr.earn("we-make-nothing")

        if (
            lastFireTimestamp > 0 &&
            Date.now() - lastFireTimestamp <=
                TRANSITION_PLAN_TICKS * TICK_INTERVAL_MS
        ) {
            mgr.earn("transition-plan")
        }
    })

    let totalFires = 0
    onAppEvent("market:employee-fired", () => {
        totalFires++
        lastFireTimestamp = Date.now()
        if (totalFires >= 3) mgr.earn("you-dont-get-to-choose")
    })

    onAppEvent("market:org-reorg", () => {
        mgr.earn("reorg")
    })

    // ── Cross-system achievements ────────────────────────────────────────
    // "Renaissance" = level 5 + complete autobattler run
    // We check conditions lazily since either can trigger first
    onAppEvent("progression:level-up", (detail) => {
        if (detail.level >= 5 && mgr.hasEarned("first-draft")) {
            mgr.earn("renaissance")
        }
    })
    onAppEvent("autobattler:run-complete", () => {
        // Already earned first-draft above; check for renaissance
        // We can't easily get the level here without importing, so
        // rely on the level-up event to pick this up
    })

    // "Full Stack" = prestige + clear first boss + first resume upgrade
    const checkFullStack = (): void => {
        if (
            mgr.hasEarned("ive-been-wrong") &&
            mgr.hasEarned("greenhorn") &&
            mgr.hasEarned("career-starter")
        ) {
            mgr.earn("full-stack")
        }
    }
    onAppEvent("prestige:triggered", checkFullStack)
    onAppEvent("autobattler:run-complete", checkFullStack)
    onAppEvent("career:node-unlocked", checkFullStack)

    // ── Faction-complete achievements ─────────────────────────────────────
    const factionAchievementMap: Record<string, string> = {
        quickdraw: "syndicate-complete",
        deputies: "deputies-complete",
        clockwork: "collective-complete",
        prospectors: "prospectors-complete",
    }
    onAppEvent("autobattler:faction-complete", (detail) => {
        const achievementId = factionAchievementMap[detail.faction]
        if (achievementId) {
            mgr.earn(achievementId as never)
        }
    })

    // ── vertical-integration: nodes in all 3 main branches ───────────────
    onAppEvent("career:node-unlocked", () => {
        const career = getCareerManager()
        const mainBranches = ["engineering", "trading", "growth"] as const
        const allHaveNodes = mainBranches.every(
            (b) => career.getUnlockedNodesForBranch(b).length > 0
        )
        if (allHaveNodes) {
            mgr.earn("vertical-integration")
        }
    })

    // ── exit-interview: career switch in same session as prestige ─────────
    let prestigedThisSession = false
    onAppEvent("prestige:triggered", () => {
        prestigedThisSession = true
    })
    onAppEvent("career:switched", () => {
        if (prestigedThisSession) {
            mgr.earn("exit-interview")
        }
    })
}

/**
 * Phase 6 achievements -- all named after Margin Call (2011) quotes.
 */
function wirePhase6Achievements(mgr: AchievementManager): void {
    const game = getMarketGame()

    // "its-just-money" -- Mint your first DAS
    // "It's just money; it's made up."
    game.on("dasCreated", () => {
        mgr.earn("its-just-money")

        // "music-stops" -- 6+ active DAS simultaneously
        // "The music is about to stop..."
        if (game.getSecurities().length >= 6) mgr.earn("music-stops")

        // XIV - Temperance: create DAS while carrying 0 debt
        if (game.getDebt() <= 0) mgr.earn("arcana-temperance")
    })

    // "someone-pays" -- Trigger a margin event
    // "Someone is going to have to pay for this."
    game.on("marginEvent", () => {
        mgr.earn("someone-pays")
    })

    // "be-first" -- Reach AAA credit rating
    // "Be first. Be smarter. Or cheat."
    game.on("ratingChanged", (data) => {
        const { rating, direction } = data as {
            rating: string
            direction: string
        }
        if (rating === "AAA") mgr.earn("be-first")

        // "killed-this-firm" -- Hit F credit rating
        if (rating === "F") mgr.earn("killed-this-firm")

        // XVI - The Tower: experience a credit rating downgrade
        if (direction === "downgrade") mgr.earn("arcana-tower")

        // VIII - Strength: survive 100+ ticks after a margin event (on upgrade)
        if (direction === "upgrade" && game.getTicksSinceMarginEvent() >= 100) {
            mgr.earn("arcana-strength")
        }
    })

    // "just-silence" -- Survive margin event and recover to A+ within 100 ticks
    // "I don't hear a thing. Just... silence."
    game.on("ratingChanged", (data) => {
        const { rating, direction } = data as {
            rating: string
            direction: string
        }
        if (direction === "upgrade") {
            const ratingIdx = ["F", "D", "C", "B", "A", "AA", "AAA"].indexOf(
                rating
            )
            if (ratingIdx >= 4 && game.getTicksSinceMarginEvent() <= 100) {
                mgr.earn("just-silence")
            }
        }
    })

    // "it-goes-quickly" -- Borrow at 90%+ of capacity
    // "It goes quite quickly."
    game.on("debtChanged", () => {
        const capacity = game.getBorrowCapacity()
        const debt = game.getDebt()
        const total = capacity + debt
        if (total > 0 && debt / total >= 0.9) mgr.earn("it-goes-quickly")

        // XV - The Devil: borrow at 95%+ capacity
        if (total > 0 && debt / total >= 0.95) mgr.earn("arcana-devil")
    })

    // "rainy-day" -- Fully repay all debt with 3+ DAS performing
    // "I put 400 away for a rainy day."
    game.on("debtChanged", () => {
        if (game.getDebt() <= 0 && game.getSecurities().length >= 3) {
            mgr.earn("rainy-day")
        }
    })
}

// ── Veil achievements ────────────────────────────────────────────────────

export function wireVeilAchievements(): void {
    const mgr = getAchievementManager()

    onAppEvent("veil:completed", (detail) => {
        const { veilId, attempts } = detail

        // Per-tier achievements (dead Germans)
        if (veilId === 0) mgr.earn("die-welt-als-wille")
        if (veilId === 1) mgr.earn("denkwurdigkeiten")
        if (veilId === 2) mgr.earn("gotzen-dammerung")
        if (veilId === 3) mgr.earn("der-antichrist")
        if (veilId === 4) {
            mgr.earn("ecce-homo")
            // Horse Whisperer: boss in under 3 attempts
            if (attempts <= 3) mgr.earn("horse-whisperer")
        }
    })

    onAppEvent("veil:failed", () => {
        mgr.incrementCounter("veil-attempts")
    })
}
