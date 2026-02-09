import { getThemeManager, type ThemeId } from "../../lib/themeManager"

const THEME_ICONS: Record<ThemeId, string> = {
    win95: "🪟",
    "mac-classic": "🍎",
    apple2: "🖥️",
    c64: "📺",
    amiga: "🖼️",
    next: "⬛",
    vaporwave: "🌸",
    golden: "👑",
    nocturnal: "🌑",
    void: "🕳️",
    arcana: "🔮",
}

const THEME_NAMES: Record<ThemeId, string> = {
    win95: "Windows 95",
    "mac-classic": "Mac Classic",
    apple2: "Apple II",
    c64: "Commodore 64",
    amiga: "Amiga Workbench",
    next: "NeXTSTEP",
    vaporwave: "Vaporwave",
    golden: "Prestige Gold",
    nocturnal: "Nocturnal",
    void: "The Void",
    arcana: "Arcana",
}

export function createThemeToggle(): HTMLElement {
    const tm = getThemeManager()
    const container = document.createElement("div")
    container.className = "theme-toggle-container"

    const btn = document.createElement("button")
    btn.className = "toolbar-button theme-toggle"

    const dropdown = document.createElement("div")
    dropdown.className = "theme-dropdown"
    dropdown.style.display = "none"

    const updateBtn = (): void => {
        const current = tm.getCurrentTheme()
        btn.textContent = THEME_ICONS[current]
        btn.title = THEME_NAMES[current]
    }

    const updateActiveOption = (): void => {
        const current = tm.getCurrentTheme()
        dropdown.querySelectorAll(".theme-option").forEach((opt) => {
            const id = opt.getAttribute("data-theme") as ThemeId
            opt.classList.toggle("active", id === current)
        })
    }

    updateBtn()

    for (const themeId of tm.getThemeIds()) {
        const option = document.createElement("button")
        option.className = "theme-option"
        option.dataset.theme = themeId

        if (themeId === tm.getCurrentTheme()) {
            option.classList.add("active")
        }

        option.textContent = THEME_ICONS[themeId]
        option.title = THEME_NAMES[themeId]

        option.addEventListener("click", (e) => {
            e.stopPropagation()
            tm.setTheme(themeId)
            dropdown.style.display = "none"
        })

        dropdown.appendChild(option)
    }

    btn.addEventListener("click", (e) => {
        e.stopPropagation()
        const isVisible = dropdown.style.display === "block"
        dropdown.style.display = isVisible ? "none" : "block"
    })

    document.addEventListener("click", () => {
        dropdown.style.display = "none"
    })

    tm.on("themeChanged", () => {
        updateBtn()
        updateActiveOption()
    })

    container.appendChild(btn)
    container.appendChild(dropdown)

    return container
}
