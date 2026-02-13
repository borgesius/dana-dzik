import { DESKTOP_ITEMS } from "../config/desktop"
import { requestResumeCareerTab } from "../lib/windowContent"
import { DesktopIcon, type IconConfig } from "./DesktopIcon"
import { Taskbar } from "./Taskbar"
import { Toolbars } from "./Toolbars"
import { WindowManager } from "./WindowManager"

function getDesktopIcons(): IconConfig[] {
    return DESKTOP_ITEMS.map((item) => {
        if (item.id === "bug-reports") {
            return {
                id: item.id,
                label: item.label ?? item.filename,
                icon: item.icon,
                action: "link" as const,
                url: "https://github.com/borgesius/dana-dzik/issues/new?title=%5BBug+Report%5D%20",
            }
        }
        return {
            id: item.id,
            label: item.label ?? item.filename,
            icon: item.icon,
            action: "window" as const,
            windowId: item.windowId,
        }
    })
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
        this.desktopArea.tabIndex = -1 // Programmatically focusable for a11y
        this.container.appendChild(this.desktopArea)

        this.desktopArea.appendChild(this.toolbars.getBusinessPanelElement())

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
                if (config.id === "career-development") {
                    requestResumeCareerTab()
                }
            })
            this.icons.push(icon)
            iconsContainer.appendChild(icon.getElement())
        })

        this.taskbar = new Taskbar(this.windowManager)
        this.container.appendChild(this.taskbar.getElement())

        this.windowManager.openWindow("welcome")

        // #region agent log
        document.addEventListener("keydown", (e) => {
            if (e.key === "Tab") {
                const da = this.desktopArea
                const beforeScroll = da.scrollTop
                setTimeout(() => {
                    const afterScroll = da.scrollTop
                    if (beforeScroll !== 0 || afterScroll !== 0) {
                        fetch(
                            "http://127.0.0.1:7242/ingest/1808834d-4e9a-4d3c-bf59-39ee92e397f1",
                            {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({
                                    location: "Desktop.ts:tabKey",
                                    message: "Tab key pressed",
                                    data: {
                                        beforeScroll,
                                        afterScroll,
                                        activeEl:
                                            document.activeElement?.tagName +
                                            "." +
                                            document.activeElement?.className,
                                        clientHeight: da.clientHeight,
                                        scrollHeight: da.scrollHeight,
                                    },
                                    timestamp: Date.now(),
                                    hypothesisId: "H1",
                                }),
                            }
                        ).catch(() => {})
                    }
                }, 50)
            }
        })
        this.desktopArea.addEventListener("scroll", () => {
            fetch(
                "http://127.0.0.1:7242/ingest/1808834d-4e9a-4d3c-bf59-39ee92e397f1",
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        location: "Desktop.ts:scrollEvent",
                        message: "desktop-area scrolled!",
                        data: {
                            scrollTop: this.desktopArea.scrollTop,
                            scrollLeft: this.desktopArea.scrollLeft,
                        },
                        timestamp: Date.now(),
                        hypothesisId: "H1-H4",
                    }),
                }
            ).catch(() => {})
        })
        // #endregion
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
