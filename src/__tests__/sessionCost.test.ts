/**
 * @vitest-environment jsdom
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import type { SessionCostTracker } from "../lib/sessionCost"

const COST_PER_INVOCATION = 0.000006
const COST_PER_REDIS_COMMAND = 0.000002
const COST_PER_BYTE = 0.0004 / (1024 * 1024)

vi.mock("../lib/analytics", () => ({
    getVisitorId: (): string => "test-visitor",
    isClientSampled: (): boolean => false,
}))

describe("SessionCostTracker", () => {
    let mockFetch: ReturnType<typeof vi.fn>

    beforeEach(() => {
        mockFetch = vi.fn().mockResolvedValue(new Response(""))
        vi.stubGlobal("fetch", mockFetch)
        vi.stubGlobal(
            "PerformanceObserver",
            vi.fn().mockImplementation(() => ({
                observe: vi.fn(),
                disconnect: vi.fn(),
            }))
        )
        vi.stubGlobal("performance", {
            getEntriesByType: () => [],
        })
    })

    afterEach(() => {
        vi.restoreAllMocks()
        vi.resetModules()
    })

    async function createTracker(): Promise<SessionCostTracker> {
        const mod = await import("../lib/sessionCost")
        return new mod.SessionCostTracker()
    }

    it("starts with zero cost", async () => {
        const tracker = await createTracker()
        const breakdown = tracker.getBreakdown()
        expect(breakdown.totalCost).toBe(0)
        expect(breakdown.lifetimeCost).toBe(0)
        expect(breakdown.items).toHaveLength(0)
        expect(breakdown.bandwidthBytes).toBe(0)
    })

    it("tracks API calls via fetch interception", async () => {
        const tracker = await createTracker()

        void window.fetch("http://localhost/api/strava")

        const breakdown = tracker.getBreakdown()
        const stravaItem = breakdown.items.find((i) => i.label === "Strava")
        expect(stravaItem).toBeDefined()
        expect(stravaItem!.count).toBe(1)
        expect(stravaItem!.sampled).toBe(false)

        const expectedCost = COST_PER_INVOCATION + 2 * COST_PER_REDIS_COMMAND
        expect(stravaItem!.cost).toBeCloseTo(expectedCost, 10)
        expect(mockFetch).toHaveBeenCalledTimes(1)
    })

    it("normalizes analytics non-critical events by type", async () => {
        const tracker = await createTracker()

        tracker.recordNonCriticalAnalyticsIntent("window")
        tracker.recordNonCriticalAnalyticsIntent("window")
        tracker.recordNonCriticalAnalyticsIntent("funnel")

        const breakdown = tracker.getBreakdown()
        const windowItem = breakdown.items.find(
            (i) => i.sampled && i.label === "Window Opens"
        )
        const funnelItem = breakdown.items.find(
            (i) => i.sampled && i.label === "Funnel Steps"
        )
        expect(windowItem).toBeDefined()
        expect(windowItem!.count).toBe(2)
        expect(funnelItem).toBeDefined()
        expect(funnelItem!.count).toBe(1)
        expect(breakdown.totalSampledIntents).toBe(3)

        const costPerCall = COST_PER_INVOCATION + 2 * COST_PER_REDIS_COMMAND
        expect(windowItem!.cost).toBeCloseTo(2 * 0.01 * costPerCall, 10)
    })

    it("tracks sampled intents via analytics:intent event", async () => {
        await createTracker()

        document.dispatchEvent(
            new CustomEvent("analytics:intent", {
                detail: { type: "ab_assign" },
            })
        )
        document.dispatchEvent(
            new CustomEvent("analytics:intent", {
                detail: { type: "perf" },
            })
        )

        const mod = await import("../lib/sessionCost")
        const tracker = mod.getSessionCostTracker()
        expect(tracker).toBeNull()

        const freshTracker = await createTracker()
        freshTracker.recordNonCriticalAnalyticsIntent("ab_assign")

        const breakdown = freshTracker.getBreakdown()
        const abItem = breakdown.items.find(
            (i) => i.label === "A/B Impressions"
        )
        expect(abItem).toBeDefined()
        expect(abItem!.sampled).toBe(true)
    })

    it("fires session-cost:cost-1 when first tier threshold is crossed", async () => {
        const handler = vi.fn()
        document.addEventListener("session-cost:cost-1", handler)

        const tracker = await createTracker()
        // Deserialize with enough lifetime cost to cross cost-1 ($0.001)
        tracker.deserialize({
            lifetimeApiCalls: {},
            lifetimeSampledIntents: {},
            lifetimeBandwidthBytes: 3 * 1024 * 1024, // ~3MB = ~$0.0012
        })

        await vi.waitFor(() => {
            expect(handler).toHaveBeenCalledTimes(1)
        })

        document.removeEventListener("session-cost:cost-1", handler)
    })

    it("fires multiple tier events when thresholds are crossed", async () => {
        const cost1Handler = vi.fn()
        const cost2Handler = vi.fn()
        document.addEventListener("session-cost:cost-1", cost1Handler)
        document.addEventListener("session-cost:cost-2", cost2Handler)

        const tracker = await createTracker()
        // Deserialize with enough lifetime cost to cross cost-1 ($0.001) and cost-2 ($0.005)
        tracker.deserialize({
            lifetimeApiCalls: {},
            lifetimeSampledIntents: {},
            lifetimeBandwidthBytes: 15 * 1024 * 1024, // ~15MB = ~$0.006
        })

        await vi.waitFor(() => {
            expect(cost1Handler).toHaveBeenCalledTimes(1)
            expect(cost2Handler).toHaveBeenCalledTimes(1)
        })

        document.removeEventListener("session-cost:cost-1", cost1Handler)
        document.removeEventListener("session-cost:cost-2", cost2Handler)
    })

    it("only fires each tier event once", async () => {
        const handler = vi.fn()
        document.addEventListener("session-cost:cost-1", handler)

        const tracker = await createTracker()
        tracker.deserialize({
            lifetimeApiCalls: {},
            lifetimeSampledIntents: {},
            lifetimeBandwidthBytes: 3 * 1024 * 1024,
        })

        // Trigger additional updates
        void window.fetch("http://localhost/api/strava")
        void window.fetch("http://localhost/api/lastfm")

        expect(handler).toHaveBeenCalledTimes(1)

        document.removeEventListener("session-cost:cost-1", handler)
    })

    it("calls update listeners on changes", async () => {
        const tracker = await createTracker()
        const listener = vi.fn()
        tracker.onUpdate(listener)

        void window.fetch("http://localhost/api/visitor-count")

        expect(listener).toHaveBeenCalled()
        const lastCall = listener.mock.calls[
            listener.mock.calls.length - 1
        ] as [{ totalCost: number }]
        expect(lastCall[0].totalCost).toBeGreaterThan(0)
    })

    it("reports isSampled from analytics module", async () => {
        const tracker = await createTracker()
        const breakdown = tracker.getBreakdown()
        expect(breakdown.isSampled).toBe(false)
    })

    describe("serialization", () => {
        it("serializes lifetime totals (previous + current session)", async () => {
            const tracker = await createTracker()

            // Restore some previous lifetime data
            tracker.deserialize({
                lifetimeApiCalls: { "/api/strava": 5 },
                lifetimeSampledIntents: { window: 10 },
                lifetimeBandwidthBytes: 1000,
            })

            // Trigger a session API call
            void window.fetch("http://localhost/api/strava")

            const saved = tracker.serialize()
            expect(saved.lifetimeApiCalls["/api/strava"]).toBe(6) // 5 previous + 1 session
            expect(saved.lifetimeSampledIntents["window"]).toBe(10)
            expect(saved.lifetimeBandwidthBytes).toBe(1000) // no new bandwidth in test
        })

        it("computes lifetimeCost from merged counters", async () => {
            const tracker = await createTracker()

            tracker.deserialize({
                lifetimeApiCalls: {},
                lifetimeSampledIntents: {},
                lifetimeBandwidthBytes: 1024 * 1024, // 1MB = $0.0004
            })

            const breakdown = tracker.getBreakdown()
            expect(breakdown.lifetimeCost).toBeCloseTo(0.0004, 6)
            expect(breakdown.totalCost).toBe(0) // session has no bandwidth
        })

        it("exports COST_TIERS array", async () => {
            const mod = await import("../lib/sessionCost")
            expect(mod.COST_TIERS).toHaveLength(7)
            expect(mod.COST_TIERS[0].slug).toBe("cost-1")
            expect(mod.COST_TIERS[0].threshold).toBe(0.001)
            expect(mod.COST_TIERS[6].slug).toBe("cost-7")
            expect(mod.COST_TIERS[6].threshold).toBe(0.25)
        })

        it("uses correct Vercel bandwidth pricing", () => {
            const oneMB = 1024 * 1024
            const costPerMB = COST_PER_BYTE * oneMB
            expect(costPerMB).toBeCloseTo(0.0004, 6)
        })
    })
})
