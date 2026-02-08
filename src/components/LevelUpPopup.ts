import { onAppEvent } from "../lib/events"
import { getLocaleManager } from "../lib/localeManager"

const POPUP_DURATION_MS = 4000
const POPUP_ANIMATION_MS = 400

export class LevelUpPopup {
    private container: HTMLElement

    constructor() {
        this.container = document.createElement("div")
        this.container.className = "levelup-popup-container"
        document.body.appendChild(this.container)

        onAppEvent("progression:level-up", (detail) => {
            this.show(detail.level)
        })
    }

    private show(level: number): void {
        const existing = this.container.querySelector(".levelup-popup")
        if (existing) existing.remove()

        const popup = document.createElement("div")
        popup.className = "levelup-popup"

        const lm = getLocaleManager()
        popup.innerHTML = `
            <div class="levelup-popup-glow"></div>
            <div class="levelup-popup-inner">
                <div class="levelup-popup-label">${lm.t("levelUp.label")}</div>
                <div class="levelup-popup-level">${level}</div>
                <div class="levelup-popup-hint">${lm.t("levelUp.hint")}</div>
            </div>
        `

        popup.addEventListener("click", () => {
            popup.classList.remove("levelup-popup-visible")
            popup.classList.add("levelup-popup-exit")
            setTimeout(() => popup.remove(), POPUP_ANIMATION_MS)
        })

        this.container.appendChild(popup)

        requestAnimationFrame(() => {
            popup.classList.add("levelup-popup-visible")
        })

        setTimeout(() => {
            if (!popup.classList.contains("levelup-popup-exit")) {
                popup.classList.remove("levelup-popup-visible")
                popup.classList.add("levelup-popup-exit")
                setTimeout(() => popup.remove(), POPUP_ANIMATION_MS)
            }
        }, POPUP_DURATION_MS)
    }
}
