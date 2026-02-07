import { describe, expect, it } from "vitest"

import { POPUP_CONFIG } from "../config/popup"
import { SLIDESHOW_CONFIG } from "../config/slideshow"
import { SOCIAL } from "../config/social"

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
        it("has reasonable session durations", () => {
            expect(POPUP_CONFIG.gameSessionDurationMs).toBeGreaterThan(0)
            expect(POPUP_CONFIG.windowSessionDurationMs).toBeGreaterThan(0)
            expect(POPUP_CONFIG.maxConcurrent).toBeGreaterThan(0)
        })

        it("game session is longer than window session", () => {
            expect(POPUP_CONFIG.gameSessionDurationMs).toBeGreaterThan(
                POPUP_CONFIG.windowSessionDurationMs
            )
        })

        it("window trigger chance is between 0 and 1", () => {
            expect(POPUP_CONFIG.windowTriggerChance).toBeGreaterThan(0)
            expect(POPUP_CONFIG.windowTriggerChance).toBeLessThanOrEqual(1)
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
})
