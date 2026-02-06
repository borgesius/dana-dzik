import { getBuildInfo } from "../lib/buildInfo"
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
            {
                icon: "🌐",
                text: pick([
                    "Internet Exploder",
                    "Netscape Navigator 7.0 (IE Mode)",
                    "The Web.exe",
                ]),
            },
            {
                icon: "📧",
                text: pick([
                    "Outlook Distress",
                    "Microsoft Outcast Express",
                    "Mail (broken)",
                ]),
            },
            {
                icon: "🎵",
                text: pick([
                    "Windows Media Destroyer",
                    "RealPlayer (fake)",
                    "Winamp 2.91 (v5.8)",
                ]),
            },
            {
                icon: "💬",
                text: pick([
                    "MSN Messenger (AIM)",
                    "ICQ/AIM/MSN/Yahoo (none)",
                    "Chat.dll",
                ]),
            },
            {
                icon: "🎮",
                text: pick([
                    "3D Pinball (2D)",
                    "Space Cadet Pinball (broken)",
                    "Minesweeper (pinball mode)",
                ]),
            },
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
            pick([
                "My Documents",
                "Your Documents",
                "Someone's Documents",
                "C:\\DOCS~1",
            ]),
            pick([
                "My Pictures",
                "My Pictures (empty)",
                "Pictures (missing)",
                "*.jpg",
            ]),
            pick([
                "My Music",
                "My Music (silent)",
                "Audio Files (corrupt)",
                "Sounds.wav",
            ]),
            pick([
                "My Computer",
                "This Computer",
                "A Computer",
                "Computer (probably)",
            ]),
            pick([
                "Control Panel",
                "Control Pannel",
                "Settings.cpl",
                "System32 (friendly mode)",
            ]),
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
        const versionStr = pick(VERSION_STRINGS)
        versionInfo.innerHTML = `${versionStr} · ${commitLink} · <a href="https://github.com/borgesius/dana-dzik/blob/main/CHANGELOG.md" target="_blank">changelog</a>`
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
        const glitchTime = Math.random() > 0.85
        if (glitchTime) {
            this.clockElement.textContent = pick(GLITCH_TIMES)
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
