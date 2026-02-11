import { getProgressionManager } from "../lib/progression/ProgressionManager"

const FLOAT_DURATION_MS = 1200
const OFFSET_X = 12
const OFFSET_Y = -20

export class XPPopup {
    private mouseX = 0
    private mouseY = 0

    constructor() {
        document.addEventListener("mousemove", (e) => {
            this.mouseX = e.clientX
            this.mouseY = e.clientY
        })

        getProgressionManager().on("xpGained", (data) => {
            this.spawn(data.amount)
        })
    }

    private spawn(amount: number): void {
        const el = document.createElement("div")
        el.className = "xp-popup"
        el.textContent = `+${amount} XP`
        el.style.left = `${this.mouseX + OFFSET_X}px`
        el.style.top = `${this.mouseY + OFFSET_Y}px`
        document.body.appendChild(el)

        requestAnimationFrame(() => {
            el.classList.add("xp-popup-active")
        })

        setTimeout(() => {
            el.remove()
        }, FLOAT_DURATION_MS)
    }
}
