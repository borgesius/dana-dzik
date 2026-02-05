const AB_TEST_KEY = "ab_variant"
const VISITOR_KEY = "visitor_id"

export const PHOTO_VARIANTS = [
    { id: "A", photo: "/assets/dana/IMG_5099.jpg" },
    { id: "B", photo: "/assets/dana/IMG_5531.jpg" },
    { id: "C", photo: "/assets/dana/IMG_5576.jpg" },
] as const

export type PhotoVariant = (typeof PHOTO_VARIANTS)[number]["id"]

interface AnalyticsEvent {
    type: "pageview" | "window" | "funnel" | "ab_assign" | "ab_convert"
    windowId?: string
    funnelStep?: string
    variant?: string
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
    void sendEvent({ type: "pageview" })
}

export function trackWindowOpen(windowId: string): void {
    void sendEvent({ type: "window", windowId })
    void sendEvent({ type: "funnel", funnelStep: `window:${windowId}` })
}

export function trackFunnelStep(step: string): void {
    void sendEvent({ type: "funnel", funnelStep: step })
}

export function getAbVariant(): PhotoVariant {
    let variant = localStorage.getItem(AB_TEST_KEY) as PhotoVariant | null

    if (!variant || !PHOTO_VARIANTS.find((v) => v.id === variant)) {
        const idx = Math.floor(Math.random() * PHOTO_VARIANTS.length)
        variant = PHOTO_VARIANTS[idx].id
        localStorage.setItem(AB_TEST_KEY, variant)
        void sendEvent({ type: "ab_assign", variant })
    }

    return variant
}

export function getVariantPhoto(): string {
    const variant = getAbVariant()
    const found = PHOTO_VARIANTS.find((v) => v.id === variant)
    return found?.photo ?? PHOTO_VARIANTS[0].photo
}

export function trackAbConversion(): void {
    const variant = localStorage.getItem(AB_TEST_KEY)
    if (variant) {
        void sendEvent({ type: "ab_convert", variant })
    }
}

export { getVisitorId }
