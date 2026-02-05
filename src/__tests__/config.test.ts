import { describe, expect, it } from "vitest"

import {
    LASTFM_POLL_INTERVAL,
    POPUP_CONFIG,
    SLIDESHOW_CONFIG,
    SOCIAL,
} from "../config"

describe("Config", () => {
    describe("SOCIAL", () => {
        it("contains required social links", () => {
            expect(SOCIAL.github).toBeDefined()
            expect(SOCIAL.linkedin).toBeDefined()
            expect(SOCIAL.email).toBeDefined()
        })

        it("has valid URL formats", () => {
            expect(SOCIAL.github.url).toMatch(/^https:\/\/github\.com\//)
            expect(SOCIAL.linkedin.url).toMatch(/^https:\/\/linkedin\.com\//)
            expect(SOCIAL.email).toMatch(/@/)
        })
    })

    describe("POPUP_CONFIG", () => {
        it("has reasonable timing values", () => {
            expect(POPUP_CONFIG.initialDelay).toBeGreaterThan(0)
            expect(POPUP_CONFIG.minInterval).toBeGreaterThan(0)
            expect(POPUP_CONFIG.randomInterval).toBeGreaterThan(0)
            expect(POPUP_CONFIG.maxConcurrent).toBeGreaterThan(0)
        })

        it("min interval is less than combined max", () => {
            expect(POPUP_CONFIG.minInterval).toBeLessThan(
                POPUP_CONFIG.minInterval + POPUP_CONFIG.randomInterval
            )
        })
    })

    describe("SLIDESHOW_CONFIG", () => {
        it("has positive interval", () => {
            expect(SLIDESHOW_CONFIG.interval).toBeGreaterThan(0)
        })

        it("has positive fade duration", () => {
            expect(SLIDESHOW_CONFIG.fadeDuration).toBeGreaterThan(0)
        })
    })

    describe("LASTFM_POLL_INTERVAL", () => {
        it("is a positive number", () => {
            expect(LASTFM_POLL_INTERVAL).toBeGreaterThan(0)
        })

        it("is at least 10 seconds to avoid rate limiting", () => {
            expect(LASTFM_POLL_INTERVAL).toBeGreaterThanOrEqual(10000)
        })
    })
})
