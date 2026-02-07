import {
    type CosmeticType,
    getCosmeticManager,
} from "../cosmetics/CosmeticManager"
import {
    type CosmeticDefinition,
    getCosmeticsForType,
} from "../cosmetics/definitions"

export function getCustomizeContent(): string {
    return `<div id="customize-root" class="customize-root"></div>`
}

export function renderCustomizeWindow(): void {
    const root = document.getElementById("customize-root")
    if (!root) return

    const cm = getCosmeticManager()

    function render(): void {
        if (!root) return
        let html = `<div class="customize-container">`

        const sections: Array<{ type: CosmeticType; label: string }> = [
            { type: "cursor-trail", label: "Cursor Trail" },
            { type: "wallpaper", label: "Desktop Wallpaper" },
            { type: "window-chrome", label: "Window Chrome" },
        ]

        for (const section of sections) {
            const active = cm.getActive(section.type)
            const defs = getCosmeticsForType(section.type)

            html += `<div class="customize-section">
                <h3>${section.label}</h3>
                <div class="customize-grid">`

            for (const def of defs) {
                const unlocked = cm.isUnlocked(section.type, def.id)
                const isActive = active === def.id

                html += renderCosmeticCard(def, unlocked, isActive)
            }

            html += `</div></div>`
        }

        html += `</div>`
        root.innerHTML = html

        root.querySelectorAll(".cosmetic-card:not(.locked)").forEach((card) => {
            card.addEventListener("click", () => {
                const type = card.getAttribute("data-type") as CosmeticType
                const id = card.getAttribute("data-id")
                if (type && id) {
                    cm.setActive(type, id)
                    render()
                }
            })
        })
    }

    render()

    // Re-render on unlock
    cm.onChange(() => render())
}

function renderCosmeticCard(
    def: CosmeticDefinition,
    unlocked: boolean,
    isActive: boolean
): string {
    if (!unlocked) {
        return `
            <div class="cosmetic-card locked" data-type="${def.type}" data-id="${def.id}">
                <div class="cosmetic-icon">🔒</div>
                <div class="cosmetic-name">???</div>
                <div class="cosmetic-hint">${def.unlockHint}</div>
            </div>`
    }

    return `
        <div class="cosmetic-card ${isActive ? "active" : ""}" data-type="${def.type}" data-id="${def.id}">
            <div class="cosmetic-icon">${def.icon}</div>
            <div class="cosmetic-name">${def.name}</div>
            <div class="cosmetic-desc">${def.description}</div>
            ${isActive ? '<div class="cosmetic-active-badge">Active</div>' : ""}
        </div>`
}
