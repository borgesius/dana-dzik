import { getLocaleManager } from "../../lib/localeManager"
import { getProgressionManager } from "../../lib/progression/ProgressionManager"

export class LevelWidget {
    private element: HTMLElement
    private levelText: HTMLElement
    private xpBar: HTMLElement
    private xpBarFill: HTMLElement

    constructor() {
        this.element = document.createElement("div")
        this.element.className = "level-widget"
        const lm = getLocaleManager()
        this.element.title = lm.t("widgets.levelTooltip", {
            level: 0,
            totalXP: 0,
            current: 0,
            next: 0,
        })

        this.levelText = document.createElement("span")
        this.levelText.className = "level-widget-text"
        this.levelText.textContent = lm.t("widgets.level", { level: 0 })
        this.element.appendChild(this.levelText)

        this.xpBar = document.createElement("div")
        this.xpBar.className = "level-widget-bar"
        this.xpBarFill = document.createElement("div")
        this.xpBarFill.className = "level-widget-bar-fill"
        this.xpBar.appendChild(this.xpBarFill)
        this.element.appendChild(this.xpBar)

        const mgr = getProgressionManager()
        mgr.on("xpGained", () => this.update())
        mgr.on("levelUp", () => this.update())
        this.update()
    }

    private update(): void {
        const lm = getLocaleManager()
        const mgr = getProgressionManager()
        const { currentLevel, xpIntoLevel, xpNeededForNext, progress } =
            mgr.getLevelProgress()

        this.levelText.textContent = lm.t("widgets.level", {
            level: currentLevel,
        })
        this.xpBarFill.style.width = `${Math.floor(progress * 100)}%`
        this.element.title = lm.t("widgets.levelTooltip", {
            level: currentLevel,
            totalXP: mgr.getTotalXP(),
            current: xpIntoLevel,
            next: xpNeededForNext,
        })
    }

    public getElement(): HTMLElement {
        return this.element
    }
}
