import { ANALYTICS_CONFIG } from "../config"

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

export const PHOTO_VARIANTS = [
    { id: "A", photo: "/assets/dana/IMG_5099.jpg" },
    { id: "B", photo: "/assets/dana/IMG_5531.jpg" },
    { id: "C", photo: "/assets/dana/IMG_5576.jpg" },
] as const

export type PhotoVariant = (typeof PHOTO_VARIANTS)[number]["id"]

interface AnalyticsEvent {
    type: "pageview" | "window" | "funnel" | "ab_assign" | "ab_convert" | "perf"
    windowId?: string
    funnelStep?: string
    variant?: string
    perf?: {
        resource: string
        duration: number
        type: string
    }
}

function getVisitorId(): string {
    let id = localStorage.getItem(VISITOR_KEY)
    if (!id) {
        id = Math.random().toString(36).substring(2) + Date.now().toString(36)
        localStorage.setItem(VISITOR_KEY, id)
    }
    return id
}

async function sendEvent(event: AnalyticsEvent): Promise<void> {
    if (isBot()) return

    try {
        await fetch("/api/analytics", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(event),
        })
    } catch {
        // Silently fail - analytics shouldn't break the site
    }
}

export function trackPageview(): void {
    if (sessionStorage.getItem(PAGEVIEW_TRACKED_KEY)) return
    sessionStorage.setItem(PAGEVIEW_TRACKED_KEY, "true")
    void sendEvent({ type: "pageview" })
}

const FUNNEL_PREFIX = "funnel_"

export function trackWindowOpen(windowId: string): void {
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

export { getVisitorId }
