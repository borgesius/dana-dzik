import i18next from "i18next"

export type LocaleId = "en" | "de" | "it" | "es" | "fr" | "pt" | "ja" | "zh"

type LocaleEvent = "localeChanged"

type LocaleEventCallback = (data: { locale: LocaleId }) => void

const LOCALE_IDS: LocaleId[] = ["en", "de", "it", "es", "fr", "pt", "ja", "zh"]

const STORAGE_KEY_LOCALE = "locale"

const LOCALE_NAMES: Record<LocaleId, string> = {
    en: "English",
    de: "Deutsch",
    it: "Italiano",
    es: "Español",
    fr: "Français",
    pt: "Português",
    ja: "日本語",
    zh: "中文",
}

const LOCALE_FLAGS: Record<LocaleId, string> = {
    en: "🇺🇸",
    de: "🇩🇪",
    it: "🇮🇹",
    es: "🇪🇸",
    fr: "🇫🇷",
    pt: "🇵🇹",
    ja: "🇯🇵",
    zh: "🇨🇳",
}

class LocaleManager {
    private currentLocale: LocaleId
    private listeners: Map<LocaleEvent, Set<LocaleEventCallback>> = new Map()
    private initialized = false

    constructor() {
        this.currentLocale = this.loadLocale()
    }

    public async init(): Promise<void> {
        if (this.initialized) return

        const enTranslations = await import("../locales/en.json")
        const deTranslations = await import("../locales/de.json")
        const itTranslations = await import("../locales/it.json")
        const esTranslations = await import("../locales/es.json")
        const frTranslations = await import("../locales/fr.json")
        const ptTranslations = await import("../locales/pt.json")
        const jaTranslations = await import("../locales/ja.json")
        const zhTranslations = await import("../locales/zh.json")

        await i18next.init({
            lng: this.currentLocale,
            fallbackLng: "en",
            resources: {
                en: { translation: enTranslations.default },
                de: { translation: deTranslations.default },
                it: { translation: itTranslations.default },
                es: { translation: esTranslations.default },
                fr: { translation: frTranslations.default },
                pt: { translation: ptTranslations.default },
                ja: { translation: jaTranslations.default },
                zh: { translation: zhTranslations.default },
            },
            interpolation: {
                escapeValue: false,
            },
        })

        this.initialized = true
        this.applyLocale()
    }

    public isInitialized(): boolean {
        return this.initialized
    }

    public getLocaleIds(): readonly LocaleId[] {
        return LOCALE_IDS
    }

    public getCurrentLocale(): LocaleId {
        return this.currentLocale
    }

    public getLocaleName(localeId?: LocaleId): string {
        return LOCALE_NAMES[localeId ?? this.currentLocale]
    }

    public getLocaleFlag(localeId?: LocaleId): string {
        return LOCALE_FLAGS[localeId ?? this.currentLocale]
    }

    public async setLocale(id: LocaleId): Promise<void> {
        if (this.currentLocale === id) return
        this.currentLocale = id
        this.saveLocale(id)
        await i18next.changeLanguage(id)
        this.applyLocale()
        this.emit("localeChanged")
    }

    public t(key: string, options?: Record<string, unknown>): string {
        if (!this.initialized) {
            return (options?.defaultValue as string) ?? key
        }
        return i18next.t(key, options)
    }

    public on(event: LocaleEvent, callback: LocaleEventCallback): void {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, new Set())
        }
        this.listeners.get(event)?.add(callback)
    }

    public off(event: LocaleEvent, callback: LocaleEventCallback): void {
        this.listeners.get(event)?.delete(callback)
    }

    private emit(event: LocaleEvent): void {
        const data = {
            locale: this.currentLocale,
        }
        this.listeners.get(event)?.forEach((cb) => cb(data))
    }

    private applyLocale(): void {
        document.documentElement.setAttribute("lang", this.currentLocale)
    }

    private loadLocale(): LocaleId {
        try {
            const stored = localStorage.getItem(STORAGE_KEY_LOCALE)
            if (stored && LOCALE_IDS.includes(stored as LocaleId)) {
                return stored as LocaleId
            }
        } catch {
            /* localStorage unavailable */
        }
        return "en"
    }

    private saveLocale(id: LocaleId): void {
        try {
            localStorage.setItem(STORAGE_KEY_LOCALE, id)
        } catch {
            /* localStorage unavailable */
        }
    }
}

let instance: LocaleManager | null = null

export function getLocaleManager(): LocaleManager {
    if (!instance) {
        instance = new LocaleManager()
    }
    return instance
}
