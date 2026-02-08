import { BOSS_TAUNTS } from "./levels"
import type { LevelConfig, ObstacleType } from "./types"

export type RunnerState = "countdown" | "playing" | "won" | "dead"

// ── Obstacle entity ─────────────────────────────────────────────────────────

interface Obstacle {
    lane: number
    depth: number // 0 = at player, 1 = far horizon
    type: ObstacleType
    width: number // in lanes (1 or 2)
    reverse: boolean // approaching from behind
}

// ── Glue wall state ─────────────────────────────────────────────────────────

interface GlueWalls {
    leftNarrow: number // how many lanes narrowed from left
    rightNarrow: number
    nextNarrowTime: number
}

// ── Taunt state ─────────────────────────────────────────────────────────────

interface Taunt {
    text: string
    x: number
    opacity: number
}

// ── Constants ───────────────────────────────────────────────────────────────

const LOGICAL_W = 800
const LOGICAL_H = 600
const HORIZON_Y = 120
const PLAYER_Y = 520
const PLAYER_SIZE = 28
const VANISHING_X = LOGICAL_W / 2
const ROAD_LEFT = 100
const ROAD_RIGHT = 700
const HIT_DEPTH = 0.05
const COUNTDOWN_SECONDS = 3
const LANE_SHIFT_AMPLITUDE = 30
const LANE_SHIFT_PERIOD = 4 // seconds per full cycle

const NEON_COLORS = ["#00ffff", "#ff00ff", "#ffffff", "#ff4444", "#44ff44"]
const GLUE_COLOR = "#88aa22"

export class CubeRunner {
    private canvas: HTMLCanvasElement
    private ctx: CanvasRenderingContext2D
    private config: LevelConfig
    private animationId: number | null = null

    private _state: RunnerState = "countdown"
    private elapsed: number = 0
    private countdownRemaining: number = COUNTDOWN_SECONDS
    private lastTimestamp: number = 0

    private targetLane: number = 0
    private playerX: number = 0 // smooth interpolated x

    private obstacles: Obstacle[] = []
    private spawnTimer: number = 0

    private glueWalls: GlueWalls | null = null
    private taunts: Taunt[] = []
    private nextTauntTime: number = 5
    private tauntIndex: number = 0

    private laneShiftOffset: number = 0

    private keysDown: Set<string> = new Set()
    private touchStartX: number | null = null

    private handleKeyDown: ((e: KeyboardEvent) => void) | null = null
    private handleKeyUp: ((e: KeyboardEvent) => void) | null = null
    private handleTouchStart: ((e: TouchEvent) => void) | null = null
    private handleTouchMove: ((e: TouchEvent) => void) | null = null
    private handleTouchEnd: (() => void) | null = null

    private screenShake: number = 0
    private isBossMode: boolean = false

    public onWin: (() => void) | null = null
    public onDeath: (() => void) | null = null

    constructor(
        canvas: HTMLCanvasElement,
        config: LevelConfig,
        bossMode: boolean = false
    ) {
        this.canvas = canvas
        const ctx = canvas.getContext("2d")
        if (!ctx) throw new Error("Could not get canvas context")
        this.ctx = ctx
        this.config = config
        this.isBossMode = bossMode

        this.canvas.width = LOGICAL_W
        this.canvas.height = LOGICAL_H

        // Start in center lane
        const centerLane = Math.floor(config.lanes / 2)
        // Start in center lane
        this.targetLane = centerLane
        this.playerX = this.getLaneX(centerLane)

        if (config.glueWalls) {
            this.glueWalls = {
                leftNarrow: 0,
                rightNarrow: 0,
                nextNarrowTime: 10,
            }
        }

        this.setupInput()
    }

    public get state(): RunnerState {
        return this._state
    }

    public get timeRemaining(): number {
        return Math.max(0, this.config.survivalSeconds - this.elapsed)
    }

    public get progress(): number {
        return Math.min(1, this.elapsed / this.config.survivalSeconds)
    }

    // ── Lane geometry ───────────────────────────────────────────────────────

    private getActiveLanes(): number {
        if (!this.glueWalls) return this.config.lanes
        return Math.max(
            2,
            this.config.lanes -
                this.glueWalls.leftNarrow -
                this.glueWalls.rightNarrow
        )
    }

