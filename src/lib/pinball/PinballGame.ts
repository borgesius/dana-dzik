import { Ball, Bumper, Flipper, Launcher, Target, Wall } from "./entities"
import { PinballRenderer } from "./renderer"

type GameState = "idle" | "launching" | "playing" | "gameOver"

interface AudioManager {
    playSound: (name: string) => void
}

const STORAGE_KEY = "pinball-high-score"

export class PinballGame {
    private canvas: HTMLCanvasElement
    private renderer: PinballRenderer
    private animationId: number | null = null
    private paused: boolean = false

    private ball: Ball
    private bumpers: Bumper[] = []
    private walls: Wall[] = []
    private flippers: Flipper[] = []
    private targets: Target[] = []
    private launcher: Launcher

    private score: number = 0
    private highScore: number = 0
    private ballsRemaining: number = 3
    private gameState: GameState = "idle"

    private keys: Set<string> = new Set()
    private audioManager: AudioManager | null = null

    private baseWidth: number = 350
    private baseHeight: number = 500
    private scale: number = 1

    constructor(canvas: HTMLCanvasElement) {
        this.canvas = canvas
        const ctx = canvas.getContext("2d")
        if (!ctx) throw new Error("Could not get canvas context")

        this.renderer = new PinballRenderer(ctx, canvas.width, canvas.height)

        this.ball = new Ball(0, 0)
        this.launcher = new Launcher(0, 0)

        this.loadHighScore()
        this.setupEntities()
        this.setupInput()
        this.findAudioManager()
    }

    private loadHighScore(): void {
        const stored = localStorage.getItem(STORAGE_KEY)
        if (stored) {
            this.highScore = parseInt(stored, 10) || 0
        }
    }

    private saveHighScore(): void {
        if (this.score > this.highScore) {
            this.highScore = this.score
            localStorage.setItem(STORAGE_KEY, this.highScore.toString())
        }
    }

    private findAudioManager(): void {
        const win = window as unknown as { audioManager?: AudioManager }
        if (win.audioManager) {
            this.audioManager = win.audioManager
        }
    }

    private playSound(name: string): void {
        this.audioManager?.playSound(name)
    }

    public resize(width: number, height: number): void {
        this.canvas.width = width
        this.canvas.height = height

        const scaleX = width / this.baseWidth
        const scaleY = height / this.baseHeight
        this.scale = Math.min(scaleX, scaleY)

        this.renderer.resize(width, height)
        this.setupEntities()
    }

