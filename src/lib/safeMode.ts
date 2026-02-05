export class SafeMode {
    private static instance: SafeMode | null = null

    private enabled = false
    private button!: HTMLElement
    private callbacks: Array<(enabled: boolean) => void> = []

    constructor() {
        if (SafeMode.instance) {
            return SafeMode.instance
        }
        SafeMode.instance = this

        this.button = this.createButton()
        document.body.appendChild(this.button)

        const saved = localStorage.getItem("safe-mode")
        if (saved === "true") {
            this.toggle()
        }
    }

    public static getInstance(): SafeMode {
        if (!SafeMode.instance) {
            SafeMode.instance = new SafeMode()
        }
        return SafeMode.instance
    }

    private createButton(): HTMLElement {
        const btn = document.createElement("button")
        btn.className = "safe-mode-btn"
        btn.innerHTML = "🛡️ Safe Mode"
        btn.title = "Toggle safe mode (disable chaos)"

        btn.style.cssText = `
            position: fixed;
            bottom: 40px;
            left: 10px;
            z-index: 99999;
            padding: 8px 12px;
            background: #c0c0c0;
            border: 2px outset #fff;
            font-family: Tahoma, sans-serif;
            font-size: 11px;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 4px;
        `

        btn.addEventListener("click", () => this.toggle())

        return btn
    }

    public toggle(): void {
        this.enabled = !this.enabled
        localStorage.setItem("safe-mode", this.enabled.toString())

        if (this.enabled) {
            this.button.innerHTML = "🔓 Chaos Mode"
            this.button.style.background = "#90EE90"
            document.body.classList.add("safe-mode")
        } else {
            this.button.innerHTML = "🛡️ Safe Mode"
            this.button.style.background = "#c0c0c0"
            document.body.classList.remove("safe-mode")
        }

        this.callbacks.forEach((cb) => cb(this.enabled))
    }

    public isEnabled(): boolean {
        return this.enabled
    }

    public onChange(callback: (enabled: boolean) => void): void {
        this.callbacks.push(callback)
        callback(this.enabled)
    }
}
