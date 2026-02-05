import { describe, expect, it } from "vitest"

import {
    generateResponse,
    getRandomItem,
    MEOW_RESPONSES,
} from "../lib/felixgpt"

describe("FelixGPT utilities", () => {
    describe("getRandomItem", () => {
        it("returns an item from the array", () => {
            const arr = ["a", "b", "c"]
            const result = getRandomItem(arr)
            expect(arr).toContain(result)
        })

        it("returns the only item from single-element array", () => {
            expect(getRandomItem(["only"])).toBe("only")
        })

        it("works with numbers", () => {
            const arr = [1, 2, 3, 4, 5]
            const result = getRandomItem(arr)
            expect(arr).toContain(result)
        })

        it("returns different items over multiple calls (probabilistic)", () => {
            const arr = ["a", "b", "c", "d", "e"]
            const results = new Set<string>()

            for (let i = 0; i < 100; i++) {
                results.add(getRandomItem(arr))
            }

            expect(results.size).toBeGreaterThan(1)
        })
    })

    describe("MEOW_RESPONSES", () => {
        it("contains expected cat sounds", () => {
            expect(MEOW_RESPONSES).toContain("Meow!")
            expect(MEOW_RESPONSES).toContain("*purrs*")
            expect(MEOW_RESPONSES.length).toBeGreaterThanOrEqual(5)
        })

        it("all responses are non-empty strings", () => {
            MEOW_RESPONSES.forEach((response) => {
                expect(typeof response).toBe("string")
                expect(response.length).toBeGreaterThan(0)
            })
        })
    })

    describe("generateResponse", () => {
        it("returns a meow response for any input", () => {
            const response = generateResponse("hello")
            expect(MEOW_RESPONSES).toContain(response)
        })

        it("returns a meow response for questions", () => {
            const response = generateResponse("How are you?")
            expect(MEOW_RESPONSES).toContain(response)
        })

        it("returns a meow response for empty string", () => {
            const response = generateResponse("")
            expect(MEOW_RESPONSES).toContain(response)
        })

        it("always returns a valid response", () => {
            const inputs = ["hello", "test", "what?", "123", ""]
            inputs.forEach((input) => {
                const response = generateResponse(input)
                expect(MEOW_RESPONSES).toContain(response)
            })
        })
    })
})