    private setupEntities(): void {
        const w = this.canvas.width
        const h = this.canvas.height
        const s = this.scale

        this.launcher = new Launcher(w - 25 * s, h - 120 * s, 20 * s, 80 * s)
        this.ball = new Ball(w - 25 * s, h - 140 * s, 10 * s)

        this.walls = []

        const wallPadding = 10 * s
        const topPadding = 60 * s
        const launcherWidth = 40 * s

        this.walls.push(
            new Wall(wallPadding, topPadding, wallPadding, h - 80 * s)
        )
        this.walls.push(
            new Wall(
                w - wallPadding - launcherWidth,
                topPadding,
                w - wallPadding - launcherWidth,
                h - 80 * s
            )
        )
        this.walls.push(
            new Wall(
                wallPadding,
                topPadding,
                w - wallPadding - launcherWidth,
                topPadding
            )
        )

        this.walls.push(
            new Wall(w - wallPadding, topPadding, w - wallPadding, h)
        )
        this.walls.push(
            new Wall(
                w - wallPadding - launcherWidth,
                topPadding,
                w - wallPadding,
                topPadding
            )
        )

        const flipperY = h - 70 * s
        const flipperGap = 60 * s
        const centerX = (w - launcherWidth) / 2

        this.walls.push(
            new Wall(wallPadding, h - 80 * s, centerX - flipperGap, flipperY)
        )
        this.walls.push(
            new Wall(
                centerX + flipperGap,
                flipperY,
                w - wallPadding - launcherWidth,
                h - 80 * s
            )
        )

        this.walls.push(
            new Wall(
                wallPadding,
                h - 200 * s,
                wallPadding + 50 * s,
                h - 130 * s,
                0.8
            )
        )
        this.walls.push(
            new Wall(
                w - wallPadding - launcherWidth - 50 * s,
                h - 130 * s,
                w - wallPadding - launcherWidth,
                h - 200 * s,
                0.8
            )
        )

        this.flippers = [
            new Flipper(
                centerX - flipperGap + 10 * s,
                flipperY,
                55 * s,
                "left"
            ),
            new Flipper(
                centerX + flipperGap - 10 * s,
                flipperY,
                55 * s,
                "right"
            ),
        ]

        const playAreaCenterX = (w - launcherWidth) / 2
        this.bumpers = [
            new Bumper(playAreaCenterX, topPadding + 80 * s, 22 * s, 100),
            new Bumper(
                playAreaCenterX - 60 * s,
                topPadding + 130 * s,
                20 * s,
                100
            ),
            new Bumper(
                playAreaCenterX + 60 * s,
                topPadding + 130 * s,
                20 * s,
                100
            ),
            new Bumper(playAreaCenterX, topPadding + 180 * s, 18 * s, 150),
        ]

        this.targets = [
            new Target(
                wallPadding + 30 * s,
                topPadding + 100 * s,
                15 * s,
                40 * s,
                500
            ),
            new Target(
                w - wallPadding - launcherWidth - 30 * s,
                topPadding + 100 * s,
                15 * s,
                40 * s,
                500
            ),
            new Target(
                playAreaCenterX - 40 * s,
                topPadding + 250 * s,
                12 * s,
                30 * s,
                300
            ),
            new Target(
                playAreaCenterX + 40 * s,
                topPadding + 250 * s,
                12 * s,
                30 * s,
                300
            ),
        ]

        this.resetBallPosition()
    }

    private setupInput(): void {
        const handleKeyDown = (e: KeyboardEvent): void => {
            this.keys.add(e.key.toLowerCase())

            if (e.key === " " || e.code === "Space") {
                e.preventDefault()
                if (this.gameState === "idle") {
                    this.startGame()
                } else if (this.gameState === "gameOver") {
                    this.resetGame()
                } else if (this.gameState === "playing" && !this.ball.active) {
                    this.launcher.startCharge()
                }
            }

            if (e.key.toLowerCase() === "z" || e.key === "ArrowLeft") {
                this.flippers[0].isPressed = true
                this.playSound("pinball_flipper")
            }
            if (e.key.toLowerCase() === "x" || e.key === "ArrowRight") {
                this.flippers[1].isPressed = true
                this.playSound("pinball_flipper")
            }
        }

        const handleKeyUp = (e: KeyboardEvent): void => {
            this.keys.delete(e.key.toLowerCase())

            if (e.key === " " || e.code === "Space") {
                if (this.launcher.isCharging && !this.ball.active) {
                    const power = this.launcher.release()
                    this.ball.launch(power)
                    this.playSound("pinball_launch")
                }
            }

            if (e.key.toLowerCase() === "z" || e.key === "ArrowLeft") {
                this.flippers[0].isPressed = false
            }
            if (e.key.toLowerCase() === "x" || e.key === "ArrowRight") {
                this.flippers[1].isPressed = false
            }
        }

        window.addEventListener("keydown", handleKeyDown)
        window.addEventListener("keyup", handleKeyUp)

        this.canvas.addEventListener("mousedown", () => {
            if (this.gameState === "idle") {
                this.startGame()
            } else if (this.gameState === "gameOver") {
                this.resetGame()
            } else if (this.gameState === "playing" && !this.ball.active) {
                this.launcher.startCharge()
            }
        })

        this.canvas.addEventListener("mouseup", () => {
            if (this.launcher.isCharging && !this.ball.active) {
                const power = this.launcher.release()
                this.ball.launch(power)
                this.playSound("pinball_launch")
            }
        })
    }

