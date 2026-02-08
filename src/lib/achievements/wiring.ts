import { ROUTABLE_WINDOWS, type RoutableWindow } from "../../config/routing"
import { onAppEvent } from "../events"
import { getLocaleManager } from "../localeManager"
import { getMarketGame } from "../marketGame/MarketEngine"
import {
    COMMODITIES,
    CORNER_MARKET_FLOAT,
    CORNER_MARKET_THRESHOLD,
    FACTORIES,
    type TradeResult,
    UPGRADES,
} from "../marketGame/types"
import { HINDSIGHT_UPGRADES } from "../prestige/constants"
import { getPrestigeManager } from "../prestige/PrestigeManager"
import { getCareerManager } from "../progression/CareerManager"
import { getNodesForBranch } from "../progression/careers"
import { getThemeManager } from "../themeManager"
import type { AchievementManager } from "./AchievementManager"

const TOURIST_WINDOWS: RoutableWindow[] = [
    "about",
    "projects",
    "resume",
    "links",
]

export function wireAchievements(
    mgr: AchievementManager,
    windowOpenCallback: (cb: (windowId: RoutableWindow) => void) => void
): void {
    wireWindowManager(mgr, windowOpenCallback)
    wireThemeManager(mgr)
    wireLocaleManager(mgr)
    wireMarketGame(mgr)
    wireTerminalEvents(mgr)
    wirePinballEvents(mgr)
    wirePopupEvents(mgr)
    wireFelixEvents(mgr)
    wireGuestbookEvents(mgr)
    wireWeltEvents(mgr)
    wireCalmMode(mgr)
    wireSessionTimer(mgr)
    wireSessionCost(mgr)
    wireQAReports(mgr)
    wireProgressionEvents(mgr)
}

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

    game.on("tradeExecuted", (data) => {
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
        if (game.getOwnedUpgrades().length >= UPGRADES.length) {
            mgr.earn("wasnt-brains")
        }
    })

    game.on("factoryDeployed", () => {
        mgr.earn("factory-floor")

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
        if (total >= 5) {
            mgr.earn("assembly-line")
        }
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

    game.on("harvestExecuted", () => {
        const harvests = game.getTotalHarvests()
        if (harvests >= 100) mgr.earn("harvest-100")
        if (harvests >= 1000) mgr.earn("harvest-1000")
        if (harvests >= 10000) mgr.earn("harvest-10000")
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
    })

    onAppEvent("terminal:file-saved", () => {
        mgr.earn("author")
    })
}

function wirePinballEvents(mgr: AchievementManager): void {
    onAppEvent("pinball:gameover", (detail) => {
        const { score, allTargetsHit } = detail

        if (score >= 1000) mgr.earn("pinball-wizard")
        if (score >= 5000) mgr.earn("high-roller")
        if (score >= 10000) mgr.earn("bounty-hunter")
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
    })

    onAppEvent("prestige:purchase", () => {
        mgr.earn("hindsight-shopper")

        const prestige = getPrestigeManager()
        const allBought = HINDSIGHT_UPGRADES.every(
            (u) => prestige.getUpgradePurchaseCount(u.id) >= u.maxPurchases
        )
        if (allBought) mgr.earn("pieces-of-paper")
    })

    // ── Autobattler achievements ─────────────────────────────────────────
    let consecutiveWins = 0
    let totalAutobattlerWins = 0
    onAppEvent("autobattler:run-complete", (detail) => {
        mgr.earn("first-draft")
        if (detail.won) {
            mgr.earn("posse-up")
            totalAutobattlerWins++
            consecutiveWins++

            // Wrangler tiered group
            if (totalAutobattlerWins >= 1) mgr.earn("greenhorn")
            if (totalAutobattlerWins >= 5) mgr.earn("deputy")
            if (totalAutobattlerWins >= 15) mgr.earn("sheriff")
            if (totalAutobattlerWins >= 50) mgr.earn("marshal")

            // Win streak (3 in a row)
            if (consecutiveWins >= 3) mgr.earn("win-streak")
        } else {
            consecutiveWins = 0
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
    onAppEvent("career:selected", () => {
        mgr.earn("career-starter")
    })

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
    let totalHires = 0
    onAppEvent("market:employee-hired", () => {
        mgr.earn("that-ones-a-person")
        totalHires++
        if (totalHires >= 9) mgr.earn("we-make-nothing")
    })

    let totalFires = 0
    onAppEvent("market:employee-fired", () => {
        totalFires++
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

    // "Full Stack" = prestige + win autobattler + career selected
    const checkFullStack = (): void => {
        if (
            mgr.hasEarned("ive-been-wrong") &&
            mgr.hasEarned("posse-up") &&
            mgr.hasEarned("career-starter")
        ) {
            mgr.earn("full-stack")
        }
    }
    onAppEvent("prestige:triggered", checkFullStack)
    onAppEvent("autobattler:run-complete", checkFullStack)
    onAppEvent("career:selected", checkFullStack)

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
        if (game.getSecurities().length >= 6) {
            mgr.earn("music-stops")
        }
    })

    // "be-first" -- Reach AAA credit rating
    // "Be first. Be smarter. Or cheat."
    game.on("ratingChanged", (data) => {
        const { rating } = data as { rating: string; direction: string }
        if (rating === "AAA") {
            mgr.earn("be-first")
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
        if (total > 0 && debt / total >= 0.9) {
            mgr.earn("it-goes-quickly")
        }
    })

    // "rainy-day" -- Fully repay all debt with 3+ DAS performing
    // "I put 400 away for a rainy day."
    game.on("debtChanged", () => {
        if (game.getDebt() <= 0 && game.getSecurities().length >= 3) {
            mgr.earn("rainy-day")
        }
    })
}
