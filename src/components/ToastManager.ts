const MAX_VISIBLE = 3
const TOAST_ANIMATION_MS = 500

let instance: ToastManager | null = null

export function getToastManager(): ToastManager {
    if (!instance) {
        instance = new ToastManager()
    }
    return instance
}

export class ToastManager {
    private container: HTMLElement
    private activeToasts: HTMLElement[] = []

    constructor() {
        this.container = document.createElement("div")
        this.container.className = "toast-container"
        document.body.appendChild(this.container)
    }

    public push(toast: HTMLElement): void {
        if (this.activeToasts.length >= MAX_VISIBLE) {
            const oldest = this.activeToasts.shift()
            oldest?.remove()
        }

        this.container.appendChild(toast)
        this.activeToasts.push(toast)

        requestAnimationFrame(() => {
            toast.classList.add("toast-visible")
        })
    }

    public dismiss(toast: HTMLElement): void {
        toast.classList.remove("toast-visible")
        toast.classList.add("toast-exit")
        setTimeout(() => {
            toast.remove()
            const idx = this.activeToasts.indexOf(toast)
            if (idx !== -1) this.activeToasts.splice(idx, 1)
        }, TOAST_ANIMATION_MS)
    }

    public scheduleDismiss(toast: HTMLElement, durationMs: number): void {
        setTimeout(() => {
            if (this.activeToasts.includes(toast)) {
                this.dismiss(toast)
            }
        }, durationMs)
    }
}
