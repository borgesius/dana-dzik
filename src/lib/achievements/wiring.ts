import { getBusinessGame } from "../businessGame"
import { getLocaleManager } from "../localeManager"
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
    wireBusinessGame(mgr)
    wireTerminalEvents(mgr)
    wirePinballEvents(mgr)
    wirePopupEvents(mgr)
    wireFelixEvents(mgr)
    wireGuestbookEvents(mgr)
    wireWeltEvents(mgr)
    wireSessionTimer(mgr)
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

function wireBusinessGame(mgr: AchievementManager): void {
    const game = getBusinessGame()

    game.on("ventureResult", (data) => {
        const d = data as {
            ventureId: string
            success: boolean
            amount: number
        }
        if (d.success) {
            mgr.incrementCounter("trades")
            mgr.earn("first-trade")
        }

        const earnings = game.getLifetimeEarnings()
        if (earnings >= 1) mgr.earn("penny-trader")
        if (earnings >= 10) mgr.earn("small-business")
        if (earnings >= 100) mgr.earn("going-concern")
        if (earnings >= 1000) mgr.earn("dot-com-darling")
        if (earnings >= 10000) mgr.earn("irrational-exuberance")
    })

    game.on("tierUnlocked", (data) => {
        const tier = data as number
        if (tier >= 2) mgr.earn("phase-2")
        if (tier >= 3) mgr.earn("phase-3")
        if (tier >= 4) mgr.earn("phase-4")
    })

    game.on("upgradeAcquired", () => {
        const upgrades = game.getOwnedUpgrades()
        if (upgrades.length >= game.getUpgrades().length) {
            mgr.earn("fully-automated")
        }
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
            if (raw.includes("system32")) {
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

    document.addEventListener("welt:error", ((
        e: CustomEvent<{ type: string }>
    ) => {
        switch (e.detail.type) {
            case "thermal":
                mgr.earn("thermal-protection")
                break
            case "divide-by-zero":
                mgr.earn("divide-by-zero")
                break
            case "suffering":
                mgr.earn("suffering")
                break
        }
    }) as EventListener)
}

function wireSessionTimer(mgr: AchievementManager): void {
    setTimeout(
        () => {
            mgr.earn("y2k-survivor")
        },
        30 * 60 * 1000
    )
}
