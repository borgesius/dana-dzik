import { getAchievementManager } from "../achievements/AchievementManager"
import { ACHIEVEMENTS } from "../achievements/definitions"
import type { AchievementDef, TieredGroup } from "../achievements/types"
import { getLocaleManager } from "../localeManager"

const TIERED_GROUP_LABELS: Record<TieredGroup, string> = {
    mogul: "Mogul",
    scholar: "Scholar",
    arcade: "Arcade",
    industrialist: "Industrialist",
    phases: "Phase Progression",
}

function renderTierStars(
    group: TieredGroup,
    defs: AchievementDef[]
): string {
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

    const mgr = getAchievementManager()
    const lm = getLocaleManager()

    const earned = mgr.getEarnedCount()
    const total = mgr.getTotalCount()

    const categories = [
        { key: "trading", label: "Trading" },
        { key: "production", label: "Production" },
        { key: "milestones", label: "Milestones" },
        { key: "exploration", label: "Exploration" },
        { key: "terminal", label: "Terminal" },
        { key: "social", label: "Social" },
        { key: "pinball", label: "Pinball" },
        { key: "autobattler", label: "Autobattler" },
        { key: "prestige", label: "Prestige" },
        { key: "career", label: "Career" },
        { key: "cross-system", label: "Cross-System" },
    ]

    // Collect tiered groups for summary
    const tieredGroups = new Map<TieredGroup, AchievementDef[]>()
    for (const def of ACHIEVEMENTS) {
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

    // Render tier progress bars
    if (tieredGroups.size > 0) {
        html += `<div class="achievements-tiers">`
        for (const [group, defs] of tieredGroups) {
            html += renderTierStars(group, defs)
        }
        html += `</div>`
    }

    for (const cat of categories) {
        const defs = ACHIEVEMENTS.filter((a) => a.category === cat.key)
        if (defs.length === 0) continue

        html += `
            <div class="achievements-category">
                <div class="achievements-category-title">${cat.label}</div>
                <div class="achievements-grid">
        `

        for (const def of defs) {
            const isEarned = mgr.hasEarned(def.id)
            const isHidden = def.hidden && !isEarned
            const name = lm.t(`achievements.${def.id}.name`)
            const description = isEarned
                ? lm.t(`achievements.${def.id}.description`)
                : isHidden
                  ? "???"
                  : lm.t(`achievements.${def.id}.description`)

            let dateStr = ""
            if (isEarned) {
                const ts = mgr.getEarnedTimestamp(def.id)
                if (ts) {
                    dateStr = new Date(ts).toLocaleDateString()
                }
            }

            const displayIcon = isHidden ? "❓" : def.icon

            const tierBadge =
                def.tieredGroup && def.tier
                    ? `<span class="achievement-tier-badge">T${def.tier}</span>`
                    : ""

            html += `
                <div class="achievement-card ${isEarned ? "earned" : "unearned"}">
                    <div class="achievement-card-icon ${isEarned ? "" : "unearned"}">${displayIcon}</div>
                    <div class="achievement-card-info">
                        <div class="achievement-card-name">${name}${tierBadge}</div>
                        <div class="achievement-card-desc">${description}</div>
                        ${dateStr ? `<div class="achievement-card-date">${dateStr}</div>` : ""}
                    </div>
                </div>
            `
        }

        html += `</div></div>`
    }

    container.innerHTML = html
}
