import { DesktopIcon, type IconConfig } from "./DesktopIcon"
import { Taskbar } from "./Taskbar"
import { Toolbars } from "./Toolbars"
import { WindowManager } from "./WindowManager"

const DESKTOP_ICONS: IconConfig[] = [
    {
        id: "internet-explorer",
        label: "Internet Explorer",
        icon: "🌐",
        action: "window",
        windowId: "welcome",
    },
    {
        id: "about-me",
        label: "about_me.doc",
        icon: "📄",
        action: "window",
        windowId: "about",
    },
    {
        id: "projects",
        label: "cool_projects.zip",
        icon: "📦",
        action: "window",
        windowId: "projects",
    },
    {
        id: "resume",
        label: "resume.pdf",
        icon: "📕",
        action: "window",
        windowId: "resume",
    },
    {
        id: "links",
        label: "bookmarks.url",
        icon: "🔗",
        action: "window",
        windowId: "links",
    },
    {
        id: "guestbook",
        label: "guestbook.exe",
        icon: "📖",
        action: "window",
        windowId: "guestbook",
    },
    {
        id: "felixgpt",
        label: "FelixGPT.exe",
        icon: "🐱",
        action: "window",
        windowId: "felixgpt",
    },
    {
        id: "stats",
        label: "Site Stats.exe",
        icon: "📊",
        action: "window",
        windowId: "stats",
    },
]

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

        DESKTOP_ICONS.forEach((config) => {
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
