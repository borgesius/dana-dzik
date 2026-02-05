import { getBuildInfo } from "../lib/buildInfo"
import type { WindowManager } from "./WindowManager"

const TRAY_ICONS = [
    "🔊",
    "🛡️",
    "📧",
    "💬",
    "🌐",
    "⚡",
    "🔒",
    "📡",
    "🖨️",
    "💾",
    "🔋",
    "📶",
    "🎵",
    "📺",
    "⚙️",
]

export class Taskbar {
    private element: HTMLElement
    private windowManager: WindowManager
    private windowsContainer: HTMLElement
    private clockElement: HTMLElement
    private startMenuOpen = false
    private startMenu: HTMLElement

    constructor(windowManager: WindowManager) {
        this.windowManager = windowManager
        this.element = document.createElement("div")
        this.element.className = "taskbar"

        this.startMenu = this.createStartMenu()
        this.element.appendChild(this.startMenu)

        const startButton = this.createStartButton()
        this.element.appendChild(startButton)

        const quickLaunch = this.createQuickLaunch()
        this.element.appendChild(quickLaunch)

        this.windowsContainer = document.createElement("div")
        this.windowsContainer.className = "taskbar-windows"
        this.element.appendChild(this.windowsContainer)

        const systemTray = this.createSystemTray()
        this.element.appendChild(systemTray)

        this.clockElement = document.createElement("div")
        this.clockElement.className = "tray-clock"
        systemTray.appendChild(this.clockElement)
        this.updateClock()
        setInterval(() => this.updateClock(), 1000)

        this.windowManager.onWindowsChange(() => this.updateWindowButtons())

        document.addEventListener("click", (e) => {
            if (
                this.startMenuOpen &&
                !this.startMenu.contains(e.target as Node) &&
                !(e.target as HTMLElement).closest(".start-button")
            ) {
                this.closeStartMenu()
            }
        })
    }

    private createStartButton(): HTMLElement {
        const btn = document.createElement("button")
        btn.className = "start-button"

        const img = document.createElement("span")
        img.textContent = "🪟"
        img.style.fontSize = "16px"

        const text = document.createElement("span")
        text.textContent = "start"

        btn.appendChild(img)
        btn.appendChild(text)

        btn.addEventListener("click", () => this.toggleStartMenu())

        return btn
    }

    private createStartMenu(): HTMLElement {
        const menu = document.createElement("div")
        menu.className = "start-menu"

        const header = document.createElement("div")
        header.className = "start-menu-header"
        const headerImg = document.createElement("img")
        headerImg.src = "/assets/dana/IMG_5531.jpg"
        headerImg.alt = "User"
        const headerText = document.createElement("span")
        headerText.textContent = "Dana"
        header.appendChild(headerImg)
        header.appendChild(headerText)
        menu.appendChild(header)

        const body = document.createElement("div")
        body.className = "start-menu-body"

        const left = document.createElement("div")
        left.className = "start-menu-left"
        const leftItems = [
            { icon: "🌐", text: "Internet Explorer" },
            { icon: "📧", text: "Outlook Express" },
            { icon: "🎵", text: "Windows Media Player" },
            { icon: "💬", text: "MSN Messenger" },
            { icon: "🎮", text: "Pinball" },
        ]
        leftItems.forEach(({ icon, text }) => {
            const item = document.createElement("div")
            item.className = "start-menu-item"
            item.innerHTML = `<span style="font-size: 20px">${icon}</span><span>${text}</span>`
            left.appendChild(item)
        })
        body.appendChild(left)

        const right = document.createElement("div")
        right.className = "start-menu-right"
        const rightItems = [
            "My Documents",
            "My Pictures",
            "My Music",
            "My Computer",
            "Control Panel",
        ]
        rightItems.forEach((text) => {
            const item = document.createElement("div")
            item.className = "start-menu-item"
            item.innerHTML = `<span>${text}</span>`
            right.appendChild(item)
        })
        body.appendChild(right)

        menu.appendChild(body)

        const footer = document.createElement("div")
        footer.className = "start-menu-footer"

        const buildInfo = getBuildInfo()
        const versionInfo = document.createElement("div")
        versionInfo.className = "start-menu-version"
        const commitShort = buildInfo.gitCommit.substring(0, 7)
        const commitLink =
            buildInfo.gitCommit !== "local"
                ? `<a href="https://github.com/borgesius/dana-dzik/commit/${buildInfo.gitCommit}" target="_blank">${commitShort}</a>`
                : commitShort
        versionInfo.innerHTML = `v${buildInfo.version} · ${commitLink} · <a href="https://github.com/borgesius/dana-dzik/blob/main/CHANGELOG.md" target="_blank">changelog</a>`
        footer.appendChild(versionInfo)

        const buttons = document.createElement("div")
        buttons.className = "start-menu-footer-buttons"
        const logOff = document.createElement("button")
        logOff.innerHTML = "🚪 Log Off"
        const shutdown = document.createElement("button")
        shutdown.innerHTML = "⏻ Shut Down"
        buttons.appendChild(logOff)
        buttons.appendChild(shutdown)
        footer.appendChild(buttons)

        menu.appendChild(footer)

        return menu
    }

    private toggleStartMenu(): void {
        this.startMenuOpen = !this.startMenuOpen
        this.startMenu.classList.toggle("open", this.startMenuOpen)
    }

    private closeStartMenu(): void {
        this.startMenuOpen = false
        this.startMenu.classList.remove("open")
    }

    private createQuickLaunch(): HTMLElement {
        const container = document.createElement("div")
        container.className = "quick-launch"

        const icons = ["🌐", "📧", "📁", "🖥️"]
        icons.forEach((icon) => {
            const span = document.createElement("span")
            span.className = "quick-launch-icon"
            span.textContent = icon
            span.style.fontSize = "16px"
            span.style.cursor = "pointer"
            container.appendChild(span)
        })

        return container
    }

    private createSystemTray(): HTMLElement {
        const container = document.createElement("div")
        container.className = "system-tray"

        TRAY_ICONS.forEach((icon) => {
            const span = document.createElement("span")
            span.className = "tray-icon"
            span.textContent = icon
            span.title = "Unknown program"
            container.appendChild(span)
        })

        return container
    }

    private updateClock(): void {
        const now = new Date()
        const glitchTime = Math.random() > 0.9
        if (glitchTime) {
            this.clockElement.textContent = "??:?? AM"
        } else {
            this.clockElement.textContent = now.toLocaleTimeString("en-US", {
                hour: "numeric",
                minute: "2-digit",
                hour12: true,
            })
        }
    }

    private updateWindowButtons(): void {
        this.windowsContainer.innerHTML = ""

        const windows = this.windowManager.getOpenWindows()
        windows.forEach((win) => {
            const btn = document.createElement("button")
            btn.className = "taskbar-window-button"
            if (win.isActive) {
                btn.classList.add("active")
            }
            btn.innerHTML = `<span>${win.icon}</span><span>${win.title}</span>`
            btn.addEventListener("click", () => {
                this.windowManager.focusWindow(win.id)
            })
            this.windowsContainer.appendChild(btn)
        })
    }

    public getElement(): HTMLElement {
        return this.element
    }
}
