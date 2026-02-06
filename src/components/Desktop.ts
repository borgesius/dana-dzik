import { DesktopIcon, type IconConfig } from "./DesktopIcon"
import { Taskbar } from "./Taskbar"
import { Toolbars } from "./Toolbars"
import { WindowManager } from "./WindowManager"

function pick<T>(arr: T[]): T {
    return arr[Math.floor(Math.random() * arr.length)]
}

const ICON_LABEL_VARIANTS: Record<string, string[]> = {
    "internet-explorer": ["Internet Explorer"],
    "about-me": ["about_me.doc"],
    projects: ["cool_projects.zip"],
    resume: ["resume.pdf"],
    links: ["bookmarks.url"],
    guestbook: ["guestbook.exe"],
    felixgpt: ["FelixGPT.exe"],
    stats: ["Site Stats.exe"],
    terminal: ["terminal.exe"],
    welt: ["WELT"],
}

function getDesktopIcons(): IconConfig[] {
    return [
        {
            id: "internet-explorer",
            label: pick(ICON_LABEL_VARIANTS["internet-explorer"]),
            icon: "🌐",
            action: "window",
            windowId: "welcome",
        },
        {
            id: "about-me",
            label: pick(ICON_LABEL_VARIANTS["about-me"]),
            icon: "📄",
            action: "window",
            windowId: "about",
        },
        {
            id: "projects",
            label: pick(ICON_LABEL_VARIANTS["projects"]),
            icon: "📦",
            action: "window",
            windowId: "projects",
        },
        {
            id: "resume",
            label: pick(ICON_LABEL_VARIANTS["resume"]),
            icon: "📕",
            action: "window",
            windowId: "resume",
        },
        {
            id: "links",
            label: pick(ICON_LABEL_VARIANTS["links"]),
            icon: "🔗",
            action: "window",
            windowId: "links",
        },
        {
            id: "guestbook",
            label: pick(ICON_LABEL_VARIANTS["guestbook"]),
            icon: "📖",
            action: "window",
            windowId: "guestbook",
        },
        {
            id: "felixgpt",
            label: pick(ICON_LABEL_VARIANTS["felixgpt"]),
            icon: "🐱",
            action: "window",
            windowId: "felixgpt",
        },
        {
            id: "stats",
            label: pick(ICON_LABEL_VARIANTS["stats"]),
            icon: "📊",
            action: "window",
            windowId: "stats",
        },
        {
            id: "terminal",
            label: pick(ICON_LABEL_VARIANTS["terminal"]),
            icon: "💻",
            action: "window",
            windowId: "terminal",
        },
        {
            id: "welt",
            label: pick(ICON_LABEL_VARIANTS["welt"]),
            icon: "📁",
            action: "window",
            windowId: "explorer",
        },
    ]
}

export class Desktop {
    private container: HTMLElement
    private desktopArea: HTMLElement
    private toolbars: Toolbars
    private taskbar: Taskbar
    private windowManager: WindowManager
    private icons: DesktopIcon[] = []
    private floatingGifsContainer: HTMLElement

    constructor(container: HTMLElement) {
        this.container = container
        this.container.className = "desktop scanlines noise"

        this.toolbars = new Toolbars()
        this.container.appendChild(this.toolbars.getElement())

        this.desktopArea = document.createElement("div")
        this.desktopArea.className = "desktop-area corrupt"
        this.container.appendChild(this.desktopArea)

        this.floatingGifsContainer = document.createElement("div")
        this.floatingGifsContainer.className = "floating-gifs"
        this.desktopArea.appendChild(this.floatingGifsContainer)

        this.windowManager = new WindowManager(this.desktopArea)

        const iconsContainer = document.createElement("div")
        iconsContainer.className = "desktop-icons"
        this.desktopArea.appendChild(iconsContainer)

        getDesktopIcons().forEach((config) => {
            const icon = new DesktopIcon(config, (windowId) => {
                this.windowManager.openWindow(windowId)
            })
            this.icons.push(icon)
            iconsContainer.appendChild(icon.getElement())
        })

        this.taskbar = new Taskbar(this.windowManager)
        this.container.appendChild(this.taskbar.getElement())

        this.windowManager.openWindow("welcome")
    }

    public addFloatingGif(src: string, x: number, y: number): void {
        const img = document.createElement("img")
        img.src = src
        img.alt = ""
        img.className = "floating-gif gif-bounce"
        img.style.left = `${x}px`
        img.style.top = `${y}px`
        this.floatingGifsContainer.appendChild(img)
    }

    public getWindowManager(): WindowManager {
        return this.windowManager
    }
}
