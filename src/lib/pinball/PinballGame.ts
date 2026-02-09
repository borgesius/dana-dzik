import { emitAppEvent } from "../events"
import { Ball, Bumper, Flipper, Launcher, Target, Wall } from "./entities"
import { LOGICAL_HEIGHT, SUBSTEPS } from "./physics"
import { PinballRenderer } from "./renderer"

export type GameState = "idle" | "launching" | "playing" | "gameOver"

interface AudioManager {
    playSound: (name: string) => void
}

const STORAGE_KEY = "pinball-high-score"

const BALL_START_X = 300
const BALL_START_Y = 420
const BALL_RADIUS = 8

const DRAIN_Y = LOGICAL_HEIGHT + BALL_RADIUS + 5
const BALL_SAVE_DURATION = 180

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

    private _score: number = 0
    private _highScore: number = 0
    private _ballsRemaining: number = 3
    private _gameState: GameState = "idle"
    private ballSaveFrames: number = 0

    private audioManager: AudioManager | null = null

    private handleKeyDown: ((e: KeyboardEvent) => void) | null = null
    private handleKeyUp: ((e: KeyboardEvent) => void) | null = null

    constructor(canvas: HTMLCanvasElement) {
        this.canvas = canvas
        const ctx = canvas.getContext("2d")
        if (!ctx) throw new Error("Could not get canvas context")

        this.renderer = new PinballRenderer(ctx, canvas.width, canvas.height)

        this.ball = new Ball(BALL_START_X, BALL_START_Y, BALL_RADIUS)
        this.launcher = new Launcher(300, 370)

        this.loadHighScore()
        this.buildPlayfield()
        this.setupInput()
        this.findAudioManager()
    }

    public get score(): number {
        return this._score
    }

    public get highScore(): number {
        return this._highScore
    }

    public get ballsRemaining(): number {
        return this._ballsRemaining
    }

    public get gameState(): GameState {
        return this._gameState
    }

    public get ballSaveActive(): boolean {
        return this.ballSaveFrames > 0
    }

    public getBall(): Ball {
        return this.ball
    }

    public getFlippers(): Flipper[] {
        return this.flippers
    }

    public getBumpers(): Bumper[] {
        return this.bumpers
    }

    public getTargets(): Target[] {
        return this.targets
    }

    public getWalls(): Wall[] {
        return this.walls
    }

    private loadHighScore(): void {
        try {
            const stored = localStorage.getItem(STORAGE_KEY)
            if (stored) {
                this._highScore = parseInt(stored, 10) || 0
            }
        } catch {
            this._highScore = 0
        }
    }

    private saveHighScore(): void {
        if (this._score > this._highScore) {
            this._highScore = this._score
            try {
                localStorage.setItem(STORAGE_KEY, this._highScore.toString())
            } catch {
                /* storage unavailable */
            }
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
        if (width <= 0 || height <= 0) return

        this.canvas.width = width
        this.canvas.height = height
        this.renderer.resize(width, height)
    }

    private buildPlayfield(): void {
        this.walls = []

        this.walls.push(new Wall(15, 55, 15, 410))
        this.walls.push(new Wall(15, 55, 245, 55))

        this.walls.push(new Wall(325, 445, 270, 80, 0.95))
        this.walls.push(new Wall(270, 80, 245, 55, 0.9))
        this.walls.push(new Wall(248, 430, 325, 445, 0.7))

        this.walls.push(new Wall(15, 410, 75, 452))
        this.walls.push(new Wall(246, 385, 182, 446))

        this.walls.push(new Wall(22, 330, 50, 398, 1.3))
        this.walls.push(new Wall(50, 398, 22, 390, 1.3))

        this.walls.push(new Wall(232, 330, 212, 398, 1.3))
        this.walls.push(new Wall(212, 398, 232, 390, 1.3))

        const flipperY = 454
        this.flippers = [
            new Flipper(85, flipperY, 58, "left"),
            new Flipper(210, flipperY, 58, "right"),
        ]

        this.bumpers = [
            new Bumper(130, 155, 20, 100),
            new Bumper(95, 215, 18, 100),
            new Bumper(165, 215, 18, 100),
            new Bumper(60, 290, 15, 150),
            new Bumper(200, 290, 15, 150),
            new Bumper(105, 345, 14, 150),
            new Bumper(160, 345, 14, 150),
        ]

        this.targets = [
            new Target(35, 140, 10, 28, 500),
            new Target(35, 175, 10, 28, 500),
            new Target(35, 210, 10, 28, 500),
            new Target(235, 140, 10, 28, 500),
            new Target(235, 175, 10, 28, 500),
            new Target(235, 210, 10, 28, 500),
        ]

        this.launcher = new Launcher(300, 370, 22, 60)
    }

    private setupInput(): void {
        this.canvas.tabIndex = 0
        this.canvas.style.outline = "none"

        this.handleKeyDown = (e: KeyboardEvent): void => {
            const key = e.key

            if (key === " " || key === "ArrowLeft" || key === "ArrowRight") {
                e.preventDefault()
            }

            if (key === " " || e.code === "Space") {
                if (this._gameState === "idle") {
                    this.startGame()
                } else if (this._gameState === "gameOver") {
                    this.resetGame()
                } else if (this._gameState === "playing" && !this.ball.active) {
                    this.launcher.startCharge()
                }
            }

            if (key.toLowerCase() === "z" || key === "ArrowLeft") {
                this.flippers[0].isPressed = true
                this.playSound("pinball_flipper")
            }
            if (key.toLowerCase() === "x" || key === "ArrowRight") {
                this.flippers[1].isPressed = true
                this.playSound("pinball_flipper")
            }
        }

        this.handleKeyUp = (e: KeyboardEvent): void => {
            const key = e.key

            if (key === " " || e.code === "Space") {
                if (this.launcher.isCharging && !this.ball.active) {
                    const power = this.launcher.release()
                    this.ball.launch(power)
                    this.ballSaveFrames = BALL_SAVE_DURATION
                    this.playSound("pinball_launch")
                }
            }

            if (key.toLowerCase() === "z" || key === "ArrowLeft") {
                this.flippers[0].isPressed = false
            }
            if (key.toLowerCase() === "x" || key === "ArrowRight") {
                this.flippers[1].isPressed = false
            }
        }

        this.canvas.addEventListener("keydown", this.handleKeyDown)
        this.canvas.addEventListener("keyup", this.handleKeyUp)

        this.canvas.addEventListener("mousedown", () => {
            this.canvas.focus()
            if (this._gameState === "idle") {
                this.startGame()
            } else if (this._gameState === "gameOver") {
                this.resetGame()
            } else if (this._gameState === "playing" && !this.ball.active) {
                this.launcher.startCharge()
            }
        })

        this.canvas.addEventListener("mouseup", () => {
            if (this.launcher.isCharging && !this.ball.active) {
                const power = this.launcher.release()
                this.ball.launch(power)
                this.ballSaveFrames = BALL_SAVE_DURATION
                this.playSound("pinball_launch")
            }
        })
    }

    public startGame(): void {
        this._gameState = "playing"
        this._score = 0
        this._ballsRemaining = 3
        this.targets.forEach((t) => t.reset())
        this.resetBallPosition()
        this.canvas.focus()
    }

    private resetGame(): void {
        this.saveHighScore()
        this.startGame()
    }

    private resetBallPosition(): void {
        this.ball.reset(BALL_START_X, BALL_START_Y)
    }

    private checkBallLost(): boolean {
        return this.ball.position.y > DRAIN_Y
    }

    public stepPhysics(): void {
        if (
            this.paused ||
            this._gameState === "idle" ||
            this._gameState === "gameOver"
        ) {
            return
        }

        this.launcher.update()
        this.flippers.forEach((f) => f.update())
        this.bumpers.forEach((b) => b.update())
        this.targets.forEach((t) => t.update())

        for (let step = 0; step < SUBSTEPS; step++) {
            this.ball.update()

            if (!this.ball.active) continue

            this.walls.forEach((wall) => {
                wall.checkCollision(this.ball)
            })

            this.flippers.forEach((flipper) => {
                flipper.checkCollision(this.ball)
            })

            this.bumpers.forEach((bumper) => {
                const result = bumper.checkCollision(this.ball)
                if (result.hit) {
                    this._score += result.points
                    this.playSound("pinball_bumper")
                }
            })

            this.targets.forEach((target) => {
                const result = target.checkCollision(this.ball)
                if (result.hit) {
                    this._score += result.points
                    this.playSound("pinball_target")
                }
            })
        }

        if (this.ballSaveFrames > 0) {
            this.ballSaveFrames--
        }

        if (this.ball.active && this.checkBallLost()) {
            if (this.ballSaveFrames > 0) {
                this.resetBallPosition()
                this.ballSaveFrames = 0
            } else {
                this._ballsRemaining--
                this.playSound("pinball_drain")

                if (this._ballsRemaining <= 0) {
                    this._gameState = "gameOver"
                    this.saveHighScore()
                    this.playSound("pinball_gameover")

                    const allTargetsHit = this.targets.every((t) => t.isHit)
                    emitAppEvent("pinball:gameover", {
                        score: this._score,
                        highScore: this._highScore,
                        allTargetsHit,
                    })
                } else {
                    this.resetBallPosition()
                    this.targets.forEach((t) => t.reset())
                }
            }
        }
    }

    private render(): void {
        this.renderer.beginFrame()

        this.renderer.drawBackground()
        this.walls.forEach((wall) => this.renderer.drawWall(wall))
        this.bumpers.forEach((bumper) => this.renderer.drawBumper(bumper))
        this.targets.forEach((target) => this.renderer.drawTarget(target))
        this.flippers.forEach((flipper) => this.renderer.drawFlipper(flipper))
        this.renderer.drawLauncher(this.launcher)
        this.renderer.drawBall(this.ball)

        this.renderer.drawScorePanel(
            this._score,
            this._highScore,
            this._ballsRemaining,
            this._gameState
        )

        if (this._gameState === "idle") {
            this.renderer.drawMessage("WANTED", "Press SPACE or click to start")
            this.renderer.drawInstructions()
        } else if (this._gameState === "gameOver") {
            this.renderer.drawMessage(
                "GAME OVER",
                `Final Score: ${this._score}`
            )
        } else if (!this.ball.active && this._gameState === "playing") {
            this.renderer.drawMessage("HOLD SPACE", "Release to launch")
        }

        this.renderer.endFrame()
    }

    private gameLoop = (): void => {
        this.stepPhysics()
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
        if (this.handleKeyDown) {
            this.canvas.removeEventListener("keydown", this.handleKeyDown)
        }
        if (this.handleKeyUp) {
            this.canvas.removeEventListener("keyup", this.handleKeyUp)
        }
    }
}

export function initPinball(container: HTMLElement): PinballGame | null {
    const canvas = container.querySelector("canvas")
    if (!canvas) return null

    const canvasEl = canvas

    const game = new PinballGame(canvasEl)

    const resizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
            const { width, height } = entry.contentRect
            if (width > 0 && height > 0) {
                game.resize(width, height)
            }
        }
    })

    resizeObserver.observe(container)

    const initialWidth = container.clientWidth
    const initialHeight = container.clientHeight
    if (initialWidth > 0 && initialHeight > 0) {
        game.resize(initialWidth, initialHeight)
    }

    game.start()

    return game
}
