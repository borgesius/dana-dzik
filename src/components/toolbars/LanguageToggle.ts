import { getLocaleManager, type LocaleId } from "../../lib/localeManager"

const LOCALE_ORDER: LocaleId[] = [
    "en",
    "es",
    "fr",
    "de",
    "it",
    "pt",
    "ja",
    "zh",
]

export function createLanguageToggle(): HTMLElement {
    const lm = getLocaleManager()
    const container = document.createElement("div")
    container.className = "language-toggle-container"
    container.style.position = "relative"

    const btn = document.createElement("button")
    btn.className = "toolbar-button language-toggle"
    btn.title = `${lm.t("toolbar.language", { language: lm.getLocaleName() })}`

    const updateBtn = (): void => {
        const locale = lm.getCurrentLocale()
        btn.textContent = lm.getLocaleFlag(locale)
        btn.title = `${lm.t("toolbar.language", { language: lm.getLocaleName() })}`
    }

    updateBtn()

    const dropdown = document.createElement("div")
    dropdown.className = "language-dropdown"
    dropdown.style.display = "none"

    LOCALE_ORDER.forEach((locale) => {
        const option = document.createElement("button")
        option.className = "language-option"
        option.textContent = `${lm.getLocaleFlag(locale)} ${lm.getLocaleName(locale)}`
        option.dataset.locale = locale

        if (locale === lm.getCurrentLocale()) {
            option.classList.add("active")
        }

        option.addEventListener("click", (e) => {
            e.stopPropagation()
            void lm.setLocale(locale)
            updateBtn()
            dropdown.style.display = "none"

            dropdown.querySelectorAll(".language-option").forEach((opt) => {
                opt.classList.remove("active")
            })
            option.classList.add("active")
        })

        dropdown.appendChild(option)
    })

    btn.addEventListener("click", (e) => {
        e.stopPropagation()
        const isVisible = dropdown.style.display === "block"
        dropdown.style.display = isVisible ? "none" : "block"
    })

    document.addEventListener("click", () => {
        dropdown.style.display = "none"
    })

    lm.on("localeChanged", () => {
        updateBtn()
        dropdown.querySelectorAll(".language-option").forEach((opt) => {
            const optLocale = opt.getAttribute("data-locale") as LocaleId
            if (optLocale === lm.getCurrentLocale()) {
                opt.classList.add("active")
            } else {
                opt.classList.remove("active")
            }
        })
    })

    container.appendChild(btn)
    container.appendChild(dropdown)

    return container
}
