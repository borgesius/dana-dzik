import { describe, expect, it } from "vitest"

import {
    calculateEquivalentTime,
    findBestActivity,
    formatTime,
} from "../lib/strava"

const createActivity = (
    distance: number,
    movingTime: number,
    type = "Run"
): Parameters<typeof findBestActivity>[0][0] => ({
    id: 1,
    name: "Test Run",
    type,
    distance,
    moving_time: movingTime,
    elapsed_time: movingTime,
    start_date: "2026-02-01T10:00:00Z",
    average_speed: distance / movingTime,
})

describe("Strava utilities", () => {
    describe("formatTime", () => {
        it("formats seconds under a minute", () => {
            expect(formatTime(45)).toBe("0:45")
        })

        it("formats minutes and seconds", () => {
            expect(formatTime(125)).toBe("2:05")
        })

        it("formats exactly 20 minutes", () => {
            expect(formatTime(1200)).toBe("20:00")
        })

        it("formats hours, minutes, and seconds", () => {
            expect(formatTime(3661)).toBe("1:01:01")
        })

        it("formats marathon time (around 4 hours)", () => {
            expect(formatTime(14400)).toBe("4:00:00")
        })

        it("pads seconds correctly", () => {
            expect(formatTime(61)).toBe("1:01")
            expect(formatTime(3601)).toBe("1:00:01")
        })

        it("handles zero", () => {
            expect(formatTime(0)).toBe("0:00")
        })
    })

    describe("calculateEquivalentTime", () => {
        it("returns same time for same distance", () => {
            const result = calculateEquivalentTime(1200, 5000, 5000)
            expect(result).toBeCloseTo(1200, 0)
        })

        it("predicts longer time for longer distance", () => {
            const result = calculateEquivalentTime(1200, 5000, 10000)
            expect(result).toBeGreaterThan(2400)
        })

        it("predicts shorter time for shorter distance", () => {
            const result = calculateEquivalentTime(2400, 10000, 5000)
            expect(result).toBeLessThan(1200)
        })

        it("follows Riegel formula (T2 = T1 × (D2/D1)^1.06)", () => {
            const t1 = 1200
            const d1 = 5000
            const d2 = 10000
            const expected = t1 * Math.pow(d2 / d1, 1.06)
            const result = calculateEquivalentTime(t1, d1, d2)
            expect(result).toBeCloseTo(expected, 5)
        })

        it("handles half marathon prediction from 5K", () => {
            const result = calculateEquivalentTime(1200, 5000, 21097.5)
            expect(result).toBeGreaterThan(5000)
            expect(result).toBeLessThan(6000)
        })
    })
})

describe("Strava race equivalency", () => {
    describe("findBestActivity", () => {
        it("returns null for empty activities", () => {
            expect(findBestActivity([])).toBeNull()
        })

        it("returns null when no runs exist", () => {
            const activities = [createActivity(5000, 1200, "Ride")]
            expect(findBestActivity(activities)).toBeNull()
        })

        it("filters out short runs under 1km", () => {
            const activities = [createActivity(500, 180)]
            expect(findBestActivity(activities)).toBeNull()
        })

        it("finds the fastest activity by 5K equivalent", () => {
            const activities = [
                createActivity(5000, 1500),
                createActivity(5000, 1200),
                createActivity(5000, 1350),
            ]

            const result = findBestActivity(activities)
            expect(result).not.toBeNull()
            expect(result!.activity.moving_time).toBe(1200)
        })

        it("compares different distances using Riegel formula", () => {
            const activities = [
                createActivity(5000, 1200),
                createActivity(10000, 2400),
            ]

            const result = findBestActivity(activities)
            expect(result).not.toBeNull()
            expect(result!.activity.distance).toBe(10000)
        })

        it("calculates race equivalents correctly", () => {
            const activities = [createActivity(5000, 1200)]

            const result = findBestActivity(activities)
            expect(result).not.toBeNull()
            expect(result!.equivalentTimes).toHaveLength(4)

            const fiveK = result!.equivalentTimes.find(
                (e) => e.distance === "5K"
            )
            expect(fiveK).toBeDefined()
            expect(fiveK!.formattedTime).toBe("20:00")
        })

        it("predicts 10K time from 5K using Riegel formula", () => {
            const activities = [createActivity(5000, 1200)]

            const result = findBestActivity(activities)
            const tenK = result!.equivalentTimes.find(
                (e) => e.distance === "10K"
            )

            expect(tenK).toBeDefined()
            expect(tenK!.predictedTime).toBeGreaterThan(2400)
            expect(tenK!.predictedTime).toBeLessThan(2600)
        })

        it("includes all four race distances in equivalents", () => {
            const activities = [createActivity(5000, 1200)]
            const result = findBestActivity(activities)

            const distances = result!.equivalentTimes.map((e) => e.distance)
            expect(distances).toContain("5K")
            expect(distances).toContain("10K")
            expect(distances).toContain("Half Marathon")
            expect(distances).toContain("Marathon")
        })

        it("returns fitness score based on 5K equivalent", () => {
            const activities = [createActivity(5000, 1200)]
            const result = findBestActivity(activities)

            expect(result!.fitnessScore).toBeCloseTo(1200, 0)
        })

        it("accepts runs exactly at 1km threshold", () => {
            const activities = [createActivity(1000, 300)]
            const result = findBestActivity(activities)
            expect(result).not.toBeNull()
        })
    })
})
