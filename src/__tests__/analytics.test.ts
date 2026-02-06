/**
 * @vitest-environment jsdom
 */
import { beforeEach, describe, expect, it, vi } from "vitest"

import {
    getAbVariant,
    getVariantPhoto,
    getVisitorId,
    hashString,
    isClientSampled,
    PHOTO_VARIANTS,
    trackAbConversion,
    trackFunnelStep,
    trackPageview,
    trackWindowOpen,
} from "../lib/analytics"

function makeSampledVisitorId(): string {
    for (let i = 0; i < 100_000; i++) {
        const id = `test-visitor-${i}`
        if (isClientSampled(id)) return id
    }
    throw new Error("Could not find a sampled visitor ID in 100k attempts")
}

describe("Analytics", () => {
    beforeEach(() => {
        localStorage.clear()
        sessionStorage.clear()
        vi.restoreAllMocks()
    })

    describe("PHOTO_VARIANTS", () => {
        it("has 4 photo variants", () => {
            expect(PHOTO_VARIANTS).toHaveLength(4)
        })

        it("each variant has an id and photo path", () => {
            PHOTO_VARIANTS.forEach((variant) => {
                expect(variant.id).toBeDefined()
                expect(variant.photo).toMatch(/^\/assets\/dana\//)
            })
        })

        it("variant ids are A, B, C, D", () => {
            const ids = PHOTO_VARIANTS.map((v) => v.id)
            expect(ids).toContain("A")
            expect(ids).toContain("B")
            expect(ids).toContain("C")
            expect(ids).toContain("D")
        })
    })

    describe("hashString", () => {
        it("returns a non-negative integer", () => {
            const hash = hashString("test")
            expect(hash).toBeGreaterThanOrEqual(0)
            expect(Number.isInteger(hash)).toBe(true)
        })

        it("is deterministic", () => {
            expect(hashString("hello")).toBe(hashString("hello"))
        })

        it("produces different hashes for different inputs", () => {
            expect(hashString("alpha")).not.toBe(hashString("beta"))
        })

        it("handles empty string", () => {
            expect(hashString("")).toBe(0)
        })
    })

    describe("isClientSampled", () => {
        it("returns a boolean", () => {
            expect(typeof isClientSampled("any-id")).toBe("boolean")
        })

        it("is deterministic for the same visitor ID", () => {
            const id = "stable-id-123"
            const result1 = isClientSampled(id)
            const result2 = isClientSampled(id)
            expect(result1).toBe(result2)
        })

        it("samples roughly 0.1% of visitors", () => {
            let sampled = 0
            const total = 100_000
            for (let i = 0; i < total; i++) {
                if (isClientSampled(`visitor-${i}`)) sampled++
            }
            const rate = sampled / total
            expect(rate).toBeGreaterThan(0)
            expect(rate).toBeLessThan(0.01)
        })
    })

    describe("getVisitorId", () => {
        it("generates a visitor id on first call", () => {
            const id = getVisitorId()
            expect(id).toBeDefined()
            expect(typeof id).toBe("string")
            expect(id.length).toBeGreaterThan(10)
        })

        it("returns same id on subsequent calls", () => {
            const id1 = getVisitorId()
            const id2 = getVisitorId()
            expect(id1).toBe(id2)
        })

        it("stores id in localStorage", () => {
            const id = getVisitorId()
            expect(localStorage.getItem("visitor_id")).toBe(id)
        })
    })

    describe("getAbVariant", () => {
        it("returns a valid variant", () => {
            const variant = getAbVariant()
            expect(["A", "B", "C", "D"]).toContain(variant)
        })

        it("returns same variant on subsequent calls", () => {
            const v1 = getAbVariant()
            const v2 = getAbVariant()
            expect(v1).toBe(v2)
        })

        it("stores variant in localStorage", () => {
            const variant = getAbVariant()
            expect(localStorage.getItem("ab_variant")).toBe(variant)
        })

        it("respects existing localStorage value", () => {
            localStorage.setItem("ab_variant", "B")
            const variant = getAbVariant()
            expect(variant).toBe("B")
        })
    })

    describe("getVariantPhoto", () => {
        it("returns a photo path for the assigned variant", () => {
            const photo = getVariantPhoto()
            expect(photo).toMatch(/^\/assets\/dana\/IMG_\d+\.jpg$/)
        })

        it("returns correct photo for variant A", () => {
            localStorage.setItem("ab_variant", "A")
            const photo = getVariantPhoto()
            expect(photo).toBe("/assets/dana/IMG_5099.jpg")
        })

        it("returns correct photo for variant B", () => {
            localStorage.setItem("ab_variant", "B")
            const photo = getVariantPhoto()
            expect(photo).toBe("/assets/dana/IMG_5531.jpg")
        })

        it("returns correct photo for variant C", () => {
            localStorage.setItem("ab_variant", "C")
            const photo = getVariantPhoto()
            expect(photo).toBe("/assets/dana/IMG_5576.jpg")
        })

        it("returns correct photo for variant D", () => {
            localStorage.setItem("ab_variant", "D")
            const photo = getVariantPhoto()
            expect(photo).toBe("/assets/dana/IMG_7045.jpg")
        })
    })

    describe("trackFunnelStep", () => {
        it("sets funnel flag in localStorage", () => {
            trackFunnelStep("launched")
            expect(localStorage.getItem("funnel_launched")).toBe("true")
        })

        it("only fires once per step", () => {
            const fetchSpy = vi
                .spyOn(globalThis, "fetch")
                .mockResolvedValue(new Response())

            trackFunnelStep("launched")
            trackFunnelStep("launched")
            trackFunnelStep("launched")

            const funnelCalls = fetchSpy.mock.calls.filter((call) => {
                const body = JSON.parse(call[1]?.body as string) as {
                    type: string
                }
                return body.type === "funnel"
            })
            expect(funnelCalls.length).toBeLessThanOrEqual(1)
        })
    })

    describe("trackAbConversion", () => {
        it("does not fire if no variant is assigned", () => {
            const fetchSpy = vi
                .spyOn(globalThis, "fetch")
                .mockResolvedValue(new Response())

            trackAbConversion()

            expect(fetchSpy).not.toHaveBeenCalled()
        })

        it("only fires once per visitor", () => {
            const fetchSpy = vi
                .spyOn(globalThis, "fetch")
                .mockResolvedValue(new Response())

            localStorage.setItem("ab_variant", "B")
            trackAbConversion()
            trackAbConversion()
            trackAbConversion()

            const conversionCalls = fetchSpy.mock.calls.filter((call) => {
                const body = JSON.parse(call[1]?.body as string) as {
                    type: string
                }
                return body.type === "ab_convert"
            })
            expect(conversionCalls.length).toBeLessThanOrEqual(1)
        })

        it("sets converted flag in localStorage", () => {
            vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response())

            localStorage.setItem("ab_variant", "C")
            trackAbConversion()

            expect(localStorage.getItem("ab_converted")).toBe("true")
        })
    })

    describe("trackWindowOpen", () => {
        it("uses sessionStorage for window tracking", () => {
            vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response())

            trackWindowOpen("about")

            expect(sessionStorage.getItem("window_tracked_about")).toBe("true")
        })

        it("only marks window once per session", () => {
            vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response())

            trackWindowOpen("about")
            trackWindowOpen("about")
            trackWindowOpen("about")

            expect(sessionStorage.getItem("window_tracked_about")).toBe("true")
        })
    })

    describe("trackPageview (critical event — always sent)", () => {
        it("fires on first call regardless of sampling", () => {
            const fetchSpy = vi
                .spyOn(globalThis, "fetch")
                .mockResolvedValue(new Response())

            trackPageview()

            expect(fetchSpy).toHaveBeenCalledTimes(1)
        })

        it("only fires once per session", () => {
            const fetchSpy = vi
                .spyOn(globalThis, "fetch")
                .mockResolvedValue(new Response())

            trackPageview()
            trackPageview()
            trackPageview()

            expect(fetchSpy).toHaveBeenCalledTimes(1)
        })

        it("uses sessionStorage for tracking", () => {
            vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response())

            trackPageview()

            expect(sessionStorage.getItem("pageview_tracked")).toBe("true")
        })

        it("sends X-Visitor-Id header", () => {
            const fetchSpy = vi
                .spyOn(globalThis, "fetch")
                .mockResolvedValue(new Response())

            trackPageview()

            const headers = fetchSpy.mock.calls[0]?.[1]?.headers as Record<
                string,
                string
            >
            expect(headers["X-Visitor-Id"]).toBeDefined()
            expect(headers["X-Visitor-Id"].length).toBeGreaterThan(0)
        })
    })

    describe("client-side sampling gate", () => {
        it("sampled visitors can send non-critical events", () => {
            const sampledId = makeSampledVisitorId()
            localStorage.setItem("visitor_id", sampledId)

            const fetchSpy = vi
                .spyOn(globalThis, "fetch")
                .mockResolvedValue(new Response())

            trackFunnelStep("launched")

            const funnelCalls = fetchSpy.mock.calls.filter((call) => {
                const body = JSON.parse(call[1]?.body as string) as {
                    type: string
                }
                return body.type === "funnel"
            })
            expect(funnelCalls).toHaveLength(1)
        })

        it("non-sampled visitors do not send non-critical events", () => {
            localStorage.setItem("visitor_id", "definitely-not-sampled-id-xyz")
            expect(isClientSampled("definitely-not-sampled-id-xyz")).toBe(false)

            const fetchSpy = vi
                .spyOn(globalThis, "fetch")
                .mockResolvedValue(new Response())

            trackFunnelStep("launched")

            const funnelCalls = fetchSpy.mock.calls.filter((call) => {
                const body = JSON.parse(call[1]?.body as string) as {
                    type: string
                }
                return body.type === "funnel"
            })
            expect(funnelCalls).toHaveLength(0)
        })

        it("non-sampled visitors can still send pageviews", () => {
            localStorage.setItem("visitor_id", "definitely-not-sampled-id-xyz")

            const fetchSpy = vi
                .spyOn(globalThis, "fetch")
                .mockResolvedValue(new Response())

            trackPageview()

            expect(fetchSpy).toHaveBeenCalledTimes(1)
        })

        it("sampled visitors are capped by session budget", () => {
            const sampledId = makeSampledVisitorId()
            localStorage.setItem("visitor_id", sampledId)

            const fetchSpy = vi
                .spyOn(globalThis, "fetch")
                .mockResolvedValue(new Response())

            for (let i = 0; i < 30; i++) {
                trackFunnelStep(`step_${i}`)
            }

            const funnelCalls = fetchSpy.mock.calls.filter((call) => {
                const body = JSON.parse(call[1]?.body as string) as {
                    type: string
                }
                return body.type === "funnel"
            })
            expect(funnelCalls.length).toBeLessThanOrEqual(15)
        })
    })
})
