import {
    type CosmeticType,
    getCosmeticManager,
} from "../cosmetics/CosmeticManager"
import {
    type CosmeticDefinition,
    getCosmeticsForType,
} from "../cosmetics/definitions"
import { getLocaleManager, type LocaleId } from "../localeManager"
import {
    type ColorScheme,
    getThemeManager,
    type ThemeId,
} from "../themeManager"

export function getCustomizeContent(): string {
    return `<div id="customize-root" class="customize-root"></div>`
}

interface TabDef {
    id: string
    label: string
    icon: string
}

const TABS: TabDef[] = [
    { id: "theme", label: "Themes", icon: "🎨" },
    { id: "color-scheme", label: "Color Scheme", icon: "🌗" },
    { id: "cursor-trail", label: "Cursor Trail", icon: "✨" },
    { id: "wallpaper", label: "Wallpaper", icon: "🖼️" },
    { id: "window-chrome", label: "Window Chrome", icon: "🪟" },
    { id: "system-font", label: "System Font", icon: "🔤" },
    { id: "taskbar-style", label: "Taskbar", icon: "▬" },
    { id: "window-animation", label: "Animation", icon: "▶️" },
    { id: "startup-sound", label: "Startup Sound", icon: "🔔" },
    { id: "language", label: "Language", icon: "🌐" },
]

const COSMETIC_TABS: CosmeticType[] = [
    "theme",
    "cursor-trail",
    "wallpaper",
    "window-chrome",
    "system-font",
    "taskbar-style",
    "window-animation",
    "startup-sound",
]

export function renderCustomizeWindow(): void {
    const root = document.getElementById("customize-root")
    if (!root) return

    const cm = getCosmeticManager()
    const tm = getThemeManager()
    const lm = getLocaleManager()
    let activeTab = "theme"

    function render(): void {
        if (!root) return

        let html = `<div class="customize-container">`

        html += `<div class="customize-tabs">`
        for (const tab of TABS) {
            const isActive = tab.id === activeTab
            html += `<button class="customize-tab ${isActive ? "active" : ""}" data-tab="${tab.id}">${tab.icon} ${tab.label}</button>`
        }
        html += `</div>`

        html += `<div class="customize-panel">`
        html += renderTabContent(activeTab)
        html += `</div></div>`

        root.innerHTML = html
        attachListeners()
    }

    function renderTabContent(tabId: string): string {
        if (tabId === "color-scheme") {
            return renderColorSchemeSection()
        }
        if (tabId === "language") {
            return renderLanguageSection()
        }
        if (COSMETIC_TABS.includes(tabId as CosmeticType)) {
            return renderCosmeticSection(tabId as CosmeticType)
        }
        return ""
    }

    function renderCosmeticSection(type: CosmeticType): string {
        const active = cm.getActive(type)
        const defs = getCosmeticsForType(type)
        const unlocked = defs.filter((d) => cm.isUnlocked(type, d.id))
        const locked = defs.filter((d) => !cm.isUnlocked(type, d.id))

        let html = `<div class="customize-section-header">${unlocked.length}/${defs.length} unlocked</div>`
        html += `<div class="customize-grid">`

        for (const def of unlocked) {
            const isActive = active === def.id
            html += renderCosmeticCard(def, true, isActive)
        }

        for (const def of locked) {
            html += renderCosmeticCard(def, false, false)
        }

        html += `</div>`
        return html
    }

    function renderColorSchemeSection(): string {
        const current = tm.getColorScheme()
        const schemes: Array<{ id: ColorScheme; label: string; icon: string }> =
            [
                { id: "light", label: "Light", icon: "☀️" },
                { id: "dark", label: "Dark", icon: "🌙" },
                { id: "system", label: "System", icon: "💻" },
            ]

        let html = `<div class="customize-grid">`
        for (const s of schemes) {
            const isActive = current === s.id
            html += `
                <div class="cosmetic-card ${isActive ? "active" : ""}" data-scheme="${s.id}">
                    <div class="cosmetic-icon">${s.icon}</div>
                    <div class="cosmetic-name">${s.label}</div>
                    ${isActive ? '<div class="cosmetic-active-badge">Active</div>' : ""}
                </div>`
        }
        html += `</div>`
        return html
    }

    function renderLanguageSection(): string {
        const currentLocale = lm.getCurrentLocale()
        const localeIds = lm.getLocaleIds()

        let html = `<div class="customize-grid">`
        for (const localeId of localeIds) {
            const flag = lm.getLocaleFlag(localeId)
            const name = lm.getLocaleName(localeId)
            const isActive = currentLocale === localeId
            html += `
                <div class="cosmetic-card ${isActive ? "active" : ""}" data-locale="${localeId}">
                    <div class="cosmetic-icon">${flag}</div>
                    <div class="cosmetic-name">${name}</div>
                    ${isActive ? '<div class="cosmetic-active-badge">Active</div>' : ""}
                </div>`
        }
        html += `</div>`
        return html
    }

    function attachListeners(): void {
        if (!root) return

        root.querySelectorAll(".customize-tab").forEach((btn) => {
            btn.addEventListener("click", () => {
                activeTab = btn.getAttribute("data-tab") ?? "theme"
                render()
            })
        })

        root.querySelectorAll(".cosmetic-card:not(.locked)").forEach((card) => {
            card.addEventListener("click", () => {
                const type = card.getAttribute("data-type") as CosmeticType
                const id = card.getAttribute("data-id")
                const scheme = card.getAttribute("data-scheme")
                const locale = card.getAttribute("data-locale")

                if (type && id) {
                    if (type === "theme") {
                        cm.setActive(type, id)
                        tm.setTheme(id as ThemeId)
                    } else {
                        cm.setActive(type, id)
                    }
                    render()
                } else if (scheme) {
                    tm.setColorScheme(scheme as ColorScheme)
                    render()
                } else if (locale) {
                    void lm.setLocale(locale as LocaleId)
                    render()
                }
            })
        })
    }

    render()

    cm.onChange(() => render())
    tm.on("themeChanged", () => render())
    tm.on("colorSchemeChanged", () => render())
    lm.on("localeChanged", () => render())
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
                <div class="cosmetic-rarity-badge cosmetic-rarity-${def.rarity}">${def.rarity}</div>
            </div>`
    }

    return `
        <div class="cosmetic-card ${isActive ? "active" : ""}" data-type="${def.type}" data-id="${def.id}">
            <div class="cosmetic-icon">${def.icon}</div>
            <div class="cosmetic-name">${def.name}</div>
            <div class="cosmetic-desc">${def.description}</div>
            <div class="cosmetic-rarity-badge cosmetic-rarity-${def.rarity}">${def.rarity}</div>
            ${isActive ? '<div class="cosmetic-active-badge">Active</div>' : ""}
        </div>`
}
