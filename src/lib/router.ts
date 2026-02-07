import {
    ROUTABLE_WINDOWS,
    type RoutableWindow,
    ROUTE_MAP,
} from "../config/routing"

/**
 * Simple hash-based router for navigating to windows via URL.
 * Supports both hash routes (#/about) and direct paths (/about).
 */
export class Router {
    private onNavigate: (windowId: RoutableWindow) => void

    constructor(onNavigate: (windowId: RoutableWindow) => void) {
        this.onNavigate = onNavigate
        this.setupListeners()
    }

    /**
     * Initializes routing based on the current URL.
     * Call this after the window manager is ready.
     */
    public init(): void {
        const windowId = this.getWindowFromUrl()
        if (windowId) {
            this.onNavigate(windowId)
        }
    }

    /**
     * Updates the URL to reflect the current window.
     * @param windowId - The window ID to reflect in the URL
     */
    public updateUrl(windowId: RoutableWindow): void {
        if (ROUTABLE_WINDOWS.includes(windowId)) {
            const path = windowId === "welcome" ? "/" : `/${windowId}`
            window.history.pushState({ windowId }, "", path)
        }
    }

    private getWindowFromUrl(): RoutableWindow | null {
        const path = window.location.pathname
        const hash = window.location.hash.replace("#", "")

        const route = hash || path
        const windowId = ROUTE_MAP[route]

        if (windowId) {
            return windowId
        }

        const pathWithoutSlash = route.replace(/^\//, "")
        if (ROUTABLE_WINDOWS.includes(pathWithoutSlash as RoutableWindow)) {
            return pathWithoutSlash as RoutableWindow
        }

        return null
    }

    private setupListeners(): void {
        window.addEventListener("popstate", () => {
            const windowId = this.getWindowFromUrl()
            if (windowId) {
                this.onNavigate(windowId)
            }
        })
    }
}
