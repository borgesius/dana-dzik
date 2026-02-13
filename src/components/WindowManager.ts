import { log } from "@/core/Logger"

import { DESKTOP_ITEMS } from "../config/desktop"
import type { RoutableWindow } from "../config/routing"
import { Window, type WindowConfig } from "./Window"

/** Information about an open window for the taskbar */
export interface OpenWindowInfo {
    id: RoutableWindow
    title: string
    icon: string
    isActive: boolean
}

const DESKTOP_ICON_BY_WINDOW_ID = new Map(
    DESKTOP_ITEMS.map((item) => [item.windowId, item.icon])
)

function icon(windowId: RoutableWindow): string {
    return DESKTOP_ICON_BY_WINDOW_ID.get(windowId) ?? "📄"
}

const WINDOW_CONFIGS: Record<RoutableWindow, WindowConfig> = {
    welcome: {
        id: "welcome",
        title: "Welcome to Dana's Desktop",
        icon: icon("welcome"),
        width: 600,
        height: 450,
        style: "winxp",
        contentType: "welcome",
    },
    about: {
        id: "about",
        title: "about_me.doc",
        icon: icon("about"),
        width: 550,
        height: 500,
        style: "win95",
        contentType: "about",
    },
    projects: {
        id: "projects",
        title: "cool_projects.zip",
        icon: icon("projects"),
        width: 500,
        height: 400,
        style: "win95",
        contentType: "projects",
    },
    resume: {
        id: "resume",
        title: "resume.pdf",
        icon: icon("resume"),
        width: 550,
        height: 500,
        style: "winxp",
        contentType: "resume",
    },
    links: {
        id: "links",
        title: "Bookmarks",
        icon: icon("links"),
        width: 450,
        height: 400,
        style: "win95",
        contentType: "links",
    },
    guestbook: {
        id: "guestbook",
        title: "guestbook.exe",
        icon: icon("guestbook"),
        width: 500,
        height: 450,
        style: "win95",
        contentType: "guestbook",
    },
    felixgpt: {
        id: "felixgpt",
        title: "FelixGPT",
        icon: icon("felixgpt"),
        width: 400,
        height: 450,
        style: "winxp",
        contentType: "felixgpt",
    },
    stats: {
        id: "stats",
        title: "Site Statistics",
        icon: icon("stats"),
        width: 450,
        height: 500,
        style: "winxp",
        contentType: "stats",
    },
    pinball: {
        id: "pinball",
        title: "Pinball.exe",
        icon: "🎮",
        width: 400,
        height: 580,
        style: "win95",
        contentType: "pinball",
    },
    terminal: {
        id: "terminal",
        title: "3:\\HACKTERM.EXE",
        icon: icon("terminal"),
        width: 600,
        height: 400,
        style: "win95",
        contentType: "terminal",
    },
    explorer: {
        id: "explorer",
        title: "File Explorer",
        icon: icon("explorer"),
        width: 500,
        height: 400,
        style: "win95",
        contentType: "explorer",
    },
    achievements: {
        id: "achievements",
        title: "Achievements",
        icon: icon("achievements"),
        width: 550,
        height: 500,
        style: "winxp",
        contentType: "achievements",
    },
    autobattler: {
        id: "autobattler",
        title: "SYMPOSIUM.exe",
        icon: icon("autobattler"),
        width: 600,
        height: 550,
        style: "win95",
        contentType: "autobattler",
    },
    customize: {
        id: "customize",
        title: "Customization",
        icon: "🎨",
        width: 620,
        height: 560,
        style: "winxp",
        contentType: "customize",
    },
    finder: {
        id: "finder",
        title: "My Computer",
        icon: icon("finder"),
        width: 550,
        height: 450,
        style: "win95",
        contentType: "finder",
    },
    md: {
        id: "md",
        title: "Monitoring and Analysis of Traffic Daemon",
        icon: icon("md"),
        width: 620,
        height: 500,
        style: "win95",
        contentType: "md",
    },
    divination: {
        id: "divination",
        title: "Divination",
        icon: icon("divination"),
        width: 520,
        height: 600,
        style: "win95",
        contentType: "divination",
    },
}

/**
 * Manages all desktop windows - opening, closing, focusing, and z-ordering.
 */
export class WindowManager {
    private container: HTMLElement
    private windows: Map<RoutableWindow, Window> = new Map()
    private activeWindowId: RoutableWindow | null = null
    private zIndexCounter = 100
    private changeCallbacks: Array<() => void> = []
    private newWindowCallbacks: Array<(windowId: RoutableWindow) => void> = []

    constructor(container: HTMLElement) {
        this.container = container
        // Allow the desktop container to receive focus when no windows are open
        if (!container.hasAttribute("tabindex")) {
            container.tabIndex = -1
        }
        this.setupKeyboardShortcuts()
    }

