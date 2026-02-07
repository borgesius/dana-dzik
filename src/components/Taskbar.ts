import { getBuildInfo } from "../lib/buildInfo"
import { saveManager } from "../lib/saveManager"
import { getThemeManager } from "../lib/themeManager"
import type { WindowManager } from "./WindowManager"

function pick<T>(arr: T[]): T {
    return arr[Math.floor(Math.random() * arr.length)]
}

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

const TRAY_TOOLTIPS = [
    "Unknown program (known)",
    "Something.exe (not responding) (responding)",
    "Volume: muted (playing)",
    "Network: connected to nothing",
    "Antivirus: probably fine",
    "Driver for unknown device",
    "Background process #▒▒",
    "System idle (busy)",
    "Memory manager (leaking)",
    "Disk manager (fragmenting)",
    "Update unavailable (downloading)",
    "Security alert (ignore)",
    "Power: plugged in (on battery)",
    "Bluetooth chip not found",
    "Process 0x????: running",
    "Unknown program",
    "Another unknown program",
    "Not malware",
    "System32.exe",
    "Helper.dll (helping)",
]

const VERSION_STRINGS = [
    "v-0.7.3a",
    "v∞.0.1",
    "build: later",
    "revision ????",
    "v4.51.NaN",
    "v1.0 (beta) (alpha) (final)",
    "version: yes",
]

const GLITCH_TIMES = [
    "??:?? AM",
    "25:61 PM",
    "3:7? AM",
    "12:00 (yesterday)",
    "-4:30 PM",
    "88:88",
    "NaN:NaN AM",
    "∞:00 PM",
]

export class Taskbar {
    private element: HTMLElement
    private windowManager: WindowManager
    private windowsContainer: HTMLElement
    private clockElement: HTMLElement
    private startMenuOpen = false
    private startMenu: HTMLElement
    private startButtonTextEl: HTMLElement | null = null

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

        getThemeManager().on("themeChanged", () => this.applyThemeLabels())
    }

    private applyThemeLabels(): void {
        const labels = getThemeManager().getLabels()
        if (this.startButtonTextEl) {
            this.startButtonTextEl.textContent = labels.startButton
        }
    }

    private createStartButton(): HTMLElement {
        const btn = document.createElement("button")
        btn.className = "start-button"

        const img = document.createElement("span")
        img.textContent = "🪟"
        img.style.fontSize = "16px"

        const labels = getThemeManager().getLabels()
        const text = document.createElement("span")
        text.textContent = labels.startButton
        this.startButtonTextEl = text

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
            {
                icon: "📁",
                text: "File Explorer",
                windowId: "explorer",
            },
            {
                icon: "💻",
                text: "Terminal",
                windowId: "terminal",
            },
            {
                icon: "🏆",
                text: "Achievements",
                windowId: "achievements",
            },
            {
                icon: "🎮",
                text: "Pinball",
                windowId: "pinball",
            },
            {
                icon: "😺",
                text: "FelixGPT",
                windowId: "felixgpt",
            },
        ]
        leftItems.forEach(({ icon, text, windowId }) => {
            const item = document.createElement("div")
            item.className = "start-menu-item"
            item.innerHTML = `<span style="font-size: 20px">${icon}</span><span>${text}</span>`
            item.addEventListener("click", () => {
                this.windowManager.openWindow(windowId)
                this.closeStartMenu()
            })
            left.appendChild(item)
        })
        body.appendChild(left)

        const right = document.createElement("div")
        right.className = "start-menu-right"
        const rightItems = [
            { text: "About", windowId: "about" },
            { text: "Projects", windowId: "projects" },
            { text: "Resume", windowId: "resume" },
            { text: "Links", windowId: "links" },
            { text: "Guestbook", windowId: "guestbook" },
        ]
        rightItems.forEach(({ text, windowId }) => {
            const item = document.createElement("div")
            item.className = "start-menu-item"
            item.innerHTML = `<span>${text}</span>`
            item.addEventListener("click", () => {
                this.windowManager.openWindow(windowId)
                this.closeStartMenu()
            })
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
        const versionStr = pick(VERSION_STRINGS)
        versionInfo.innerHTML = `${versionStr} · ${commitLink} · <a href="https://github.com/borgesius/dana-dzik/blob/main/CHANGELOG.md" target="_blank">changelog</a>`
        footer.appendChild(versionInfo)

        const buttons = document.createElement("div")
        buttons.className = "start-menu-footer-buttons"
        const resetBtn = document.createElement("button")
        resetBtn.innerHTML = "🔄 Reset"
        resetBtn.title = "Erase all saved progress"
        resetBtn.addEventListener("click", () => {
            this.closeStartMenu()
            this.confirmReset()
        })
        buttons.appendChild(resetBtn)
        footer.appendChild(buttons)

        menu.appendChild(footer)

        return menu
    }

    private confirmReset(): void {
        const overlay = document.createElement("div")
        overlay.className = "reset-dialog-overlay"

        const dialog = document.createElement("div")
        dialog.className = "reset-dialog"

        const title = document.createElement("div")
        title.className = "reset-dialog-title"
        title.textContent = "⚠️ Reset All Data"
        dialog.appendChild(title)

        const message = document.createElement("div")
        message.className = "reset-dialog-message"
        message.textContent =
            "This will permanently erase all progress, achievements, market game state, filesystem edits, and preferences. This cannot be undone."
        dialog.appendChild(message)

        const buttonRow = document.createElement("div")
        buttonRow.className = "reset-dialog-buttons"

        const cancelBtn = document.createElement("button")
        cancelBtn.className = "reset-dialog-cancel"
        cancelBtn.textContent = "Cancel"
        cancelBtn.addEventListener("click", () => overlay.remove())

        const confirmBtn = document.createElement("button")
        confirmBtn.className = "reset-dialog-confirm"
        confirmBtn.textContent = "Erase Everything"
        confirmBtn.addEventListener("click", () => {
            overlay.remove()
            saveManager.reset()
        })

        buttonRow.appendChild(cancelBtn)
        buttonRow.appendChild(confirmBtn)
        dialog.appendChild(buttonRow)

        overlay.appendChild(dialog)
        overlay.addEventListener("click", (e) => {
            if (e.target === overlay) overlay.remove()
        })

        document.body.appendChild(overlay)
    }

    private toggleStartMenu(): void {
        this.playSound("click")
        this.startMenuOpen = !this.startMenuOpen
        this.startMenu.classList.toggle("open", this.startMenuOpen)
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
            span.title = pick(TRAY_TOOLTIPS)
            container.appendChild(span)
        })

        return container
    }

    private updateClock(): void {
        const now = new Date()
        const prefix = getThemeManager().getLabels().clockPrefix
        const glitchTime = Math.random() > 0.85
        if (glitchTime) {
            this.clockElement.textContent = prefix + pick(GLITCH_TIMES)
        } else {
            const time = now.toLocaleTimeString("en-US", {
                hour: "numeric",
                minute: "2-digit",
                hour12: true,
            })
            this.clockElement.textContent = prefix + time
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
