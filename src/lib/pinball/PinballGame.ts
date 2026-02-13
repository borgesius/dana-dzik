import { CanvasError } from "@/core/errors"

import { emitAppEvent } from "../events"
import {
    Ball,
    Bumper,
    Flipper,
    Launcher,
    OneWayWall,
    Post,
    Slingshot,
    Target,
    Wall,
} from "./entities"
import { ParticleSystem } from "./particles"
import { LOGICAL_HEIGHT, LOGICAL_WIDTH, SUBSTEPS, Vector2D } from "./physics"
import type { PhysicsInput, PhysicsOutput } from "./physicsTypes"
import { requestPhysicsStep } from "./physicsWorkerClient"
import { PinballRenderer } from "./renderer"

export type GameState = "idle" | "launching" | "playing" | "gameOver"

interface AudioManager {
    playSound: (name: string) => void
}

const STORAGE_KEY = "pinball-high-score"

const BALL_START_X = 300
const BALL_START_Y = 420
const BALL_RADIUS = 8

const COWBOY_DAN_QUOTES = [
    "COWBOY DAN: I WANT MORE!!!!!",
    "COWBOY DAN: GONNA START A WAR!!!",
    "COWBOY DAN: I'M A MAJOR PLAYER IN THE COWBOY SCENE!!!",
    "COWBOY DAN: FIRING MY RIFLE IN THE SKY!!!",
]
const FEVER_QUOTE = "COWBOY DAN: GOD IF I HAVE TO DIE YOU WILL HAVE TO DIE!!!"

const TICKER_SPEED = 1.2
const TICKER_PAUSE_FRAMES = 120

const DRAIN_Y = LOGICAL_HEIGHT + BALL_RADIUS + 5
const BALL_SAVE_DURATION = 180

// Game speed scales asymptotically: 0.5x at 0 pts → 1.0x at ~200k → 1.25x max
const GAME_SPEED_MIN = 0.5
const GAME_SPEED_MAX = 1.25
const GAME_SPEED_K = Math.log(3) / 200_000

