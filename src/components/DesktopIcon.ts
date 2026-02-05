export interface IconConfig {
    id: string
    label: string
    icon: string
    action: "window" | "link" | "none"
    windowId?: string
    url?: string
}

export class DesktopIcon {
    private element: HTMLElement
    private config: IconConfig
    private onOpen: (windowId: string) => void
    private clickCount = 0
    private clickTimer: number | null = null

    constructor(config: IconConfig, onOpen: (windowId: string) => void) {
        this.config = config
        this.onOpen = onOpen
        this.element = this.createElement()
    }

    private createElement(): HTMLElement {
        const div = document.createElement("div")
        div.className = "desktop-icon"
        div.dataset.iconId = this.config.id

        const iconEl = document.createElement("span")
        iconEl.style.fontSize = "32px"
        iconEl.style.display = "block"
        iconEl.textContent = this.config.icon

        const span = document.createElement("span")
        span.textContent = this.config.label

        div.appendChild(iconEl)
        div.appendChild(span)

        div.addEventListener("click", () => this.handleClick())
        div.addEventListener("dblclick", (e) => this.handleDoubleClick(e))

        return div
    }

    private handleClick(): void {
        this.clickCount++

        if (this.clickTimer) {
            window.clearTimeout(this.clickTimer)
        }

        this.clickTimer = window.setTimeout(() => {
            if (this.clickCount === 1) {
                this.element.classList.toggle("selected")
            }
            this.clickCount = 0
        }, 250)
    }

    private handleDoubleClick(e: Event): void {
        e.preventDefault()
        this.clickCount = 0
        if (this.clickTimer) {
            window.clearTimeout(this.clickTimer)
        }

        if (this.config.action === "window" && this.config.windowId) {
            this.onOpen(this.config.windowId)
        } else if (this.config.action === "link" && this.config.url) {
            window.open(this.config.url, "_blank")
        }
    }

    public getElement(): HTMLElement {
        return this.element
    }
}
