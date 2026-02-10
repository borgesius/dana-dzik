import { ANALYTICS_CONFIG } from "../config/analytics"
import { getVisitorId, isClientSampled } from "./analytics"
import { emitAppEvent, onAppEvent } from "./events"

const COST_PER_INVOCATION = 0.000006
const COST_PER_REDIS_COMMAND = 0.000002
const COST_PER_BYTE = 0.0004 / (1024 * 1024)

export const BIG_SPENDER_THRESHOLD = 0.001
export const WHALE_THRESHOLD = 0.002
export const LEVIATHAN_THRESHOLD = 0.003

interface ApiCostEntry {
    redisCommands: number
    label: string
    isAnalytics?: boolean
}

const API_COST_MAP: Record<string, ApiCostEntry> = {
    "/api/analytics:POST": {
        redisCommands: 2,
        label: "Pageview",
        isAnalytics: true,
    },
    "/api/analytics:GET": { redisCommands: 1, label: "Stats" },
    "/api/strava": { redisCommands: 2, label: "Strava" },
    "/api/lastfm": { redisCommands: 0, label: "Last.fm" },
    "/api/visitor-count": { redisCommands: 2, label: "Visitor Count" },
    "/api/reports": { redisCommands: 0, label: "QA Reports" },
    "/api/achievement-counts:POST": {
        redisCommands: 4,
        label: "Achievements",
    },
    "/api/achievement-counts:GET": {
        redisCommands: 1,
        label: "Achiev. Counts",
    },
}

interface CostLineItem {
    label: string
    cost: number
    count: number
    sampled: boolean
}

interface CostBreakdown {
    items: CostLineItem[]
    bandwidthBytes: number
    bandwidthCost: number
    totalCost: number
    isSampled: boolean
    totalSampledIntents: number
}

type CostUpdateCallback = (breakdown: CostBreakdown) => void

const SAMPLED_EVENT_LABELS: Record<string, string> = {
    window: "Window Opens",
    funnel: "Funnel Steps",
    ab_assign: "A/B Impressions",
    ab_convert: "A/B Conversions",
    perf: "Perf Metrics",
}

export class SessionCostTracker {
    private apiCalls: Map<string, number> = new Map()
    private sampledIntents: Map<string, number> = new Map()
    private bandwidthBytes = 0
    private isSampled = false
    private listeners: CostUpdateCallback[] = []
    private bigSpenderThreshold: number
    private whaleThreshold: number
    private leviathanThreshold: number
    private bigSpenderFired = false
    private whaleFired = false
    private leviathanFired = false

    constructor(
        bigSpenderThreshold: number,
        whaleThreshold: number,
        leviathanThreshold: number
    ) {
        this.bigSpenderThreshold = bigSpenderThreshold
        this.whaleThreshold = whaleThreshold
        this.leviathanThreshold = leviathanThreshold

        try {
            this.isSampled = isClientSampled(getVisitorId())
        } catch {
            this.isSampled = false
        }

        this.interceptFetch()
        this.measureBandwidth()
        this.listenForAnalyticsIntents()
    }

    private interceptFetch(): void {
        const originalFetch = window.fetch
        const recordApiCall = this.recordApiCall.bind(this)
        const recordAnalyticsPost = this.recordAnalyticsPost.bind(this)

        window.fetch = function (
            input: RequestInfo | URL,
            init?: RequestInit
        ): Promise<Response> {
            const url =
                typeof input === "string"
                    ? input
                    : input instanceof URL
                      ? input.pathname
                      : input.url

            let pathname: string
            try {
                pathname = new URL(url, window.location.origin).pathname
            } catch {
                pathname = url
            }

            const method = init?.method?.toUpperCase() ?? "GET"
            const methodKey = `${pathname}:${method}`
            const entry = API_COST_MAP[methodKey] ?? API_COST_MAP[pathname]
            if (entry) {
                if (entry.isAnalytics && method === "POST") {
                    recordAnalyticsPost(init, methodKey)
                } else {
                    recordApiCall(
                        API_COST_MAP[methodKey] ? methodKey : pathname
                    )
                }
            }

            return originalFetch.call(window, input, init)
        }
    }

    private recordAnalyticsPost(init?: RequestInit, key?: string): void {
        try {
            // SAFETY: init.body is our own serialized analytics payload
            const body: Record<string, unknown> | null =
                typeof init?.body === "string"
                    ? (JSON.parse(init.body) as Record<string, unknown>)
                    : null
            const eventType = body?.type as string | undefined

            if (eventType === "pageview") {
                this.recordApiCall(key ?? "/api/analytics:POST")
            }
        } catch {
            this.recordApiCall(key ?? "/api/analytics:POST")
        }
    }

