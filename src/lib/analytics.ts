import { ANALYTICS_CONFIG } from "../config/analytics"
import type { RoutableWindow } from "../config/routing"
import { apiFetch, apiPost } from "./api/client"
import { emitAppEvent, onAppEvent } from "./events"

function isBot(): boolean {
    const ua = navigator.userAgent.toLowerCase()
    const botPatterns = [
        "bot",
        "crawl",
        "spider",
        "slurp",
        "facebookexternalhit",
        "linkedinbot",
        "twitterbot",
        "whatsapp",
        "telegram",
        "discord",
        "slack",
        "googlebot",
        "bingbot",
        "yandex",
        "baidu",
        "duckduck",
        "semrush",
        "ahref",
        "mj12bot",
        "dotbot",
        "petalbot",
        "bytespider",
        "gptbot",
        "claudebot",
        "anthropic",
        "headless",
        "phantom",
        "selenium",
        "puppeteer",
        "playwright",
        "webdriver",
        "lighthouse",
        "pagespeed",
        "pingdom",
        "uptimerobot",
    ]
    return botPatterns.some((pattern) => ua.includes(pattern))
}

const AB_TEST_KEY = "ab_variant"
const AB_TRACKED_KEY = "ab_variant_tracked"
const VISITOR_KEY = "visitor_id"
const PERF_COUNT_KEY = "perf_event_count"
const WINDOW_TRACKED_PREFIX = "window_tracked_"
const PAGEVIEW_TRACKED_KEY = "pageview_tracked"
const SESSION_BUDGET_KEY = "analytics_session_budget"

export const PHOTO_VARIANTS = [
    {
        id: "A",
        photo: "/assets/dana/IMG_5099.jpg",
        webp: "/assets/dana/IMG_5099.webp",
    },
    {
        id: "B",
        photo: "/assets/dana/IMG_5531.jpg",
        webp: "/assets/dana/IMG_5531.webp",
    },
    {
        id: "C",
        photo: "/assets/dana/IMG_5576.jpg",
        webp: "/assets/dana/IMG_5576.webp",
    },
    {
        id: "D",
        photo: "/assets/dana/IMG_7045.jpg",
        webp: "/assets/dana/IMG_7045.webp",
    },
] as const

export type PhotoVariant = (typeof PHOTO_VARIANTS)[number]["id"]

interface AnalyticsEvent {
    type:
        | "pageview"
        | "window"
        | "funnel"
        | "ab_assign"
        | "ab_convert"
        | "perf"
        | "crash"
    windowId?: string
    funnelStep?: string
    variant?: string
    effectType?: string
    perf?: {
        resource: string
        duration: number
        type: string
    }
}

// ─── Sampling ───────────────────────────────────────────────────────────────
//     Deterministic hash so both client and server agree on who is sampled.
//     Must match the implementation in api/lib/redisGateway.ts.

export function hashString(value: string): number {
    let hash = 0
    for (let i = 0; i < value.length; i++) {
        hash = ((hash << 5) - hash + value.charCodeAt(i)) | 0
    }
    return Math.abs(hash)
}

export function isClientSampled(visitorId: string): boolean {
    const { sampleRate } = ANALYTICS_CONFIG
    return hashString(visitorId) % 10_000 < sampleRate * 10_000
}

function isCriticalEvent(eventType: string): boolean {
    return eventType === "pageview" || eventType === "crash"
}

function consumeSessionBudget(): boolean {
    const count = parseInt(
        sessionStorage.getItem(SESSION_BUDGET_KEY) || "0",
        10
    )
    if (count >= ANALYTICS_CONFIG.sessionEventBudget) return false
    sessionStorage.setItem(SESSION_BUDGET_KEY, (count + 1).toString())
    return true
}

// ─── Visitor ID ─────────────────────────────────────────────────────────────

function getVisitorId(): string {
    let id = localStorage.getItem(VISITOR_KEY)
    if (!id) {
        id = Math.random().toString(36).substring(2) + Date.now().toString(36)
        localStorage.setItem(VISITOR_KEY, id)
    }
    return id
}

// ─── Event Sending ──────────────────────────────────────────────────────────
//
//     Client-side gating mirrors the server-side redisGateway:
//
//     1. Critical events (pageview) → always sent
//     2. Non-sampled visitors (99%) → non-critical events dropped here,
//        never hitting the server or Redis at all
//     3. Sampled visitors (1%) → non-critical events sent up to the
//        per-session budget, then stopped
//
//     The server enforces the same rules as defense-in-depth, but the
//     client-side gating avoids unnecessary network requests entirely.

const ANALYTICS_TOKEN = "dk-analytics-2026"

async function sendEvent(event: AnalyticsEvent): Promise<void> {
    if (isBot()) return

    const visitorId = getVisitorId()

    if (!isCriticalEvent(event.type)) {
        emitAppEvent("analytics:intent", { type: event.type })
        if (!isClientSampled(visitorId)) return
        if (!consumeSessionBudget()) return
    }

    await apiPost("/api/analytics", event, {
        "X-Analytics-Token": ANALYTICS_TOKEN,
        "X-Visitor-Id": visitorId,
    })
}

export function trackPageview(): void {
    if (sessionStorage.getItem(PAGEVIEW_TRACKED_KEY)) return
    sessionStorage.setItem(PAGEVIEW_TRACKED_KEY, "true")
    void sendEvent({ type: "pageview" })
}

const FUNNEL_PREFIX = "funnel_"

