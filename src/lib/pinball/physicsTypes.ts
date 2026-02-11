/**
 * Serializable types for transferring pinball state between
 * the main thread and the physics Web Worker.
 *
 * All Vector2D instances are flattened to { x, y } objects.
 */

// ── Primitive state snapshots ────────────────────────────────────────────────

export interface Vec2 {
    x: number
    y: number
}

export interface BallState {
    position: Vec2
    velocity: Vec2
    radius: number
    active: boolean
}

export interface FlipperState {
    pivot: Vec2
    length: number
    angle: number
    restAngle: number
    activeAngle: number
    side: "left" | "right"
    isPressed: boolean
    angularVelocity: number
}

export interface BumperState {
    position: Vec2
    radius: number
    points: number
    hitAnimation: number
}

export interface TargetState {
    position: Vec2
    width: number
    height: number
    points: number
    isHit: boolean
    hitAnimation: number
}

export interface WallState {
    start: Vec2
    end: Vec2
    damping: number
}

export interface OneWayWallState extends WallState {
    blockNormal: Vec2
}

export interface PostState {
    position: Vec2
    radius: number
    points: number
    hitAnimation: number
    damping: number
}

export interface SlingshotState {
    vertices: [Vec2, Vec2, Vec2]
    points: number
    hitAnimation: number
    damping: number
}

export interface LauncherState {
    position: Vec2
    power: number
    maxPower: number
    isCharging: boolean
}

// ── Full physics input ───────────────────────────────────────────────────────

export interface PhysicsInput {
    ball: BallState
    flippers: FlipperState[]
    bumpers: BumperState[]
    targets: TargetState[]
    walls: WallState[]
    guideRails: WallState[]
    oneWayWalls: OneWayWallState[]
    posts: PostState[]
    slingshots: SlingshotState[]
    launcher: LauncherState
    gameSpeed: number
    paused: boolean
    gameState: "idle" | "playing" | "gameOver"
    ballSaveFrames: number
    comboCount: number
    comboTimer: number
    multiplier: number
    feverActive: boolean
    feverTimer: number
    ballsRemaining: number
    score: number
    highScore: number
    launcherSettleFrames: number
}

// ── Physics output ───────────────────────────────────────────────────────────

export interface HitEvent {
    points: number
    x: number
    y: number
    color: string
    particleSize: number
    sound: string
}

export interface PhysicsOutput {
    ball: BallState
    flippers: FlipperState[]
    bumpers: BumperState[]
    targets: TargetState[]
    posts: PostState[]
    slingshots: SlingshotState[]
    launcher: LauncherState
    hits: HitEvent[]
    ballLost: boolean
    ballSaved: boolean
    gameOver: boolean
    allTargetsHit: boolean
    ballSaveFrames: number
    comboCount: number
    comboTimer: number
    multiplier: number
    feverActive: boolean
    feverTimer: number
    ballsRemaining: number
    score: number
    launcherSettleFrames: number
    drainBurst: boolean
}