    private listenForAnalyticsIntents(): void {
        onAppEvent("analytics:intent", (detail) => {
            this.recordSampledIntent(detail.type)
        })
    }

    private recordSampledIntent(eventType: string): void {
        const current = this.sampledIntents.get(eventType) ?? 0
        this.sampledIntents.set(eventType, current + 1)
        this.emit()
    }

    private recordApiCall(pathname: string): void {
        const current = this.apiCalls.get(pathname) ?? 0
        this.apiCalls.set(pathname, current + 1)
        this.emit()
    }

    public recordNonCriticalAnalyticsIntent(eventType = "unknown"): void {
        this.recordSampledIntent(eventType)
    }

    private measureBandwidth(): void {
        if (typeof PerformanceObserver === "undefined") return

        const processEntries = (entries: PerformanceEntryList): void => {
            for (const entry of entries) {
                const resource = entry as PerformanceResourceTiming
                if (resource.transferSize > 0) {
                    this.bandwidthBytes += resource.transferSize
                }
            }
            this.emit()
        }

        try {
            const existing = performance.getEntriesByType("resource")
            for (const entry of existing) {
                const resource = entry as PerformanceResourceTiming
                if (resource.transferSize > 0) {
                    this.bandwidthBytes += resource.transferSize
                }
            }
        } catch {
            // Performance API may not be available
        }

        try {
            const observer = new PerformanceObserver((list) => {
                processEntries(list.getEntries())
            })
            observer.observe({ entryTypes: ["resource"] })
        } catch {
            // PerformanceObserver may not support resource type
        }

        this.emit()
    }

    public getBreakdown(): CostBreakdown {
        const items: CostLineItem[] = []

        for (const [pathname, entry] of Object.entries(API_COST_MAP)) {
            const count = this.apiCalls.get(pathname) ?? 0
            if (count === 0) continue

            const cost =
                count *
                (COST_PER_INVOCATION +
                    entry.redisCommands * COST_PER_REDIS_COMMAND)
            items.push({
                label: entry.label,
                cost,
                count,
                sampled: false,
            })
        }

        const sampleRate = ANALYTICS_CONFIG.sampleRate
        const costPerSampledCall =
            COST_PER_INVOCATION +
            (API_COST_MAP["/api/analytics:POST"]?.redisCommands ?? 2) *
                COST_PER_REDIS_COMMAND
        let totalSampledIntents = 0

        for (const [eventType, count] of this.sampledIntents.entries()) {
            totalSampledIntents += count
            const normalizedCount = count * sampleRate
            const cost = normalizedCount * costPerSampledCall
            const label = SAMPLED_EVENT_LABELS[eventType] ?? eventType
            items.push({
                label,
                cost,
                count,
                sampled: true,
            })
        }

        const bandwidthCost = this.bandwidthBytes * COST_PER_BYTE
        const totalCost =
            items.reduce((sum, item) => sum + item.cost, 0) + bandwidthCost

        return {
            items,
            bandwidthBytes: this.bandwidthBytes,
            bandwidthCost,
            totalCost,
            isSampled: this.isSampled,
            totalSampledIntents,
        }
    }

    public onUpdate(fn: CostUpdateCallback): void {
        this.listeners.push(fn)
    }

    private emit(): void {
        const breakdown = this.getBreakdown()
        for (const fn of this.listeners) {
            fn(breakdown)
        }

        if (
            !this.bigSpenderFired &&
            breakdown.totalCost >= this.bigSpenderThreshold
        ) {
            this.bigSpenderFired = true
            emitAppEvent("session-cost:big-spender")
        }

        if (!this.whaleFired && breakdown.totalCost >= this.whaleThreshold) {
            this.whaleFired = true
            emitAppEvent("session-cost:whale")
        }

        if (
            !this.leviathanFired &&
            breakdown.totalCost >= this.leviathanThreshold
        ) {
            this.leviathanFired = true
            emitAppEvent("session-cost:leviathan")
        }
    }
}

let instance: SessionCostTracker | null = null

export function initSessionCostTracker(
    bigSpenderThreshold: number,
    whaleThreshold: number,
    leviathanThreshold: number
): SessionCostTracker {
    if (!instance) {
        instance = new SessionCostTracker(
            bigSpenderThreshold,
            whaleThreshold,
            leviathanThreshold
        )
    }
    return instance
}

export function getSessionCostTracker(): SessionCostTracker | null {
    return instance
}
