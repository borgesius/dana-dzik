import { BOSS_TAUNTS } from "./levels"
import type { LevelConfig, LevelTheme, ObstacleType } from "./types"

export type RunnerState = "countdown" | "playing" | "won" | "dead" | "freeze"

// ── Obstacle entity ─────────────────────────────────────────────────────────

interface Obstacle {
    lane: number
    depth: number // 0 = at player, 1 = far horizon
    type: ObstacleType
    width: number // in lanes (1 or 2+)
    reverse: boolean
    /** Visual jitter offset for depth distortion (boss) */
    depthJitter: number
    /** Prevents repeated near-miss triggers for same obstacle */
    nearMissTriggered: boolean
}

// ── Glue wall state ─────────────────────────────────────────────────────────

interface GlueWalls {
    leftNarrow: number
    rightNarrow: number
    nextNarrowTime: number
    /** Animated drip offsets for ooze effect */
    drips: number[]
}

// ── Taunt state ─────────────────────────────────────────────────────────────

interface Taunt {
    text: string
    opacity: number
    life: number
    maxLife: number
}

// ── Particle ────────────────────────────────────────────────────────────────

interface Particle {
    x: number
    y: number
    vx: number
    vy: number
    life: number
    maxLife: number
    color: string
    size: number
}

// ── Star (background void particle) ─────────────────────────────────────────

interface Star {
    x: number
    depth: number // 0 = near, 1 = far
    speed: number
    brightness: number
}

// ── Speed line (persistent, scrolling) ──────────────────────────────────────

interface SpeedLine {
    x: number
    depth: number // 0 = near player, 1 = at horizon
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
const HIT_DEPTH = 0.04
const COUNTDOWN_SECONDS = 3
const LANE_SHIFT_AMPLITUDE = 30
const LANE_SHIFT_PERIOD = 4
const EASE_RATE = 40 // exponential ease-out factor (~25ms to 95%)
const GRACE_PERIOD = 0.5 // invulnerability seconds after GO
const DEPTH_PERSPECTIVE_K = 5 // non-linear perspective constant

const GLUE_COLOR = "#88aa22"

// ── VeilAudio (procedural Web Audio) ────────────────────────────────────────

class VeilAudio {
    private ctx: AudioContext | null = null
    private droneOsc: OscillatorNode | null = null
    private droneGain: GainNode | null = null
    private drone2Osc: OscillatorNode | null = null
    private drone2Gain: GainNode | null = null
    private masterGain: GainNode | null = null
    private heartbeatInterval: number | null = null
    private basePitch: number = 55

    public init(isBoss: boolean): void {
        try {
            this.ctx = new AudioContext()
        } catch {
            return
        }
        this.basePitch = isBoss ? 45 : 55

        this.masterGain = this.ctx.createGain()
        this.masterGain.gain.value = 0
        this.masterGain.connect(this.ctx.destination)

        // Primary drone
        this.droneOsc = this.ctx.createOscillator()
        this.droneOsc.type = "sine"
        this.droneOsc.frequency.value = this.basePitch
        this.droneGain = this.ctx.createGain()
        this.droneGain.gain.value = 0.12
        this.droneOsc.connect(this.droneGain)
        this.droneGain.connect(this.masterGain)
        this.droneOsc.start()

        // Boss dissonance oscillator
        if (isBoss) {
            this.drone2Osc = this.ctx.createOscillator()
            this.drone2Osc.type = "sine"
            this.drone2Osc.frequency.value = this.basePitch * 1.02 // slight detune
            this.drone2Gain = this.ctx.createGain()
            this.drone2Gain.gain.value = 0.06
            this.drone2Osc.connect(this.drone2Gain)
            this.drone2Gain.connect(this.masterGain)
            this.drone2Osc.start()
        }

        // Fade in
        this.masterGain.gain.linearRampToValueAtTime(
            0.7,
            this.ctx.currentTime + 1.5
        )
    }

    /** Update drone pitch based on speed progress (0-1) */
    public updateIntensity(t: number): void {
        if (!this.ctx || !this.droneOsc) return
        const pitch = this.basePitch + t * 30
        this.droneOsc.frequency.setValueAtTime(pitch, this.ctx.currentTime)
        if (this.drone2Osc) {
            this.drone2Osc.frequency.setValueAtTime(
                pitch * (1.02 + t * 0.03),
                this.ctx.currentTime
            )
        }
    }

    public playLaneTick(): void {
        if (!this.ctx || !this.masterGain) return
        const osc = this.ctx.createOscillator()
        osc.type = "square"
        osc.frequency.value = 800
        const gain = this.ctx.createGain()
        gain.gain.value = 0.08
        gain.gain.exponentialRampToValueAtTime(
            0.001,
            this.ctx.currentTime + 0.03
        )
        osc.connect(gain)
        gain.connect(this.masterGain)
        osc.start()
        osc.stop(this.ctx.currentTime + 0.04)
    }

    public playNearMiss(): void {
        if (!this.ctx || !this.masterGain) return
        const bufferSize = this.ctx.sampleRate * 0.08
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate)
        const data = buffer.getChannelData(0)
        for (let i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize)
        }
        const source = this.ctx.createBufferSource()
        source.buffer = buffer
        const filter = this.ctx.createBiquadFilter()
        filter.type = "bandpass"
        filter.frequency.value = 2000
        filter.frequency.exponentialRampToValueAtTime(
            200,
            this.ctx.currentTime + 0.08
        )
        filter.Q.value = 2
        const gain = this.ctx.createGain()
        gain.gain.value = 0.15
        source.connect(filter)
        filter.connect(gain)
        gain.connect(this.masterGain)
        source.start()
    }

    public playDeath(): void {
        if (!this.ctx || !this.masterGain) return
        const osc = this.ctx.createOscillator()
        osc.type = "sine"
        osc.frequency.value = 80
        const gain = this.ctx.createGain()
        gain.gain.value = 0.4
        gain.gain.exponentialRampToValueAtTime(
            0.001,
            this.ctx.currentTime + 0.3
        )
        osc.connect(gain)
        gain.connect(this.masterGain)
        osc.start()
        osc.stop(this.ctx.currentTime + 0.35)

        const bufferSize = this.ctx.sampleRate * 0.15
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate)
        const data = buffer.getChannelData(0)
        for (let i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize) * 0.5
        }
        const nSource = this.ctx.createBufferSource()
        nSource.buffer = buffer
        const nGain = this.ctx.createGain()
        nGain.gain.value = 0.2
        nSource.connect(nGain)
        nGain.connect(this.masterGain)
        nSource.start()
    }

    public playCountdownBeep(final: boolean): void {
        if (!this.ctx || !this.masterGain) return
        const osc = this.ctx.createOscillator()
        osc.type = "sine"
        osc.frequency.value = final ? 880 : 440
        const gain = this.ctx.createGain()
        gain.gain.value = 0.15
        gain.gain.exponentialRampToValueAtTime(
            0.001,
            this.ctx.currentTime + 0.12
        )
        osc.connect(gain)
        gain.connect(this.masterGain)
        osc.start()
        osc.stop(this.ctx.currentTime + 0.15)
    }

    public playWin(): void {
        if (!this.ctx || !this.masterGain) return
        const notes = [440, 554, 659]
        notes.forEach((freq, i) => {
            const osc = this.ctx!.createOscillator()
            osc.type = "sine"
            osc.frequency.value = freq
            const gain = this.ctx!.createGain()
            gain.gain.value = 0
            gain.gain.setValueAtTime(0, this.ctx!.currentTime + i * 0.15)
            gain.gain.linearRampToValueAtTime(
                0.12,
                this.ctx!.currentTime + i * 0.15 + 0.02
            )
            gain.gain.exponentialRampToValueAtTime(
                0.001,
                this.ctx!.currentTime + i * 0.15 + 0.3
            )
            osc.connect(gain)
            gain.connect(this.masterGain!)
            osc.start(this.ctx!.currentTime + i * 0.15)
            osc.stop(this.ctx!.currentTime + i * 0.15 + 0.35)
        })
    }

    public startHeartbeat(bpm: number): void {
        this.stopHeartbeat()
        const beat = (): void => {
            if (!this.ctx || !this.masterGain) return
            const osc = this.ctx.createOscillator()
            osc.type = "sine"
            osc.frequency.value = 40
            const gain = this.ctx.createGain()
            gain.gain.value = 0.2
            gain.gain.exponentialRampToValueAtTime(
                0.001,
                this.ctx.currentTime + 0.15
            )
            osc.connect(gain)
            gain.connect(this.masterGain)
            osc.start()
            osc.stop(this.ctx.currentTime + 0.2)
        }
        beat()
        this.heartbeatInterval = window.setInterval(beat, 60000 / bpm)
    }

    public updateHeartbeat(bpm: number): void {
        if (this.heartbeatInterval !== null) {
            this.startHeartbeat(bpm)
        }
    }

    public stopHeartbeat(): void {
        if (this.heartbeatInterval !== null) {
            clearInterval(this.heartbeatInterval)
            this.heartbeatInterval = null
        }
    }

    public fadeOut(): void {
        if (!this.ctx || !this.masterGain) return
        this.masterGain.gain.linearRampToValueAtTime(
            0,
            this.ctx.currentTime + 0.8
        )
        this.stopHeartbeat()
    }

    public destroy(): void {
        this.stopHeartbeat()
        try {
            this.droneOsc?.stop()
            this.drone2Osc?.stop()
        } catch {
            // already stopped
        }
        void this.ctx?.close()
        this.ctx = null
    }
}

