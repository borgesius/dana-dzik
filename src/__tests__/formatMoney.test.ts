import { describe, expect, it } from "vitest"

import { formatMoney } from "../lib/formatMoney"

describe("formatMoney", () => {
    describe("zero", () => {
        it("displays zero with 3 decimals", () => {
            expect(formatMoney(0)).toBe("$0.000")
        })
    })

    describe("under $1 (3 decimals)", () => {
        it("formats small values", () => {
            expect(formatMoney(0.001)).toBe("$0.001")
            expect(formatMoney(0.05)).toBe("$0.050")
            expect(formatMoney(0.104)).toBe("$0.104")
            expect(formatMoney(0.999)).toBe("$0.999")
        })
    })

    describe("$1 - $999.99 (2 decimals)", () => {
        it("formats at boundary", () => {
            expect(formatMoney(1)).toBe("$1.00")
        })

        it("formats mid-range", () => {
            expect(formatMoney(14.52)).toBe("$14.52")
            expect(formatMoney(999.99)).toBe("$999.99")
        })
    })

    describe("K suffix ($1,000 - $999,999)", () => {
        it("formats at boundary", () => {
            expect(formatMoney(1000)).toBe("$1.0K")
        })

        it("formats various K values", () => {
            expect(formatMoney(1200)).toBe("$1.2K")
            expect(formatMoney(14500)).toBe("$14.5K")
            expect(formatMoney(142500)).toBe("$142K")
            expect(formatMoney(999900)).toBe("$999K")
        })
    })

    describe("M suffix ($1M - $999.9M)", () => {
        it("formats at boundary", () => {
            expect(formatMoney(1000000)).toBe("$1.0M")
        })

        it("formats various M values", () => {
            expect(formatMoney(3400000)).toBe("$3.4M")
            expect(formatMoney(999900000)).toBe("$999M")
        })
    })

    describe("B suffix ($1B - $999.9B)", () => {
        it("formats at boundary", () => {
            expect(formatMoney(1e9)).toBe("$1.0B")
        })

        it("formats various B values", () => {
            expect(formatMoney(7.1e9)).toBe("$7.1B")
        })
    })

    describe("T suffix ($1T - $999.9T)", () => {
        it("formats at boundary", () => {
            expect(formatMoney(1e12)).toBe("$1.0T")
        })

        it("formats various T values", () => {
            expect(formatMoney(2.8e12)).toBe("$2.8T")
        })
    })

    describe("Qa suffix ($1Qa - $999.9Qa)", () => {
        it("formats at boundary", () => {
            expect(formatMoney(1e15)).toBe("$1.0Qa")
        })

        it("formats various Qa values", () => {
            expect(formatMoney(5.0e15)).toBe("$5.0Qa")
        })
    })

    describe("scientific notation (beyond Qa)", () => {
        it("uses scientific notation for very large values", () => {
            expect(formatMoney(1.2e18)).toBe("$1.2e+18")
            expect(formatMoney(5e20)).toBe("$5.0e+20")
        })
    })

    describe("negative values", () => {
        it("formats negative under $1", () => {
            expect(formatMoney(-0.034)).toBe("-$0.034")
        })

        it("formats negative mid-range", () => {
            expect(formatMoney(-14.52)).toBe("-$14.52")
        })

        it("formats negative K", () => {
            expect(formatMoney(-1200)).toBe("-$1.2K")
        })

        it("formats negative M", () => {
            expect(formatMoney(-3400000)).toBe("-$3.4M")
        })
    })

    describe("boundary transitions", () => {
        it("correctly transitions between ranges", () => {
            expect(formatMoney(0.999)).toBe("$0.999")
            expect(formatMoney(1.0)).toBe("$1.00")

            expect(formatMoney(999.99)).toBe("$999.99")
            expect(formatMoney(1000)).toBe("$1.0K")

            expect(formatMoney(999999)).toBe("$999K")
            expect(formatMoney(1000000)).toBe("$1.0M")
        })
    })
})
