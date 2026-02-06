import { trackFunnelStep, trackWindowOpen } from "../lib/analytics"
import { initFelixGPT } from "../lib/felixgpt"
import { initGuestbook } from "../lib/guestbook"
import { initNowPlaying } from "../lib/nowPlaying"
import { initPhotoSlideshows } from "../lib/photoSlideshow"
import { initPinball, type PinballGame } from "../lib/pinball"
import { initSiteStats } from "../lib/siteStats"
import { initVisitorCount } from "../lib/visitorCount"
import { getWindowContent } from "../lib/windowContent"
import { FileExplorer } from "./FileExplorer"
import { Terminal } from "./Terminal"

export interface WindowConfig {
    id: string
    title: string
    icon: string
    x?: number
    y?: number
    width: number
    height: number
    style: "win95" | "winxp"
    contentType: string
}

export interface WindowCallbacks {
    onClose: () => void
    onFocus: () => void
    onMinimize: () => void
}

export class Window {
    private element: HTMLElement
    private config: WindowConfig
    private callbacks: WindowCallbacks
    private isDragging = false
    private isResizing = false
    private dragOffset = { x: 0, y: 0 }
    private minimized = false
    private pinballGame: PinballGame | null = null

    constructor(config: WindowConfig, callbacks: WindowCallbacks) {
        this.config = config
        this.callbacks = callbacks
        this.element = this.createElement()
    }

    private createElement(): HTMLElement {
        const win = document.createElement("div")
        win.className = `window ${this.config.style}`
        win.style.left = `${this.config.x ?? 100}px`
        win.style.top = `${this.config.y ?? 100}px`
        win.style.width = `${this.config.width}px`
        win.style.height = `${this.config.height}px`

        win.setAttribute("role", "dialog")
        win.setAttribute("aria-label", this.config.title)
        win.setAttribute("aria-modal", "false")
        win.tabIndex = -1

        win.addEventListener("mousedown", () => this.callbacks.onFocus())

        const titlebar = this.createTitlebar()
        win.appendChild(titlebar)

        const content = document.createElement("div")
        content.className = "window-content"
        content.innerHTML = getWindowContent(this.config.contentType)
        win.appendChild(content)

        const resizeHandle = document.createElement("div")
        resizeHandle.className = "window-resize-handle"
        resizeHandle.addEventListener("mousedown", (e) => this.startResize(e))
        win.appendChild(resizeHandle)

        setTimeout(() => this.initContentFeatures(), 100)

        return win
    }

    private initContentFeatures(): void {
        trackWindowOpen(this.config.contentType)

        if (this.config.contentType === "welcome") {
            initVisitorCount()
        }

        if (this.config.contentType === "guestbook") {
            trackFunnelStep("guestbook")
            initGuestbook()
        }

        if (this.config.contentType === "about") {
            initPhotoSlideshows()
            initNowPlaying()
        } else if (this.config.contentType === "felixgpt") {
            initFelixGPT()
        } else if (this.config.contentType === "stats") {
            initSiteStats()
        } else if (this.config.contentType === "pinball") {
            const container = this.element.querySelector(
                "#pinball-container"
            ) as HTMLElement
            if (container) {
                this.pinballGame = initPinball(container)
            }
        } else if (this.config.contentType === "terminal") {
            this.initTerminal()
        } else if (this.config.contentType === "explorer") {
            this.initExplorer()
        }
    }

    private initExplorer(): void {
        const container = this.element.querySelector(
            "#explorer-content"
        ) as HTMLElement
        if (container) {
            new FileExplorer(container, "C:\\Users\\Dana\\Desktop\\WELT")
        }
    }

    private initTerminal(): void {
        const container = this.element.querySelector(
            "#terminal-content"
        ) as HTMLElement
        if (container) {
            new Terminal(container, {
                openWindow: (windowId): void => {
                    document.dispatchEvent(
                        new CustomEvent("terminal:open-window", {
                            detail: { windowId },
                        })
                    )
                },
                closeTerminal: (): void => {
                    this.callbacks.onClose()
                },
            })
        }
    }

