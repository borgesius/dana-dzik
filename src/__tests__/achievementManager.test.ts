import { beforeEach, describe, expect, it, vi } from "vitest"

import { AchievementManager } from "../lib/achievements/AchievementManager"
import type { AchievementSaveData } from "../lib/achievements/types"

describe("AchievementManager", () => {
    let mgr: AchievementManager

    beforeEach(() => {
        mgr = new AchievementManager()
    })

    describe("earn", () => {
        it("earns a valid achievement", () => {
            expect(mgr.earn("first-trade")).toBe(true)
            expect(mgr.hasEarned("first-trade")).toBe(true)
        })

        it("returns false for already-earned achievement", () => {
            mgr.earn("first-trade")
            expect(mgr.earn("first-trade")).toBe(false)
        })

        it("returns false for unknown achievement id", () => {
            expect(mgr.earn("nonexistent" as never)).toBe(false)
        })

        it("sets a timestamp on earn", () => {
            const before = Date.now()
            mgr.earn("hacker")
            const ts = mgr.getEarnedTimestamp("hacker")
            expect(ts).toBeGreaterThanOrEqual(before)
            expect(ts).toBeLessThanOrEqual(Date.now())
        })

        it("returns null timestamp for unearned achievement", () => {
            expect(mgr.getEarnedTimestamp("hacker")).toBeNull()
        })

        it("increments earned count", () => {
            expect(mgr.getEarnedCount()).toBe(0)
            mgr.earn("first-trade")
            expect(mgr.getEarnedCount()).toBe(1)
            mgr.earn("hacker")
            expect(mgr.getEarnedCount()).toBe(2)
        })
    })

    describe("listeners", () => {
        it("notifies listener on earn", () => {
            const listener = vi.fn()
            mgr.onEarned(listener)
            mgr.earn("first-trade")
            expect(listener).toHaveBeenCalledWith("first-trade")
        })

        it("does not notify for duplicate earn", () => {
            const listener = vi.fn()
            mgr.onEarned(listener)
            mgr.earn("first-trade")
            mgr.earn("first-trade")
            expect(listener).toHaveBeenCalledTimes(1)
        })

        it("calls dirty callback on earn", () => {
            const dirty = vi.fn()
            mgr.setDirtyCallback(dirty)
            mgr.earn("first-trade")
            expect(dirty).toHaveBeenCalledTimes(1)
        })
    })

    describe("counters", () => {
        it("starts at zero", () => {
            expect(mgr.getCounter("trades")).toBe(0)
        })

        it("increments by 1 by default", () => {
            expect(mgr.incrementCounter("trades")).toBe(1)
            expect(mgr.incrementCounter("trades")).toBe(2)
        })

        it("increments by custom amount", () => {
            expect(mgr.incrementCounter("trades", 5)).toBe(5)
            expect(mgr.incrementCounter("trades", 3)).toBe(8)
        })
    })

    describe("sets", () => {
        it("tracks unique items", () => {
            expect(mgr.addToSet("windows-opened", "welcome")).toBe(1)
            expect(mgr.addToSet("windows-opened", "about")).toBe(2)
            expect(mgr.addToSet("windows-opened", "welcome")).toBe(2)
        })

        it("reports set size", () => {
            expect(mgr.getSetSize("windows-opened")).toBe(0)
            mgr.addToSet("windows-opened", "welcome")
            expect(mgr.getSetSize("windows-opened")).toBe(1)
        })

        it("checks membership", () => {
            expect(mgr.setHas("windows-opened", "welcome")).toBe(false)
            mgr.addToSet("windows-opened", "welcome")
            expect(mgr.setHas("windows-opened", "welcome")).toBe(true)
        })
    })

    describe("reporting", () => {
        it("tracks reported achievements", () => {
            mgr.earn("first-trade")
            expect(mgr.isReported("first-trade")).toBe(false)
            mgr.markReported("first-trade")
            expect(mgr.isReported("first-trade")).toBe(true)
        })

        it("returns unreported earned achievements", () => {
            mgr.earn("first-trade")
            mgr.earn("hacker")
            mgr.markReported("first-trade")
            const unreported = mgr.getUnreported()
            expect(unreported).toEqual(["hacker"])
        })
    })

    describe("serialization", () => {
        it("round-trips earned achievements", () => {
            mgr.earn("first-trade")
            mgr.earn("hacker")

            const data = mgr.serialize()
            const mgr2 = new AchievementManager()
            mgr2.deserialize(data)

            expect(mgr2.hasEarned("first-trade")).toBe(true)
            expect(mgr2.hasEarned("hacker")).toBe(true)
            expect(mgr2.hasEarned("tourist")).toBe(false)
            expect(mgr2.getEarnedCount()).toBe(2)
        })

        it("round-trips counters", () => {
            mgr.incrementCounter("trades", 42)
            mgr.incrementCounter("felix-messages", 7)

            const data = mgr.serialize()
            const mgr2 = new AchievementManager()
            mgr2.deserialize(data)

            expect(mgr2.getCounter("trades")).toBe(42)
            expect(mgr2.getCounter("felix-messages")).toBe(7)
        })

        it("round-trips sets", () => {
            mgr.addToSet("windows-opened", "welcome")
            mgr.addToSet("windows-opened", "about")
            mgr.addToSet("themes-tried", "c64")

            const data = mgr.serialize()
            const mgr2 = new AchievementManager()
            mgr2.deserialize(data)

            expect(mgr2.getSetSize("windows-opened")).toBe(2)
            expect(mgr2.setHas("windows-opened", "welcome")).toBe(true)
            expect(mgr2.setHas("windows-opened", "about")).toBe(true)
            expect(mgr2.getSetSize("themes-tried")).toBe(1)
        })

        it("round-trips reported status", () => {
            mgr.earn("first-trade")
            mgr.markReported("first-trade")

            const data = mgr.serialize()
            const mgr2 = new AchievementManager()
            mgr2.deserialize(data)

            expect(mgr2.isReported("first-trade")).toBe(true)
        })

        it("ignores invalid achievement IDs on deserialize", () => {
            const data: AchievementSaveData = {
                earned: { "invalid-id": 12345 },
                counters: {},
                sets: {},
                reported: ["invalid-id"],
            }
            mgr.deserialize(data)
            expect(mgr.getEarnedCount()).toBe(0)
        })

        it("deserialize clears previous state", () => {
            mgr.earn("first-trade")
            mgr.incrementCounter("trades", 10)

            mgr.deserialize({
                earned: {},
                counters: {},
                sets: {},
                reported: [],
            })

            expect(mgr.hasEarned("first-trade")).toBe(false)
            expect(mgr.getCounter("trades")).toBe(0)
        })

        it("serializes empty state correctly", () => {
            const data = mgr.serialize()
            expect(data).toEqual({
                earned: {},
                counters: {},
                sets: {},
                reported: [],
            })
        })
    })

    describe("getTotalCount", () => {
        it("returns total number of defined achievements", () => {
            expect(mgr.getTotalCount()).toBeGreaterThan(0)
        })
    })
})
