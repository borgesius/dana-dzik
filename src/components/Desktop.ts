import { DESKTOP_ITEMS } from "../config"
import { DesktopIcon, type IconConfig } from "./DesktopIcon"
import { Taskbar } from "./Taskbar"
import { Toolbars } from "./Toolbars"
import { WindowManager } from "./WindowManager"

function getDesktopIcons(): IconConfig[] {
    return DESKTOP_ITEMS.map((item) => ({
        id: item.id,
        label: item.label ?? item.filename,
        icon: item.icon,
        action: "window" as const,
        windowId: item.windowId,
    }))
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
