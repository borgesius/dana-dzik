import type { AchievementManager } from "../lib/achievements/AchievementManager"
import { ACHIEVEMENT_MAP } from "../lib/achievements/definitions"
import type { AchievementId } from "../lib/achievements/types"
import { emitAppEvent } from "../lib/events"
import { getLocaleManager } from "../lib/localeManager"
import { scrollToAchievement } from "../lib/windowContent/achievements"
import { getToastManager } from "./ToastManager"

const TOAST_DURATION_MS = 6000

export class AchievementToast {
    constructor(mgr: AchievementManager) {
        mgr.onEarned((id) => this.show(id))
    }

    private show(id: AchievementId): void {
        const def = ACHIEVEMENT_MAP.get(id)
        if (!def) return

        const lm = getLocaleManager()
        const fallbackName = id
            .split("-")
            .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
            .join(" ")
        const name = lm.t(`achievements.${id}.name`, {
            defaultValue: fallbackName,
        })
        const description = lm.t(`achievements.${id}.description`, {
            defaultValue: "",
        })

        const toast = document.createElement("div")
        toast.className = "achievement-toast"

        toast.innerHTML = `
            <div class="achievement-toast-shine"></div>
            <div class="achievement-toast-icon">${def.icon}</div>
            <div class="achievement-toast-content">
                <div class="achievement-toast-title">🎉 Achievement Unlocked!</div>
                <div class="achievement-toast-name">${name}</div>
                <div class="achievement-toast-desc">${description}</div>
            </div>
        `

        const tm = getToastManager()

        toast.addEventListener("click", () => {
            emitAppEvent("terminal:open-window", { windowId: "achievements" })
            tm.dismiss(toast)
            // Window is now open and rendered (dispatchEvent is sync).
            // Wait one frame for layout, then scroll to the card.
            requestAnimationFrame(() => {
                scrollToAchievement(id)
            })
        })

        tm.push(toast)
        tm.scheduleDismiss(toast, TOAST_DURATION_MS)
    }
}