export function trackWindowOpen(windowId: RoutableWindow): void {
    const key = `${WINDOW_TRACKED_PREFIX}${windowId}`
    if (!sessionStorage.getItem(key)) {
        sessionStorage.setItem(key, "true")
        void sendEvent({ type: "window", windowId })
    }
    trackFunnelStep("engaged")
    trackAbConversion()
}

export function trackFunnelStep(step: string): void {
    const key = `${FUNNEL_PREFIX}${step}`
    if (localStorage.getItem(key)) return
    localStorage.setItem(key, "true")
    void sendEvent({ type: "funnel", funnelStep: step })
}

export function getAbVariant(): PhotoVariant {
    let variant = localStorage.getItem(AB_TEST_KEY) as PhotoVariant | null

    if (!variant || !PHOTO_VARIANTS.find((v) => v.id === variant)) {
        const idx = Math.floor(Math.random() * PHOTO_VARIANTS.length)
        variant = PHOTO_VARIANTS[idx].id
        localStorage.setItem(AB_TEST_KEY, variant)
    }

    if (!localStorage.getItem(AB_TRACKED_KEY)) {
        localStorage.setItem(AB_TRACKED_KEY, "true")
        void sendEvent({ type: "ab_assign", variant })
    }

    return variant
}

export function getVariantPhoto(): string {
    const variant = getAbVariant()
    const found = PHOTO_VARIANTS.find((v) => v.id === variant)
    return found?.photo ?? PHOTO_VARIANTS[0].photo
}

const AB_CONVERTED_KEY = "ab_converted"

export function trackAbConversion(): void {
    if (localStorage.getItem(AB_CONVERTED_KEY)) return
    const variant = localStorage.getItem(AB_TEST_KEY)
    if (variant) {
        localStorage.setItem(AB_CONVERTED_KEY, "true")
        void sendEvent({ type: "ab_convert", variant })
    }
}

export function trackCrash(effectType: string): void {
    void sendEvent({ type: "crash", effectType })
}

function getPerfEventCount(): number {
    const stored = localStorage.getItem(PERF_COUNT_KEY)
    return stored ? parseInt(stored, 10) : 0
}

function incrementPerfEventCount(): number {
    const count = getPerfEventCount() + 1
    localStorage.setItem(PERF_COUNT_KEY, count.toString())
    return count
}

export function initPerfTracking(): void {
    if (typeof PerformanceObserver === "undefined") return

    const { maxPerfEvents, minPerfDuration } = ANALYTICS_CONFIG

    if (getPerfEventCount() >= maxPerfEvents) return

    const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
            if (getPerfEventCount() >= maxPerfEvents) {
                observer.disconnect()
                return
            }

            if (entry.entryType === "resource") {
                const resource = entry as PerformanceResourceTiming
                const url = new URL(resource.name, window.location.origin)
                const ext = url.pathname.split(".").pop() || "other"
                const type = getResourceType(ext)

                if (resource.duration > minPerfDuration) {
                    incrementPerfEventCount()
                    void sendEvent({
                        type: "perf",
                        perf: {
                            resource: url.pathname,
                            duration: Math.round(resource.duration),
                            type,
                        },
                    })
                }
            }
        }
    })

    observer.observe({ entryTypes: ["resource"] })
}

function getResourceType(ext: string): string {
    const types: Record<string, string> = {
        js: "script",
        css: "style",
        jpg: "image",
        jpeg: "image",
        png: "image",
        gif: "image",
        webp: "image",
        svg: "image",
        woff: "font",
        woff2: "font",
        ttf: "font",
        mp3: "audio",
        wav: "audio",
        mid: "audio",
        midi: "audio",
    }
    return types[ext.toLowerCase()] || "other"
}

export function initCrashTracking(): void {
    onAppEvent("system-crash:triggered", (detail) => {
        trackCrash(detail.effectType)
    })
}

// ─── Achievement Reporting ──────────────────────────────────────────────────
//     NOT sampled — every user reports earned achievements so global counts
//     are accurate. The server deduplicates per visitor.

let reportTimer: ReturnType<typeof setTimeout> | null = null
const REPORT_DEBOUNCE_MS = 2000

export function scheduleAchievementReport(): void {
    if (reportTimer) clearTimeout(reportTimer)
    reportTimer = setTimeout(() => {
        reportTimer = null
        void reportAchievements()
    }, REPORT_DEBOUNCE_MS)
}

async function reportAchievements(): Promise<void> {
    if (isBot()) return

    const { getAchievementManager } =
        await import("./achievements/AchievementManager")
    const mgr = getAchievementManager()
    const unreported = mgr.getUnreported()
    if (unreported.length === 0) return

    const visitorId = getVisitorId()

    try {
        await apiPost(
            "/api/achievement-counts",
            { achievements: unreported },
            { "X-Visitor-Id": visitorId }
        )

        for (const id of unreported) {
            mgr.markReported(id)
        }
    } catch {
        // Silently fail — will retry on next earn
    }
}

// ─── Achievement Counts (GET) ───────────────────────────────────────────────

export interface AchievementCountsData {
    counts: Record<string, number>
    totalUsers: number
}

let cachedCounts: AchievementCountsData | null = null

export async function fetchAchievementCounts(): Promise<AchievementCountsData> {
    if (cachedCounts) return cachedCounts

    const result = await apiFetch<{
        ok: boolean
        data?: AchievementCountsData
    }>("/api/achievement-counts")

    if (result.ok && result.data.ok && result.data.data) {
        cachedCounts = result.data.data
        return cachedCounts
    }

    return { counts: {}, totalUsers: 0 }
}

export { getVisitorId }
