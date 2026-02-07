import { getLocaleManager } from "../localeManager"
import {
    COMMODITIES,
    CORNER_MARKET_FLOAT,
    CORNER_MARKET_THRESHOLD,
    FACTORIES,
    getMarketGame,
    type TradeResult,
    UPGRADES,
} from "../marketGame"
import { getThemeManager } from "../themeManager"
import type { AchievementManager } from "./AchievementManager"

const ROUTABLE_WINDOW_IDS = [
    "welcome",
    "about",
    "projects",
    "resume",
    "links",
    "guestbook",
    "felixgpt",
    "stats",
    "pinball",
    "terminal",
    "explorer",
]

const TOURIST_WINDOWS = ["about", "projects", "resume", "links"]

export function wireAchievements(
    mgr: AchievementManager,
    windowOpenCallback: (cb: (windowId: string) => void) => void
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
}

function wireWindowManager(
    mgr: AchievementManager,
    onNewWindowOpen: (cb: (windowId: string) => void) => void
): void {
    onNewWindowOpen((windowId: string) => {
        const count = mgr.addToSet("windows-opened", windowId)

        if (count >= ROUTABLE_WINDOW_IDS.length) {
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
    document.addEventListener("terminal:command", ((
        e: CustomEvent<{ command: string; raw: string }>
    ) => {
        mgr.earn("hacker")

        const cmd = e.detail.command.toLowerCase()

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
            const raw = e.detail.raw.toLowerCase()
            if (raw.includes("syslog")) {
                mgr.earn("syslog")
            }
            if (raw.includes("manual")) {
                mgr.earn("readme")
            }
        }

        if (cmd === "cd") {
            const raw = e.detail.raw.toLowerCase()
            if (raw.includes("das")) {
                mgr.earn("archivist")
            }
        }
    }) as EventListener)

    document.addEventListener("terminal:file-saved", (() => {
        mgr.earn("author")
    }) as EventListener)
}

function wirePinballEvents(mgr: AchievementManager): void {
    document.addEventListener("pinball:gameover", ((
        e: CustomEvent<{
            score: number
            highScore: number
            allTargetsHit: boolean
        }>
    ) => {
        const { score, allTargetsHit } = e.detail

        if (score >= 1000) mgr.earn("pinball-wizard")
        if (score >= 5000) mgr.earn("high-roller")
        if (score >= 10000) mgr.earn("bounty-hunter")
        if (allTargetsHit) mgr.earn("target-practice")
    }) as EventListener)
}

function wirePopupEvents(mgr: AchievementManager): void {
    document.addEventListener("popup:bonus-claimed", () => {
        const count = mgr.incrementCounter("bonus-popups-claimed")
        if (count >= 5) {
            mgr.earn("popup-enjoyer")
        }
    })
}

function wireFelixEvents(mgr: AchievementManager): void {
    document.addEventListener("felix:message", () => {
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
    document.addEventListener("welt:completed", () => {
        mgr.earn("programmer")
    })

    document.addEventListener("welt:exercises-tested", ((
        e: CustomEvent<{
            passed: number
            total: number
            passedExercises?: number[]
        }>
    ) => {
        if (e.detail.passed >= 1) mgr.earn("welt-beginner")
        if (e.detail.passed >= 3) mgr.earn("welt-intermediate")
        if (e.detail.passed >= 5) mgr.earn("welt-advanced")
        if (e.detail.passed >= 7) mgr.earn("erlosung")
    }) as EventListener)

    document.addEventListener("welt:all-exercises-passed", () => {
        mgr.earn("erlosung")
    })

    document.addEventListener("welt:exercise-passed", ((
        e: CustomEvent<{ exercise: number }>
    ) => {
        if (e.detail.exercise === 6) mgr.earn("welt-master")
        if (e.detail.exercise === 7) mgr.earn("nibelung")
    }) as EventListener)

    document.addEventListener("welt:error", ((
        e: CustomEvent<{ type: string }>
    ) => {
        switch (e.detail.type) {
            case "thermal":
                mgr.earn("thermal-protection")
                break
            case "suffering":
                mgr.earn("suffering")
                break
        }
    }) as EventListener)

    document.addEventListener("grund:compiled", () => {
        mgr.earn("grund-compiled")
    })

    document.addEventListener("grund:executed", () => {
        mgr.earn("grund-executed")
    })

    document.addEventListener("grund:ring-overflow", () => {
        mgr.earn("ring-overflow")
    })

    document.addEventListener("freak:used", () => {
        mgr.earn("freakgpt")
    })

    document.addEventListener("felix:editor", () => {
        mgr.earn("keyboard-cat")
    })
}

function wireCalmMode(mgr: AchievementManager): void {
    document.addEventListener("calm-mode:toggled", () => {
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
    document.addEventListener("session-cost:big-spender", () => {
        mgr.earn("big-spender")
    })
    document.addEventListener("session-cost:whale", () => {
        mgr.earn("whale")
    })
}

function wireQAReports(mgr: AchievementManager): void {
    document.addEventListener("qa:report-clicked", () => {
        mgr.earn("qa-inspector")
    })
}
