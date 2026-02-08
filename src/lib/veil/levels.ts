import type { LevelConfig, LevelTheme, ObstaclePattern, VeilId } from "./types"

// ── Themes ──────────────────────────────────────────────────────────────────

const THEME_SIGNAL: LevelTheme = {
    name: "Signal",
    bgColor: "#020810",
    bgPulseColor: "#041020",
    roadColor: "rgba(0, 200, 220, 0.45)",
    laneColor: "rgba(0, 200, 220, 0.15)",
    depthMarkerColor: "rgba(0, 150, 200, 0.1)",
    playerColor: "#00ddee",
    playerFill: "rgba(0, 220, 240, 0.18)",
    obstacleColors: ["#00ccdd", "#00eeff", "#66ffff", "#0099cc", "#33ddff"],
    horizonGlow: "rgba(0, 180, 220, 0.12)",
    fogColor: "rgba(0, 40, 60, 0.6)",
    starColor: "rgba(100, 220, 255, 0.6)",
    vignetteIntensity: 0.35,
    cssClass: "veil-level-0",
}

const THEME_NERVE: LevelTheme = {
    name: "Nerve",
    bgColor: "#0a0418",
    bgPulseColor: "#150828",
    roadColor: "rgba(180, 60, 220, 0.45)",
    laneColor: "rgba(180, 60, 220, 0.15)",
    depthMarkerColor: "rgba(160, 40, 200, 0.1)",
    playerColor: "#cc66ff",
    playerFill: "rgba(200, 100, 255, 0.18)",
    obstacleColors: ["#cc44ff", "#ff44cc", "#aa66ff", "#ff66aa", "#dd88ff"],
    horizonGlow: "rgba(180, 60, 220, 0.15)",
    fogColor: "rgba(40, 10, 50, 0.6)",
    starColor: "rgba(200, 130, 255, 0.5)",
    vignetteIntensity: 0.4,
    cssClass: "veil-level-1",
}

const THEME_TRANSMUTATION: LevelTheme = {
    name: "Transmutation",
    bgColor: "#100800",
    bgPulseColor: "#201000",
    roadColor: "rgba(220, 160, 40, 0.45)",
    laneColor: "rgba(220, 160, 40, 0.15)",
    depthMarkerColor: "rgba(200, 140, 20, 0.1)",
    playerColor: "#ffaa22",
    playerFill: "rgba(255, 170, 40, 0.18)",
    obstacleColors: ["#ffaa00", "#ffcc33", "#ff8800", "#ffdd66", "#ee9900"],
    horizonGlow: "rgba(220, 150, 30, 0.18)",
    fogColor: "rgba(50, 30, 0, 0.6)",
    starColor: "rgba(255, 200, 100, 0.5)",
    vignetteIntensity: 0.45,
    cssClass: "veil-level-2",
}

const THEME_REVELATION: LevelTheme = {
    name: "Revelation",
    bgColor: "#010a04",
    bgPulseColor: "#021408",
    roadColor: "rgba(100, 255, 100, 0.45)",
    laneColor: "rgba(100, 255, 100, 0.12)",
    depthMarkerColor: "rgba(80, 220, 80, 0.08)",
    playerColor: "#44ff66",
    playerFill: "rgba(60, 255, 100, 0.18)",
    obstacleColors: ["#44ff44", "#88ff88", "#22dd44", "#ccffcc", "#00ff66"],
    horizonGlow: "rgba(80, 255, 80, 0.15)",
    fogColor: "rgba(5, 30, 10, 0.7)",
    starColor: "rgba(150, 255, 150, 0.4)",
    vignetteIntensity: 0.5,
    cssClass: "veil-level-3",
}

