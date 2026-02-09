import type {
    CosmeticRarity,
    CosmeticType,
} from "../lib/cosmetics/CosmeticManager"
import { getCosmeticDef } from "../lib/cosmetics/definitions"
import { emitAppEvent, onAppEvent } from "../lib/events"
import { getLocaleManager } from "../lib/localeManager"
import { getToastManager } from "./ToastManager"

const DURATION_BY_RARITY: Record<CosmeticRarity, number> = {
    common: 6000,
    uncommon: 6000,
    rare: 8000,
    legendary: 10000,
}

export class CosmeticToast {
    constructor() {
        onAppEvent("cosmetic:unlocked", (detail) => {
            this.show(detail.type as CosmeticType, detail.id)
        })
    }

    private show(type: CosmeticType, id: string): void {
        const def = getCosmeticDef(type, id)
        if (!def) return

        const lm = getLocaleManager()
        const nameKey = `cosmetics.${type}.${id}.name`
        const descKey = `cosmetics.${type}.${id}.description`
        const name = lm.t(nameKey)
        const description = lm.t(descKey)

        const toast = document.createElement("div")
        toast.className = `cosmetic-toast cosmetic-toast-${def.rarity}`

        const shineClass =
            def.rarity === "legendary"
                ? "cosmetic-toast-shine cosmetic-toast-shine-loop"
                : "cosmetic-toast-shine"

        toast.innerHTML = `
            <div class="${shineClass}"></div>
            <div class="cosmetic-toast-icon">${def.icon}</div>
            <div class="cosmetic-toast-content">
                <div class="cosmetic-toast-title">✨ Cosmetic Unlocked!</div>
                <div class="cosmetic-toast-name">${name}</div>
                <div class="cosmetic-toast-desc">${description}</div>
                <div class="cosmetic-toast-rarity cosmetic-rarity-${def.rarity}">${def.rarity}</div>
            </div>
        `

        const tm = getToastManager()

        toast.addEventListener("click", () => {
            emitAppEvent("terminal:open-window", { windowId: "customize" })
            tm.dismiss(toast)
        })

        tm.push(toast)
        tm.scheduleDismiss(toast, DURATION_BY_RARITY[def.rarity])
    }
}
