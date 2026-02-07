import { getAchievementManager } from "../achievements/AchievementManager"
import { ACHIEVEMENTS } from "../achievements/definitions"
import { getLocaleManager } from "../localeManager"

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
    ]

    let html = `
        <div class="achievements-header">
            <h2>🏆 Achievements</h2>
            <div class="achievements-progress">${earned} / ${total} unlocked</div>
        </div>
    `

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

            html += `
                <div class="achievement-card ${isEarned ? "earned" : "unearned"}">
                    <div class="achievement-card-icon ${isEarned ? "" : "unearned"}">${displayIcon}</div>
                    <div class="achievement-card-info">
                        <div class="achievement-card-name">${name}</div>
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
