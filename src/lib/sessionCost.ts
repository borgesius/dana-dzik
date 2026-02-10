import { ANALYTICS_CONFIG } from "../config/analytics"
import { getVisitorId, isClientSampled } from "./analytics"
import { emitAppEvent, onAppEvent } from "./events"

const COST_PER_INVOCATION = 0.000006
const COST_PER_REDIS_COMMAND = 0.000002
const COST_PER_BYTE = 0.0004 / (1024 * 1024)

// ─── Cost Achievement Tiers ─────────────────────────────────────────────────

export interface CostTier {
    threshold: number
    slug: string
}

export const COST_TIERS: readonly CostTier[] = [
    { threshold: 0.001, slug: "cost-1" },
    { threshold: 0.005, slug: "cost-2" },
    { threshold: 0.01, slug: "cost-3" },
    { threshold: 0.025, slug: "cost-4" },
    { threshold: 0.05, slug: "cost-5" },
    { threshold: 0.1, slug: "cost-6" },
    { threshold: 0.25, slug: "cost-7" },
] as const

// ─── Save Data ──────────────────────────────────────────────────────────────

export interface CostSaveData {
    lifetimeApiCalls: Record<string, number>
    lifetimeSampledIntents: Record<string, number>
    lifetimeBandwidthBytes: number
}

export function createEmptyCostData(): CostSaveData {
    return {
        lifetimeApiCalls: {},
        lifetimeSampledIntents: {},
        lifetimeBandwidthBytes: 0,
    }
}

// ─── Types ──────────────────────────────────────────────────────────────────

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

export interface CostBreakdown {
    items: CostLineItem[]
    bandwidthBytes: number
    bandwidthCost: number
    totalCost: number
    lifetimeCost: number
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

// ─── Tracker ────────────────────────────────────────────────────────────────

export class SessionCostTracker {
    // Session-only counters (reset each page load)
    private sessionApiCalls: Map<string, number> = new Map()
    private sessionSampledIntents: Map<string, number> = new Map()
    private sessionBandwidthBytes = 0

    // Lifetime counters (restored from save, accumulated across sessions)
    private prevLifetimeApiCalls: Map<string, number> = new Map()
    private prevLifetimeSampledIntents: Map<string, number> = new Map()
    private prevLifetimeBandwidthBytes = 0

    private isSampled = false
    private listeners: CostUpdateCallback[] = []
    private onDirty: (() => void) | null = null

    // Track which tiers have already fired events
    private firedTiers: Set<string> = new Set()

    constructor() {
        try {
            this.isSampled = isClientSampled(getVisitorId())
        } catch {
            this.isSampled = false
        }

        this.interceptFetch()
        this.measureBandwidth()
        this.listenForAnalyticsIntents()
    }

    public setDirtyCallback(fn: () => void): void {
        this.onDirty = fn
    }

    // ── Serialization ─────────────────────────────────────────────────────

    public serialize(): CostSaveData {
        const lifetimeApiCalls: Record<string, number> = {}
        // Merge previous lifetime + current session
        for (const [k, v] of this.prevLifetimeApiCalls) {
            lifetimeApiCalls[k] = v
        }
        for (const [k, v] of this.sessionApiCalls) {
            lifetimeApiCalls[k] = (lifetimeApiCalls[k] ?? 0) + v
        }

        const lifetimeSampledIntents: Record<string, number> = {}
        for (const [k, v] of this.prevLifetimeSampledIntents) {
            lifetimeSampledIntents[k] = v
        }
        for (const [k, v] of this.sessionSampledIntents) {
            lifetimeSampledIntents[k] = (lifetimeSampledIntents[k] ?? 0) + v
        }

        return {
            lifetimeApiCalls,
            lifetimeSampledIntents,
            lifetimeBandwidthBytes:
                this.prevLifetimeBandwidthBytes + this.sessionBandwidthBytes,
        }
    }

    public deserialize(data: CostSaveData | undefined): void {
        if (!data) return

        this.prevLifetimeApiCalls.clear()
        if (data.lifetimeApiCalls) {
            for (const [k, v] of Object.entries(data.lifetimeApiCalls)) {
                this.prevLifetimeApiCalls.set(k, v)
            }
        }

        this.prevLifetimeSampledIntents.clear()
        if (data.lifetimeSampledIntents) {
            for (const [k, v] of Object.entries(data.lifetimeSampledIntents)) {
                this.prevLifetimeSampledIntents.set(k, v)
            }
        }

        this.prevLifetimeBandwidthBytes = data.lifetimeBandwidthBytes ?? 0

        // Re-emit so the widget and tier checks pick up restored data
        this.emit()
    }

