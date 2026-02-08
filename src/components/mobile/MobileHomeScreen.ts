import { DESKTOP_ITEMS } from "../../config/desktop"
import { MOBILE_ALLOWED_IDS, MOBILE_DOCK_IDS } from "../../config/mobile"
import type { RoutableWindow } from "../../config/routing"

export class MobileHomeScreen {
    private element: HTMLElement
    private onAppOpen: (windowId: RoutableWindow) => void

    constructor(onAppOpen: (windowId: RoutableWindow) => void) {
        this.onAppOpen = onAppOpen
        this.element = this.createElement()
    }

    private createElement(): HTMLElement {
        const screen = document.createElement("div")
        screen.className = "ios-home-screen"

        const gridItems = DESKTOP_ITEMS.filter(
            (item) =>
                MOBILE_ALLOWED_IDS.includes(item.id) &&
                !MOBILE_DOCK_IDS.includes(item.id)
        )
        const dockItems = DESKTOP_ITEMS.filter((item) =>
            MOBILE_DOCK_IDS.includes(item.id)
        )

        const grid = document.createElement("div")
        grid.className = "ios-home-icons"

        for (const item of gridItems) {
            grid.appendChild(
                this.createAppIcon(
                    item.icon,
                    item.label ?? item.filename,
                    item.windowId
                )
            )
        }

        screen.appendChild(grid)

        const pageDots = document.createElement("div")
        pageDots.className = "ios-page-dots"
        const dot = document.createElement("div")
        dot.className = "ios-page-dot active"
        pageDots.appendChild(dot)
        screen.appendChild(pageDots)

        const dock = document.createElement("div")
        dock.className = "ios-dock"

        for (const item of dockItems) {
            dock.appendChild(
                this.createAppIcon(
                    item.icon,
                    item.label ?? item.filename,
                    item.windowId
                )
            )
        }

        screen.appendChild(dock)

        return screen
    }

    private createAppIcon(
        icon: string,
        label: string,
        windowId: RoutableWindow
    ): HTMLElement {
        const wrapper = document.createElement("div")
        wrapper.className = "ios-app-icon-wrapper"

        const iconEl = document.createElement("div")
        iconEl.className = `ios-app-icon icon-${windowId}`
        iconEl.textContent = icon

        const labelEl = document.createElement("span")
        labelEl.className = "ios-app-label"
        labelEl.textContent = label

        wrapper.appendChild(iconEl)
        wrapper.appendChild(labelEl)

        wrapper.addEventListener("click", () => {
            this.onAppOpen(windowId)
        })

        return wrapper
    }

    public getElement(): HTMLElement {
        return this.element
    }
}
