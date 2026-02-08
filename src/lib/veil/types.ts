// ── Veil types ──────────────────────────────────────────────────────────────

export type VeilId = 0 | 1 | 2 | 3 | 4

export const VEIL_IDS: readonly VeilId[] = [0, 1, 2, 3, 4] as const

/** Veil 0-3 are encounters, Veil 4 is the T. Pferd boss fight */
export const BOSS_VEIL: VeilId = 4

// ── Save data ───────────────────────────────────────────────────────────────

export interface VeilSaveData {
    completed: number[]
    attempts: Record<number, number>
    /** Veils that have been triggered (available to play) but not yet completed */
    unlocked?: number[]
}

export function createEmptyVeilData(): VeilSaveData {
    return {
        completed: [],
        attempts: {},
        unlocked: [],
    }
}

// ── Visual theme ────────────────────────────────────────────────────────────

export interface LevelTheme {
    name: string
    /** Background base color */
    bgColor: string
    /** Background pulse color (mixed during pulse) */
    bgPulseColor: string
    /** Road edge line color */
    roadColor: string
    /** Lane divider color */
    laneColor: string
    /** Depth marker color */
    depthMarkerColor: string
    /** Player wireframe + glow color */
    playerColor: string
    /** Player inner fill color (with alpha) */
    playerFill: string
    /** Obstacle neon palette */
    obstacleColors: string[]
    /** Horizon glow radial gradient color */
    horizonGlow: string
    /** Depth fog tint (objects fade into this) */
    fogColor: string
    /** Starfield / void particle color */
    starColor: string
    /** Vignette intensity (0-1) */
    vignetteIntensity: number
    /** CSS class suffix for overlay */
    cssClass: string
}

// ── Obstacle patterns ───────────────────────────────────────────────────────

export interface PatternWave {
    /** Delay in seconds from pattern start */
    delay: number
    /** Lane index, or "random" for random placement, or "mirror" for mirrored from center */
    lane: number | "random" | "mirror"
    type: ObstacleType
    width?: number
    reverse?: boolean
}

export interface ObstaclePattern {
    id: string
    waves: PatternWave[]
}

// ── Cube Runner level config ────────────────────────────────────────────────

export type ObstacleType = "single" | "double" | "wall" | "glue"

export interface LevelConfig {
    veilId: VeilId
    lanes: number
    survivalSeconds: number
    /** Base speed (units/sec) */
    baseSpeed: number
    /** Speed multiplier at end of level */
    maxSpeedMultiplier: number
    /** Obstacle spawn interval (seconds) - decreases over time */
    baseSpawnInterval: number
    minSpawnInterval: number
    /** Available obstacle types */
    obstacleTypes: ObstacleType[]
    /** Lane-shift mechanic: lanes drift sideways */
    laneShift: boolean
    /** Obstacles approach from behind too */
    reverseObstacles: boolean
    /** Boss taunts scroll across screen */
    taunts: boolean
    /** Glue walls narrow the corridor */
    glueWalls: boolean

    // ── Visual theme ────────────────────────────────────────────────────
    theme: LevelTheme

    // ── Pattern system ──────────────────────────────────────────────────
    /** Available choreographed patterns for this level */
    patterns: ObstaclePattern[]
    /** Chance (0-1) of spawning a pattern instead of random obstacle */
    patternChance: number

    // ── Environment hazards ─────────────────────────────────────────────
    /** Visual road edge warping (purely visual disorientation) */
    roadWarp: boolean
    /** Brief blackout moments (only player + nearest obstacles visible) */
    blackout: boolean
    /** Lane shift can reverse direction mid-cycle */
    laneInversion: boolean
    /** Speed pulses (sine modulation on top of linear ramp) */
    pulseSpeed: boolean
    /** Obstacles jitter in visual depth (distance estimation harder) */
    depthDistortion: boolean
}

// ── Dialogue types ──────────────────────────────────────────────────────────

export interface DialogueChoice {
    label: string // locale key
    next: string // node id
}

export interface DialogueNode {
    id: string
    speaker: "???" | "T. PFERD" | "you"
    text: string // locale key
    choices?: DialogueChoice[]
    next?: string // auto-advance to this node
    /** Optional effect key to trigger side effects */
    effect?: string
    /** Typing speed override (ms per char, default 30) */
    typingSpeed?: number
}

export interface DialogueTree {
    veilId: VeilId
    startNode: string
    nodes: Record<string, DialogueNode>
}
