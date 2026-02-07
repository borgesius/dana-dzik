import { getProgressionManager } from "../../lib/progression/ProgressionManager"

export class LevelWidget {
    private element: HTMLElement
    private levelText: HTMLElement
    private xpBar: HTMLElement
    private xpBarFill: HTMLElement

    constructor() {
        this.element = document.createElement("div")
        this.element.className = "level-widget"
        this.element.title = "Level 0 · 0 XP"

        this.levelText = document.createElement("span")
        this.levelText.className = "level-widget-text"
        this.levelText.textContent = "Lv.0"
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
        const mgr = getProgressionManager()
        const { currentLevel, xpIntoLevel, xpNeededForNext, progress } =
            mgr.getLevelProgress()

        this.levelText.textContent = `Lv.${currentLevel}`
        this.xpBarFill.style.width = `${Math.floor(progress * 100)}%`
        this.element.title = `Level ${currentLevel} · ${mgr.getTotalXP()} XP · ${xpIntoLevel}/${xpNeededForNext} to next`
    }

    public getElement(): HTMLElement {
        return this.element
    }
}
