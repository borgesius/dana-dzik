import { describe, expect, it } from "vitest"

import { POPUP_CONTENTS, type PopupContent } from "../lib/popupContent"

describe("Popup Content", () => {
    describe("POPUP_CONTENTS structure", () => {
        it("contains at least one popup", () => {
            expect(POPUP_CONTENTS.length).toBeGreaterThanOrEqual(1)
        })

        it("all popups have required fields", () => {
            POPUP_CONTENTS.forEach((popup: PopupContent) => {
                expect(popup.type).toBeDefined()
                expect(popup.title).toBeDefined()
                expect(popup.headline).toBeDefined()
                expect(popup.body).toBeDefined()
                expect(popup.buttons).toBeDefined()
            })
        })

        it("all popups have valid type", () => {
            const validTypes = ["error", "warning", "winner", "ad"]
            POPUP_CONTENTS.forEach((popup: PopupContent) => {
                expect(validTypes).toContain(popup.type)
            })
        })

        it("all popups have at least one button", () => {
            POPUP_CONTENTS.forEach((popup: PopupContent) => {
                expect(popup.buttons.length).toBeGreaterThanOrEqual(1)
            })
        })

        it("all buttons have text", () => {
            POPUP_CONTENTS.forEach((popup: PopupContent) => {
                popup.buttons.forEach((button) => {
                    expect(button.text).toBeDefined()
                    expect(button.text.length).toBeGreaterThan(0)
                })
            })
        })
    })

    describe("specific popup content", () => {
        it("has a winner popup", () => {
            const winnerPopup = POPUP_CONTENTS.find((p) => p.type === "winner")
            expect(winnerPopup).toBeDefined()
            expect(winnerPopup?.headline).toBeDefined()
            expect(winnerPopup?.headline.length).toBeGreaterThan(0)
        })

        it("has an error popup", () => {
            const errorPopup = POPUP_CONTENTS.find((p) => p.type === "error")
            expect(errorPopup).toBeDefined()
            expect(errorPopup?.headline).toBeDefined()
            expect(errorPopup?.headline.length).toBeGreaterThan(0)
        })

        it("has an ad popup", () => {
            const adPopup = POPUP_CONTENTS.find((p) => p.type === "ad")
            expect(adPopup).toBeDefined()
        })

        it("winner popup has action button", () => {
            const winnerPopup = POPUP_CONTENTS.find((p) => p.type === "winner")
            expect(winnerPopup?.buttons.length).toBeGreaterThanOrEqual(1)
            expect(winnerPopup?.buttons[0].text.length).toBeGreaterThan(0)
        })
    })

    describe("popup variety", () => {
        it("has multiple different popup types", () => {
            const types = new Set(POPUP_CONTENTS.map((p) => p.type))
            expect(types.size).toBeGreaterThanOrEqual(2)
        })

        it("popups have unique headlines", () => {
            const headlines = POPUP_CONTENTS.map((p) => p.headline)
            const uniqueHeadlines = new Set(headlines)
            expect(uniqueHeadlines.size).toBe(headlines.length)
        })
    })
})
