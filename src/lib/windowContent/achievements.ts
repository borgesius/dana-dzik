import { getAchievementManager } from "../achievements/AchievementManager"
import { ACHIEVEMENTS } from "../achievements/definitions"
import type {
    AchievementDef,
    AchievementId,
    TieredGroup,
} from "../achievements/types"
import {
    type AchievementCountsData,
    fetchAchievementCounts,
} from "../analytics"
import { isMobile } from "../isMobile"
import { getLocaleManager } from "../localeManager"

const TIERED_GROUP_LABELS: Record<TieredGroup, string> = {
    mogul: "Mogul",
    scholar: "Scholar",
    arcade: "Arcade",
    industrialist: "Industrialist",
    phases: "Phase Progression",
    depth: "Depth",
    rank: "Rank",
    harvester: "Harvester",
    "commodity-harvester": "Commodity Specialist",
    introspection: "Introspection",
    collector: "Collector",
    lunar: "Lunar Cycle",
    ascension: "Ascension",
    cost: "Cost",
    "prestige-count": "Prestige Count",
    mastery: "Mastery",
}

function renderTierStars(group: TieredGroup, defs: AchievementDef[]): string {
    const mgr = getAchievementManager()
    const sorted = [...defs].sort((a, b) => (a.tier ?? 0) - (b.tier ?? 0))
    const stars = sorted
        .map((d) => {
            const earned = mgr.hasEarned(d.id)
            return `<span class="tier-star ${earned ? "earned" : ""}" title="${d.id}">★</span>`
        })
        .join("")

    const earnedCount = sorted.filter((d) => mgr.hasEarned(d.id)).length

    return `
        <div class="tier-progress">
            <span class="tier-label">${TIERED_GROUP_LABELS[group]}</span>
            <span class="tier-stars">${stars}</span>
            <span class="tier-count">${earnedCount}/${sorted.length}</span>
        </div>
    `
}

export function getAchievementsContent(): string {
    return `<div id="achievements-content" class="achievements-container"></div>`
}

export function renderAchievementsWindow(): void {
    const container = document.getElementById("achievements-content")
    if (!container) return

    // Holds the global counts once fetched (shared across re-renders)
    let globalCounts: AchievementCountsData | null = null

    function render(): void {
        const el = document.getElementById("achievements-content")
        if (!el) return

        const mgr = getAchievementManager()
        const lm = getLocaleManager()
        const mobile = isMobile()

        const visibleAchievements = mobile
            ? ACHIEVEMENTS.filter((a) => !a.desktopOnly)
            : ACHIEVEMENTS

        const earned = mobile
            ? visibleAchievements.filter((a) => mgr.hasEarned(a.id)).length
            : mgr.getEarnedCount()
        const total = visibleAchievements.length

        const categories = [
            // Core gameplay
            { key: "trading", label: "Trading" },
            { key: "production", label: "Production" },
            { key: "milestones", label: "Milestones" },
            { key: "prestige", label: "Prestige" },
            { key: "career", label: "Career" },
            // Technical
            { key: "terminal", label: "Terminal" },
            { key: "coding", label: "Coding" },
            { key: "exercises", label: "Exercises" },
            // Mini-games
            { key: "pinball", label: "Pinball" },
            { key: "autobattler", label: "Symposia" },
            // Discovery & social
            { key: "exploration", label: "Exploration" },
            { key: "customization", label: "Customization" },
            { key: "social", label: "Social" },
            // Endgame & hidden
            { key: "cross-system", label: "Cross-System" },
            { key: "veil", label: "Piercing the Veil" },
            { key: "arcana", label: "Major Arcana" },
        ]

        const tieredGroups = new Map<TieredGroup, AchievementDef[]>()
        for (const def of visibleAchievements) {
            if (def.tieredGroup) {
                if (!tieredGroups.has(def.tieredGroup)) {
                    tieredGroups.set(def.tieredGroup, [])
                }
                tieredGroups.get(def.tieredGroup)?.push(def)
            }
        }

        let html = `
            <div class="achievements-header">
                <h2>🏆 Achievements</h2>
                <div class="achievements-progress">${earned} / ${total} unlocked</div>
            </div>
        `

        if (tieredGroups.size > 0) {
            html += `<div class="achievements-tiers">`
            for (const [group, defs] of tieredGroups) {
                html += renderTierStars(group, defs)
            }
            html += `</div>`
        }

        for (const cat of categories) {
            const defs = visibleAchievements.filter(
                (a) => a.category === cat.key
            )
            if (defs.length === 0) continue

            html += `
                <div class="achievements-category">
                    <div class="achievements-category-title">${cat.label}</div>
                    <div class="achievements-grid">
            `

            for (const def of defs) {
                const isEarned = mgr.hasEarned(def.id)
                const isHidden = def.hidden && !isEarned
                const fallbackName = def.id
                    .split("-")
                    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
                    .join(" ")
                const name = lm.t(`achievements.${def.id}.name`, {
                    defaultValue: fallbackName,
                })
                const description = isEarned
                    ? lm.t(`achievements.${def.id}.description`, {
                          defaultValue: "",
                      })
                    : isHidden
                      ? "???"
                      : lm.t(`achievements.${def.id}.description`, {
                            defaultValue: "",
                        })

                let dateStr = ""
                if (isEarned) {
                    const ts = mgr.getEarnedTimestamp(def.id)
                    if (ts) {
                        dateStr = new Date(ts).toLocaleDateString()
                    }
                }

                const displayIcon = isHidden ? "❓" : def.icon

                let rarityHtml = ""
                if (globalCounts && globalCounts.totalUsers > 0) {
                    const count = globalCounts.counts[def.id] ?? 0
                    rarityHtml = `<div class="achievement-card-rarity">${count} / ${globalCounts.totalUsers} users</div>`
                }

                html += `
                    <div class="achievement-card ${isEarned ? "earned" : "unearned"}" data-achievement-id="${def.id}">
                        <div class="achievement-card-icon ${isEarned ? "" : "unearned"}">${displayIcon}</div>
                        <div class="achievement-card-info">
                            <div class="achievement-card-name">${name}</div>
                            <div class="achievement-card-desc">${description}</div>
                            ${dateStr ? `<div class="achievement-card-date">${dateStr}</div>` : ""}
                            ${rarityHtml}
                        </div>
                    </div>
                `
            }

            html += `</div></div>`
        }

        el.innerHTML = html
    }

    // Render immediately with local data, then fetch global counts
    render()

    void fetchAchievementCounts().then((data) => {
        if (data.totalUsers > 0) {
            globalCounts = data
            render()
        }
    })

    getAchievementManager().onEarned(() => render())
}

// ── Scroll-to support (called from AchievementToast) ────────────────────

const HIGHLIGHT_DURATION_MS = 1500

/**
 * Scroll the achievements window to a specific achievement card and
 * briefly highlight it. Safe to call even if the window isn't open yet.
 */
export function scrollToAchievement(id: AchievementId): void {
    const card = document.querySelector<HTMLElement>(
        `.achievement-card[data-achievement-id="${id}"]`
    )
    if (!card) return

    card.scrollIntoView({ behavior: "smooth", block: "center" })
    card.classList.add("achievement-card-highlight")
    setTimeout(() => {
        card.classList.remove("achievement-card-highlight")
    }, HIGHLIGHT_DURATION_MS)
}