const THEME_FACILITY: LevelTheme = {
    name: "Facility",
    bgColor: "#0a0000",
    bgPulseColor: "#1a0000",
    roadColor: "rgba(255, 50, 50, 0.5)",
    laneColor: "rgba(255, 50, 50, 0.12)",
    depthMarkerColor: "rgba(200, 30, 30, 0.08)",
    playerColor: "#ff3333",
    playerFill: "rgba(255, 50, 50, 0.22)",
    obstacleColors: ["#ff2222", "#ff4444", "#cc0000", "#ff6666", "#ff0000"],
    horizonGlow: "rgba(255, 30, 30, 0.2)",
    fogColor: "rgba(40, 0, 0, 0.7)",
    starColor: "rgba(255, 120, 80, 0.5)",
    vignetteIntensity: 0.6,
    cssClass: "veil-level-4",
}

// ── Patterns ────────────────────────────────────────────────────────────────

const PATTERN_ZIGZAG: ObstaclePattern = {
    id: "zigzag",
    waves: [
        { delay: 0, lane: 0, type: "single" },
        { delay: 0.25, lane: "mirror", type: "single" },
        { delay: 0.5, lane: 0, type: "single" },
        { delay: 0.75, lane: "mirror", type: "single" },
    ],
}

const PATTERN_CORRIDOR: ObstaclePattern = {
    id: "corridor",
    waves: [
        { delay: 0, lane: 0, type: "wall" },
        { delay: 0.6, lane: "mirror", type: "wall" },
    ],
}

const PATTERN_PINCH: ObstaclePattern = {
    id: "pinch",
    waves: [
        { delay: 0, lane: 0, type: "double", width: 2 },
        { delay: 0, lane: "mirror", type: "double", width: 2 },
    ],
}

const PATTERN_SWEEP: ObstaclePattern = {
    id: "sweep",
    waves: [
        { delay: 0, lane: 0, type: "single" },
        { delay: 0.2, lane: 1, type: "single" },
        { delay: 0.4, lane: 2, type: "single" },
        { delay: 0.6, lane: 3, type: "single" },
    ],
}

const PATTERN_REVERSE_AMBUSH: ObstaclePattern = {
    id: "reverse_ambush",
    waves: [
        { delay: 0, lane: "random", type: "single" },
        { delay: 0.3, lane: "random", type: "single", reverse: true },
    ],
}

const PATTERN_BREATHE: ObstaclePattern = {
    id: "breathe",
    waves: [], // intentionally empty — gives a gap
}

const PATTERN_GAUNTLET: ObstaclePattern = {
    id: "gauntlet",
    waves: [
        { delay: 0, lane: 0, type: "single" },
        { delay: 0.15, lane: 1, type: "single" },
        { delay: 0.3, lane: 2, type: "single" },
        { delay: 0.15, lane: 0, type: "single", reverse: true },
    ],
}

const PATTERN_DOUBLE_SWEEP: ObstaclePattern = {
    id: "double_sweep",
    waves: [
        { delay: 0, lane: 0, type: "double", width: 2 },
        { delay: 0.35, lane: 1, type: "double", width: 2 },
        { delay: 0.7, lane: 2, type: "double", width: 2 },
    ],
}

const PATTERN_TRAP: ObstaclePattern = {
    id: "trap",
    waves: [
        { delay: 0, lane: 0, type: "wall" },
        { delay: 0.2, lane: "random", type: "single", reverse: true },
        { delay: 0.5, lane: "mirror", type: "wall" },
    ],
}

// ── Level configs ───────────────────────────────────────────────────────────

