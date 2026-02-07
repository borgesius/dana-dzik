export class MobileLockScreen {
    private element: HTMLElement
    private onUnlock: () => void

    constructor(onUnlock: () => void) {
        this.onUnlock = onUnlock
        this.element = this.createElement()
    }

    private createElement(): HTMLElement {
        const screen = document.createElement("div")
        screen.className = "ios-lock-screen"

        const clock = document.createElement("div")
        clock.className = "ios-lock-clock"

        const time = document.createElement("div")
        time.className = "ios-lock-time"
        time.textContent = this.formatTime()

        const date = document.createElement("div")
        date.className = "ios-lock-date"
        date.textContent = this.formatDate()

        clock.appendChild(time)
        clock.appendChild(date)
        screen.appendChild(clock)

        const hint = document.createElement("div")
        hint.className = "ios-lock-hint"
        hint.textContent = "this site is best experienced on a computer"
        screen.appendChild(hint)

        const slideContainer = document.createElement("div")
        slideContainer.className = "ios-slide-to-unlock"

        const slideText = document.createElement("span")
        slideText.className = "ios-slide-text"

        const arrow = document.createElement("span")
        arrow.className = "ios-slide-arrow"
        arrow.textContent = "▷"

        slideText.appendChild(arrow)
        slideText.appendChild(document.createTextNode("slide to unlock"))
        slideContainer.appendChild(slideText)
        screen.appendChild(slideContainer)

        this.setupSwipeGesture(screen)

        return screen
    }

    private setupSwipeGesture(screen: HTMLElement): void {
        let touchStartX = 0

        screen.addEventListener(
            "touchstart",
            (e) => {
                touchStartX = e.touches[0].clientX
            },
            { passive: true }
        )

        screen.addEventListener(
            "touchend",
            (e) => {
                const touchEndX = e.changedTouches[0].clientX
                const diff = touchEndX - touchStartX

                if (diff > 100) {
                    this.triggerUnlock()
                }
            },
            { passive: true }
        )

        screen.addEventListener("click", () => {
            this.triggerUnlock()
        })
    }

    private triggerUnlock(): void {
        this.element.classList.add("unlocking")
        setTimeout(() => {
            this.onUnlock()
        }, 500)
    }

    private formatTime(): string {
        const now = new Date()
        let hours = now.getHours()
        const minutes = now.getMinutes().toString().padStart(2, "0")
        hours = hours % 12 || 12
        return `${hours}:${minutes}`
    }

    private formatDate(): string {
        const now = new Date()
        const days = [
            "Sunday",
            "Monday",
            "Tuesday",
            "Wednesday",
            "Thursday",
            "Friday",
            "Saturday",
        ]
        const months = [
            "January",
            "February",
            "March",
            "April",
            "May",
            "June",
            "July",
            "August",
            "September",
            "October",
            "November",
            "December",
        ]
        return `${days[now.getDay()]}, ${months[now.getMonth()]} ${now.getDate()}`
    }

    public hide(): void {
        this.element.classList.add("unlocking")
        setTimeout(() => {
            this.element.style.display = "none"
        }, 500)
    }

    public getElement(): HTMLElement {
        return this.element
    }
}
