import { beforeEach, describe, expect, it, vi } from "vitest"

// Mock emitAppEvent before importing modules that use it
vi.mock("../lib/events", () => ({
    emitAppEvent: vi.fn(),
    onAppEvent: vi.fn(),
}))

// Mock isCalmMode for VeilManager
vi.mock("../lib/calmMode", () => ({
    isCalmMode: vi.fn(() => false),
}))

import { CollectionManager } from "../lib/autobattler/CollectionManager"
import { ALL_UNITS } from "../lib/autobattler/units"
import { CosmeticManager } from "../lib/cosmetics/CosmeticManager"
import { xpForLevel } from "../lib/progression/constants"
import { ProgressionManager } from "../lib/progression/ProgressionManager"
import { VeilManager } from "../lib/veil/VeilManager"

// ═════════════════════════════════════════════════════════════════════════════
// CollectionManager
// ═════════════════════════════════════════════════════════════════════════════

describe("CollectionManager", () => {
    let mgr: CollectionManager

    beforeEach(() => {
        vi.restoreAllMocks()
        mgr = new CollectionManager()
    })

    describe("unit collection", () => {
        it("starts with no units", () => {
            expect(mgr.getCollectionSize()).toBe(0)
        })

        it("can add a unit", () => {
            mgr.addUnit("drifter-brawler")
            expect(mgr.hasUnit("drifter-brawler")).toBe(true)
            expect(mgr.getUnitCount("drifter-brawler")).toBe(1)
        })

        it("adding same unit increments count", () => {
            mgr.addUnit("drifter-brawler")
            mgr.addUnit("drifter-brawler")
            expect(mgr.getUnitCount("drifter-brawler")).toBe(2)
            // Collection size is still 1 (distinct units)
            expect(mgr.getCollectionSize()).toBe(1)
        })

        it("getUnlockedUnitIds returns set of owned units", () => {
            mgr.addUnit("drifter-brawler")
            mgr.addUnit("qd-sharpshooter")
            const ids = mgr.getUnlockedUnitIds()
            expect(ids.has("drifter-brawler")).toBe(true)
            expect(ids.has("qd-sharpshooter")).toBe(true)
            expect(ids.size).toBe(2)
        })
    })

    describe("faction completion", () => {
        it("faction is not complete with partial units", () => {
            mgr.addUnit("qd-sharpshooter")
            expect(mgr.isFactionComplete("quickdraw")).toBe(false)
        })

        it("faction is complete when all shop units are owned", () => {
            const qdUnits = ALL_UNITS.filter(
                (u) => u.faction === "quickdraw" && u.shopCost > 0
            )
            for (const u of qdUnits) {
                mgr.addUnit(u.id)
            }
            expect(mgr.isFactionComplete("quickdraw")).toBe(true)
        })
    })

    describe("run tracking", () => {
        it("starts with 0 completed runs", () => {
            expect(mgr.getCompletedRuns()).toBe(0)
        })

        it("recordRunComplete increments completed runs", () => {
            mgr.recordRunComplete()
            expect(mgr.getCompletedRuns()).toBe(1)
            mgr.recordRunComplete()
            expect(mgr.getCompletedRuns()).toBe(2)
        })

        it("recordRunComplete tracks highest round", () => {
            mgr.recordRunComplete(undefined, undefined, undefined, 10)
            expect(mgr.getHighestRound()).toBe(10)
            mgr.recordRunComplete(undefined, undefined, undefined, 5)
            expect(mgr.getHighestRound()).toBe(10) // doesn't decrease
        })
    })

    describe("boss tracking", () => {
        it("starts with no bosses defeated", () => {
            expect(mgr.getTotalBossesDefeated()).toBe(0)
        })

        it("recordBossDefeated tracks bosses", () => {
            mgr.recordBossDefeated("boss-gadfly")
            expect(mgr.hasBossDefeated("boss-gadfly")).toBe(true)
            expect(mgr.getTotalBossesDefeated()).toBe(1)
        })

        it("tracks unique boss IDs", () => {
            mgr.recordBossDefeated("boss-gadfly")
            mgr.recordBossDefeated("boss-gadfly")
            mgr.recordBossDefeated("boss-noumenon")
            expect(mgr.getUniqueBossesDefeated()).toBe(2)
            expect(mgr.getTotalBossesDefeated()).toBe(3)
        })
    })

    describe("relic tracking", () => {
        it("default relics are unlocked at start", () => {
            const defaults = mgr.getUnlockedRelicIds()
            expect(defaults.size).toBeGreaterThan(0)
        })

        it("can unlock a relic", () => {
            mgr.unlockRelic("ibn-rushds-mirror")
            expect(mgr.hasRelicUnlocked("ibn-rushds-mirror")).toBe(true)
        })
    })

    describe("serialization", () => {
        it("round-trips through serialize/deserialize", () => {
            mgr.addUnit("drifter-brawler")
            mgr.addUnit("qd-sharpshooter")
            mgr.recordRunComplete(undefined, undefined, undefined, 8)
            mgr.recordBossDefeated("boss-gadfly")
            mgr.unlockRelic("aletheia")

            const data = mgr.serialize()
            const mgr2 = new CollectionManager()
            mgr2.deserialize(data)

            expect(mgr2.hasUnit("drifter-brawler")).toBe(true)
            expect(mgr2.hasUnit("qd-sharpshooter")).toBe(true)
            expect(mgr2.getCompletedRuns()).toBe(1)
            expect(mgr2.getHighestRound()).toBe(8)
            expect(mgr2.hasBossDefeated("boss-gadfly")).toBe(true)
            expect(mgr2.hasRelicUnlocked("aletheia")).toBe(true)
        })
    })

    describe("units bought tracking", () => {
        it("starts at 0", () => {
            expect(mgr.getTotalUnitsBought()).toBe(0)
        })

        it("addUnitsBought accumulates", () => {
            mgr.addUnitsBought(5)
            mgr.addUnitsBought(3)
            expect(mgr.getTotalUnitsBought()).toBe(8)
        })
    })
})