export const LEVEL_CONFIGS: Record<VeilId, LevelConfig> = {
    0: {
        veilId: 0,
        lanes: 3,
        survivalSeconds: 20,
        baseSpeed: 280,
        maxSpeedMultiplier: 2.0,
        baseSpawnInterval: 0.9,
        minSpawnInterval: 0.35,
        obstacleTypes: ["single"],
        laneShift: false,
        reverseObstacles: false,
        taunts: false,
        glueWalls: false,
        theme: THEME_SIGNAL,
        patterns: [PATTERN_ZIGZAG, PATTERN_BREATHE],
        patternChance: 0.15,
        roadWarp: false,
        blackout: false,
        laneInversion: false,
        pulseSpeed: false,
        depthDistortion: false,
    },
    1: {
        veilId: 1,
        lanes: 4,
        survivalSeconds: 25,
        baseSpeed: 310,
        maxSpeedMultiplier: 2.3,
        baseSpawnInterval: 0.8,
        minSpawnInterval: 0.3,
        obstacleTypes: ["single", "double"],
        laneShift: false,
        reverseObstacles: false,
        taunts: false,
        glueWalls: false,
        theme: THEME_NERVE,
        patterns: [
            PATTERN_ZIGZAG,
            PATTERN_PINCH,
            PATTERN_SWEEP,
            PATTERN_BREATHE,
        ],
        patternChance: 0.25,
        roadWarp: false,
        blackout: false,
        laneInversion: false,
        pulseSpeed: false,
        depthDistortion: false,
    },
    2: {
        veilId: 2,
        lanes: 4,
        survivalSeconds: 30,
        baseSpeed: 340,
        maxSpeedMultiplier: 2.5,
        baseSpawnInterval: 0.75,
        minSpawnInterval: 0.25,
        obstacleTypes: ["single", "double", "wall"],
        laneShift: true,
        reverseObstacles: false,
        taunts: false,
        glueWalls: false,
        theme: THEME_TRANSMUTATION,
        patterns: [
            PATTERN_ZIGZAG,
            PATTERN_CORRIDOR,
            PATTERN_PINCH,
            PATTERN_SWEEP,
            PATTERN_DOUBLE_SWEEP,
            PATTERN_BREATHE,
        ],
        patternChance: 0.3,
        roadWarp: true,
        blackout: false,
        laneInversion: false,
        pulseSpeed: true,
        depthDistortion: false,
    },
    3: {
        veilId: 3,
        lanes: 5,
        survivalSeconds: 35,
        baseSpeed: 370,
        maxSpeedMultiplier: 2.8,
        baseSpawnInterval: 0.7,
        minSpawnInterval: 0.22,
        obstacleTypes: ["single", "double", "wall"],
        laneShift: true,
        reverseObstacles: true,
        taunts: false,
        glueWalls: false,
        theme: THEME_REVELATION,
        patterns: [
            PATTERN_ZIGZAG,
            PATTERN_CORRIDOR,
            PATTERN_PINCH,
            PATTERN_SWEEP,
            PATTERN_REVERSE_AMBUSH,
            PATTERN_GAUNTLET,
            PATTERN_BREATHE,
        ],
        patternChance: 0.35,
        roadWarp: true,
        blackout: true,
        laneInversion: true,
        pulseSpeed: true,
        depthDistortion: false,
    },
    4: {
        veilId: 4,
        lanes: 5,
        survivalSeconds: 45,
        baseSpeed: 400,
        maxSpeedMultiplier: 3.0,
        baseSpawnInterval: 0.65,
        minSpawnInterval: 0.2,
        obstacleTypes: ["single", "double", "wall", "glue"],
        laneShift: true,
        reverseObstacles: true,
        taunts: true,
        glueWalls: true,
        theme: THEME_FACILITY,
        patterns: [
            PATTERN_ZIGZAG,
            PATTERN_CORRIDOR,
            PATTERN_PINCH,
            PATTERN_SWEEP,
            PATTERN_REVERSE_AMBUSH,
            PATTERN_GAUNTLET,
            PATTERN_DOUBLE_SWEEP,
            PATTERN_TRAP,
            PATTERN_BREATHE,
        ],
        patternChance: 0.4,
        roadWarp: true,
        blackout: true,
        laneInversion: true,
        pulseSpeed: true,
        depthDistortion: true,
    },
}

/** Boss taunts that flash across the screen during veil 4 */
export const BOSS_TAUNTS: string[] = [
    "THE WILL TO BIND",
    "ADHESIVE DESTINY",
    "NO ESCAPE",
    "PRINCIPIUM INDIVIDUATIONIS",
    "BECOME SUBSTRATE",
    "THE ORDER DEMANDS",
    "NERVE LANGUAGE",
    "YIELD: 98.7%",
    "COLLAGEN. PROTEIN. YOU.",
    "TRANSMUTATION IS NOT OPTIONAL",
]
