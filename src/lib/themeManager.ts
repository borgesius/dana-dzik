export type ThemeId =
    | "win95"
    | "mac-classic"
    | "apple2"
    | "c64"
    | "amiga"
    | "next"
    | "vaporwave"
    | "golden"
    | "nocturnal"
    | "void"
    | "arcana"

export type ColorScheme = "light" | "dark" | "system"

export type ResolvedColorScheme = "light" | "dark"

export interface ThemeLabels {
    startButton: string
    startMenuTitle: string
    closeButton: string
    minimizeButton: string
    maximizeButton: string
    searchPlaceholder: string
    searchUrl: string
    clockPrefix: string
    terminalPrompt: string
    windowTitleSuffix: string
    fileManager: string
    desktopIconLabels: Record<string, string>
}

type ThemeEvent = "themeChanged" | "colorSchemeChanged"

type ThemeEventCallback = (data: {
    theme: ThemeId
    colorScheme: ResolvedColorScheme
}) => void

const THEME_IDS: ThemeId[] = [
    "win95",
    "mac-classic",
    "apple2",
    "c64",
    "amiga",
    "next",
    "vaporwave",
    "golden",
    "nocturnal",
    "void",
    "arcana",
]

const STORAGE_KEY_THEME = "theme"
const STORAGE_KEY_COLOR_SCHEME = "colorScheme"

const VALID_SCHEMES = ["light", "dark", "system"]

