import { type RoutableWindow } from "../config"
import { Window, type WindowConfig } from "./Window"

/** Information about an open window for the taskbar */
export interface OpenWindowInfo {
    id: string
    title: string
    icon: string
    isActive: boolean
}

const WINDOW_CONFIGS: Record<RoutableWindow, WindowConfig> = {
    welcome: {
        id: "welcome",
        title: "Welcome to Dana's Desktop",
        icon: "🌐",
        width: 600,
        height: 450,
        style: "winxp",
        contentType: "welcome",
    },
    about: {
        id: "about",
        title: "about_me.doc",
        icon: "📄",
        width: 550,
        height: 500,
        style: "win95",
        contentType: "about",
    },
    projects: {
        id: "projects",
        title: "cool_projects.zip",
        icon: "📦",
        width: 500,
        height: 400,
        style: "win95",
        contentType: "projects",
    },
    resume: {
        id: "resume",
        title: "resume.pdf",
        icon: "📕",
        width: 550,
        height: 500,
        style: "winxp",
        contentType: "resume",
    },
    links: {
        id: "links",
        title: "Bookmarks",
        icon: "🔗",
        width: 450,
        height: 400,
        style: "win95",
        contentType: "links",
    },
    guestbook: {
        id: "guestbook",
        title: "guestbook.exe",
        icon: "📖",
        width: 500,
        height: 450,
        style: "win95",
        contentType: "guestbook",
    },
    felixgpt: {
        id: "felixgpt",
        title: "FelixGPT",
        icon: "🐱",
        width: 400,
        height: 450,
        style: "winxp",
        contentType: "felixgpt",
    },
    stats: {
        id: "stats",
        title: "Site Statistics",
        icon: "📊",
        width: 450,
        height: 500,
        style: "winxp",
        contentType: "stats",
    },
    terminal: {
        id: "terminal",
        title: "C:\\HACKTERM.EXE",
        icon: "💻",
        width: 600,
        height: 400,
        style: "win95",
        contentType: "terminal",
    },
    explorer: {
        id: "explorer",
        title: "File Explorer",
        icon: "📁",
        width: 500,
        height: 400,
        style: "win95",
        contentType: "explorer",
    },
}

/**
 * Manages all desktop windows - opening, closing, focusing, and z-ordering.
 */
export class WindowManager {
    private container: HTMLElement
    private windows: Map<string, Window> = new Map()
    private activeWindowId: string | null = null
    private zIndexCounter = 100
    private changeCallbacks: Array<() => void> = []
    private newWindowCallbacks: Array<(windowId: string) => void> = []

    constructor(container: HTMLElement) {
        this.container = container
        this.setupKeyboardShortcuts()
    }

    /**
     * Opens a window by ID. If already open, focuses it instead.
     * @param windowId - The ID of the window to open
     */
    public openWindow(windowId: string): void {
        if (this.windows.has(windowId)) {
            this.focusWindow(windowId)
            return
        }

        const config = WINDOW_CONFIGS[windowId as RoutableWindow]
        if (!config) {
            console.error(`Unknown window: ${windowId}`)
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
        this.notifyChange()
        this.newWindowCallbacks.forEach((cb) => cb(windowId))
    }

    /**
     * Closes a window by ID.
     * @param windowId - The ID of the window to close
     */
    public closeWindow(windowId: string): void {
        const win = this.windows.get(windowId)
        if (win) {
            win.getElement().remove()
            this.windows.delete(windowId)
            if (this.activeWindowId === windowId) {
                this.activeWindowId = null
                const remaining = Array.from(this.windows.keys())
                if (remaining.length > 0) {
                    this.focusWindow(remaining[remaining.length - 1])
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
    public focusWindow(windowId: string): void {
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
        this.activeWindowId = windowId
        this.notifyChange()
    }

    /**
     * Minimizes a window to the taskbar.
     * @param windowId - The ID of the window to minimize
     */
    public minimizeWindow(windowId: string): void {
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
    public onNewWindowOpen(callback: (windowId: string) => void): void {
        this.newWindowCallbacks.push(callback)
    }

    /**
     * Returns the ID of the currently active window, or null if none.
     */
    public getActiveWindowId(): string | null {
        return this.activeWindowId
    }

    private setupKeyboardShortcuts(): void {
        document.addEventListener("keydown", (e) => {
            if (e.key === "Escape" && this.activeWindowId) {
                this.closeWindow(this.activeWindowId)
            }
        })
    }

    private notifyChange(): void {
        this.changeCallbacks.forEach((cb) => cb())
    }
}
