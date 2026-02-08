// ── Veil types ──────────────────────────────────────────────────────────────

export type VeilId = 0 | 1 | 2 | 3 | 4

export const VEIL_IDS: readonly VeilId[] = [0, 1, 2, 3, 4] as const

/** Veil 0-3 are encounters, Veil 4 is the T. Pferd boss fight */
export const BOSS_VEIL: VeilId = 4

// ── Save data ───────────────────────────────────────────────────────────────

export interface VeilSaveData {
    completed: number[]
    attempts: Record<number, number>
}

export function createEmptyVeilData(): VeilSaveData {
    return {
        completed: [],
        attempts: {},
    }
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