    private startGame(): void {
        this.gameState = "playing"
        this.score = 0
        this.ballsRemaining = 3
        this.targets.forEach((t) => t.reset())
        this.resetBallPosition()
    }

    private resetGame(): void {
        this.saveHighScore()
        this.startGame()
    }

    private resetBallPosition(): void {
        const s = this.scale
        this.ball.reset(
            this.canvas.width - 25 * s,
            this.canvas.height - 140 * s
        )
    }

    private checkBallLost(): boolean {
        const bottomY = this.canvas.height + this.ball.radius
        return this.ball.position.y > bottomY
    }

    private update(): void {
        if (
            this.paused ||
            this.gameState === "idle" ||
            this.gameState === "gameOver"
        ) {
            return
        }

        this.ball.update()
        this.launcher.update()

        this.flippers.forEach((f) => f.update())
        this.bumpers.forEach((b) => b.update())
        this.targets.forEach((t) => t.update())

        this.walls.forEach((wall) => {
            if (wall.checkCollision(this.ball)) {
                this.playSound("pinball_wall")
            }
        })

        this.flippers.forEach((flipper) => {
            flipper.checkCollision(this.ball)
        })

        this.bumpers.forEach((bumper) => {
            const result = bumper.checkCollision(this.ball)
            if (result.hit) {
                this.score += result.points
                this.playSound("pinball_bumper")
            }
        })

        this.targets.forEach((target) => {
            const result = target.checkCollision(this.ball)
            if (result.hit) {
                this.score += result.points
                this.playSound("pinball_target")
            }
        })

        if (this.ball.active && this.checkBallLost()) {
            this.ballsRemaining--
            this.playSound("pinball_drain")

            if (this.ballsRemaining <= 0) {
                this.gameState = "gameOver"
                this.saveHighScore()
                this.playSound("pinball_gameover")
            } else {
                this.resetBallPosition()
                this.targets.forEach((t) => t.reset())
            }
        }
    }

    private render(): void {
        this.renderer.clear()

        this.walls.forEach((wall) => this.renderer.drawWall(wall))
        this.bumpers.forEach((bumper) => this.renderer.drawBumper(bumper))
        this.targets.forEach((target) => this.renderer.drawTarget(target))
        this.flippers.forEach((flipper) => this.renderer.drawFlipper(flipper))
        this.renderer.drawLauncher(this.launcher)
        this.renderer.drawBall(this.ball)

        this.renderer.drawScorePanel(
            this.score,
            this.highScore,
            this.ballsRemaining,
            this.gameState
        )

        if (this.gameState === "idle") {
            this.renderer.drawMessage(
                "PINBALL",
                "Press SPACE or click to start"
            )
            this.renderer.drawInstructions()
        } else if (this.gameState === "gameOver") {
            this.renderer.drawMessage("GAME OVER", `Final Score: ${this.score}`)
        } else if (!this.ball.active && this.gameState === "playing") {
            this.renderer.drawMessage("HOLD SPACE", "Release to launch")
        }
    }

    private gameLoop = (): void => {
        this.update()
        this.render()
        this.animationId = requestAnimationFrame(this.gameLoop)
    }

    public start(): void {
        if (this.animationId) return
        this.gameLoop()
    }

    public stop(): void {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId)
            this.animationId = null
        }
    }

    public pause(): void {
        this.paused = true
    }

    public resume(): void {
        this.paused = false
    }

    public isPaused(): boolean {
        return this.paused
    }

    public destroy(): void {
        this.stop()
    }
}

export function initPinball(container: HTMLElement): PinballGame | null {
    const canvas = container.querySelector("canvas")
    if (!canvas) return null

    const game = new PinballGame(canvas)

    const resizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
            const { width, height } = entry.contentRect
            game.resize(width, height - 5)
        }
    })

    resizeObserver.observe(container)

    const initialWidth = container.clientWidth
    const initialHeight = container.clientHeight
    game.resize(initialWidth, initialHeight - 5)

    game.start()

    return game
}
