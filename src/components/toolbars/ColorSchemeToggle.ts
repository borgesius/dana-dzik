import { getLocaleManager } from "../../lib/localeManager"
import {
    type ColorScheme,
    getThemeManager,
    type ResolvedColorScheme,
} from "../../lib/themeManager"

const SCHEME_ICONS: Record<ColorScheme, string> = {
    light: "\u2600\uFE0F",
    dark: "\uD83C\uDF19",
    system: "\uD83D\uDCBB",
}

const SCHEME_ORDER: ColorScheme[] = ["light", "dark", "system"]

export function createColorSchemeToggle(): HTMLElement {
    const tm = getThemeManager()
    const lm = getLocaleManager()
    const btn = document.createElement("button")
    btn.className = "toolbar-button color-scheme-toggle"
    btn.title = lm.t("toolbar.colorScheme", { scheme: tm.getColorScheme() })

    const updateBtn = (): void => {
        const scheme = tm.getColorScheme()
        btn.textContent = SCHEME_ICONS[scheme]
        btn.title = lm.t("toolbar.colorScheme", { scheme })
    }

    updateBtn()

    btn.addEventListener("click", () => {
        const current = tm.getColorScheme()
        const idx = SCHEME_ORDER.indexOf(current)
        const next = SCHEME_ORDER[(idx + 1) % SCHEME_ORDER.length]
        tm.setColorScheme(next)
        updateBtn()
    })

    tm.on(
        "colorSchemeChanged",
        (_data: { theme: string; colorScheme: ResolvedColorScheme }) => {
            updateBtn()
        }
    )

    lm.on("localeChanged", () => {
        updateBtn()
    })

    return btn
}