    private createTitlebar(): HTMLElement {
        const titlebar = document.createElement("div")
        titlebar.className = "window-titlebar"

        const icon = document.createElement("span")
        icon.className = "window-titlebar-icon"
        icon.textContent = this.config.icon
        titlebar.appendChild(icon)

        const text = document.createElement("span")
        text.className = "window-titlebar-text"
        text.textContent = this.config.title
        titlebar.appendChild(text)

        const buttons = document.createElement("div")
        buttons.className = "window-titlebar-buttons"

        const minimizeBtn = document.createElement("button")
        minimizeBtn.className = "window-btn minimize"
        minimizeBtn.textContent = "_"
        minimizeBtn.setAttribute("aria-label", "Minimize window")
        minimizeBtn.addEventListener("click", (e) => {
            e.stopPropagation()
            this.callbacks.onMinimize()
        })
        buttons.appendChild(minimizeBtn)

        const maximizeBtn = document.createElement("button")
        maximizeBtn.className = "window-btn maximize"
        maximizeBtn.textContent = "□"
        maximizeBtn.setAttribute("aria-label", "Maximize window")
        buttons.appendChild(maximizeBtn)

        const closeBtn = document.createElement("button")
        closeBtn.className = "window-btn close"
        closeBtn.textContent = "×"
        closeBtn.setAttribute("aria-label", "Close window")
        closeBtn.addEventListener("click", (e) => {
            e.stopPropagation()
            this.callbacks.onClose()
        })
        buttons.appendChild(closeBtn)

        titlebar.appendChild(buttons)

        titlebar.addEventListener("mousedown", (e) => this.startDrag(e))

        return titlebar
    }

    private startDrag(e: MouseEvent): void {
        if ((e.target as HTMLElement).closest(".window-btn")) return

        this.isDragging = true
        const rect = this.element.getBoundingClientRect()
        this.dragOffset = {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top,
        }

        const onMouseMove = (e: MouseEvent): void => {
            if (!this.isDragging) return
            this.element.style.left = `${e.clientX - this.dragOffset.x}px`
            this.element.style.top = `${e.clientY - this.dragOffset.y}px`
        }

        const onMouseUp = (): void => {
            this.isDragging = false
            document.removeEventListener("mousemove", onMouseMove)
            document.removeEventListener("mouseup", onMouseUp)
        }

        document.addEventListener("mousemove", onMouseMove)
        document.addEventListener("mouseup", onMouseUp)
    }

    private startResize(e: MouseEvent): void {
        e.preventDefault()
        e.stopPropagation()
        this.isResizing = true

        const startWidth = this.element.offsetWidth
        const startHeight = this.element.offsetHeight
        const startX = e.clientX
        const startY = e.clientY

        const onMouseMove = (e: MouseEvent): void => {
            if (!this.isResizing) return
            const newWidth = startWidth + (e.clientX - startX)
            const newHeight = startHeight + (e.clientY - startY)
            this.element.style.width = `${Math.max(200, newWidth)}px`
            this.element.style.height = `${Math.max(100, newHeight)}px`
        }

        const onMouseUp = (): void => {
            this.isResizing = false
            document.removeEventListener("mousemove", onMouseMove)
            document.removeEventListener("mouseup", onMouseUp)
        }

        document.addEventListener("mousemove", onMouseMove)
        document.addEventListener("mouseup", onMouseUp)
    }

    public getElement(): HTMLElement {
        return this.element
    }

    public setZIndex(z: number): void {
        this.element.style.zIndex = z.toString()
    }

    public setActive(active: boolean): void {
        this.element.classList.toggle("inactive", !active)
        if (this.pinballGame) {
            if (active) {
                this.pinballGame.resume()
            } else {
                this.pinballGame.pause()
            }
        }
    }

    public minimize(): void {
        this.minimized = true
        this.element.style.display = "none"
    }

    public restore(): void {
        this.minimized = false
        this.element.style.display = "flex"
    }

    public isMinimized(): boolean {
        return this.minimized
    }

    public getTitle(): string {
        return this.config.title
    }

    public getIcon(): string {
        return this.config.icon
    }

    public destroy(): void {
        if (this.pinballGame) {
            this.pinballGame.destroy()
            this.pinballGame = null
        }
    }
}
