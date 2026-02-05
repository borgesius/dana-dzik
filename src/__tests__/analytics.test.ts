/**
 * @vitest-environment jsdom
 */
import { beforeEach, describe, expect, it, vi } from "vitest"

import {
    getAbVariant,
    getVariantPhoto,
    getVisitorId,
    PHOTO_VARIANTS,
    trackEngagement,
} from "../lib/analytics"

describe("Analytics", () => {
    beforeEach(() => {
        localStorage.clear()
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

    describe("trackEngagement", () => {
        it("sets engaged flag in localStorage", () => {
            trackEngagement()
            expect(localStorage.getItem("user_engaged")).toBe("true")
        })

        it("only fires once per session", () => {
            const fetchSpy = vi
                .spyOn(globalThis, "fetch")
                .mockResolvedValue(new Response())

            trackEngagement()
            trackEngagement()
            trackEngagement()

            expect(fetchSpy).toHaveBeenCalledTimes(1)
        })
    })
})