// ═════════════════════════════════════════════════════════════════════════════
// ProgressionManager
// ═════════════════════════════════════════════════════════════════════════════

describe("ProgressionManager", () => {
    let mgr: ProgressionManager

    beforeEach(() => {
        vi.restoreAllMocks()
        mgr = new ProgressionManager()
    })

    describe("XP and leveling", () => {
        it("starts at 0 XP and level 0", () => {
            expect(mgr.getTotalXP()).toBe(0)
            expect(mgr.getLevel()).toBe(0)
        })

        it("addXP increases total XP", () => {
            mgr.addXP(50)
            expect(mgr.getTotalXP()).toBe(50)
        })

        it("addXP accumulates", () => {
            mgr.addXP(30)
            mgr.addXP(20)
            expect(mgr.getTotalXP()).toBe(50)
        })

        it("level increases when XP passes threshold", () => {
            mgr.addXP(xpForLevel(1) + 1)
            expect(mgr.getLevel()).toBeGreaterThanOrEqual(1)
        })

        it("getLevelProgress returns valid data", () => {
            mgr.addXP(150)
            const info = mgr.getLevelProgress()
            expect(info.currentLevel).toBeGreaterThanOrEqual(0)
            expect(info.progress).toBeGreaterThanOrEqual(0)
            expect(info.progress).toBeLessThanOrEqual(1)
        })
    })

    describe("exploration tracking", () => {
        it("tracks seen windows", () => {
            expect(mgr.hasSeenWindow("about")).toBe(false)
            mgr.markWindowSeen("about")
            expect(mgr.hasSeenWindow("about")).toBe(true)
        })

        it("tracks seen themes", () => {
            expect(mgr.hasSeenTheme("dark")).toBe(false)
            mgr.markThemeSeen("dark")
            expect(mgr.hasSeenTheme("dark")).toBe(true)
        })

        it("tracks seen locales", () => {
            expect(mgr.hasSeenLocale("de")).toBe(false)
            mgr.markLocaleSeen("de")
            expect(mgr.hasSeenLocale("de")).toBe(true)
        })

        it("tracks pinball thresholds", () => {
            expect(mgr.hasPinballThreshold(5000)).toBe(false)
            mgr.markPinballThreshold(5000)
            expect(mgr.hasPinballThreshold(5000)).toBe(true)
        })

        it("tracks guestbook signed", () => {
            expect(mgr.hasSignedGuestbook()).toBe(false)
            mgr.markGuestbookSigned()
            expect(mgr.hasSignedGuestbook()).toBe(true)
        })
    })

    describe("serialization", () => {
        it("round-trips through serialize/deserialize", () => {
            mgr.addXP(500)
            mgr.markWindowSeen("about")
            mgr.markThemeSeen("dark")
            mgr.markGuestbookSigned()

            const data = mgr.serialize()
            const mgr2 = new ProgressionManager()
            mgr2.deserialize(data)

            expect(mgr2.getTotalXP()).toBe(500)
            expect(mgr2.hasSeenWindow("about")).toBe(true)
            expect(mgr2.hasSeenTheme("dark")).toBe(true)
            expect(mgr2.hasSignedGuestbook()).toBe(true)
        })
    })

    describe("dirty callback", () => {
        it("calls dirty callback when state changes", () => {
            const dirty = vi.fn()
            mgr.setDirtyCallback(dirty)
            mgr.addXP(10)
            expect(dirty).toHaveBeenCalled()
        })
    })
})

