import { describe, expect, it } from "vitest"

import { findBestActivity } from "../lib/strava"

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
                createActivity(5000, 1500), // 25:00 5K - slower
                createActivity(5000, 1200), // 20:00 5K - faster
                createActivity(5000, 1350), // 22:30 5K - medium
            ]

            const result = findBestActivity(activities)
            expect(result).not.toBeNull()
            expect(result!.activity.moving_time).toBe(1200)
        })

        it("compares different distances using Riegel formula", () => {
            const activities = [
                createActivity(5000, 1200), // 20:00 5K
                createActivity(10000, 2400), // 40:00 10K ≈ 19:10 5K equivalent (faster)
            ]

            const result = findBestActivity(activities)
            expect(result).not.toBeNull()
            expect(result!.activity.distance).toBe(10000)
        })

        it("calculates race equivalents correctly", () => {
            const activities = [createActivity(5000, 1200)] // 20:00 5K

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
            const activities = [createActivity(5000, 1200)] // 20:00 5K

            const result = findBestActivity(activities)
            const tenK = result!.equivalentTimes.find(
                (e) => e.distance === "10K"
            )

            expect(tenK).toBeDefined()
            expect(tenK!.predictedTime).toBeGreaterThan(2400)
            expect(tenK!.predictedTime).toBeLessThan(2600)
        })
    })
})
