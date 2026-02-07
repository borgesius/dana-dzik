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

    async function createTracker(
        bigSpenderThreshold = 1,
        whaleThreshold = 2,
        leviathanThreshold = 3
    ): Promise<SessionCostTracker> {
        const mod = await import("../lib/sessionCost")
        return new mod.SessionCostTracker(
            bigSpenderThreshold,
            whaleThreshold,
            leviathanThreshold
        )
    }

    it("starts with zero cost", async () => {
        const tracker = await createTracker()
        const breakdown = tracker.getBreakdown()
        expect(breakdown.totalCost).toBe(0)
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
        expect(windowItem!.cost).toBeCloseTo(2 * 0.001 * costPerCall, 10)
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

    it("fires session-cost:big-spender when first threshold is crossed", async () => {
        const handler = vi.fn()
        document.addEventListener("session-cost:big-spender", handler)

        await createTracker(0, 1)

        void window.fetch("http://localhost/api/strava")

        await vi.waitFor(() => {
            expect(handler).toHaveBeenCalledTimes(1)
        })

        document.removeEventListener("session-cost:big-spender", handler)
    })

    it("fires session-cost:whale when second threshold is crossed", async () => {
        const bigSpenderHandler = vi.fn()
        const whaleHandler = vi.fn()
        document.addEventListener("session-cost:big-spender", bigSpenderHandler)
        document.addEventListener("session-cost:whale", whaleHandler)

        await createTracker(0, 0)

        void window.fetch("http://localhost/api/strava")

        await vi.waitFor(() => {
            expect(bigSpenderHandler).toHaveBeenCalledTimes(1)
            expect(whaleHandler).toHaveBeenCalledTimes(1)
        })

        document.removeEventListener(
            "session-cost:big-spender",
            bigSpenderHandler
        )
        document.removeEventListener("session-cost:whale", whaleHandler)
    })

    it("only fires each threshold event once", async () => {
        const handler = vi.fn()
        document.addEventListener("session-cost:big-spender", handler)

        await createTracker(0, 1)

        void window.fetch("http://localhost/api/strava")
        void window.fetch("http://localhost/api/lastfm")

        expect(handler).toHaveBeenCalledTimes(1)

        document.removeEventListener("session-cost:big-spender", handler)
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

    describe("cost constants", () => {
        it("exports cost thresholds", async () => {
            const mod = await import("../lib/sessionCost")
            expect(mod.BIG_SPENDER_THRESHOLD).toBe(0.001)
            expect(mod.WHALE_THRESHOLD).toBe(0.002)
            expect(mod.LEVIATHAN_THRESHOLD).toBe(0.003)
        })

        it("uses correct Vercel bandwidth pricing", () => {
            const oneMB = 1024 * 1024
            const costPerMB = COST_PER_BYTE * oneMB
            expect(costPerMB).toBeCloseTo(0.0004, 6)
        })
    })
})
