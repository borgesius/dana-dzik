import { getAchievementManager } from "../achievements/AchievementManager"
import { onAppEvent } from "../events"
import { getCosmeticManager } from "./CosmeticManager"

/**
 * Wire all cosmetic unlock triggers to events.
 * Call once during initialization.
 */
export function wireCosmeticUnlocks(): void {
    const cm = getCosmeticManager()

    // ── Cursor trails: faction collection complete ────────────────────────
    const factionTrailMap: Record<string, string> = {
        quickdraw: "quickdraw",
        deputies: "deputies",
        clockwork: "clockwork",
        prospectors: "prospectors",
    }
    onAppEvent("autobattler:faction-complete", (detail) => {
        const trailId = factionTrailMap[detail.faction]
        if (trailId) {
            cm.unlock("cursor-trail", trailId)
        }
    })

    // ── Wallpapers: run wins with faction majority ───────────────────────
    const factionWallpaperMap: Record<string, string> = {
        quickdraw: "quickdraw-sunset",
        deputies: "deputies-badge",
        clockwork: "clockwork-gears",
        prospectors: "prospectors-mine",
    }
    onAppEvent("autobattler:run-complete", (detail) => {
        if (detail.won && detail.majorityFaction) {
            const wpId = factionWallpaperMap[detail.majorityFaction]
            if (wpId) {
                cm.unlock("wallpaper", wpId)
            }
        }
    })

    // ── Wallpaper: prestige-gold (prestige 3+ times) ─────────────────────
    let prestigeCount = 0
    onAppEvent("prestige:triggered", () => {
        prestigeCount++
        if (prestigeCount >= 3) {
            cm.unlock("wallpaper", "prestige-gold")
        }
    })

    // ── Window chrome: frontier (full spiral complete) ───────────────────
    onAppEvent("autobattler:spiral-complete", () => {
        cm.unlock("window-chrome", "frontier")
    })

    // ── Window chrome: corporate (reach level 25) ────────────────────────
    onAppEvent("progression:level-up", (detail) => {
        if (detail.level >= 25) {
            cm.unlock("window-chrome", "corporate")
        }
    })

    // ── Window chrome: vintage (50+ achievements) ────────────────────────
    const achMgr = getAchievementManager()
    achMgr.onEarned(() => {
        const earned = achMgr.getEarnedCount()
        if (earned >= 50) {
            cm.unlock("window-chrome", "vintage")
        }
    })
}