    private getLaneX(lane: number): number {
        const activeLanes = this.getActiveLanes()
        const roadWidth = ROAD_RIGHT - ROAD_LEFT
        const laneWidth = roadWidth / activeLanes
        const offset = this.glueWalls
            ? this.glueWalls.leftNarrow * laneWidth
            : 0
        return (
            ROAD_LEFT + offset + laneWidth * (lane + 0.5) + this.laneShiftOffset
        )
    }

    private getLaneWidth(): number {
        const activeLanes = this.getActiveLanes()
        return (ROAD_RIGHT - ROAD_LEFT) / activeLanes
    }

    // ── Input ───────────────────────────────────────────────────────────────

    private setupInput(): void {
        this.handleKeyDown = (e: KeyboardEvent) => {
            this.keysDown.add(e.key)
            if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") {
                this.moveLeft()
                e.preventDefault()
            }
            if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") {
                this.moveRight()
                e.preventDefault()
            }
        }
        this.handleKeyUp = (e: KeyboardEvent) => {
            this.keysDown.delete(e.key)
        }

        this.handleTouchStart = (e: TouchEvent) => {
            if (e.touches.length > 0) {
                this.touchStartX = e.touches[0].clientX
            }
        }
        this.handleTouchMove = (e: TouchEvent) => {
            if (this.touchStartX !== null && e.touches.length > 0) {
                const dx = e.touches[0].clientX - this.touchStartX
                if (Math.abs(dx) > 30) {
                    if (dx < 0) this.moveLeft()
                    else this.moveRight()
                    this.touchStartX = e.touches[0].clientX
                }
            }
            e.preventDefault()
        }
        this.handleTouchEnd = () => {
            this.touchStartX = null
        }

        document.addEventListener("keydown", this.handleKeyDown)
        document.addEventListener("keyup", this.handleKeyUp)
        this.canvas.addEventListener("touchstart", this.handleTouchStart, {
            passive: true,
        })
        this.canvas.addEventListener("touchmove", this.handleTouchMove, {
            passive: false,
        })
        this.canvas.addEventListener("touchend", this.handleTouchEnd)
    }

    private moveLeft(): void {
        if (this._state !== "playing") return
        const minLane = this.glueWalls ? this.glueWalls.leftNarrow : 0
        if (this.targetLane > 0) {
            this.targetLane = Math.max(minLane, this.targetLane - 1)
        }
    }

    private moveRight(): void {
        if (this._state !== "playing") return
        const maxLane = this.glueWalls
            ? this.config.lanes - 1 - this.glueWalls.rightNarrow
            : this.config.lanes - 1
        if (this.targetLane < maxLane) {
            this.targetLane = Math.min(maxLane, this.targetLane + 1)
        }
    }

    // ── Game loop ───────────────────────────────────────────────────────────

    public start(): void {
        this.lastTimestamp = performance.now()
        this.loop(this.lastTimestamp)
    }

    public stop(): void {
        if (this.animationId !== null) {
            cancelAnimationFrame(this.animationId)
            this.animationId = null
        }
        this.removeInput()
    }

    private removeInput(): void {
        if (this.handleKeyDown)
            document.removeEventListener("keydown", this.handleKeyDown)
        if (this.handleKeyUp)
            document.removeEventListener("keyup", this.handleKeyUp)
        if (this.handleTouchStart)
            this.canvas.removeEventListener("touchstart", this.handleTouchStart)
        if (this.handleTouchMove)
            this.canvas.removeEventListener("touchmove", this.handleTouchMove)
        if (this.handleTouchEnd)
            this.canvas.removeEventListener("touchend", this.handleTouchEnd)
    }

    private loop = (timestamp: number): void => {
        const dt = Math.min((timestamp - this.lastTimestamp) / 1000, 0.05)
        this.lastTimestamp = timestamp

        this.update(dt)
        this.render()

        if (this._state === "countdown" || this._state === "playing") {
            this.animationId = requestAnimationFrame(this.loop)
        }
    }

    // ── Update ──────────────────────────────────────────────────────────────

    private update(dt: number): void {
        if (this._state === "countdown") {
            this.countdownRemaining -= dt
            if (this.countdownRemaining <= 0) {
                this._state = "playing"
            }
            return
        }

        if (this._state !== "playing") return

        this.elapsed += dt

        // Win condition
        if (this.elapsed >= this.config.survivalSeconds) {
            this._state = "won"
            this.onWin?.()
            return
        }

        // Speed curve: ramps from baseSpeed to baseSpeed * maxSpeedMultiplier
        const t = this.elapsed / this.config.survivalSeconds
        const speedMul = 1 + (this.config.maxSpeedMultiplier - 1) * t
        const speed = this.config.baseSpeed * speedMul

        // Lane shift
        if (this.config.laneShift) {
            this.laneShiftOffset =
                Math.sin((this.elapsed / LANE_SHIFT_PERIOD) * Math.PI * 2) *
                LANE_SHIFT_AMPLITUDE *
                t // grows stronger over time
        }

        // Smooth player movement
        const targetX = this.getLaneX(this.targetLane)
        const moveSpeed = 1200 // pixels/sec
        const diff = targetX - this.playerX
        if (Math.abs(diff) < moveSpeed * dt) {
            this.playerX = targetX
        } else {
            this.playerX += Math.sign(diff) * moveSpeed * dt
        }

        // Spawn obstacles
        const spawnInterval =
            this.config.baseSpawnInterval -
            (this.config.baseSpawnInterval - this.config.minSpawnInterval) * t
        this.spawnTimer += dt
        if (this.spawnTimer >= spawnInterval) {
            this.spawnTimer -= spawnInterval
            this.spawnObstacle()
        }

        // Move obstacles
        const depthSpeed = speed / 800 // normalize to depth units/sec
        for (const obs of this.obstacles) {
            if (obs.reverse) {
                obs.depth += depthSpeed * dt * 0.7
            } else {
                obs.depth -= depthSpeed * dt
            }
        }

        // Collision detection
        for (const obs of this.obstacles) {
            if (obs.depth > HIT_DEPTH || obs.depth < -0.05) continue

            const playerLaneActual = this.targetLane
            const obsEnd = obs.lane + obs.width
            if (playerLaneActual >= obs.lane && playerLaneActual < obsEnd) {
                this._state = "dead"
                this.screenShake = 0.3
                this.onDeath?.()
                return
            }
        }

        // Near-miss screen shake
        for (const obs of this.obstacles) {
            if (Math.abs(obs.depth) < 0.08) {
                const playerLaneActual = this.targetLane
                const dist = Math.min(
                    Math.abs(playerLaneActual - obs.lane),
                    Math.abs(playerLaneActual - (obs.lane + obs.width - 1))
                )
                if (dist === 1) {
                    this.screenShake = Math.max(this.screenShake, 0.1)
                }
            }
        }

        // Remove off-screen obstacles
        this.obstacles = this.obstacles.filter(
            (o) => o.depth > -0.2 && o.depth < 1.5
        )

        // Glue walls
        if (this.glueWalls && this.elapsed >= this.glueWalls.nextNarrowTime) {
            const activeLanes = this.getActiveLanes()
            if (activeLanes > 2) {
                if (Math.random() < 0.5) {
                    this.glueWalls.leftNarrow++
                } else {
                    this.glueWalls.rightNarrow++
                }
                // Clamp player lane
                const maxLane =
                    this.config.lanes - 1 - this.glueWalls.rightNarrow
                if (this.targetLane > maxLane) this.targetLane = maxLane
                if (this.targetLane < this.glueWalls.leftNarrow) {
                    this.targetLane = this.glueWalls.leftNarrow
                }
            }
            this.glueWalls.nextNarrowTime += 8 + Math.random() * 4
        }

        // Taunts
        if (this.config.taunts && this.elapsed >= this.nextTauntTime) {
            const key = BOSS_TAUNTS[this.tauntIndex % BOSS_TAUNTS.length]
            this.taunts.push({
                text: key, // locale key — resolved at render
                x: LOGICAL_W + 50,
                opacity: 1,
            })
            this.tauntIndex++
            this.nextTauntTime += 4 + Math.random() * 3
        }

        // Move taunts
        for (const taunt of this.taunts) {
            taunt.x -= 200 * dt
            if (taunt.x < -400) taunt.opacity = 0
        }
        this.taunts = this.taunts.filter((t) => t.opacity > 0)

        // Decay screen shake
        this.screenShake = Math.max(0, this.screenShake - dt * 2)
    }

    private spawnObstacle(): void {
        const activeLanes = this.getActiveLanes()
        const minLane = this.glueWalls ? this.glueWalls.leftNarrow : 0

        const types = this.config.obstacleTypes
        const type = types[Math.floor(Math.random() * types.length)]

        let width = 1
        if (type === "double") width = 2
        if (type === "wall") width = Math.max(1, activeLanes - 1)

        const maxStartLane = minLane + activeLanes - width
        const lane =
            minLane + Math.floor(Math.random() * (maxStartLane - minLane + 1))

        const reverse = this.config.reverseObstacles && Math.random() < 0.2

        this.obstacles.push({
            lane,
            depth: reverse ? -0.1 : 1.0,
            type,
            width,
            reverse,
        })
    }

    // ── Rendering ───────────────────────────────────────────────────────────

    private render(): void {
        const ctx = this.ctx
        const w = LOGICAL_W
        const h = LOGICAL_H

        // Screen shake offset
        const shakeX =
            this.screenShake > 0
                ? (Math.random() - 0.5) * this.screenShake * 20
                : 0
        const shakeY =
            this.screenShake > 0
                ? (Math.random() - 0.5) * this.screenShake * 20
                : 0

        ctx.save()
        ctx.translate(shakeX, shakeY)

        // Background
        if (this.isBossMode) {
            // Pulsing dark red background
            const pulse = Math.sin(this.elapsed * 1.5) * 0.3 + 0.5
            const r = Math.floor(15 * pulse)
            ctx.fillStyle = `rgb(${r}, 0, 0)`
        } else {
            ctx.fillStyle = "#000000"
        }
        ctx.fillRect(-10, -10, w + 20, h + 20)

        // Scanlines
        if (this.isBossMode) {
            // Red-tinted scanlines for boss
            ctx.fillStyle = "rgba(255, 0, 0, 0.02)"
        } else {
            ctx.fillStyle = "rgba(255, 255, 255, 0.015)"
        }
        for (let y = 0; y < h; y += 3) {
            ctx.fillRect(0, y, w, 1)
        }

        // Boss mode: occasional lightning flashes
        if (
            this.isBossMode &&
            this._state === "playing" &&
            Math.random() < 0.003
        ) {
            ctx.fillStyle = "rgba(255, 0, 0, 0.08)"
            ctx.fillRect(0, 0, w, h)
        }

        // Road perspective lines
        this.renderRoad(ctx)

        // Obstacles
        for (const obs of this.obstacles) {
            this.renderObstacle(ctx, obs)
        }

        // Player
        this.renderPlayer(ctx)

        // Glue walls
        if (this.glueWalls) {
            this.renderGlueWalls(ctx)
        }

        // Taunts
        for (const taunt of this.taunts) {
            this.renderTaunt(ctx, taunt)
        }

        // HUD
        this.renderHUD(ctx)

        // Countdown
        if (this._state === "countdown") {
            this.renderCountdown(ctx)
        }

        // Death flash
        if (this._state === "dead") {
            ctx.fillStyle = "rgba(255, 0, 0, 0.3)"
            ctx.fillRect(0, 0, w, h)
        }

        ctx.restore()
    }

    private renderRoad(ctx: CanvasRenderingContext2D): void {
        const activeLanes = this.getActiveLanes()
        const laneWidth = this.getLaneWidth()
        const offset = this.glueWalls
            ? this.glueWalls.leftNarrow * laneWidth
            : 0
        const roadLeft = ROAD_LEFT + offset + this.laneShiftOffset
        const roadRight =
            ROAD_LEFT + offset + laneWidth * activeLanes + this.laneShiftOffset

        // Perspective road edges
        ctx.strokeStyle = this.isBossMode
            ? "rgba(255, 50, 50, 0.5)"
            : "rgba(0, 255, 255, 0.4)"
        ctx.lineWidth = 1

        // Left edge
        ctx.beginPath()
        ctx.moveTo(roadLeft, PLAYER_Y)
        ctx.lineTo(VANISHING_X, HORIZON_Y)
        ctx.stroke()

        // Right edge
        ctx.beginPath()
        ctx.moveTo(roadRight, PLAYER_Y)
        ctx.lineTo(VANISHING_X, HORIZON_Y)
        ctx.stroke()

        // Lane dividers
        ctx.strokeStyle = this.isBossMode
            ? "rgba(255, 50, 50, 0.1)"
            : "rgba(0, 255, 255, 0.15)"
        for (let i = 1; i < activeLanes; i++) {
            const x = roadLeft + laneWidth * i
            ctx.beginPath()
            ctx.moveTo(x, PLAYER_Y)
            ctx.lineTo(VANISHING_X, HORIZON_Y)
            ctx.stroke()
        }

        // Depth markers (horizontal lines receding)
        ctx.strokeStyle = "rgba(255, 0, 255, 0.1)"
        for (let d = 0; d < 1; d += 0.1) {
            const y = this.depthToY(d)
            const scale = this.depthToScale(d)
            const left = VANISHING_X - (VANISHING_X - roadLeft) * scale
            const right = VANISHING_X + (roadRight - VANISHING_X) * scale
            ctx.beginPath()
            ctx.moveTo(left, y)
            ctx.lineTo(right, y)
            ctx.stroke()
        }
    }

    private renderObstacle(ctx: CanvasRenderingContext2D, obs: Obstacle): void {
        if (obs.depth < 0 || obs.depth > 1) return

        const scale = this.depthToScale(obs.depth)
        const y = this.depthToY(obs.depth)
        const laneWidth = this.getLaneWidth()
        const centerX = this.getLaneX(obs.lane + obs.width / 2 - 0.5)

        // Perspective transform
        const screenX = VANISHING_X + (centerX - VANISHING_X) * scale
        const obsW = laneWidth * obs.width * scale * 0.8
        const obsH = PLAYER_SIZE * scale

        const alpha = Math.min(1, (1 - obs.depth) * 2)

        let color: string
        switch (obs.type) {
            case "glue":
                color = GLUE_COLOR
                break
            case "wall":
                color = "#ff4444"
                break
            case "double":
                color = "#ff00ff"
                break
            default:
                color =
                    NEON_COLORS[
                        Math.abs(obs.lane * 7 + Math.floor(obs.depth * 10)) %
                            NEON_COLORS.length
                    ]
        }

        // Wireframe cube
        ctx.strokeStyle = color
        ctx.globalAlpha = alpha
        ctx.lineWidth = Math.max(1, 2 * scale)

        // Front face
        ctx.strokeRect(screenX - obsW / 2, y - obsH, obsW, obsH)

        // Top face (perspective lines to back)
        const backScale = this.depthToScale(obs.depth + 0.03)
        const backW = obsW * (backScale / scale)
        const backY = this.depthToY(obs.depth + 0.03)

        ctx.beginPath()
        ctx.moveTo(screenX - obsW / 2, y - obsH)
        ctx.lineTo(screenX - backW / 2, backY - obsH * (backScale / scale))
        ctx.stroke()

        ctx.beginPath()
        ctx.moveTo(screenX + obsW / 2, y - obsH)
        ctx.lineTo(screenX + backW / 2, backY - obsH * (backScale / scale))
        ctx.stroke()

        // Back top edge
        ctx.beginPath()
        ctx.moveTo(screenX - backW / 2, backY - obsH * (backScale / scale))
        ctx.lineTo(screenX + backW / 2, backY - obsH * (backScale / scale))
        ctx.stroke()

        ctx.globalAlpha = 1
    }

    private renderPlayer(ctx: CanvasRenderingContext2D): void {
        const x = this.playerX + this.laneShiftOffset
        const y = PLAYER_Y
        const size = PLAYER_SIZE

        // Glow
        const playerColor = this.isBossMode ? "#ff3333" : "#00ffff"
        ctx.shadowColor = playerColor
        ctx.shadowBlur = this.isBossMode ? 20 : 15

        // Player cube (wireframe)
        ctx.strokeStyle = playerColor
        ctx.lineWidth = 2
        ctx.strokeRect(x - size / 2, y - size, size, size)

        // Inner fill
        ctx.fillStyle = this.isBossMode
            ? "rgba(255, 50, 50, 0.2)"
            : "rgba(0, 255, 255, 0.15)"
        ctx.fillRect(x - size / 2, y - size, size, size)

        // Top face hint
        ctx.beginPath()
        ctx.moveTo(x - size / 2, y - size)
        ctx.lineTo(x - size / 2 + 6, y - size - 8)
        ctx.lineTo(x + size / 2 + 6, y - size - 8)
        ctx.lineTo(x + size / 2, y - size)
        ctx.strokeStyle = "rgba(0, 255, 255, 0.5)"
        ctx.stroke()

        ctx.shadowBlur = 0
    }

    private renderGlueWalls(ctx: CanvasRenderingContext2D): void {
        if (!this.glueWalls) return

        const laneWidth = this.getLaneWidth()

        // Left glue wall
        if (this.glueWalls.leftNarrow > 0) {
            const wallRight =
                ROAD_LEFT +
                this.glueWalls.leftNarrow * laneWidth +
                this.laneShiftOffset
            ctx.fillStyle = "rgba(136, 170, 34, 0.3)"
            ctx.fillRect(0, HORIZON_Y, wallRight, PLAYER_Y - HORIZON_Y)
            ctx.strokeStyle = GLUE_COLOR
            ctx.lineWidth = 2
            ctx.beginPath()
            ctx.moveTo(wallRight, PLAYER_Y)
            ctx.lineTo(VANISHING_X, HORIZON_Y)
            ctx.stroke()
        }

        // Right glue wall
        if (this.glueWalls.rightNarrow > 0) {
            const wallLeft =
                ROAD_RIGHT -
                this.glueWalls.rightNarrow * laneWidth +
                this.laneShiftOffset
            ctx.fillStyle = "rgba(136, 170, 34, 0.3)"
            ctx.fillRect(
                wallLeft,
                HORIZON_Y,
                LOGICAL_W - wallLeft,
                PLAYER_Y - HORIZON_Y
            )
            ctx.strokeStyle = GLUE_COLOR
            ctx.lineWidth = 2
            ctx.beginPath()
            ctx.moveTo(wallLeft, PLAYER_Y)
            ctx.lineTo(VANISHING_X, HORIZON_Y)
            ctx.stroke()
        }
    }

    private renderTaunt(ctx: CanvasRenderingContext2D, taunt: Taunt): void {
        ctx.font = "bold 24px monospace"
        ctx.fillStyle = `rgba(255, 0, 0, ${taunt.opacity * 0.6})`
        ctx.textAlign = "left"
        // Use the locale key as display text; real localization happens at the overlay level
        const displayText = taunt.text
            .replace("veil.taunt.", "")
            .replace(/_/g, " ")
            .toUpperCase()
        ctx.fillText(
            displayText,
            taunt.x,
            HORIZON_Y + 50 + (this.tauntIndex % 3) * 40
        )
    }

    private renderHUD(ctx: CanvasRenderingContext2D): void {
        const remaining = this.timeRemaining

        // Timer
        ctx.font = "bold 20px monospace"
        ctx.textAlign = "right"
        ctx.fillStyle = remaining < 5 ? "#ff4444" : "#00ffff"
        ctx.fillText(remaining.toFixed(1) + "s", LOGICAL_W - 20, 30)

        // Progress bar
        const barW = 200
        const barH = 4
        const barX = LOGICAL_W - 20 - barW
        const barY = 40

        ctx.fillStyle = "rgba(0, 255, 255, 0.2)"
        ctx.fillRect(barX, barY, barW, barH)
        ctx.fillStyle = "#00ffff"
        ctx.fillRect(barX, barY, barW * this.progress, barH)

        // SURVIVE text
        ctx.font = "bold 14px monospace"
        ctx.textAlign = "left"
        ctx.fillStyle = "rgba(255, 255, 255, 0.3)"
        ctx.fillText("SURVIVE", 20, 30)

        // Veil level indicator
        ctx.fillStyle = "rgba(255, 0, 255, 0.3)"
        ctx.fillText(`VEIL ${this.config.veilId}`, 20, 50)
    }

    private renderCountdown(ctx: CanvasRenderingContext2D): void {
        const num = Math.ceil(this.countdownRemaining)

        ctx.font = "bold 120px monospace"
        ctx.textAlign = "center"
        ctx.textBaseline = "middle"

        // Pulsing glow
        const pulse = 1 + Math.sin(this.countdownRemaining * Math.PI * 4) * 0.1
        ctx.fillStyle = "#00ffff"
        ctx.globalAlpha = 0.6 + pulse * 0.2

        ctx.fillText(
            num > 0 ? num.toString() : "GO",
            LOGICAL_W / 2,
            LOGICAL_H / 2
        )

        ctx.globalAlpha = 1
        ctx.textBaseline = "alphabetic"
    }

    // ── Perspective math ────────────────────────────────────────────────────

    private depthToY(depth: number): number {
        // depth 0 = player (PLAYER_Y), depth 1 = horizon (HORIZON_Y)
        return PLAYER_Y - (PLAYER_Y - HORIZON_Y) * depth
    }

    private depthToScale(depth: number): number {
        // 1 at player, 0 at horizon
        return 1 - depth * 0.85
    }

    // ── Cleanup ─────────────────────────────────────────────────────────────

    public destroy(): void {
        this.stop()
    }
}