// ── CubeRunner ──────────────────────────────────────────────────────────────

export class CubeRunner {
    private canvas: HTMLCanvasElement
    private ctx: CanvasRenderingContext2D
    private config: LevelConfig
    private theme: LevelTheme
    private animationId: number | null = null

    private _state: RunnerState = "countdown"
    private elapsed: number = 0
    private countdownRemaining: number = COUNTDOWN_SECONDS
    private lastTimestamp: number = 0
    private lastCountdownBeep: number = 4

    private targetLane: number = 0
    private playerX: number = 0
    private playerTilt: number = 0 // visual lean during lane change (-1..1)
    private queuedMove: "left" | "right" | null = null
    private laneChangeFlash: number = 0 // micro-flash on lane change

    private obstacles: Obstacle[] = []
    private spawnTimer: number = 0
    private patternQueue: {
        delay: number
        lane: number
        type: ObstacleType
        width: number
        reverse: boolean
    }[] = []
    private patternCooldown: number = 0

    private glueWalls: GlueWalls | null = null
    private taunts: Taunt[] = []
    private nextTauntTime: number = 5
    private tauntIndex: number = 0

    private laneShiftOffset: number = 0
    private laneInverted: boolean = false
    private nextInversionTime: number = 8

    private keysDown: Set<string> = new Set()
    private touchStartX: number | null = null

    private handleKeyDown: ((e: KeyboardEvent) => void) | null = null
    private handleKeyUp: ((e: KeyboardEvent) => void) | null = null
    private handleTouchStart: ((e: TouchEvent) => void) | null = null
    private handleTouchMove: ((e: TouchEvent) => void) | null = null
    private handleTouchEnd: (() => void) | null = null

    private screenShake: number = 0
    private isBossMode: boolean = false

    // Atmosphere
    private stars: Star[] = []
    private speedLines: SpeedLine[] = []
    private particles: Particle[] = []
    private nearMissFlash: number = 0
    private blackoutTimer: number = 0
    private blackoutActive: boolean = false
    private nextBlackoutTime: number = 10
    private deathFreezeTimer: number = 0

    // Grace period (invulnerability after GO)
    private graceTimer: number = GRACE_PERIOD

    // Boss-specific
    private horseSilhouetteAlpha: number = 0
    private bossHeartbeatBpm: number = 60
    private finalCrescendo: boolean = false

    // Audio
    private audio: VeilAudio

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
        this.theme = config.theme
        this.isBossMode = bossMode

        this.canvas.width = LOGICAL_W
        this.canvas.height = LOGICAL_H

        const centerLane = Math.floor(config.lanes / 2)
        this.targetLane = centerLane
        this.playerX = this.getLaneX(centerLane)

        if (config.glueWalls) {
            this.glueWalls = {
                leftNarrow: 0,
                rightNarrow: 0,
                nextNarrowTime: 10,
                drips: Array.from(
                    { length: 20 },
                    () => Math.random() * LOGICAL_H
                ),
            }
        }

        // Initialize starfield
        for (let i = 0; i < 80; i++) {
            this.stars.push({
                x: Math.random() * LOGICAL_W,
                depth: Math.random(),
                speed: 0.2 + Math.random() * 0.8,
                brightness: 0.3 + Math.random() * 0.7,
            })
        }

        // Initialize persistent speed lines
        for (let i = 0; i < 15; i++) {
            this.speedLines.push({
                x: ROAD_LEFT + Math.random() * (ROAD_RIGHT - ROAD_LEFT),
                depth: Math.random(),
            })
        }

        this.audio = new VeilAudio()

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

    /** Compute which lane the player is visually closest to based on playerX */
    private getVisualLane(): number {
        const activeLanes = this.getActiveLanes()
        const laneWidth = this.getLaneWidth()
        const minLane = this.glueWalls ? this.glueWalls.leftNarrow : 0
        const offset = this.glueWalls ? minLane * laneWidth : 0
        const relativeX =
            this.playerX - ROAD_LEFT - offset - this.laneShiftOffset
        const lane = Math.round(relativeX / laneWidth - 0.5) + minLane
        return Math.max(minLane, Math.min(lane, minLane + activeLanes - 1))
    }

    // ── Input ───────────────────────────────────────────────────────────────

