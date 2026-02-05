/**
 * @vitest-environment jsdom
 */
import { beforeEach, describe, expect, it, vi } from "vitest"

import {
    getAbVariant,
    getVariantPhoto,
    getVisitorId,
    PHOTO_VARIANTS,
    trackAbConversion,
    trackFunnelStep,
    trackWindowOpen,
} from "../lib/analytics"

describe("Analytics", () => {
    beforeEach(() => {
        localStorage.clear()
        sessionStorage.clear()
        vi.restoreAllMocks()
    })

    describe("PHOTO_VARIANTS", () => {
        it("has 3 photo variants", () => {
            expect(PHOTO_VARIANTS).toHaveLength(3)
        })

        it("each variant has an id and photo path", () => {
            PHOTO_VARIANTS.forEach((variant) => {
                expect(variant.id).toBeDefined()
                expect(variant.photo).toMatch(/^\/assets\/dana\//)
            })
        })

        it("variant ids are A, B, C", () => {
            const ids = PHOTO_VARIANTS.map((v) => v.id)
            expect(ids).toContain("A")
            expect(ids).toContain("B")
            expect(ids).toContain("C")
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
            expect(["A", "B", "C"]).toContain(variant)
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

            expect(fetchSpy).toHaveBeenCalledTimes(1)
        })

        it("fires separately for different steps", () => {
            const fetchSpy = vi
                .spyOn(globalThis, "fetch")
                .mockResolvedValue(new Response())

            trackFunnelStep("launched")
            trackFunnelStep("boot_complete")
            trackFunnelStep("engaged")

            expect(fetchSpy).toHaveBeenCalledTimes(3)
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

        it("fires once when variant is assigned", () => {
            const fetchSpy = vi
                .spyOn(globalThis, "fetch")
                .mockResolvedValue(new Response())

            localStorage.setItem("ab_variant", "A")
            trackAbConversion()

            expect(fetchSpy).toHaveBeenCalledTimes(1)
        })

        it("only fires once per visitor", () => {
            const fetchSpy = vi
                .spyOn(globalThis, "fetch")
                .mockResolvedValue(new Response())

            localStorage.setItem("ab_variant", "B")
            trackAbConversion()
            trackAbConversion()
            trackAbConversion()

            expect(fetchSpy).toHaveBeenCalledTimes(1)
        })

        it("sets converted flag in localStorage", () => {
            vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response())

            localStorage.setItem("ab_variant", "C")
            trackAbConversion()

            expect(localStorage.getItem("ab_converted")).toBe("true")
        })
    })

    describe("trackWindowOpen", () => {
        it("fires window event on first open", () => {
            const fetchSpy = vi
                .spyOn(globalThis, "fetch")
                .mockResolvedValue(new Response())

            trackWindowOpen("about")

            expect(fetchSpy).toHaveBeenCalled()
            const calls = fetchSpy.mock.calls
            const windowCall = calls.find((call) => {
                const body = JSON.parse(call[1]?.body as string) as {
                    type: string
                }
                return body.type === "window"
            })
            expect(windowCall).toBeDefined()
        })

        it("only fires once per window per session", () => {
            const fetchSpy = vi
                .spyOn(globalThis, "fetch")
                .mockResolvedValue(new Response())

            trackWindowOpen("about")
            trackWindowOpen("about")
            trackWindowOpen("about")

            const windowCalls = fetchSpy.mock.calls.filter((call) => {
                const body = JSON.parse(call[1]?.body as string) as {
                    type: string
                }
                return body.type === "window"
            })
            expect(windowCalls).toHaveLength(1)
        })

        it("fires separately for different windows", () => {
            const fetchSpy = vi
                .spyOn(globalThis, "fetch")
                .mockResolvedValue(new Response())

            trackWindowOpen("about")
            trackWindowOpen("projects")
            trackWindowOpen("resume")

            const windowCalls = fetchSpy.mock.calls.filter((call) => {
                const body = JSON.parse(call[1]?.body as string) as {
                    type: string
                }
                return body.type === "window"
            })
            expect(windowCalls).toHaveLength(3)
        })

        it("uses sessionStorage for window tracking", () => {
            vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response())

            trackWindowOpen("about")

            expect(sessionStorage.getItem("window_tracked_about")).toBe("true")
        })
    })
})