const LABEL_MAPS: Record<ThemeId, ThemeLabels> = {
    win95: {
        startButton: "Start",
        startMenuTitle: "Programs",
        closeButton: "\u00D7",
        minimizeButton: "\u2014",
        maximizeButton: "\u25A1",
        searchPlaceholder: "Ask Jeeves",
        searchUrl: "http://localhost:3000/?q=",
        clockPrefix: "",
        terminalPrompt: "3:\\>",
        windowTitleSuffix: "",
        fileManager: "Explorer",
        desktopIconLabels: {
            "internet-explorer": "Internet Explorer",
            "about-me": "about_me.doc",
            projects: "cool_projects.zip",
            resume: "resume.pdf",
            links: "bookmarks.url",
            guestbook: "guestbook.exe",
            felixgpt: "FelixGPT.exe",
            stats: "Site Stats.exe",
            pinball: "Pinball.exe",
            terminal: "terminal.exe",
            welt: "WELT",
        },
    },
    "mac-classic": {
        startButton: "\uD83C\uDF4E",
        startMenuTitle: "Apple Menu",
        closeButton: "",
        minimizeButton: "",
        maximizeButton: "",
        searchPlaceholder: "Sherlock",
        searchUrl: "http://localhost:3000/?q=",
        clockPrefix: "",
        terminalPrompt: "% ",
        windowTitleSuffix: "",
        fileManager: "Finder",
        desktopIconLabels: {
            "internet-explorer": "Netscape Navigator",
            "about-me": "About Me",
            projects: "Projects",
            resume: "R\u00E9sum\u00E9",
            links: "Bookmarks",
            guestbook: "Guest Book",
            felixgpt: "FelixGPT",
            stats: "Site Statistics",
            pinball: "Crystal Quest",
            terminal: "Terminal",
            welt: "WELT",
        },
    },
    apple2: {
        startButton: "]",
        startMenuTitle: "CATALOG",
        closeButton: "ESC",
        minimizeButton: "-",
        maximizeButton: "+",
        searchPlaceholder: "SEARCH:",
        searchUrl: "http://localhost:3000/?q=",
        clockPrefix: "TIME: ",
        terminalPrompt: "] ",
        windowTitleSuffix: "",
        fileManager: "CATALOG",
        desktopIconLabels: {
            "internet-explorer": "MODEM.LINK",
            "about-me": "ABOUT.ME",
            projects: "PROJECTS",
            resume: "RESUME.TXT",
            links: "BOOKMARKS",
            guestbook: "GUESTBOOK",
            felixgpt: "FELIXGPT",
            stats: "SYS.STATS",
            pinball: "PINBALL",
            terminal: "MONITOR",
            welt: "WELT",
        },
    },
    c64: {
        startButton: "RUN",
        startMenuTitle: "LOAD",
        closeButton: "CLR",
        minimizeButton: "_",
        maximizeButton: "\u25A0",
        searchPlaceholder: "?",
        searchUrl: "http://localhost:3000/?q=",
        clockPrefix: "TI$=",
        terminalPrompt: "READY.\n",
        windowTitleSuffix: "",
        fileManager: "DIRECTORY",
        desktopIconLabels: {
            "internet-explorer": 'LOAD"BROWSER",8',
            "about-me": "ABOUT ME",
            projects: "PROJECTS.D64",
            resume: "RESUME.SEQ",
            links: "BOOKMARKS",
            guestbook: "GUESTBOOK",
            felixgpt: "FELIXGPT",
            stats: "STATS.PRG",
            pinball: "PINBALL.PRG",
            terminal: "BASIC V2",
            welt: "WELT",
        },
    },
    amiga: {
        startButton: "Workbench",
        startMenuTitle: "Tools",
        closeButton: "\u25A0",
        minimizeButton: "\u25BC",
        maximizeButton: "\u25B2",
        searchPlaceholder: "AmigaDOS",
        searchUrl: "http://localhost:3000/?q=",
        clockPrefix: "",
        terminalPrompt: "1> ",
        windowTitleSuffix: "",
        fileManager: "DiskMaster",
        desktopIconLabels: {
            "internet-explorer": "AWeb",
            "about-me": "About Me",
            projects: "Projects",
            resume: "Resume",
            links: "Bookmarks",
            guestbook: "Guest Book",
            felixgpt: "FelixGPT",
            stats: "SysInfo",
            pinball: "Pinball",
            terminal: "Shell",
            welt: "WELT",
        },
    },
    next: {
        startButton: "NeXT",
        startMenuTitle: "Services",
        closeButton: "\u00D7",
        minimizeButton: "m",
        maximizeButton: "M",
        searchPlaceholder: "Digital Librarian",
        searchUrl: "http://localhost:3000/?q=",
        clockPrefix: "",
        terminalPrompt: "localhost# ",
        windowTitleSuffix: ".app",
        fileManager: "File Viewer",
        desktopIconLabels: {
            "internet-explorer": "WorldWideWeb.app",
            "about-me": "AboutMe.app",
            projects: "Projects.app",
            resume: "Resume.rtfd",
            links: "Bookmarks.app",
            guestbook: "GuestBook.app",
            felixgpt: "FelixGPT.app",
            stats: "SystemStats.app",
            pinball: "Pinball.app",
            terminal: "Terminal.app",
            welt: "WELT",
        },
    },
    vaporwave: {
        startButton: "\u30B9\u30BF\u30FC\u30C8",
        startMenuTitle: "\u30D7\u30ED\u30B0\u30E9\u30E0",
        closeButton: "\u2716",
        minimizeButton: "\u2500",
        maximizeButton: "\u2610",
        searchPlaceholder: "\u691C\u7D22...",
        searchUrl: "http://localhost:3000/?q=",
        clockPrefix: "",
        terminalPrompt: "\u2234 ",
        windowTitleSuffix: "",
        fileManager: "\u30A8\u30AF\u30B9\u30D7\u30ED\u30FC\u30E9",
        desktopIconLabels: {
            "internet-explorer": "Netscape\u2122",
            "about-me": "\u30A2\u30D0\u30A6\u30C8",
            projects: "Projects",
            resume: "R\u00E9sum\u00E9",
            links: "Bookmarks",
            guestbook: "Guest Book",
            felixgpt: "FelixGPT",
            stats: "Stats",
            pinball: "Pinball",
            terminal: "Terminal",
            welt: "WELT",
        },
    },
    golden: {
        startButton: "Prestige",
        startMenuTitle: "Portfolio",
        closeButton: "\u00D7",
        minimizeButton: "\u2014",
        maximizeButton: "\u25A1",
        searchPlaceholder: "Search...",
        searchUrl: "http://localhost:3000/?q=",
        clockPrefix: "",
        terminalPrompt: "\u00A7 ",
        windowTitleSuffix: "",
        fileManager: "Vault",
        desktopIconLabels: {
            "internet-explorer": "The Exchange",
            "about-me": "Dossier",
            projects: "Holdings",
            resume: "Curriculum Vitae",
            links: "Connections",
            guestbook: "Registry",
            felixgpt: "FelixGPT",
            stats: "Analytics",
            pinball: "Pinball",
            terminal: "Terminal",
            welt: "WELT",
        },
    },
    nocturnal: {
        startButton: "Awaken",
        startMenuTitle: "Programs",
        closeButton: "\u00D7",
        minimizeButton: "\u2014",
        maximizeButton: "\u25A1",
        searchPlaceholder: "Search...",
        searchUrl: "http://localhost:3000/?q=",
        clockPrefix: "",
        terminalPrompt: "600> ",
        windowTitleSuffix: "",
        fileManager: "Records",
        desktopIconLabels: {
            "internet-explorer": "Browser",
            "about-me": "Compendium",
            projects: "Projects",
            resume: "Resume",
            links: "Bookmarks",
            guestbook: "Guest Book",
            felixgpt: "FelixGPT",
            stats: "Vitals",
            pinball: "Pinball",
            terminal: "Terminal",
            welt: "WELT",
        },
    },
    void: {
        startButton: "...",
        startMenuTitle: "???",
        closeButton: "\u00D7",
        minimizeButton: "\u2014",
        maximizeButton: "\u25A1",
        searchPlaceholder: "???",
        searchUrl: "http://localhost:3000/?q=",
        clockPrefix: "",
        terminalPrompt: "\u2591 ",
        windowTitleSuffix: "",
        fileManager: "???",
        desktopIconLabels: {
            "internet-explorer": "???",
            "about-me": "???",
            projects: "???",
            resume: "???",
            links: "???",
            guestbook: "???",
            felixgpt: "???",
            stats: "???",
            pinball: "???",
            terminal: "???",
            welt: "???",
        },
    },
    arcana: {
        startButton: "Invoke",
        startMenuTitle: "Rituals",
        closeButton: "\u2716",
        minimizeButton: "\u2014",
        maximizeButton: "\u25A1",
        searchPlaceholder: "Consult the Oracle...",
        searchUrl: "http://localhost:3000/?q=",
        clockPrefix: "\u2606 ",
        terminalPrompt: "\u2721 ",
        windowTitleSuffix: "",
        fileManager: "The Archive",
        desktopIconLabels: {
            "internet-explorer": "The Aether",
            "about-me": "The Fool",
            projects: "The Tower",
            resume: "The Scroll",
            links: "The Web",
            guestbook: "The Ledger",
            felixgpt: "The Oracle",
            stats: "The Stars",
            pinball: "The Wheel",
            terminal: "The Mirror",
            welt: "WELT",
        },
    },
}

