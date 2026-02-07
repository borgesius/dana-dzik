import { ACHIEVEMENT_MAP } from "../lib/achievements"
import type { AchievementManager } from "../lib/achievements/AchievementManager"
import type { AchievementId } from "../lib/achievements/types"
import { getLocaleManager } from "../lib/localeManager"

const TOAST_DURATION_MS = 4000
const TOAST_ANIMATION_MS = 300
const MAX_VISIBLE = 3

export class AchievementToast {
    private container: HTMLElement
    private activeToasts: HTMLElement[] = []

    constructor(mgr: AchievementManager) {
        this.container = document.createElement("div")
        this.container.className = "achievement-toast-container"
        document.body.appendChild(this.container)

        mgr.onEarned((id) => this.show(id))
    }

    private show(id: AchievementId): void {
        const def = ACHIEVEMENT_MAP.get(id)
        if (!def) return

        const lm = getLocaleManager()
        const name = lm.t(`achievements.${id}.name`)
        const description = lm.t(`achievements.${id}.description`)

        const toast = document.createElement("div")
        toast.className = "achievement-toast"

        toast.innerHTML = `
            <div class="achievement-toast-icon">${def.icon}</div>
            <div class="achievement-toast-content">
                <div class="achievement-toast-title">Achievement Unlocked!</div>
                <div class="achievement-toast-name">${name}</div>
                <div class="achievement-toast-desc">${description}</div>
            </div>
        `

        if (this.activeToasts.length >= MAX_VISIBLE) {
            const oldest = this.activeToasts.shift()
            oldest?.remove()
        }

        this.container.appendChild(toast)
        this.activeToasts.push(toast)

        requestAnimationFrame(() => {
            toast.classList.add("achievement-toast-visible")
        })

        setTimeout(() => {
            toast.classList.remove("achievement-toast-visible")
            toast.classList.add("achievement-toast-exit")
            setTimeout(() => {
                toast.remove()
                const idx = this.activeToasts.indexOf(toast)
                if (idx !== -1) this.activeToasts.splice(idx, 1)
            }, TOAST_ANIMATION_MS)
        }, TOAST_DURATION_MS)
    }
}
