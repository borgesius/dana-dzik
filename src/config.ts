/**
 * Site configuration - centralized constants and settings
 */

/** Social links and contact information */
export const SOCIAL = {
    github: {
        username: "borgesius",
        url: "https://github.com/borgesius",
    },
    linkedin: {
        username: "danadzik",
        url: "https://linkedin.com/in/danadzik",
    },
    strava: {
        username: "danadzik",
        url: "https://www.strava.com/athletes/danadzik",
    },
    email: "danadzik@gmail.com",
} as const

/** Popup behavior settings */
export const POPUP_CONFIG = {
    /** How long popups keep spawning after engaging with the money game (ms) */
    gameSessionDurationMs: 180_000,
    /** How long popups keep spawning after a window-open trigger (ms) */
    windowSessionDurationMs: 15_000,
    /** Chance of popups triggering when a new window opens (0-1) */
    windowTriggerChance: 0.2,
    /** Maximum concurrent popups */
    maxConcurrent: 2,
} as const

/** Photo slideshow settings */
export const SLIDESHOW_CONFIG = {
    /** Interval between photo changes (ms) */
    interval: 3000,
    /** Fade transition duration (ms) */
    fadeDuration: 300,
} as const

/** Last.fm polling interval (ms) */
export const LASTFM_POLL_INTERVAL = 30000

/** Analytics settings */
export const ANALYTICS_CONFIG = {
    /** Maximum number of performance events to send per page load */
    maxPerfEvents: 10,
    /** Minimum resource duration (ms) to track */
    minPerfDuration: 50,
    /**
     * Fraction of visitors in the "sampled" cohort (0.001 = 0.1%).
     * Only sampled visitors send non-critical events (window opens, funnel,
     * A/B, perf). Must match the server-side SAMPLE_RATE in redisGateway.
     */
    sampleRate: 0.001,
    /** Max non-critical events a sampled client sends per session */
    sessionEventBudget: 15,
} as const

/** Window content types that can be routed to */
export const ROUTABLE_WINDOWS = [
    "welcome",
    "about",
    "projects",
    "resume",
    "links",
    "guestbook",
    "felixgpt",
    "stats",
    "terminal",
    "explorer",
] as const

export type RoutableWindow = (typeof ROUTABLE_WINDOWS)[number]

/** Map URL paths to window content types */
export const ROUTE_MAP: Record<string, RoutableWindow> = {
    "/": "welcome",
    "/about": "about",
    "/projects": "projects",
    "/resume": "resume",
    "/links": "links",
    "/guestbook": "guestbook",
    "/felixgpt": "felixgpt",
    "/stats": "stats",
    "/terminal": "terminal",
}