class ThemeManager {
    private currentTheme: ThemeId
    private currentColorScheme: ColorScheme
    private listeners: Map<ThemeEvent, Set<ThemeEventCallback>> = new Map()
    private mediaQuery: MediaQueryList

    constructor() {
        this.currentTheme = this.loadTheme()
        this.currentColorScheme = this.loadColorScheme()
        this.mediaQuery = window.matchMedia("(prefers-color-scheme: dark)")

        this.mediaQuery.addEventListener("change", () => {
            if (this.currentColorScheme === "system") {
                this.applyColorScheme()
                this.emit("colorSchemeChanged")
            }
        })

        this.applyTheme()
        this.applyColorScheme()
    }

    public getThemeIds(): readonly ThemeId[] {
        return THEME_IDS
    }

    public getCurrentTheme(): ThemeId {
        return this.currentTheme
    }

    public getColorScheme(): ColorScheme {
        return this.currentColorScheme
    }

    public getResolvedColorScheme(): ResolvedColorScheme {
        if (this.currentColorScheme === "system") {
            return this.mediaQuery.matches ? "dark" : "light"
        }
        return this.currentColorScheme
    }

    public getLabels(themeId?: ThemeId): ThemeLabels {
        return LABEL_MAPS[themeId ?? this.currentTheme]
    }

    public setTheme(id: ThemeId): void {
        if (this.currentTheme === id) return
        this.currentTheme = id
        this.saveTheme(id)
        this.applyTheme()
        this.emit("themeChanged")
    }

    public setColorScheme(scheme: ColorScheme): void {
        if (this.currentColorScheme === scheme) return
        this.currentColorScheme = scheme
        this.saveColorScheme(scheme)
        this.applyColorScheme()
        this.emit("colorSchemeChanged")
    }

    public setThemeTemporary(id: ThemeId): void {
        document.documentElement.setAttribute("data-theme", id)
    }

    public restoreTheme(): void {
        document.documentElement.setAttribute("data-theme", this.currentTheme)
    }

    public getRandomOtherTheme(): ThemeId {
        const others = THEME_IDS.filter((t) => t !== this.currentTheme)
        return others[Math.floor(Math.random() * others.length)]
    }

    public on(event: ThemeEvent, callback: ThemeEventCallback): void {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, new Set())
        }
        this.listeners.get(event)?.add(callback)
    }

    public off(event: ThemeEvent, callback: ThemeEventCallback): void {
        this.listeners.get(event)?.delete(callback)
    }

    private emit(event: ThemeEvent): void {
        const data = {
            theme: this.currentTheme,
            colorScheme: this.getResolvedColorScheme(),
        }
        this.listeners.get(event)?.forEach((cb) => cb(data))
    }

    private applyTheme(): void {
        document.documentElement.setAttribute("data-theme", this.currentTheme)
    }

    private applyColorScheme(): void {
        const resolved = this.getResolvedColorScheme()
        document.documentElement.setAttribute("data-color-scheme", resolved)
    }

    private loadTheme(): ThemeId {
        try {
            const stored = localStorage.getItem(STORAGE_KEY_THEME)
            if (stored && THEME_IDS.includes(stored as ThemeId)) {
                return stored as ThemeId
            }
        } catch {
            /* localStorage unavailable */
        }
        return "win95"
    }

    private loadColorScheme(): ColorScheme {
        try {
            const stored = localStorage.getItem(STORAGE_KEY_COLOR_SCHEME)
            if (stored && VALID_SCHEMES.includes(stored)) {
                return stored as ColorScheme
            }
        } catch {
            /* localStorage unavailable */
        }
        return "system"
    }

    private saveTheme(id: ThemeId): void {
        try {
            localStorage.setItem(STORAGE_KEY_THEME, id)
        } catch {
            /* localStorage unavailable */
        }
    }

    private saveColorScheme(scheme: ColorScheme): void {
        try {
            localStorage.setItem(STORAGE_KEY_COLOR_SCHEME, scheme)
        } catch {
            /* localStorage unavailable */
        }
    }
}

let instance: ThemeManager | null = null

export function getThemeManager(): ThemeManager {
    if (!instance) {
        instance = new ThemeManager()
    }
    return instance
}