// ═════════════════════════════════════════════════════════════════════════════
// VeilManager
// ═════════════════════════════════════════════════════════════════════════════

describe("VeilManager", () => {
    let mgr: VeilManager

    beforeEach(() => {
        vi.restoreAllMocks()
        mgr = new VeilManager()
    })

    describe("initial state", () => {
        it("starts with no completed veils", () => {
            expect(mgr.getCompletedCount()).toBe(0)
        })

        it("is not active at start", () => {
            expect(mgr.isActive()).toBe(false)
        })

        it("no current veil", () => {
            expect(mgr.getCurrentVeil()).toBeNull()
        })
    })

    describe("veil unlocking", () => {
        it("can unlock a veil", () => {
            mgr.unlockVeil(0)
            expect(mgr.isVeilUnlocked(0)).toBe(true)
        })

        it("unlocked veils are listed", () => {
            mgr.unlockVeil(0)
            mgr.unlockVeil(1)
            expect(mgr.getUnlockedVeils()).toContain(0)
            expect(mgr.getUnlockedVeils()).toContain(1)
        })
    })

    describe("veil completion", () => {
        it("can complete a veil", () => {
            mgr.unlockVeil(0)
            mgr.triggerVeil(0)
            mgr.completeVeil(0)
            expect(mgr.isVeilCompleted(0)).toBe(true)
        })

        it("completed veils are listed", () => {
            mgr.unlockVeil(0)
            mgr.triggerVeil(0)
            mgr.completeVeil(0)
            expect(mgr.getAllCompleted()).toContain(0)
        })

        it("completing a veil increments count", () => {
            mgr.unlockVeil(0)
            mgr.triggerVeil(0)
            mgr.completeVeil(0)
            expect(mgr.getCompletedCount()).toBe(1)
        })
    })

    describe("attempts", () => {
        it("starts at 0 attempts", () => {
            expect(mgr.getAttempts(0)).toBe(0)
        })

        it("recordAttempt increments", () => {
            mgr.recordAttempt(0)
            mgr.recordAttempt(0)
            expect(mgr.getAttempts(0)).toBe(2)
        })
    })

    describe("trigger and dismiss", () => {
        it("triggerVeil sets active state", () => {
            mgr.unlockVeil(0)
            mgr.triggerVeil(0)
            expect(mgr.isActive()).toBe(true)
            expect(mgr.getCurrentVeil()).toBe(0)
        })

        it("dismissVeil clears active state", () => {
            mgr.unlockVeil(0)
            mgr.triggerVeil(0)
            mgr.dismissVeil()
            expect(mgr.isActive()).toBe(false)
            expect(mgr.getCurrentVeil()).toBeNull()
        })

        it("failVeil emits event but does not clear active (dismissVeil does)", () => {
            mgr.unlockVeil(0)
            mgr.triggerVeil(0)
            mgr.failVeil(0)
            // failVeil only emits events; dismissVeil clears state
            expect(mgr.isActive()).toBe(true)
            mgr.dismissVeil()
            expect(mgr.isActive()).toBe(false)
        })
    })

    describe("serialization", () => {
        it("round-trips through serialize/deserialize", () => {
            mgr.unlockVeil(0)
            mgr.unlockVeil(1)
            mgr.triggerVeil(0)
            mgr.completeVeil(0) // moves 0 from unlocked to completed
            mgr.recordAttempt(0)
            mgr.recordAttempt(0)

            const data = mgr.serialize()
            const mgr2 = new VeilManager()
            mgr2.deserialize(data)

            // Veil 0 was completed, so it's in completed but not unlocked
            expect(mgr2.isVeilCompleted(0)).toBe(true)
            expect(mgr2.isVeilUnlocked(0)).toBe(false)
            // Veil 1 was unlocked but not completed
            expect(mgr2.isVeilUnlocked(1)).toBe(true)
            expect(mgr2.getAttempts(0)).toBe(2)
        })
    })
})

