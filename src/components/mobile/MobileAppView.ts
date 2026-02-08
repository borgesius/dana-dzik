import { DESKTOP_ITEMS } from "../../config/desktop"
import type { RoutableWindow } from "../../config/routing"
import { trackFunnelStep, trackWindowOpen } from "../../lib/analytics"
import { initFelixGPT } from "../../lib/felixgpt"
import { initGuestbook } from "../../lib/guestbook"
import { getLocaleManager } from "../../lib/localeManager"
import { initNowPlaying } from "../../lib/nowPlaying"
import { initPhotoSlideshows } from "../../lib/photoSlideshow"
import { initSiteStats } from "../../lib/siteStats"
import {
    getWindowContent,
    renderAchievementsWindow,
    renderAutobattlerWindow,
    renderCustomizeWindow,
    renderResumeWindow,
} from "../../lib/windowContent"
import { FileExplorer } from "../FileExplorer"

const APP_TITLES: Record<string, string> = {
    welcome: "Welcome",
    about: "About Me",
    projects: "Projects",
    resume: "Resume",
    links: "Links",
    guestbook: "Guestbook",
    felixgpt: "FelixGPT",
    stats: "Stats",
    explorer: "Files",
    achievements: "Achievements",
    autobattler: "Frontier",
    customize: "Customize",
}

export class MobileAppView {
    private element: HTMLElement
    private navTitle: HTMLElement
    private contentArea: HTMLElement
    private onBack: () => void
    private currentAppId: RoutableWindow | null = null

    constructor(onBack: () => void) {
        this.onBack = onBack
        this.element = document.createElement("div")
        this.element.className = "ios-app-view"

        const navBar = this.createNavBar()
        this.element.appendChild(navBar)

        this.contentArea = document.createElement("div")
        this.contentArea.className = "ios-app-content"
        this.element.appendChild(this.contentArea)

        this.setupSwipeBack()
        this.setupLocaleListener()

        this.navTitle = this.element.querySelector(
            ".ios-nav-title"
        ) as HTMLElement
    }

    private setupLocaleListener(): void {
        const lm = getLocaleManager()
        lm.on("localeChanged", () => {
            if (this.currentAppId) {
                this.refreshContent()
            }
        })
    }

    private refreshContent(): void {
        if (this.currentAppId) {
            this.contentArea.innerHTML = getWindowContent(this.currentAppId)
            this.initContentFeatures(this.currentAppId)
        }
    }

    private createNavBar(): HTMLElement {
        const nav = document.createElement("div")
        nav.className = "ios-nav-bar"

        const backBtn = document.createElement("button")
        backBtn.className = "ios-nav-back"

        const chevron = document.createElement("span")
        chevron.className = "ios-nav-back-chevron"
        chevron.textContent = "‹"

        backBtn.appendChild(chevron)
        backBtn.addEventListener("click", () => this.back())

        const title = document.createElement("span")
        title.className = "ios-nav-title"

        nav.appendChild(backBtn)
        nav.appendChild(title)

        return nav
    }

    private setupSwipeBack(): void {
        let startX = 0
        let startY = 0

        this.element.addEventListener(
            "touchstart",
            (e) => {
                startX = e.touches[0].clientX
                startY = e.touches[0].clientY
            },
            { passive: true }
        )

        this.element.addEventListener(
            "touchend",
            (e) => {
                const endX = e.changedTouches[0].clientX
                const endY = e.changedTouches[0].clientY
                const diffX = endX - startX
                const diffY = Math.abs(endY - startY)

                if (startX < 40 && diffX > 80 && diffY < 100) {
                    this.back()
                }
            },
            { passive: true }
        )
    }

    public show(windowId: RoutableWindow): void {
        this.currentAppId = windowId

        const title =
            APP_TITLES[windowId] ??
            DESKTOP_ITEMS.find((item) => item.windowId === windowId)?.label ??
            windowId
        this.navTitle.textContent = title

        this.contentArea.innerHTML = getWindowContent(windowId)

        this.element.classList.remove("closing")
        requestAnimationFrame(() => {
            this.element.classList.add("active")
        })

        setTimeout(() => this.initContentFeatures(windowId), 100)
    }

    public hide(): void {
        this.element.classList.add("closing")
        this.element.classList.remove("active")
        setTimeout(() => {
            this.contentArea.innerHTML = ""
            this.currentAppId = null
            this.element.classList.remove("closing")
        }, 300)
    }

    private back(): void {
        this.onBack()
    }

    private initContentFeatures(contentType: RoutableWindow): void {
        trackWindowOpen(contentType)

        if (contentType === "guestbook") {
            trackFunnelStep("guestbook")
            initGuestbook()
        }

        if (contentType === "about") {
            initPhotoSlideshows()
            initNowPlaying()
        } else if (contentType === "felixgpt") {
            initFelixGPT()
        } else if (contentType === "stats") {
            initSiteStats()
        } else if (contentType === "explorer") {
            this.initExplorer()
        } else if (contentType === "achievements") {
            renderAchievementsWindow()
        } else if (contentType === "autobattler") {
            renderAutobattlerWindow()
        } else if (contentType === "resume") {
            renderResumeWindow()
        } else if (contentType === "customize") {
            renderCustomizeWindow()
        }
    }

    private initExplorer(): void {
        const container = this.contentArea.querySelector(
            "#explorer-content"
        ) as HTMLElement
        if (container) {
            new FileExplorer(container, "3:\\Users\\Dana\\Desktop\\WELT")
        }
    }

    public getCurrentAppId(): string | null {
        return this.currentAppId
    }

    public getElement(): HTMLElement {
        return this.element
    }
}
