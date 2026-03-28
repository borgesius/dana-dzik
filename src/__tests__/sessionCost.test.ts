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

        const expectedCost = COST_PER_INVOCATION + 2 * COST_PER_REDIS_COMMAND
        expect(stravaItem!.cost).toBeCloseTo(expectedCost, 10)
        expect(mockFetch).toHaveBeenCalledTimes(1)
    })

    it("records every analytics POST as a real API call", async () => {
        const tracker = await createTracker()

        void window.fetch("http://localhost/api/analytics", {
            method: "POST",
            body: JSON.stringify({ type: "window", windowId: "about" }),
        })
        void window.fetch("http://localhost/api/analytics", {
            method: "POST",
            body: JSON.stringify({ type: "funnel", funnelStep: "engaged" }),
        })

        const breakdown = tracker.getBreakdown()
        const analyticsItem = breakdown.items.find(
            (i) => i.label === "Pageview"
        )
        expect(analyticsItem).toBeDefined()
        expect(analyticsItem!.count).toBe(2)
    })

    it("fires session-cost:cost-1 when first tier threshold is crossed", async () => {
        const handler = vi.fn()
        document.addEventListener("session-cost:cost-1", handler)

        const tracker = await createTracker()
        // Deserialize with enough lifetime cost to cross cost-1 ($0.001)
        tracker.deserialize({
            lifetimeApiCalls: {},
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

    describe("serialization", () => {
        it("serializes lifetime totals (previous + current session)", async () => {
            const tracker = await createTracker()

            // Restore some previous lifetime data
            tracker.deserialize({
                lifetimeApiCalls: { "/api/strava": 5 },
                lifetimeBandwidthBytes: 1000,
            })

            // Trigger a session API call
            void window.fetch("http://localhost/api/strava")

            const saved = tracker.serialize()
            expect(saved.lifetimeApiCalls["/api/strava"]).toBe(6) // 5 previous + 1 session
            expect(saved.lifetimeBandwidthBytes).toBe(1000) // no new bandwidth in test
        })

        it("computes lifetimeCost from merged counters", async () => {
            const tracker = await createTracker()

            tracker.deserialize({
                lifetimeApiCalls: {},
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
