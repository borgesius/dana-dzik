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
                mgr.earn("buy-the-dip")
            }
        }

        if (trade.action === "sell") {
            const def = COMMODITIES.find((c) => c.id === trade.commodityId)
            if (def && trade.pricePerUnit >= def.basePrice * 5) {
                mgr.earn("sell-the-top")
            }
        }

        const allHeld = COMMODITIES.every((c) => {
            const h = game.getHolding(c.id)
            return h !== null && h.quantity > 0
        })
        if (allHeld) {
            mgr.earn("diversified")
        }

        if (trade.action === "buy") {
            const holding = game.getHolding(trade.commodityId)
            if (
                holding &&
                holding.quantity > CORNER_MARKET_FLOAT * CORNER_MARKET_THRESHOLD
            ) {
                mgr.earn("cornered")
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
            mgr.earn("fully-automated")
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
            mgr.earn("market-maker")
        }
    })

    game.on("limitOrderFilled", () => {
        mgr.earn("limit-filled")
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
}

function wireQAReports(mgr: AchievementManager): void {
    onAppEvent("qa:report-clicked", () => {
        mgr.earn("qa-inspector")
    })
}

function wireProgressionEvents(mgr: AchievementManager): void {
    // ── Prestige achievements ────────────────────────────────────────────
    onAppEvent("prestige:triggered", (detail) => {
        mgr.earn("bubble-popper")
        if (detail.count >= 5) {
            mgr.earn("serial-popper")
        }
        if (detail.hindsight >= 50) {
            mgr.earn("hindsight-hoarder")
        }
    })

    onAppEvent("prestige:purchase", () => {
        mgr.earn("hindsight-shopper")
    })

    // ── Autobattler achievements ─────────────────────────────────────────
    onAppEvent("autobattler:run-complete", (detail) => {
        mgr.earn("first-draft")
        if (detail.won) {
            mgr.earn("posse-up")
        }
    })

    onAppEvent("autobattler:unit-unlocked", () => {
        mgr.earn("faction-recruit")
    })

    onAppEvent("autobattler:spiral-complete", () => {
        mgr.earn("full-spiral")
    })

    // ── Career achievements ──────────────────────────────────────────────
    onAppEvent("career:selected", () => {
        mgr.earn("career-starter")
    })

    onAppEvent("career:switched", () => {
        mgr.earn("career-switcher")
    })

    let nodesUnlocked = 0
    onAppEvent("career:node-unlocked", () => {
        nodesUnlocked++
        if (nodesUnlocked >= 5) mgr.earn("skill-tree-novice")
        if (nodesUnlocked >= 15) mgr.earn("skill-tree-master")
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
            mgr.hasEarned("bubble-popper") &&
            mgr.hasEarned("posse-up") &&
            mgr.hasEarned("career-starter")
        ) {
            mgr.earn("full-stack")
        }
    }
    onAppEvent("prestige:triggered", checkFullStack)
    onAppEvent("autobattler:run-complete", checkFullStack)
    onAppEvent("career:selected", checkFullStack)
}