const COMBO_TIMEOUT = 90
const FEVER_DURATION = 600
const FEVER_COMBO_THRESHOLD = 10
const ALL_TARGETS_BONUS = 2500

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
    private slingshots: Slingshot[] = []
    private posts: Post[] = []
    private guideRails: Wall[] = []
    private launcher: Launcher

    private _score: number = 0
    private _highScore: number = 0
    private _ballsRemaining: number = 3
    private _gameState: GameState = "idle"
    private ballSaveFrames: number = 0
    private launcherSettleFrames: number = 0

    private audioManager: AudioManager | null = null

    private tickerMessage: string = ""
    private tickerX: number = 0
    private tickerPauseFrames: number = 0
    private tickerQuoteIndex: number = -1

    // Screen shake
    private shakeIntensity: number = 0
    private shakeDuration: number = 0
    private shakeX: number = 0
    private shakeY: number = 0

    // Combo system
    private comboCount: number = 0
    private comboTimer: number = 0
    private _multiplier: number = 1

    // Fever mode
    private _feverActive: boolean = false
    private _feverTimer: number = 0
    private _feverMaxTimer: number = FEVER_DURATION

    // Particles
    private particleSystem: ParticleSystem = new ParticleSystem()
    private ballTrailCounter: number = 0

    // Flash effect (all-targets)
    private flashAlpha: number = 0

    private handleKeyDown: ((e: KeyboardEvent) => void) | null = null
    private handleKeyUp: ((e: KeyboardEvent) => void) | null = null

    constructor(canvas: HTMLCanvasElement) {
        this.canvas = canvas
        const ctx = canvas.getContext("2d")
        if (!ctx)
            throw new CanvasError("Could not get canvas context", {
                component: "PinballGame",
            })

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

    public get multiplier(): number {
        return this._multiplier
    }

    public get feverActive(): boolean {
        return this._feverActive
    }

    public get feverProgress(): number {
        return this._feverTimer / this._feverMaxTimer
    }

    private get gameSpeed(): number {
        return (
            GAME_SPEED_MAX -
            (GAME_SPEED_MAX - GAME_SPEED_MIN) *
                Math.exp(-GAME_SPEED_K * this._score)
        )
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

    public getSlingshots(): Slingshot[] {
        return this.slingshots
    }

    public getPosts(): Post[] {
        return this.posts
    }

    public getGuideRails(): Wall[] {
        return this.guideRails
    }

    public getParticleSystem(): ParticleSystem {
        return this.particleSystem
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

        // Left outer wall
        this.walls.push(new Wall(15, 55, 15, 410))
        // Top wall
        this.walls.push(new Wall(15, 55, 245, 55))

        // Launcher channel
        this.walls.push(new Wall(325, 445, 270, 80, 0.95))
        this.walls.push(new Wall(270, 80, 245, 55, 0.9))
        this.walls.push(new OneWayWall(248, 100, 248, 430, -1, 0))
        this.walls.push(new Wall(248, 430, 325, 445, 0.7))

        // Drain guides (angled walls leading to flippers)
        this.walls.push(new Wall(15, 410, 72, 452))
        this.walls.push(new Wall(240, 400, 205, 448))

        // Top orbit kickback wall
        this.walls.push(new Wall(15, 75, 60, 55, 1.2))

        const flipperY = 454
        this.flippers = [
            new Flipper(80, flipperY, 68, "left"),
            new Flipper(215, flipperY, 68, "right"),
        ]

        // Slingshots (triangular kickers flanking the flippers)
        this.slingshots = [
            // Left slingshot
            new Slingshot(22, 330, 48, 395, 22, 385, 25, 1.5),
            // Right slingshot
            new Slingshot(235, 330, 215, 395, 235, 385, 25, 1.5),
        ]

        // Bumpers: tight triangle up top + two wide mid-field wings
        this.bumpers = [
            new Bumper(132, 120, 20, 50), // top center
            new Bumper(100, 170, 18, 50), // left
            new Bumper(165, 170, 18, 50), // right
            new Bumper(55, 270, 16, 75), // left wing
            new Bumper(205, 270, 16, 75), // right wing
        ]

        // Targets: left bank, right bank, and orbit target
        this.targets = [
            new Target(30, 135, 10, 28, 250),
            new Target(30, 170, 10, 28, 250),
            new Target(30, 205, 10, 28, 250),
            new Target(230, 135, 10, 28, 250),
            new Target(230, 170, 10, 28, 250),
            new Target(230, 205, 10, 28, 250),
            new Target(40, 65, 12, 12, 375), // orbit lane target
        ]

        // Posts: small decorative posts in the lower playfield
        this.posts = [
            new Post(90, 320, 4, 10),
            new Post(170, 320, 4, 10),
            new Post(130, 365, 5, 10),
            new Post(75, 390, 4, 10),
            new Post(190, 390, 4, 10),
        ]

        // Guide rails: gentle funnel toward flippers
        this.guideRails = [
            new Wall(65, 345, 90, 370, 0.95),
            new Wall(195, 345, 170, 370, 0.95),
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
        this.comboCount = 0
        this.comboTimer = 0
        this._multiplier = 1
        this._feverActive = false
        this._feverTimer = 0
        this.shakeIntensity = 0
        this.shakeDuration = 0
        this.flashAlpha = 0
        this.particleSystem.clear()
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

    private triggerShake(intensity: number, duration: number): void {
        if (intensity > this.shakeIntensity) {
            this.shakeIntensity = intensity
            this.shakeDuration = duration
        }
    }

    private updateShake(dt: number): void {
        if (this.shakeDuration > 0) {
            const t = this.shakeDuration / 15 // normalized decay
            this.shakeX = (Math.random() - 0.5) * 2 * this.shakeIntensity * t
            this.shakeY = (Math.random() - 0.5) * 2 * this.shakeIntensity * t
            this.shakeDuration -= dt
        } else {
            this.shakeX = 0
            this.shakeY = 0
            this.shakeIntensity = 0
        }
    }

    private getComboMultiplier(): number {
        if (this.comboCount >= 10) return 5
        if (this.comboCount >= 6) return 3
        if (this.comboCount >= 3) return 2
        return 1
    }

    private registerHit(
        basePoints: number,
        x: number,
        y: number,
        color: string,
        particleCount: number
    ): void {
        this.comboCount++
        this.comboTimer = COMBO_TIMEOUT

        const prevMultiplier = this._multiplier
        this._multiplier = this.getComboMultiplier()

        const feverBonus = this._feverActive ? 5 : 1
        const totalMultiplier = this._multiplier * feverBonus
        const points = basePoints * totalMultiplier
        this._score += points

        const label =
            totalMultiplier > 1
                ? `+${points} x${totalMultiplier}`
                : `+${points}`
        this.particleSystem.addFloatingText(x, y - 10, label, color)

        this.particleSystem.burst(x, y, particleCount, color, 2.5, 2.5, 25)

        const shakeBase = particleCount > 8 ? 3 : 2
        this.triggerShake(
            Math.min(shakeBase + (this._multiplier - 1), 6),
            8 + this._multiplier * 2
        )

        if (
            !this._feverActive &&
            this.comboCount >= FEVER_COMBO_THRESHOLD &&
            prevMultiplier < 5
        ) {
            this.activateFever()
        }
    }

    private activateFever(): void {
        this._feverActive = true
        this._feverTimer = FEVER_DURATION
        this.triggerShake(5, 15)

        this.tickerMessage = FEVER_QUOTE
        this.tickerX = LOGICAL_WIDTH + 10
        this.tickerPauseFrames = 0

        const cx = LOGICAL_WIDTH / 2
        const cy = LOGICAL_HEIGHT / 2
        this.particleSystem.burst(cx, cy, 20, "#FF4444", 3.5, 3, 35)
        this.particleSystem.burst(cx, cy, 15, "#FF8800", 3, 2.5, 30)
    }

    private updateCombo(dt: number): void {
        if (this.comboTimer > 0) {
            this.comboTimer -= dt
        } else if (this.comboCount > 0) {
            this.comboCount = 0
            this._multiplier = 1
        }
    }

    private updateFever(dt: number): void {
        if (!this._feverActive) return
        this._feverTimer -= dt
        if (this._feverTimer <= 0) {
            this._feverActive = false
            this._feverTimer = 0
        }
    }

    private updateBallTrail(): void {
        if (!this.ball.active) return
        const speed = this.ball.velocity.magnitude()
        const threshold = this._feverActive ? 3 : 6
        if (speed > threshold) {
            this.ballTrailCounter++
            const interval = this._feverActive ? 1 : 2
            if (this.ballTrailCounter % interval === 0) {
                const color = this._feverActive ? "#FF6633" : "#AAAAAA"
                const size = this._feverActive ? 2.5 : 1.5
                this.particleSystem.trail(
                    this.ball.position.x,
                    this.ball.position.y,
                    color,
                    size,
                    this._feverActive ? 20 : 12
                )
            }
        } else {
            this.ballTrailCounter = 0
        }
    }

    private updateFlash(dt: number): void {
        if (this.flashAlpha > 0) {
            this.flashAlpha = Math.max(0, this.flashAlpha - 0.06 * dt)
        }
    }

    private checkAllTargets(): void {
        if (this.targets.every((t) => t.isHit)) {
            const cx = LOGICAL_WIDTH / 2
            const cy = LOGICAL_HEIGHT / 2 - 30
            this.particleSystem.burst(cx, cy, 20, "#FFD700", 4, 3, 40)
            this.particleSystem.burst(cx, cy, 15, "#FFFFFF", 3, 2, 30)
            this.flashAlpha = 0.3
            this.triggerShake(4, 12)

            const feverBonus = this._feverActive ? 5 : 1
            const points = ALL_TARGETS_BONUS * this._multiplier * feverBonus
            this._score += points
            this.particleSystem.addFloatingText(
                cx,
                cy,
                `+${points} ALL TARGETS`,
                "#FFFFFF",
                70
            )
        }
    }

    public stepPhysics(): void {
        if (
            this.paused ||
            this._gameState === "idle" ||
            this._gameState === "gameOver"
        ) {
            return
        }

        const speed = this.gameSpeed

        this.launcher.update(speed)
        this.flippers.forEach((f) => f.update(speed))
        this.bumpers.forEach((b) => b.update(speed))
        this.targets.forEach((t) => t.update(speed))
        this.slingshots.forEach((s) => s.update(speed))
        this.posts.forEach((p) => p.update(speed))

        for (let step = 0; step < SUBSTEPS; step++) {
            this.ball.update(speed)

            if (!this.ball.active) continue

            this.walls.forEach((wall) => {
                wall.checkCollision(this.ball)
            })

            this.guideRails.forEach((rail) => {
                rail.checkCollision(this.ball)
            })

            this.flippers.forEach((flipper) => {
                flipper.checkCollision(this.ball)
            })

            this.bumpers.forEach((bumper) => {
                const result = bumper.checkCollision(this.ball)
                if (result.hit) {
                    this.registerHit(
                        result.points,
                        bumper.position.x,
                        bumper.position.y,
                        "#FF4444",
                        8
                    )
                    this.playSound("pinball_bumper")
                }
            })

            this.targets.forEach((target) => {
                const result = target.checkCollision(this.ball)
                if (result.hit) {
                    this.registerHit(
                        result.points,
                        target.position.x,
                        target.position.y,
                        "#FFD700",
                        12
                    )
                    this.playSound("pinball_target")
                    this.checkAllTargets()
                }
            })

            this.slingshots.forEach((slingshot) => {
                const result = slingshot.checkCollision(this.ball)
                if (result.hit) {
                    const c = slingshot.center
                    this.registerHit(result.points, c.x, c.y, "#C4A882", 6)
                    this.playSound("pinball_bumper")
                }
            })

            this.posts.forEach((post) => {
                const result = post.checkCollision(this.ball)
                if (result.hit) {
                    this.registerHit(
                        result.points,
                        post.position.x,
                        post.position.y,
                        "#B8B8B8",
                        4
                    )
                    this.playSound("pinball_bumper")
                }
            })
        }

        if (this.ballSaveFrames > 0) {
            this.ballSaveFrames -= speed
        }

        this.updateCombo(speed)
        this.updateFever(speed)
        this.updateShake(speed)
        this.updateBallTrail()
        this.updateFlash(speed)
        this.particleSystem.update(speed)

        this.updateTicker()

        if (
            this.ball.active &&
            this.ball.position.x > 248 &&
            this.ball.position.y > 350 &&
            this.ball.velocity.magnitude() < 1.5
        ) {
            this.launcherSettleFrames += speed
            if (this.launcherSettleFrames > 45) {
                this.ball.reset(BALL_START_X, BALL_START_Y)
                this.launcherSettleFrames = 0
            }
        } else {
            this.launcherSettleFrames = 0
        }

        if (this.ball.active && this.checkBallLost()) {
            if (this.ballSaveFrames > 0) {
                this.resetBallPosition()
                this.ballSaveFrames = 0
            } else {
                this.particleSystem.burst(
                    this.ball.position.x,
                    LOGICAL_HEIGHT - 10,
                    6,
                    "#FF6633",
                    1.5,
                    2,
                    20
                )
                this.triggerShake(3, 10)
                this.comboCount = 0
                this.comboTimer = 0
                this._multiplier = 1
                this._feverActive = false
                this._feverTimer = 0

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

    private pickNextQuote(): void {
        let nextIndex = Math.floor(Math.random() * COWBOY_DAN_QUOTES.length)
        if (
            nextIndex === this.tickerQuoteIndex &&
            COWBOY_DAN_QUOTES.length > 1
        ) {
            nextIndex = (nextIndex + 1) % COWBOY_DAN_QUOTES.length
        }
        this.tickerQuoteIndex = nextIndex
        this.tickerMessage = COWBOY_DAN_QUOTES[nextIndex]
        this.tickerX = LOGICAL_WIDTH + 10
    }

    private updateTicker(): void {
        if (this._gameState !== "playing") return

        if (!this.tickerMessage) {
            if (this.tickerPauseFrames > 0) {
                this.tickerPauseFrames -= this.gameSpeed
            } else {
                if (this._feverActive) {
                    this.tickerMessage = FEVER_QUOTE
                    this.tickerX = LOGICAL_WIDTH + 10
                } else {
                    this.pickNextQuote()
                }
            }
            return
        }

        this.tickerX -= TICKER_SPEED * this.gameSpeed

        // Estimate text width (~6px per char at 9px font)
        const textWidth = this.tickerMessage.length * 6
        if (this.tickerX < -textWidth) {
            this.tickerMessage = ""
            this.tickerPauseFrames = TICKER_PAUSE_FRAMES
        }
    }

    private render(): void {
        this.renderer.beginFrame(this.shakeX, this.shakeY)

        this.renderer.drawBackground(this._feverActive)
        this.walls.forEach((wall) => this.renderer.drawWall(wall))
        this.guideRails.forEach((rail) => this.renderer.drawGuideRail(rail))
        this.slingshots.forEach((s) => this.renderer.drawSlingshot(s))
        this.posts.forEach((post) => this.renderer.drawPost(post))
        this.bumpers.forEach((bumper) =>
            this.renderer.drawBumper(bumper, this._feverActive)
        )
        this.targets.forEach((target) => this.renderer.drawTarget(target))
        this.flippers.forEach((flipper) => this.renderer.drawFlipper(flipper))
        this.renderer.drawLauncher(this.launcher)
        this.renderer.drawBall(this.ball, this._feverActive)

        this.renderer.drawParticles(this.particleSystem.particles)
        this.renderer.drawFloatingTexts(this.particleSystem.floatingTexts)

        if (this.flashAlpha > 0) {
            this.renderer.drawFlash(this.flashAlpha)
        }

        this.renderer.drawScorePanel(
            this._score,
            this._highScore,
            this._ballsRemaining,
            this._gameState,
            this._multiplier,
            this._feverActive,
            this.feverProgress
        )

        if (this.tickerMessage && this._gameState === "playing") {
            this.renderer.drawCowboyDanTicker(
                this.tickerMessage,
                this.tickerX,
                this._feverActive
            )
        }

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

    private workerBusy = false

    /** Serialize current game state into a plain object for the worker. */
    private serializePhysicsInput(): PhysicsInput {
        const toVec = (v: Vector2D): { x: number; y: number } => ({
            x: v.x,
            y: v.y,
        })

        const physicsState =
            this._gameState === "launching" ? "playing" : this._gameState

        return {
            ball: {
                position: toVec(this.ball.position),
                velocity: toVec(this.ball.velocity),
                radius: this.ball.radius,
                active: this.ball.active,
            },
            flippers: this.flippers.map((f) => ({
                pivot: toVec(f.pivot),
                length: f.length,
                angle: f.angle,
                restAngle: f.restAngle,
                activeAngle: f.activeAngle,
                side: f.side,
                isPressed: f.isPressed,
                angularVelocity: f.angularVelocity,
            })),
            bumpers: this.bumpers.map((b) => ({
                position: toVec(b.position),
                radius: b.radius,
                points: b.points,
                hitAnimation: b.hitAnimation,
            })),
            targets: this.targets.map((t) => ({
                position: toVec(t.position),
                width: t.width,
                height: t.height,
                points: t.points,
                isHit: t.isHit,
                hitAnimation: t.hitAnimation,
            })),
            walls: this.walls.map((w) => ({
                start: toVec(w.start),
                end: toVec(w.end),
                damping: w.damping,
            })),
            guideRails: this.guideRails.map((r) => ({
                start: toVec(r.start),
                end: toVec(r.end),
                damping: r.damping,
            })),
            oneWayWalls: this.guideRails
                .filter((r): r is OneWayWall => r instanceof OneWayWall)
                .map((r) => ({
                    start: toVec(r.start),
                    end: toVec(r.end),
                    damping: r.damping,
                    blockNormal: toVec(r.blockNormal),
                })),
            posts: this.posts.map((p) => ({
                position: toVec(p.position),
                radius: p.radius,
                points: p.points,
                hitAnimation: p.hitAnimation,
                damping: 0.85,
            })),
            slingshots: this.slingshots.map((s) => ({
                vertices: s.vertices.map(toVec) as [
                    { x: number; y: number },
                    { x: number; y: number },
                    { x: number; y: number },
                ],
                points: s.points,
                hitAnimation: s.hitAnimation,
                damping: s.damping,
            })),
            launcher: {
                position: toVec(this.launcher.position),
                power: this.launcher.power,
                maxPower: this.launcher.maxPower,
                isCharging: this.launcher.isCharging,
            },
            gameSpeed: this.gameSpeed,
            paused: this.paused,
            gameState: physicsState,
            ballSaveFrames: this.ballSaveFrames,
            comboCount: this.comboCount,
            comboTimer: this.comboTimer,
            multiplier: this._multiplier,
            feverActive: this._feverActive,
            feverTimer: this._feverTimer,
            ballsRemaining: this._ballsRemaining,
            score: this._score,
            highScore: this._highScore,
            launcherSettleFrames: this.launcherSettleFrames,
        }
    }

    /** Apply the worker's physics output back to game entities. */
    private applyPhysicsOutput(out: PhysicsOutput): void {
        // Ball
        this.ball.position = new Vector2D(
            out.ball.position.x,
            out.ball.position.y
        )
        this.ball.velocity = new Vector2D(
            out.ball.velocity.x,
            out.ball.velocity.y
        )
        this.ball.active = out.ball.active

        // Flippers
        for (
            let i = 0;
            i < this.flippers.length && i < out.flippers.length;
            i++
        ) {
            this.flippers[i].angle = out.flippers[i].angle
            this.flippers[i].angularVelocity = out.flippers[i].angularVelocity
        }

        // Bumpers
        for (
            let i = 0;
            i < this.bumpers.length && i < out.bumpers.length;
            i++
        ) {
            this.bumpers[i].hitAnimation = out.bumpers[i].hitAnimation
        }

        // Targets
        for (
            let i = 0;
            i < this.targets.length && i < out.targets.length;
            i++
        ) {
            this.targets[i].isHit = out.targets[i].isHit
            this.targets[i].hitAnimation = out.targets[i].hitAnimation
        }

        // Posts
        for (let i = 0; i < this.posts.length && i < out.posts.length; i++) {
            this.posts[i].hitAnimation = out.posts[i].hitAnimation
        }

        // Slingshots
        for (
            let i = 0;
            i < this.slingshots.length && i < out.slingshots.length;
            i++
        ) {
            this.slingshots[i].hitAnimation = out.slingshots[i].hitAnimation
        }

        // Launcher
        this.launcher.power = out.launcher.power

        // Scalar state
        this.ballSaveFrames = out.ballSaveFrames
        this.comboCount = out.comboCount
        this.comboTimer = out.comboTimer
        this._multiplier = out.multiplier
        this._feverActive = out.feverActive
        this._feverTimer = out.feverTimer
        this._ballsRemaining = out.ballsRemaining
        this.launcherSettleFrames = out.launcherSettleFrames

        // Process hit events (sounds + particles)
        for (const hit of out.hits) {
            this.registerHit(
                hit.points,
                hit.x,
                hit.y,
                hit.color,
                hit.particleSize
            )
            this.playSound(hit.sound)
        }

        if (out.allTargetsHit) {
            this.checkAllTargets()
        }

        if (out.drainBurst) {
            this.particleSystem.burst(
                this.ball.position.x,
                LOGICAL_HEIGHT - 10,
                6,
                "#FF6633",
                1.5,
                2,
                20
            )
            this.triggerShake(3, 10)
            this.playSound("pinball_drain")
        }

        if (out.gameOver) {
            this._gameState = "gameOver"
            this.saveHighScore()
            this.playSound("pinball_gameover")
            const allTargetsHit = this.targets.every((t) => t.isHit)
            emitAppEvent("pinball:gameover", {
                score: this._score,
                highScore: this._highScore,
                allTargetsHit,
            })
        }

        this.updateCombo(this.gameSpeed)
        this.updateFever(this.gameSpeed)
        this.updateShake(this.gameSpeed)
        this.updateBallTrail()
        this.updateFlash(this.gameSpeed)
        this.particleSystem.update(this.gameSpeed)
        this.updateTicker()
    }

    private gameLoop = (): void => {
        if (!this.workerBusy) {
            const input = this.serializePhysicsInput()
            const promise = requestPhysicsStep(input)

            if (promise) {
                this.workerBusy = true
                void promise.then((output) => {
                    this.applyPhysicsOutput(output)
                    this.workerBusy = false
                })
            } else {
                // Worker unavailable — fall back to synchronous physics
                this.stepPhysics()
            }
        }

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
