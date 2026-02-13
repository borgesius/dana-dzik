import { getCosmeticManager } from "../lib/cosmetics/CosmeticManager"
import { getCosmeticDef, type TrailConfig } from "../lib/cosmetics/definitions"

interface Sparkle {
    x: number
    y: number
    size: number
    opacity: number
    color: string
    shape: string
    vx: number
    vy: number
}

const CURSOR_CLASSES = [
    "cursor-crosshair",
    "cursor-wait",
    "cursor-help",
    "cursor-pointer",
]

const DEFAULT_COLORS = [
    "#ff00ff",
    "#00ffff",
    "#ffff00",
    "#ff0000",
    "#00ff00",
    "#ffffff",
]

const DEFAULT_SHAPES = ["✦", "✧", "⬥"]

export class CursorTrail {
    private canvas: HTMLCanvasElement
    private ctx: CanvasRenderingContext2D
    private sparkles: Sparkle[] = []
    private cursorIndex = 0
    private cursorInterval: number | null = null
    private animationFrame: number | null = null
    private trailConfig: TrailConfig | null = null

    constructor() {
        this.canvas = document.createElement("canvas")
        this.canvas.className = "cursor-sparkle-canvas"
        this.canvas.width = window.innerWidth
        this.canvas.height = window.innerHeight
        document.body.appendChild(this.canvas)

        this.ctx = this.canvas.getContext("2d") as CanvasRenderingContext2D

        this.loadTrailConfig()
        this.bindEvents()
        this.startCursorChange()
        this.animate()

        getCosmeticManager().onChange((type) => {
            if (type === "cursor-trail") {
                this.loadTrailConfig()
            }
        })
    }

    private loadTrailConfig(): void {
        const activeId = getCosmeticManager().getActive("cursor-trail")
        const def = getCosmeticDef("cursor-trail", activeId)
        this.trailConfig = def?.trailConfig ?? null
    }

    private getColors(): string[] {
        return this.trailConfig?.colors ?? DEFAULT_COLORS
    }

    private getShapes(): string[] {
        return this.trailConfig?.shapes ?? DEFAULT_SHAPES
    }

    private getSizeRange(): [number, number] {
        return this.trailConfig?.size ?? [2, 6]
    }

    private bindEvents(): void {
        document.addEventListener("mousemove", (e) => {
            this.addSparkles(e.clientX, e.clientY)
        })

        document.addEventListener("click", (e) => {
            this.addClickBurst(e.clientX, e.clientY)
        })

        window.addEventListener("resize", () => {
            this.canvas.width = window.innerWidth
            this.canvas.height = window.innerHeight
        })
    }

    private addSparkles(x: number, y: number): void {
        const colors = this.getColors()
        const shapes = this.getShapes()
        const [minSize, maxSize] = this.getSizeRange()

        for (let i = 0; i < 2; i++) {
            this.sparkles.push({
                x,
                y,
                size: Math.random() * (maxSize - minSize) + minSize,
                opacity: 1,
                color: colors[Math.floor(Math.random() * colors.length)],
                shape: shapes[Math.floor(Math.random() * shapes.length)],
                vx: (Math.random() - 0.5) * 2,
                vy: (Math.random() - 0.5) * 2 + 1,
            })
        }

        if (this.sparkles.length > 100) {
            this.sparkles = this.sparkles.slice(-100)
        }
    }

    private addClickBurst(x: number, y: number): void {
        const colors = this.getColors()
        const shapes = this.getShapes()
        const [minSize, maxSize] = this.getSizeRange()

        for (let i = 0; i < 20; i++) {
            const angle = (Math.PI * 2 * i) / 20
            const speed = Math.random() * 5 + 2
            this.sparkles.push({
                x,
                y,
                size: Math.random() * (maxSize - minSize + 3) + minSize,
                opacity: 1,
                color: colors[Math.floor(Math.random() * colors.length)],
                shape: shapes[Math.floor(Math.random() * shapes.length)],
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
            })
        }
    }

    private animate(): void {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)

        this.sparkles = this.sparkles.filter((s) => s.opacity > 0.01)

        this.sparkles.forEach((sparkle) => {
            sparkle.x += sparkle.vx
            sparkle.y += sparkle.vy
            sparkle.vy += 0.1
            sparkle.opacity *= 0.95
            sparkle.size *= 0.98

            this.ctx.globalAlpha = sparkle.opacity
            this.ctx.font = `${Math.max(sparkle.size * 2, 8)}px sans-serif`
            this.ctx.fillStyle = sparkle.color
            this.ctx.textAlign = "center"
            this.ctx.textBaseline = "middle"
            this.ctx.fillText(sparkle.shape, sparkle.x, sparkle.y)

            this.ctx.beginPath()
            this.ctx.arc(
                sparkle.x,
                sparkle.y,
                sparkle.size * 0.5,
                0,
                Math.PI * 2
            )
            this.ctx.fillStyle = sparkle.color
            this.ctx.globalAlpha = sparkle.opacity * 0.3
            this.ctx.fill()
            this.ctx.globalAlpha = 1
        })

        this.animationFrame = requestAnimationFrame(() => this.animate())
    }

    private startCursorChange(): void {
        this.cursorInterval = window.setInterval(() => {
            document.body.classList.remove(...CURSOR_CLASSES)
            this.cursorIndex = (this.cursorIndex + 1) % CURSOR_CLASSES.length
            document.body.classList.add(CURSOR_CLASSES[this.cursorIndex])
        }, 5000)
    }

    public destroy(): void {
        if (this.cursorInterval) {
            window.clearInterval(this.cursorInterval)
        }
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame)
        }
        this.canvas.remove()
    }

    public disable(): void {
        this.canvas.style.display = "none"
        if (this.cursorInterval) {
            window.clearInterval(this.cursorInterval)
            this.cursorInterval = null
        }
        document.body.classList.remove(...CURSOR_CLASSES)
    }

    public enable(): void {
        this.canvas.style.display = "block"
        if (!this.cursorInterval) {
            this.startCursorChange()
        }
    }
}