    private setupInput(): void {
        this.handleKeyDown = (e: KeyboardEvent): void => {
            // Fix #2: Prevent key-repeat spam
            if (this.keysDown.has(e.key)) return
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
        this.handleKeyUp = (e: KeyboardEvent): void => {
            this.keysDown.delete(e.key)
        }

        // Fix #3: Touch tap zones + swipe
        this.handleTouchStart = (e: TouchEvent): void => {
            if (e.touches.length > 0) {
                this.touchStartX = e.touches[0].clientX
            }
        }
        this.handleTouchMove = (e: TouchEvent): void => {
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
        this.handleTouchEnd = (): void => {
            // Tap detection: if touchStartX is still set and no swipe happened,
            // treat as a tap on left/right half
            if (this.touchStartX !== null) {
                const rect = this.canvas.getBoundingClientRect()
                const midX = rect.left + rect.width / 2
                if (this.touchStartX < midX) {
                    this.moveLeft()
                } else {
                    this.moveRight()
                }
            }
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

    private isTransitioning(): boolean {
        const targetX = this.getLaneX(this.targetLane)
        return Math.abs(targetX - this.playerX) > 1
    }

    private moveLeft(): void {
        if (this._state !== "playing") return
        if (this.isTransitioning()) {
            this.queuedMove = "left"
            return
        }
        const minLane = this.glueWalls ? this.glueWalls.leftNarrow : 0
        if (this.targetLane > minLane) {
            this.targetLane--
            this.audio.playLaneTick()
            this.laneChangeFlash = 0.04 // Fix #6: micro-flash
        }
    }

    private moveRight(): void {
        if (this._state !== "playing") return
        if (this.isTransitioning()) {
            this.queuedMove = "right"
            return
        }
        const maxLane = this.glueWalls
            ? this.config.lanes - 1 - this.glueWalls.rightNarrow
            : this.config.lanes - 1
        if (this.targetLane < maxLane) {
            this.targetLane++
            this.audio.playLaneTick()
            this.laneChangeFlash = 0.04 // Fix #6: micro-flash
        }
    }

    // ── Game loop ───────────────────────────────────────────────────────────

    public start(): void {
        this.audio.init(this.isBossMode)
        if (this.isBossMode) {
            this.audio.startHeartbeat(60)
        }
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

        if (
            this._state === "countdown" ||
            this._state === "playing" ||
            this._state === "freeze"
        ) {
            this.animationId = requestAnimationFrame(this.loop)
        }
    }

    // ── Update ──────────────────────────────────────────────────────────────

    private update(dt: number): void {
        // Update particles always (even during countdown/death)
        this.updateParticles(dt)
        this.updateStars(dt)

        if (this._state === "countdown") {
            this.countdownRemaining -= dt
            const num = Math.ceil(this.countdownRemaining)
            if (num < this.lastCountdownBeep && num >= 0) {
                this.audio.playCountdownBeep(num === 0)
                this.lastCountdownBeep = num
            }
            if (this.countdownRemaining <= 0) {
                this._state = "playing"
                this.graceTimer = GRACE_PERIOD // Fix #17: grace period
            }
            return
        }

        if (this._state === "freeze") {
            this.deathFreezeTimer -= dt
            if (this.deathFreezeTimer <= 0) {
                this._state = "dead"
                this.audio.playDeath()
                this.audio.fadeOut()
                this.spawnDeathParticles()
                this.animationId = requestAnimationFrame(this.loop)
            }
            return
        }

        if (this._state === "dead") {
            if (this.particles.length === 0) {
                this.stop()
            }
            return
        }

        if (this._state !== "playing") return

        this.elapsed += dt

        // Grace timer countdown
        if (this.graceTimer > 0) {
            this.graceTimer -= dt
        }

        // Win condition
        if (this.elapsed >= this.config.survivalSeconds) {
            this._state = "won"
            this.audio.playWin()
            this.audio.fadeOut()
            this.spawnWinParticles()
            this.onWin?.()
            return
        }

        // Speed curve with optional pulse
        const t = this.elapsed / this.config.survivalSeconds
        let speedMul = 1 + (this.config.maxSpeedMultiplier - 1) * t
        if (this.config.pulseSpeed) {
            speedMul *= 1 + Math.sin(this.elapsed * 2.5) * 0.12
        }
        const speed = this.config.baseSpeed * speedMul

        // Audio intensity
        this.audio.updateIntensity(t)

        // Boss heartbeat acceleration
        if (this.isBossMode) {
            const newBpm = 60 + t * 80
            if (Math.abs(newBpm - this.bossHeartbeatBpm) > 5) {
                this.bossHeartbeatBpm = newBpm
                this.audio.updateHeartbeat(newBpm)
            }
            this.horseSilhouetteAlpha = Math.min(
                0.3,
                t * 0.3 + Math.sin(this.elapsed * 0.7) * 0.05
            )
            if (this.timeRemaining < 10 && !this.finalCrescendo) {
                this.finalCrescendo = true
            }
        }

        // Lane shift (with optional inversion)
        if (this.config.laneShift) {
            let shiftPhase = (this.elapsed / LANE_SHIFT_PERIOD) * Math.PI * 2
            if (this.config.laneInversion && this.laneInverted) {
                shiftPhase = -shiftPhase
            }
            this.laneShiftOffset =
                Math.sin(shiftPhase) * LANE_SHIFT_AMPLITUDE * t

            if (
                this.config.laneInversion &&
                this.elapsed >= this.nextInversionTime
            ) {
                this.laneInverted = !this.laneInverted
                this.nextInversionTime += 6 + Math.random() * 6
            }
        }

        // Fix #1: Fast ease-out lane movement (exponential interpolation)
        const targetX = this.getLaneX(this.targetLane)
        const diff = targetX - this.playerX
        const step = diff * Math.min(1, dt * EASE_RATE)
        if (Math.abs(diff) < 1) {
            this.playerX = targetX
            // Fix #7: process queued input immediately on arrival
            if (this.queuedMove) {
                const move = this.queuedMove
                this.queuedMove = null
                if (move === "left") this.moveLeft()
                else this.moveRight()
            }
        } else {
            this.playerX += step
        }

        // Fix #5: Player tilt tracks movement direction, decays to 0
        const tiltTarget = Math.abs(diff) > 2 ? Math.sign(diff) * 0.6 : 0
        this.playerTilt += (tiltTarget - this.playerTilt) * Math.min(1, dt * 15)

        // Player trail particles
        if (Math.random() < 0.4) {
            this.particles.push({
                x:
                    this.playerX +
                    this.laneShiftOffset +
                    (Math.random() - 0.5) * 8,
                y: PLAYER_Y + Math.random() * 4,
                vx: (Math.random() - 0.5) * 10,
                vy: 20 + Math.random() * 30,
                life: 0.3 + Math.random() * 0.2,
                maxLife: 0.5,
                color: this.theme.playerColor,
                size: 1.5 + Math.random(),
            })
        }

        // Spawn obstacles (pattern or random)
        const spawnInterval =
            this.config.baseSpawnInterval -
            (this.config.baseSpawnInterval - this.config.minSpawnInterval) * t

        // Process pattern queue
        this.patternCooldown = Math.max(0, this.patternCooldown - dt)
        if (this.patternQueue.length > 0) {
            const next = this.patternQueue[0]
            next.delay -= dt
            if (next.delay <= 0) {
                this.patternQueue.shift()
                this.obstacles.push({
                    lane: next.lane,
                    depth: next.reverse ? -0.1 : 1.0,
                    type: next.type,
                    width: next.width,
                    reverse: next.reverse,
                    depthJitter: 0,
                    nearMissTriggered: false,
                })
            }
        }

        this.spawnTimer += dt
        if (
            this.spawnTimer >= spawnInterval &&
            this.patternQueue.length === 0
        ) {
            this.spawnTimer -= spawnInterval

            if (
                this.patternCooldown <= 0 &&
                this.config.patterns.length > 0 &&
                Math.random() < this.config.patternChance
            ) {
                this.startPattern()
            } else {
                this.spawnObstacle()
            }
        }

        // Move obstacles
        const depthSpeed = speed / 800
        for (const obs of this.obstacles) {
            if (obs.reverse) {
                obs.depth += depthSpeed * dt * 0.7
            } else {
                obs.depth -= depthSpeed * dt
            }
            if (this.config.depthDistortion) {
                obs.depthJitter =
                    Math.sin(this.elapsed * 15 + obs.lane * 3) * 0.015
            }
        }

        // Fix #14: Collision based on visual position, not target lane
        // Fix #17: Skip collision during grace period
        if (this.graceTimer <= 0) {
            const visualLane = this.getVisualLane()
            for (const obs of this.obstacles) {
                if (obs.depth > HIT_DEPTH || obs.depth < -0.05) continue
                const obsEnd = obs.lane + obs.width
                if (visualLane >= obs.lane && visualLane < obsEnd) {
                    this._state = "freeze"
                    this.deathFreezeTimer = 0.25
                    this.screenShake = 0.5
                    this.onDeath?.()
                    return
                }
            }
        }

        // Fix #15: Near-miss detection with per-obstacle deduplication
        const visualLaneForNm = this.getVisualLane()
        for (const obs of this.obstacles) {
            if (obs.nearMissTriggered) continue
            if (Math.abs(obs.depth) < 0.08) {
                const dist = Math.min(
                    Math.abs(visualLaneForNm - obs.lane),
                    Math.abs(visualLaneForNm - (obs.lane + obs.width - 1))
                )
                if (dist === 1) {
                    obs.nearMissTriggered = true
                    this.screenShake = Math.max(this.screenShake, 0.15)
                    this.nearMissFlash = 0.08
                    this.audio.playNearMiss()
                    this.spawnNearMissParticles(obs)
                    if (this.isBossMode) {
                        this.screenShake = Math.max(this.screenShake, 0.25)
                    }
                }
            }
        }

        // Remove off-screen obstacles (emit pass-through shimmer)
        // Fix #18: removed unused prevLen variable
        this.obstacles = this.obstacles.filter((o) => {
            if (o.depth < -0.15 && !o.reverse) {
                this.spawnPassThroughParticles(o)
                return false
            }
            return o.depth > -0.2 && o.depth < 1.5
        })

        // Glue walls
        if (this.glueWalls && this.elapsed >= this.glueWalls.nextNarrowTime) {
            const activeLanes = this.getActiveLanes()
            if (activeLanes > 2) {
                if (Math.random() < 0.5) {
                    this.glueWalls.leftNarrow++
                } else {
                    this.glueWalls.rightNarrow++
                }
                const maxLane =
                    this.config.lanes - 1 - this.glueWalls.rightNarrow
                if (this.targetLane > maxLane) this.targetLane = maxLane
                if (this.targetLane < this.glueWalls.leftNarrow) {
                    this.targetLane = this.glueWalls.leftNarrow
                }
            }
            this.glueWalls.nextNarrowTime += 8 + Math.random() * 4
        }

        // Animate glue wall drips
        if (this.glueWalls) {
            for (let i = 0; i < this.glueWalls.drips.length; i++) {
                this.glueWalls.drips[i] += (40 + i * 5) * dt
                if (this.glueWalls.drips[i] > LOGICAL_H) {
                    this.glueWalls.drips[i] = HORIZON_Y + Math.random() * 20
                }
            }
        }

        // Taunts (boss: subliminal flash)
        if (this.config.taunts && this.elapsed >= this.nextTauntTime) {
            const text = BOSS_TAUNTS[this.tauntIndex % BOSS_TAUNTS.length]
            this.taunts.push({
                text,
                opacity: 1,
                life: 0,
                maxLife: 0.6,
            })
            this.tauntIndex++
            this.nextTauntTime += 3 + Math.random() * 3
        }

        for (const taunt of this.taunts) {
            taunt.life += dt
            const lifeT = taunt.life / taunt.maxLife
            if (lifeT < 0.1) taunt.opacity = lifeT / 0.1
            else if (lifeT > 0.6)
                taunt.opacity = Math.max(0, 1 - (lifeT - 0.6) / 0.4)
            else taunt.opacity = 1
        }
        this.taunts = this.taunts.filter((t) => t.life < t.maxLife)

        // Blackout hazard
        if (this.config.blackout) {
            if (!this.blackoutActive && this.elapsed >= this.nextBlackoutTime) {
                this.blackoutActive = true
                this.blackoutTimer = 0.3
            }
            if (this.blackoutActive) {
                this.blackoutTimer -= dt
                if (this.blackoutTimer <= 0) {
                    this.blackoutActive = false
                    this.nextBlackoutTime = this.elapsed + 8 + Math.random() * 8
                }
            }
        }

        // Boss ember particles
        if (this.isBossMode && Math.random() < 0.3) {
            this.particles.push({
                x: Math.random() * LOGICAL_W,
                y: LOGICAL_H + 10,
                vx: (Math.random() - 0.5) * 15,
                vy: -(30 + Math.random() * 40),
                life: 1.5 + Math.random(),
                maxLife: 2.5,
                color: this.theme.starColor,
                size: 1 + Math.random() * 2,
            })
        }

        // Fix #10: Update persistent speed lines
        this.updateSpeedLines(dt, speed)

        // Decay screen shake, flashes
        this.screenShake = Math.max(0, this.screenShake - dt * 2.5)
        this.nearMissFlash = Math.max(0, this.nearMissFlash - dt)
        this.laneChangeFlash = Math.max(0, this.laneChangeFlash - dt)
    }

    // ── Speed line update ────────────────────────────────────────────────────

    private updateSpeedLines(dt: number, speed: number): void {
        const lineSpeed = (speed / 800) * 1.5
        for (const line of this.speedLines) {
            line.depth -= lineSpeed * dt
            if (line.depth <= 0) {
                line.depth = 0.8 + Math.random() * 0.2
                line.x = ROAD_LEFT + Math.random() * (ROAD_RIGHT - ROAD_LEFT)
            }
        }
    }

    // ── Pattern spawning ────────────────────────────────────────────────────

    private startPattern(): void {
        const patterns = this.config.patterns
        const pattern = patterns[Math.floor(Math.random() * patterns.length)]
        if (pattern.waves.length === 0) {
            this.patternCooldown = 1.5
            return
        }

        const activeLanes = this.getActiveLanes()
        const minLane = this.glueWalls ? this.glueWalls.leftNarrow : 0

        // Fix #16: Track used lanes per delay slot for gap validation
        const usedSlots = new Map<number, Set<number>>()

        for (const wave of pattern.waves) {
            let lane: number
            if (wave.lane === "random") {
                const width = wave.width ?? 1
                const maxStart = minLane + activeLanes - width
                lane =
                    minLane +
                    Math.floor(Math.random() * (maxStart - minLane + 1))
            } else if (wave.lane === "mirror") {
                lane = minLane + activeLanes - 1 - (wave.width ?? 1)
            } else {
                lane = Math.min(
                    wave.lane,
                    minLane + activeLanes - (wave.width ?? 1)
                )
                lane = Math.max(lane, minLane)
            }

            let width: number
            if (wave.type === "wall") {
                // Fix #16: Wall gap -- the wall covers activeLanes-1 width,
                // and lane indicates the gap position
                width = Math.max(1, activeLanes - 1)
                lane = minLane + Math.floor(Math.random() * activeLanes)
            } else if (wave.type === "double") {
                width = 2
            } else {
                width = wave.width ?? 1
            }

            // Fix #16: Validate that this doesn't create an impossible block
            const delayKey = Math.round(wave.delay * 100) // bucket by ~10ms
            if (!usedSlots.has(delayKey)) {
                usedSlots.set(delayKey, new Set())
            }
            const slotLanes = usedSlots.get(delayKey)!
            let blocked = false
            if (wave.type !== "wall") {
                for (let l = lane; l < lane + width; l++) {
                    if (slotLanes.has(l)) {
                        blocked = true
                        break
                    }
                }
            }
            // Ensure at least one gap lane exists in this time slot
            if (!blocked && wave.type !== "wall") {
                for (let l = lane; l < lane + width; l++) {
                    slotLanes.add(l)
                }
                // Check: are ALL lanes now blocked?
                if (slotLanes.size >= activeLanes) {
                    blocked = true // would create impossible config
                }
            }

            if (!blocked) {
                this.patternQueue.push({
                    delay: wave.delay,
                    lane,
                    type: wave.type,
                    width,
                    reverse: wave.reverse ?? false,
                })
            }
        }

        this.patternCooldown = 2
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
            depthJitter: 0,
            nearMissTriggered: false,
        })
    }

    // ── Particles ───────────────────────────────────────────────────────────

    private updateParticles(dt: number): void {
        for (const p of this.particles) {
            p.x += p.vx * dt
            p.y += p.vy * dt
            p.vy += 60 * dt
            p.life -= dt
            p.size *= 0.995
        }
        this.particles = this.particles.filter(
            (p) => p.life > 0 && p.size > 0.3
        )
    }

    private updateStars(dt: number): void {
        const speed = this._state === "playing" ? 1 + this.progress * 2 : 0.5
        for (const star of this.stars) {
            star.depth -= star.speed * dt * speed * 0.3
            if (star.depth <= 0) {
                star.depth = 0.9 + Math.random() * 0.1
                star.x = Math.random() * LOGICAL_W
                star.brightness = 0.3 + Math.random() * 0.7
            }
        }
    }

    private spawnNearMissParticles(obs: Obstacle): void {
        const x = this.playerX + this.laneShiftOffset
        const dir = obs.lane > this.targetLane ? -1 : 1
        for (let i = 0; i < 7; i++) {
            this.particles.push({
                x: x + dir * PLAYER_SIZE * 0.6,
                y:
                    PLAYER_Y -
                    PLAYER_SIZE / 2 +
                    (Math.random() - 0.5) * PLAYER_SIZE,
                vx: dir * (80 + Math.random() * 120),
                vy: (Math.random() - 0.5) * 100,
                life: 0.2 + Math.random() * 0.2,
                maxLife: 0.4,
                color: this.theme.playerColor,
                size: 2 + Math.random() * 2,
            })
        }
    }

    private spawnPassThroughParticles(obs: Obstacle): void {
        const lw = this.getLaneWidth()
        const cx = this.getLaneX(obs.lane + obs.width / 2 - 0.5)
        for (let i = 0; i < 3; i++) {
            this.particles.push({
                x: cx + (Math.random() - 0.5) * lw,
                y: PLAYER_Y + 10 + Math.random() * 20,
                vx: (Math.random() - 0.5) * 20,
                vy: 20 + Math.random() * 20,
                life: 0.3,
                maxLife: 0.3,
                color: this.theme.obstacleColors[0],
                size: 1.5,
            })
        }
    }

    private spawnDeathParticles(): void {
        const x = this.playerX + this.laneShiftOffset
        for (let i = 0; i < 40; i++) {
            const angle = (Math.PI * 2 * i) / 40 + Math.random() * 0.3
            const spd = 100 + Math.random() * 200
            this.particles.push({
                x: x + (Math.random() - 0.5) * 10,
                y: PLAYER_Y - PLAYER_SIZE / 2 + (Math.random() - 0.5) * 10,
                vx: Math.cos(angle) * spd,
                vy: Math.sin(angle) * spd - 50,
                life: 0.5 + Math.random() * 0.5,
                maxLife: 1,
                color:
                    i % 3 === 0
                        ? "#ff4400"
                        : i % 3 === 1
                          ? "#ff8800"
                          : "#ff0000",
                size: 2 + Math.random() * 3,
            })
        }
    }

    private spawnWinParticles(): void {
        const cx = LOGICAL_W / 2
        for (let i = 0; i < 50; i++) {
            const angle = (Math.PI * 2 * i) / 50
            const spd = 60 + Math.random() * 100
            this.particles.push({
                x: cx + (Math.random() - 0.5) * 200,
                y: LOGICAL_H / 2 + (Math.random() - 0.5) * 100,
                vx: Math.cos(angle) * spd * 0.5,
                vy: -(40 + Math.random() * spd),
                life: 1 + Math.random() * 0.8,
                maxLife: 1.8,
                color: this.theme.obstacleColors[
                    i % this.theme.obstacleColors.length
                ],
                size: 2 + Math.random() * 2,
            })
        }
    }

    // ── Rendering ───────────────────────────────────────────────────────────

    private render(): void {
        const ctx = this.ctx
        const w = LOGICAL_W
        const h = LOGICAL_H
        const theme = this.theme

        // Screen shake offset
        const shakeMultiplier = this.finalCrescendo ? 2.5 : 1
        const shakeX =
            this.screenShake > 0
                ? (Math.random() - 0.5) *
                  this.screenShake *
                  20 *
                  shakeMultiplier
                : 0
        const shakeY =
            this.screenShake > 0
                ? (Math.random() - 0.5) *
                  this.screenShake *
                  20 *
                  shakeMultiplier
                : 0

        ctx.save()
        ctx.translate(shakeX, shakeY)

        // ── Background ──────────────────────────────────────────────────
        const pulse = Math.sin(this.elapsed * 1.2) * 0.5 + 0.5
        ctx.fillStyle = this.lerpColor(theme.bgColor, theme.bgPulseColor, pulse)
        ctx.fillRect(-10, -10, w + 20, h + 20)

        // ── Horizon glow ────────────────────────────────────────────────
        const horizonGrad = ctx.createRadialGradient(
            VANISHING_X,
            HORIZON_Y,
            0,
            VANISHING_X,
            HORIZON_Y,
            300
        )
        const glowAlpha = 0.6 + Math.sin(this.elapsed * 0.8) * 0.2
        horizonGrad.addColorStop(
            0,
            this.alphaColor(theme.horizonGlow, glowAlpha)
        )
        horizonGrad.addColorStop(1, "transparent")
        ctx.fillStyle = horizonGrad
        ctx.fillRect(0, 0, w, HORIZON_Y + 200)

        // ── Starfield ───────────────────────────────────────────────────
        for (const star of this.stars) {
            const sy = HORIZON_Y + (PLAYER_Y - HORIZON_Y) * (1 - star.depth)
            const sx =
                VANISHING_X + (star.x - VANISHING_X) * (1 - star.depth * 0.8)
            const alpha = star.brightness * (1 - star.depth * 0.5)
            const size = 1 + (1 - star.depth) * 1.5
            ctx.fillStyle = this.alphaColor(theme.starColor, alpha)
            ctx.fillRect(sx, sy, size, size)
        }

        // ── Scanlines ───────────────────────────────────────────────────
        ctx.fillStyle = `rgba(0, 0, 0, 0.08)`
        for (let y = 0; y < h; y += 3) {
            const warpOffset = this.config.roadWarp
                ? Math.sin(y * 0.02 + this.elapsed * 3) * 3 * this.progress
                : 0
            ctx.fillRect(warpOffset, y, w, 1)
        }

        // ── Speed lines (Fix #10: persistent, scrolling) ────────────────
        if (this.progress > 0.3 && this._state === "playing") {
            const lineAlpha = (this.progress - 0.3) * 0.2
            ctx.strokeStyle = this.alphaColor(theme.roadColor, lineAlpha)
            ctx.lineWidth = 1
            for (const line of this.speedLines) {
                if (line.depth > 0.8) continue // don't draw at horizon
                const sy = this.depthToY(line.depth)
                const scale = this.depthToScale(line.depth)
                const sx = VANISHING_X + (line.x - VANISHING_X) * scale
                const endY = this.depthToY(Math.max(0, line.depth - 0.08))
                const endScale = this.depthToScale(
                    Math.max(0, line.depth - 0.08)
                )
                const endX = VANISHING_X + (line.x - VANISHING_X) * endScale
                ctx.beginPath()
                ctx.moveTo(sx, sy)
                ctx.lineTo(endX, endY)
                ctx.stroke()
            }
        }

        // ── Road perspective ────────────────────────────────────────────
        this.renderRoad(ctx)

        // ── Countdown lane preview (Fix #13) ────────────────────────────
        if (this._state === "countdown") {
            this.renderLanePreview(ctx)
        }

        // ── Boss horse silhouette ───────────────────────────────────────
        if (this.isBossMode && this.horseSilhouetteAlpha > 0.01) {
            this.renderHorseSilhouette(ctx)
        }

        // ── Obstacles (Fix #9: depth-sorted, farthest first) ────────────
        const sorted = [...this.obstacles].sort((a, b) => b.depth - a.depth)
        for (const obs of sorted) {
            this.renderObstacle(ctx, obs)
        }

        // ── Player ──────────────────────────────────────────────────────
        if (this._state !== "dead") {
            // Fix #4: lane target ghost
            if (this.isTransitioning()) {
                this.renderLaneGhost(ctx)
            }
            this.renderPlayer(ctx)
        }

        // ── Glue walls ──────────────────────────────────────────────────
        if (this.glueWalls) {
            this.renderGlueWalls(ctx)
        }

        // ── Taunts (subliminal flash) ───────────────────────────────────
        for (const taunt of this.taunts) {
            this.renderTaunt(ctx, taunt)
        }

        // ── Particles ───────────────────────────────────────────────────
        this.renderParticles(ctx)

        // ── Vignette ────────────────────────────────────────────────────
        const vignetteGrad = ctx.createRadialGradient(
            w / 2,
            h / 2,
            w * 0.3,
            w / 2,
            h / 2,
            w * 0.75
        )
        const vIntensity =
            theme.vignetteIntensity + (this.finalCrescendo ? 0.2 : 0)
        vignetteGrad.addColorStop(0, "transparent")
        vignetteGrad.addColorStop(1, `rgba(0, 0, 0, ${vIntensity})`)
        ctx.fillStyle = vignetteGrad
        ctx.fillRect(0, 0, w, h)

        // ── Blackout hazard ─────────────────────────────────────────────
        if (this.blackoutActive) {
            ctx.fillStyle = "rgba(0, 0, 0, 0.85)"
            ctx.fillRect(0, 0, w, h)
            this.renderPlayer(ctx)
        }

        // ── Near-miss flash ─────────────────────────────────────────────
        if (this.nearMissFlash > 0) {
            ctx.fillStyle = `rgba(255, 255, 255, ${this.nearMissFlash * 0.3})`
            ctx.fillRect(0, 0, w, h)
        }

        // ── Lane change flash (Fix #6) ──────────────────────────────────
        if (this.laneChangeFlash > 0) {
            ctx.fillStyle = `rgba(255, 255, 255, ${this.laneChangeFlash * 0.5})`
            ctx.fillRect(0, 0, w, h)
        }

        // ── Grace period indicator ──────────────────────────────────────
        if (this.graceTimer > 0 && this._state === "playing") {
            const gAlpha = (this.graceTimer / GRACE_PERIOD) * 0.15
            ctx.fillStyle = this.alphaColor(theme.playerColor, gAlpha)
            ctx.fillRect(0, 0, w, h)
        }

        // ── HUD ─────────────────────────────────────────────────────────
        this.renderHUD(ctx)

        // ── Countdown ───────────────────────────────────────────────────
        if (this._state === "countdown") {
            this.renderCountdown(ctx)
        }

        // ── Death / freeze effects ──────────────────────────────────────
        if (this._state === "freeze") {
            ctx.fillStyle = "rgba(255, 255, 255, 0.4)"
            ctx.fillRect(0, 0, w, h)
        }
        if (this._state === "dead") {
            ctx.fillStyle = "rgba(255, 0, 0, 0.3)"
            ctx.fillRect(0, 0, w, h)
        }

        // ── Boss final crescendo screen corruption ──────────────────────
        if (this.finalCrescendo && this._state === "playing") {
            if (Math.random() < 0.1) {
                const tearY = Math.random() * h
                const tearH = 2 + Math.random() * 4
                ctx.save()
                ctx.translate((Math.random() - 0.5) * 15, 0)
                ctx.drawImage(
                    this.canvas,
                    0,
                    tearY,
                    w,
                    tearH,
                    0,
                    tearY,
                    w,
                    tearH
                )
                ctx.restore()
            }
            if (Math.random() < 0.08) {
                ctx.fillStyle = `rgba(255, 0, 0, ${0.05 + Math.random() * 0.1})`
                ctx.fillRect(0, 0, w, h)
            }
        }

        ctx.restore()
    }

    private renderRoad(ctx: CanvasRenderingContext2D): void {
        const theme = this.theme
        const activeLanes = this.getActiveLanes()
        const laneWidth = this.getLaneWidth()
        const offset = this.glueWalls
            ? this.glueWalls.leftNarrow * laneWidth
            : 0
        const roadLeft = ROAD_LEFT + offset + this.laneShiftOffset
        const roadRight =
            ROAD_LEFT + offset + laneWidth * activeLanes + this.laneShiftOffset

        // Road edges
        ctx.strokeStyle = theme.roadColor
        ctx.lineWidth = 1.5

        ctx.beginPath()
        ctx.moveTo(roadLeft, PLAYER_Y)
        ctx.lineTo(VANISHING_X, HORIZON_Y)
        ctx.stroke()

        ctx.beginPath()
        ctx.moveTo(roadRight, PLAYER_Y)
        ctx.lineTo(VANISHING_X, HORIZON_Y)
        ctx.stroke()

        // Lane dividers
        ctx.strokeStyle = theme.laneColor
        ctx.lineWidth = 1
        for (let i = 1; i < activeLanes; i++) {
            const x = roadLeft + laneWidth * i
            ctx.beginPath()
            ctx.moveTo(x, PLAYER_Y)
            ctx.lineTo(VANISHING_X, HORIZON_Y)
            ctx.stroke()
        }

        // Fix #11: Animated depth markers (road surface scroll)
        ctx.strokeStyle = theme.depthMarkerColor
        const scrollOffset = (this.elapsed * 0.8) % 0.1 // scroll speed
        for (let d = scrollOffset; d < 1; d += 0.1) {
            const y = this.depthToY(d)
            const scale = this.depthToScale(d)
            const left = VANISHING_X - (VANISHING_X - roadLeft) * scale
            const right = VANISHING_X + (roadRight - VANISHING_X) * scale
            // Dashed style
            ctx.setLineDash([4 * scale, 8 * scale])
            ctx.beginPath()
            ctx.moveTo(left, y)
            ctx.lineTo(right, y)
            ctx.stroke()
        }
        ctx.setLineDash([])
    }

    // Fix #13: Lane preview during countdown
    private renderLanePreview(ctx: CanvasRenderingContext2D): void {
        const theme = this.theme
        const laneX = this.getLaneX(this.targetLane)
        const lw = this.getLaneWidth()

        // Subtle glow column on starting lane
        const grad = ctx.createLinearGradient(0, HORIZON_Y, 0, PLAYER_Y)
        grad.addColorStop(0, "transparent")
        grad.addColorStop(0.5, this.alphaColor(theme.playerColor, 0.06))
        grad.addColorStop(1, this.alphaColor(theme.playerColor, 0.12))
        ctx.fillStyle = grad
        ctx.fillRect(
            laneX + this.laneShiftOffset - lw / 2,
            HORIZON_Y,
            lw,
            PLAYER_Y - HORIZON_Y
        )
    }

    private renderObstacle(ctx: CanvasRenderingContext2D, obs: Obstacle): void {
        const rawDepth = obs.depth + obs.depthJitter
        if (rawDepth < 0 || rawDepth > 1) return

        const theme = this.theme
        const scale = this.depthToScale(rawDepth)
        const y = this.depthToY(rawDepth)
        const laneWidth = this.getLaneWidth()
        const centerX = this.getLaneX(obs.lane + obs.width / 2 - 0.5)

        const screenX = VANISHING_X + (centerX - VANISHING_X) * scale
        const obsW = laneWidth * obs.width * scale * 0.8
        const obsH = PLAYER_SIZE * scale

        // Fog-based alpha
        const alpha = Math.min(1, (1 - rawDepth) * 2.2)

        let color: string
        switch (obs.type) {
            case "glue":
                color = GLUE_COLOR
                break
            case "wall":
                color = theme.obstacleColors[3] ?? "#ff4444"
                break
            case "double":
                color = theme.obstacleColors[1] ?? "#ff00ff"
                break
            default:
                color =
                    theme.obstacleColors[
                        Math.abs(obs.lane * 7 + Math.floor(rawDepth * 10)) %
                            theme.obstacleColors.length
                    ]
        }

        ctx.globalAlpha = alpha

        // Obstacle glow (telegraph when first appearing at horizon)
        if (rawDepth > 0.85) {
            const glowAlpha = ((rawDepth - 0.85) / 0.15) * 0.3
            ctx.shadowColor = color
            ctx.shadowBlur = 20 * glowAlpha
        }

        // Fix #12: Brightness pulse as obstacles enter danger zone
        if (rawDepth < 0.15) {
            const dangerPulse =
                1 + Math.sin(this.elapsed * 20) * 0.3 * (1 - rawDepth / 0.15)
            ctx.shadowColor = color
            ctx.shadowBlur = 12 * dangerPulse
        }

        // Wireframe cube
        ctx.strokeStyle = color
        ctx.lineWidth = Math.max(1, 2 * scale)

        // Front face
        ctx.strokeRect(screenX - obsW / 2, y - obsH, obsW, obsH)

        // Inner fill (faint)
        ctx.fillStyle = this.alphaColor(color, 0.1)
        ctx.fillRect(screenX - obsW / 2, y - obsH, obsW, obsH)

        // Top face (perspective lines to back)
        const backScale = this.depthToScale(rawDepth + 0.03)
        const backW = obsW * (backScale / scale)
        const backY = this.depthToY(rawDepth + 0.03)

        ctx.beginPath()
        ctx.moveTo(screenX - obsW / 2, y - obsH)
        ctx.lineTo(screenX - backW / 2, backY - obsH * (backScale / scale))
        ctx.stroke()

        ctx.beginPath()
        ctx.moveTo(screenX + obsW / 2, y - obsH)
        ctx.lineTo(screenX + backW / 2, backY - obsH * (backScale / scale))
        ctx.stroke()

        ctx.beginPath()
        ctx.moveTo(screenX - backW / 2, backY - obsH * (backScale / scale))
        ctx.lineTo(screenX + backW / 2, backY - obsH * (backScale / scale))
        ctx.stroke()

        ctx.shadowBlur = 0
        ctx.globalAlpha = 1
    }

    // Fix #4: Lane target ghost indicator
    private renderLaneGhost(ctx: CanvasRenderingContext2D): void {
        const targetX = this.getLaneX(this.targetLane) + this.laneShiftOffset
        const size = PLAYER_SIZE
        const theme = this.theme

        ctx.save()
        ctx.globalAlpha = 0.2
        ctx.strokeStyle = theme.playerColor
        ctx.lineWidth = 1
        ctx.setLineDash([4, 4])
        ctx.strokeRect(targetX - size / 2, PLAYER_Y - size, size, size)
        ctx.setLineDash([])
        ctx.restore()
    }

    private renderPlayer(ctx: CanvasRenderingContext2D): void {
        const x = this.playerX + this.laneShiftOffset
        const y = PLAYER_Y
        const size = PLAYER_SIZE
        const theme = this.theme

        ctx.save()

        // Fix #5: Apply tilt (lean into movement direction)
        if (Math.abs(this.playerTilt) > 0.01) {
            ctx.translate(x, y - size / 2)
            ctx.transform(1, 0, this.playerTilt * 0.3, 1, 0, 0) // skewX
            ctx.translate(-x, -(y - size / 2))
        }

        // Glow
        ctx.shadowColor = theme.playerColor
        ctx.shadowBlur = 18

        // Player cube (wireframe)
        ctx.strokeStyle = theme.playerColor
        ctx.lineWidth = 2
        ctx.strokeRect(x - size / 2, y - size, size, size)

        // Inner fill
        ctx.fillStyle = theme.playerFill
        ctx.fillRect(x - size / 2, y - size, size, size)

        // Top face hint
        ctx.beginPath()
        ctx.moveTo(x - size / 2, y - size)
        ctx.lineTo(x - size / 2 + 6, y - size - 8)
        ctx.lineTo(x + size / 2 + 6, y - size - 8)
        ctx.lineTo(x + size / 2, y - size)
        ctx.strokeStyle = this.alphaColor(theme.playerColor, 0.5)
        ctx.stroke()

        ctx.shadowBlur = 0
        ctx.restore()
    }

    private renderGlueWalls(ctx: CanvasRenderingContext2D): void {
        if (!this.glueWalls) return

        const laneWidth = this.getLaneWidth()

        if (this.glueWalls.leftNarrow > 0) {
            const wallRight =
                ROAD_LEFT +
                this.glueWalls.leftNarrow * laneWidth +
                this.laneShiftOffset

            ctx.fillStyle = "rgba(136, 170, 34, 0.25)"
            ctx.fillRect(0, HORIZON_Y, wallRight, PLAYER_Y - HORIZON_Y)

            ctx.fillStyle = "rgba(136, 170, 34, 0.5)"
            for (let i = 0; i < 10; i++) {
                const dripY = this.glueWalls.drips[i]
                const dripX = wallRight - 2 - (i % 3) * 4
                ctx.fillRect(dripX, dripY, 2, 8 + (i % 4) * 3)
            }

            ctx.strokeStyle = GLUE_COLOR
            ctx.lineWidth = 2
            ctx.beginPath()
            ctx.moveTo(wallRight, PLAYER_Y)
            ctx.lineTo(VANISHING_X, HORIZON_Y)
            ctx.stroke()
        }

        if (this.glueWalls.rightNarrow > 0) {
            const wallLeft =
                ROAD_RIGHT -
                this.glueWalls.rightNarrow * laneWidth +
                this.laneShiftOffset

            ctx.fillStyle = "rgba(136, 170, 34, 0.25)"
            ctx.fillRect(
                wallLeft,
                HORIZON_Y,
                LOGICAL_W - wallLeft,
                PLAYER_Y - HORIZON_Y
            )

            ctx.fillStyle = "rgba(136, 170, 34, 0.5)"
            for (let i = 10; i < 20; i++) {
                const dripY = this.glueWalls.drips[i]
                const dripX = wallLeft + 2 + ((i - 10) % 3) * 4
                ctx.fillRect(dripX, dripY, 2, 8 + (i % 4) * 3)
            }

            ctx.strokeStyle = GLUE_COLOR
            ctx.lineWidth = 2
            ctx.beginPath()
            ctx.moveTo(wallLeft, PLAYER_Y)
            ctx.lineTo(VANISHING_X, HORIZON_Y)
            ctx.stroke()
        }
    }

    private renderTaunt(ctx: CanvasRenderingContext2D, taunt: Taunt): void {
        ctx.save()
        ctx.font = "bold 72px monospace"
        ctx.textAlign = "center"
        ctx.textBaseline = "middle"
        ctx.fillStyle = `rgba(255, 0, 0, ${taunt.opacity * 0.18})`
        ctx.fillText(taunt.text, LOGICAL_W / 2, LOGICAL_H / 2)

        ctx.font = "bold 36px monospace"
        ctx.fillStyle = `rgba(255, 0, 0, ${taunt.opacity * 0.08})`
        ctx.fillText(
            taunt.text,
            LOGICAL_W / 2 + (Math.random() - 0.5) * 10,
            LOGICAL_H / 2 + 60
        )
        ctx.restore()
    }

    private renderParticles(ctx: CanvasRenderingContext2D): void {
        for (const p of this.particles) {
            const alpha = Math.min(1, p.life / (p.maxLife * 0.3))
            ctx.fillStyle = this.alphaColor(p.color, alpha * 0.8)
            ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size)
        }
    }

    private renderHorseSilhouette(ctx: CanvasRenderingContext2D): void {
        const alpha = this.horseSilhouetteAlpha * (this.finalCrescendo ? 2 : 1)
        ctx.save()
        ctx.globalAlpha = Math.min(0.6, alpha)
        ctx.strokeStyle = "#ff2222"
        ctx.lineWidth = 2
        ctx.lineJoin = "round"

        const cx = VANISHING_X
        const cy = HORIZON_Y - 20
        const s = 0.7 + Math.sin(this.elapsed * 0.5) * 0.1

        ctx.beginPath()
        ctx.moveTo(cx - 25 * s, cy + 30 * s)
        ctx.lineTo(cx - 15 * s, cy - 10 * s)
        ctx.lineTo(cx - 5 * s, cy - 30 * s)
        ctx.lineTo(cx, cy - 42 * s)
        ctx.lineTo(cx + 5 * s, cy - 30 * s)
        ctx.lineTo(cx + 12 * s, cy - 15 * s)
        ctx.lineTo(cx + 20 * s, cy)
        ctx.lineTo(cx + 15 * s, cy + 10 * s)
        ctx.lineTo(cx + 5 * s, cy + 15 * s)
        ctx.lineTo(cx - 10 * s, cy + 20 * s)
        ctx.lineTo(cx - 25 * s, cy + 30 * s)
        ctx.stroke()

        ctx.fillStyle = `rgba(255, 0, 0, ${alpha * 1.5})`
        ctx.beginPath()
        ctx.arc(cx + 2 * s, cy - 12 * s, 3 * s, 0, Math.PI * 2)
        ctx.fill()

        ctx.restore()
    }

    private renderHUD(ctx: CanvasRenderingContext2D): void {
        const theme = this.theme
        const remaining = this.timeRemaining

        ctx.font = "bold 20px monospace"
        ctx.textAlign = "right"
        ctx.fillStyle = remaining < 5 ? "#ff4444" : theme.playerColor
        ctx.fillText(remaining.toFixed(1) + "s", LOGICAL_W - 20, 30)

        const barW = 200
        const barH = 4
        const barX = LOGICAL_W - 20 - barW
        const barY = 40

        ctx.fillStyle = this.alphaColor(theme.playerColor, 0.2)
        ctx.fillRect(barX, barY, barW, barH)
        ctx.fillStyle = theme.playerColor
        ctx.fillRect(barX, barY, barW * this.progress, barH)

        ctx.font = "bold 14px monospace"
        ctx.textAlign = "left"
        ctx.fillStyle = "rgba(255, 255, 255, 0.3)"
        ctx.fillText("SURVIVE", 20, 30)

        ctx.fillStyle = this.alphaColor(theme.playerColor, 0.3)
        ctx.fillText(theme.name.toUpperCase(), 20, 50)
    }

    private renderCountdown(ctx: CanvasRenderingContext2D): void {
        const num = Math.ceil(this.countdownRemaining)

        ctx.font = "bold 120px monospace"
        ctx.textAlign = "center"
        ctx.textBaseline = "middle"

        const pulse = 1 + Math.sin(this.countdownRemaining * Math.PI * 4) * 0.1
        ctx.fillStyle = this.theme.playerColor
        ctx.globalAlpha = 0.6 + pulse * 0.2

        ctx.shadowColor = this.theme.playerColor
        ctx.shadowBlur = 30

        ctx.fillText(
            num > 0 ? num.toString() : "GO",
            LOGICAL_W / 2,
            LOGICAL_H / 2
        )

        ctx.shadowBlur = 0
        ctx.globalAlpha = 1
        ctx.textBaseline = "alphabetic"
    }

    // ── Perspective math (Fix #8: non-linear) ───────────────────────────────

    private depthToY(depth: number): number {
        // Non-linear: objects compress faster near horizon
        const t = 1 / (1 + depth * DEPTH_PERSPECTIVE_K)
        return PLAYER_Y - (PLAYER_Y - HORIZON_Y) * (1 - t)
    }

    private depthToScale(depth: number): number {
        return 1 / (1 + depth * DEPTH_PERSPECTIVE_K)
    }

    // ── Color utilities ─────────────────────────────────────────────────────

    private alphaColor(color: string, alpha: number): string {
        if (color.startsWith("rgba")) {
            return color.replace(/[\d.]+\)$/, `${alpha})`)
        }
        if (color.startsWith("#")) {
            const r = parseInt(color.slice(1, 3), 16)
            const g = parseInt(color.slice(3, 5), 16)
            const b = parseInt(color.slice(5, 7), 16)
            return `rgba(${r}, ${g}, ${b}, ${alpha})`
        }
        return color
    }

    private lerpColor(a: string, b: string, t: number): string {
        const parse = (c: string): [number, number, number] => {
            if (c.startsWith("#")) {
                return [
                    parseInt(c.slice(1, 3), 16),
                    parseInt(c.slice(3, 5), 16),
                    parseInt(c.slice(5, 7), 16),
                ]
            }
            return [0, 0, 0]
        }
        const [ar, ag, ab] = parse(a)
        const [br, bg, bb] = parse(b)
        const r = Math.round(ar + (br - ar) * t)
        const g = Math.round(ag + (bg - ag) * t)
        const bl = Math.round(ab + (bb - ab) * t)
        return `rgb(${r}, ${g}, ${bl})`
    }

    // ── Cleanup ─────────────────────────────────────────────────────────────

    public destroy(): void {
        this.stop()
        this.audio.fadeOut()
        setTimeout(() => this.audio.destroy(), 1000)
    }
}