    // ── Fetch Interception ────────────────────────────────────────────────

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
        const current = this.sessionSampledIntents.get(eventType) ?? 0
        this.sessionSampledIntents.set(eventType, current + 1)
        this.emit()
    }

    private recordApiCall(pathname: string): void {
        const current = this.sessionApiCalls.get(pathname) ?? 0
        this.sessionApiCalls.set(pathname, current + 1)
        this.emit()
    }

    public recordNonCriticalAnalyticsIntent(eventType = "unknown"): void {
        this.recordSampledIntent(eventType)
    }

    // ── Bandwidth ─────────────────────────────────────────────────────────

    private measureBandwidth(): void {
        if (typeof PerformanceObserver === "undefined") return

        const processEntries = (entries: PerformanceEntryList): void => {
            for (const entry of entries) {
                const resource = entry as PerformanceResourceTiming
                if (resource.transferSize > 0) {
                    this.sessionBandwidthBytes += resource.transferSize
                }
            }
            this.emit()
        }

        try {
            const existing = performance.getEntriesByType("resource")
            for (const entry of existing) {
                const resource = entry as PerformanceResourceTiming
                if (resource.transferSize > 0) {
                    this.sessionBandwidthBytes += resource.transferSize
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

    // ── Cost Calculation ──────────────────────────────────────────────────

    private computeCostForCounters(
        apiCalls: Map<string, number>,
        sampledIntents: Map<string, number>,
        bandwidthBytes: number
    ): {
        items: CostLineItem[]
        bandwidthCost: number
        total: number
        totalSampledIntents: number
    } {
        const items: CostLineItem[] = []

        for (const [pathname, entry] of Object.entries(API_COST_MAP)) {
            const count = apiCalls.get(pathname) ?? 0
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

        for (const [eventType, count] of sampledIntents.entries()) {
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

        const bandwidthCost = bandwidthBytes * COST_PER_BYTE
        const total =
            items.reduce((sum, item) => sum + item.cost, 0) + bandwidthCost

        return { items, bandwidthCost, total, totalSampledIntents }
    }

    public getBreakdown(): CostBreakdown {
        // Session cost (current page load only)
        const session = this.computeCostForCounters(
            this.sessionApiCalls,
            this.sessionSampledIntents,
            this.sessionBandwidthBytes
        )

        // Lifetime cost (previous sessions + current session)
        const mergedApiCalls = new Map(this.prevLifetimeApiCalls)
        for (const [k, v] of this.sessionApiCalls) {
            mergedApiCalls.set(k, (mergedApiCalls.get(k) ?? 0) + v)
        }
        const mergedSampledIntents = new Map(this.prevLifetimeSampledIntents)
        for (const [k, v] of this.sessionSampledIntents) {
            mergedSampledIntents.set(k, (mergedSampledIntents.get(k) ?? 0) + v)
        }
        const mergedBandwidth =
            this.prevLifetimeBandwidthBytes + this.sessionBandwidthBytes

        const lifetime = this.computeCostForCounters(
            mergedApiCalls,
            mergedSampledIntents,
            mergedBandwidth
        )

        return {
            items: session.items,
            bandwidthBytes: this.sessionBandwidthBytes,
            bandwidthCost: session.bandwidthCost,
            totalCost: session.total,
            lifetimeCost: lifetime.total,
            isSampled: this.isSampled,
            totalSampledIntents: session.totalSampledIntents,
        }
    }

    public onUpdate(fn: CostUpdateCallback): void {
        this.listeners.push(fn)
    }

    // ── Emit & Tier Checks ────────────────────────────────────────────────

    private emit(): void {
        const breakdown = this.getBreakdown()
        for (const fn of this.listeners) {
            fn(breakdown)
        }

        // Check cost tiers against lifetime cost
        for (const tier of COST_TIERS) {
            if (
                !this.firedTiers.has(tier.slug) &&
                breakdown.lifetimeCost >= tier.threshold
            ) {
                this.firedTiers.add(tier.slug)
                type CostEvent =
                    | "session-cost:cost-1"
                    | "session-cost:cost-2"
                    | "session-cost:cost-3"
                    | "session-cost:cost-4"
                    | "session-cost:cost-5"
                    | "session-cost:cost-6"
                    | "session-cost:cost-7"
                emitAppEvent(`session-cost:${tier.slug}` as CostEvent)
            }
        }

        this.onDirty?.()
    }
}

// ─── Singleton ──────────────────────────────────────────────────────────────

let instance: SessionCostTracker | null = null

export function initSessionCostTracker(): SessionCostTracker {
    if (!instance) {
        instance = new SessionCostTracker()
    }
    return instance
}

export function getSessionCostTracker(): SessionCostTracker | null {
    return instance
}
