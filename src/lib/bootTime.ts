declare global {
    interface Window {
        __BOOT_START?: number
    }
}

export interface BootTimingBreakdown {
    totalMs: number
    dns: number
    tcp: number
    ttfb: number
    domParse: number
    resources: number
}

let bootEndMs: number | null = null
let breakdown: BootTimingBreakdown | null = null

export function recordBootEnd(): void {
    const now = performance.now()
    const start = window.__BOOT_START
    if (start == null) return

    bootEndMs = now - start

    // Try to build a navigation timing breakdown
    try {
        const entries = performance.getEntriesByType(
            "navigation"
        ) as PerformanceNavigationTiming[]
        if (entries.length > 0) {
            const nav = entries[0]
            breakdown = {
                totalMs: Math.round(bootEndMs),
                dns: Math.round(nav.domainLookupEnd - nav.domainLookupStart),
                tcp: Math.round(nav.connectEnd - nav.connectStart),
                ttfb: Math.round(nav.responseStart - nav.requestStart),
                domParse: Math.round(
                    nav.domContentLoadedEventEnd - nav.responseEnd
                ),
                resources: Math.round(nav.loadEventEnd - nav.responseEnd),
            }
            return
        }
    } catch {
        // Navigation Timing API may not be available
    }

    breakdown = {
        totalMs: Math.round(bootEndMs),
        dns: 0,
        tcp: 0,
        ttfb: 0,
        domParse: 0,
        resources: 0,
    }
}

export function getBootTimeMs(): number | null {
    return bootEndMs !== null ? Math.round(bootEndMs) : null
}

export function getBootBreakdown(): BootTimingBreakdown | null {
    return breakdown
}