    /**
     * Opens a window by ID. If already open, focuses it instead.
     * @param windowId - The ID of the window to open
     */
    public openWindow(windowId: RoutableWindow): void {
        if (this.windows.has(windowId)) {
            this.focusWindow(windowId)
            return
        }

        const config = WINDOW_CONFIGS[windowId]
        if (!config) {
            log.ui("Unknown window: %s", windowId)
            return
        }

        const offsetX = (this.windows.size % 5) * 30
        const offsetY = (this.windows.size % 5) * 30

        const win = new Window(
            {
                ...config,
                x: 50 + offsetX,
                y: 50 + offsetY,
            },
            {
                onClose: (): void => this.closeWindow(windowId),
                onFocus: (): void => this.focusWindow(windowId),
                onMinimize: (): void => this.minimizeWindow(windowId),
            }
        )

        this.windows.set(windowId, win)
        this.container.appendChild(win.getElement())
        this.focusWindow(windowId)
        // Focus the DOM element for keyboard accessibility
        win.getElement().focus()
        this.notifyChange()
        this.newWindowCallbacks.forEach((cb) => cb(windowId))
    }

    /**
     * Closes a window by ID.
     * @param windowId - The ID of the window to close
     */
    public closeWindow(windowId: RoutableWindow): void {
        const win = this.windows.get(windowId)
        if (win) {
            win.destroy()
            win.getElement().remove()
            this.windows.delete(windowId)
            if (this.activeWindowId === windowId) {
                this.activeWindowId = null
                const remaining = Array.from(this.windows.keys())
                if (remaining.length > 0) {
                    this.focusWindow(remaining[remaining.length - 1])
                    const nextWin = this.windows.get(
                        remaining[remaining.length - 1]
                    )
                    nextWin?.getElement().focus()
                } else {
                    // No windows remain — return focus to desktop container
                    this.container.focus()
                }
            }
            this.notifyChange()
            this.playSound("close")
        }
    }

    private playSound(name: string): void {
        const audioManager = (
            window as unknown as {
                audioManager?: { playSound: (n: string) => void }
            }
        ).audioManager
        if (audioManager) {
            audioManager.playSound(name)
        }
    }

    /**
     * Brings a window to the front and marks it as active.
     * @param windowId - The ID of the window to focus
     */
    public focusWindow(windowId: RoutableWindow): void {
        const win = this.windows.get(windowId)
        if (!win) return

        if (this.activeWindowId && this.activeWindowId !== windowId) {
            const oldWin = this.windows.get(this.activeWindowId)
            if (oldWin) {
                oldWin.setActive(false)
            }
        }

        this.zIndexCounter++
        win.setZIndex(this.zIndexCounter)
        win.setActive(true)
        win.restore()
        win.getElement().focus()
        this.activeWindowId = windowId
        this.notifyChange()
    }

    /**
     * Minimizes a window to the taskbar.
     * @param windowId - The ID of the window to minimize
     */
    public minimizeWindow(windowId: RoutableWindow): void {
        const win = this.windows.get(windowId)
        if (win) {
            win.minimize()
            if (this.activeWindowId === windowId) {
                this.activeWindowId = null
            }
            this.notifyChange()
        }
    }

    /**
     * Returns information about all currently open windows.
     */
    public getOpenWindows(): OpenWindowInfo[] {
        return Array.from(this.windows.entries()).map(([id, win]) => ({
            id,
            title: win.getTitle(),
            icon: win.getIcon(),
            isActive: id === this.activeWindowId && !win.isMinimized(),
        }))
    }

    /**
     * Registers a callback to be called when windows change.
     * @param callback - Function to call on window changes
     */
    public onWindowsChange(callback: () => void): void {
        this.changeCallbacks.push(callback)
    }

    /**
     * Registers a callback to be called when a new window is opened.
     * Does not fire when an existing window is focused.
     * @param callback - Function to call with the new window's ID
     */
    public onNewWindowOpen(callback: (windowId: RoutableWindow) => void): void {
        this.newWindowCallbacks.push(callback)
    }

    /**
     * Returns the ID of the currently active window, or null if none.
     */
    public getActiveWindowId(): RoutableWindow | null {
        return this.activeWindowId
    }

    private setupKeyboardShortcuts(): void {
        document.addEventListener("keydown", (e) => {
            // Escape — close the active window
            if (e.key === "Escape" && this.activeWindowId) {
                this.closeWindow(this.activeWindowId)
                return
            }

            // Alt+Tab / Alt+Shift+Tab — cycle through open windows
            if (e.altKey && e.key === "Tab") {
                e.preventDefault()
                this.cycleWindow(e.shiftKey ? "backward" : "forward")
            }
        })
    }

    /**
     * Cycles focus through open windows in z-index order.
     * @param direction - "forward" for Alt+Tab, "backward" for Alt+Shift+Tab
     */
    private cycleWindow(direction: "forward" | "backward"): void {
        const windowIds = Array.from(this.windows.keys())
        if (windowIds.length === 0) return
        if (windowIds.length === 1) {
            this.focusWindow(windowIds[0])
            return
        }

        const currentIndex = this.activeWindowId
            ? windowIds.indexOf(this.activeWindowId)
            : -1

        let nextIndex: number
        if (direction === "forward") {
            nextIndex =
                currentIndex < 0 ? 0 : (currentIndex + 1) % windowIds.length
        } else {
            nextIndex =
                currentIndex <= 0 ? windowIds.length - 1 : currentIndex - 1
        }

        this.focusWindow(windowIds[nextIndex])
    }

    private notifyChange(): void {
        this.changeCallbacks.forEach((cb) => cb())
    }
}