// ═════════════════════════════════════════════════════════════════════════════
// CosmeticManager
// ═════════════════════════════════════════════════════════════════════════════

describe("CosmeticManager", () => {
    let mgr: CosmeticManager

    beforeEach(() => {
        vi.restoreAllMocks()
        mgr = new CosmeticManager()
    })

    describe("initial state", () => {
        it("has some default unlocked cosmetics", () => {
            expect(mgr.getUnlockedCount()).toBeGreaterThan(0)
        })
    })

    describe("unlock and equip", () => {
        it("can unlock a cosmetic", () => {
            const result = mgr.unlock("cursor-trail", "sparkle")
            expect(result).toBe(true)
            expect(mgr.isUnlocked("cursor-trail", "sparkle")).toBe(true)
        })

        it("unlocking an already-unlocked cosmetic returns false", () => {
            mgr.unlock("cursor-trail", "sparkle")
            expect(mgr.unlock("cursor-trail", "sparkle")).toBe(false)
        })

        it("can set active cosmetic", () => {
            mgr.unlock("cursor-trail", "sparkle")
            const result = mgr.setActive("cursor-trail", "sparkle")
            expect(result).toBe(true)
            expect(mgr.getActive("cursor-trail")).toBe("sparkle")
        })

        it("cannot set active if not unlocked", () => {
            const result = mgr.setActive("cursor-trail", "notunlocked")
            expect(result).toBe(false)
        })
    })

    describe("getUnlockedForType", () => {
        it("returns unlocked cosmetics for a type", () => {
            mgr.unlock("cursor-trail", "sparkle")
            mgr.unlock("cursor-trail", "fire")
            const unlocked = mgr.getUnlockedForType("cursor-trail")
            expect(unlocked).toContain("sparkle")
            expect(unlocked).toContain("fire")
        })
    })

    describe("serialization", () => {
        it("round-trips through serialize/deserialize", () => {
            mgr.unlock("cursor-trail", "sparkle")
            mgr.setActive("cursor-trail", "sparkle")

            const data = mgr.serialize()
            const mgr2 = new CosmeticManager()
            mgr2.deserialize(data)

            expect(mgr2.isUnlocked("cursor-trail", "sparkle")).toBe(true)
            expect(mgr2.getActive("cursor-trail")).toBe("sparkle")
        })
    })

    describe("dirty callback", () => {
        it("calls dirty callback on unlock", () => {
            const dirty = vi.fn()
            mgr.setDirtyCallback(dirty)
            mgr.unlock("cursor-trail", "sparkle")
            expect(dirty).toHaveBeenCalled()
        })
    })

    describe("change callback", () => {
        it("calls onChange when active cosmetic changes", () => {
            const onChange = vi.fn()
            mgr.onChange(onChange)
            mgr.unlock("cursor-trail", "sparkle")
            mgr.setActive("cursor-trail", "sparkle")
            expect(onChange).toHaveBeenCalled()
        })
    })
})
