/**
 * @vitest-environment jsdom
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import type { SaveData } from "../lib/saveManager"

interface SaveManagerInstance {
    load(): SaveData
    registerGatherFn(fn: () => SaveData): void
    requestSave(): void
    saveImmediate(): void
    reset(): void
    getSaveSize(): number
    hasSave(): boolean
}

describe("SaveManager", () => {
    beforeEach(() => {
        localStorage.clear()
        vi.resetModules()
    })

    afterEach(() => {
        vi.restoreAllMocks()
    })

    async function loadSaveManagerModule(): Promise<{
        saveManager: SaveManagerInstance
    }> {
        const mod = await import("../lib/saveManager")
        return { saveManager: mod.saveManager }
    }

    describe("load", () => {
        it("creates empty save data when nothing stored", async () => {
            const { saveManager } = await loadSaveManagerModule()
            const data = saveManager.load()
            expect(data.version).toBe(2)
            expect(data.pinball.highScore).toBe(0)
            expect(data.preferences.theme).toBe("win95")
            expect(data.preferences.colorScheme).toBe("system")
            expect(data.preferences.locale).toBe("en")
            expect(data.achievements.earned).toEqual({})
        })

        it("migrates legacy pinball high score", async () => {
            localStorage.setItem("pinball-high-score", "4200")
            const { saveManager } = await loadSaveManagerModule()
            const data = saveManager.load()
            expect(data.pinball.highScore).toBe(4200)
        })

        it("migrates legacy theme", async () => {
            localStorage.setItem("theme", "c64")
            const { saveManager } = await loadSaveManagerModule()
            const data = saveManager.load()
            expect(data.preferences.theme).toBe("c64")
        })

        it("migrates legacy colorScheme", async () => {
            localStorage.setItem("colorScheme", "dark")
            const { saveManager } = await loadSaveManagerModule()
            const data = saveManager.load()
            expect(data.preferences.colorScheme).toBe("dark")
        })

        it("migrates legacy locale", async () => {
            localStorage.setItem("locale", "de")
            const { saveManager } = await loadSaveManagerModule()
            const data = saveManager.load()
            expect(data.preferences.locale).toBe("de")
        })

        it("writes back individual localStorage keys after migration", async () => {
            localStorage.setItem("pinball-high-score", "100")
            localStorage.setItem("theme", "c64")
            localStorage.setItem("colorScheme", "dark")
            localStorage.setItem("locale", "de")
            const { saveManager } = await loadSaveManagerModule()
            saveManager.load()
            expect(localStorage.getItem("theme")).toBe("c64")
            expect(localStorage.getItem("colorScheme")).toBe("dark")
            expect(localStorage.getItem("locale")).toBe("de")
            expect(localStorage.getItem("pinball-high-score")).toBe("100")
        })

        it("loads existing save data", async () => {
            const saveData: SaveData = {
                version: 1,
                savedAt: Date.now(),
                game: null,
                pinball: { highScore: 9999 },
                preferences: {
                    theme: "apple2",
                    colorScheme: "dark",
                    locale: "ja",
                },
                filesystem: { modified: {}, created: {}, deleted: [] },
                achievements: {
                    earned: { "first-trade": 12345 },
                    counters: { trades: 10 },
                    sets: {},
                    reported: [],
                },
            }
            localStorage.setItem("save", JSON.stringify(saveData))
            const { saveManager } = await loadSaveManagerModule()
            const loaded = saveManager.load()
            expect(loaded.pinball.highScore).toBe(9999)
            expect(loaded.preferences.theme).toBe("apple2")
            expect(loaded.achievements.earned["first-trade"]).toBe(12345)
        })

        it("falls back to defaults on corrupt JSON", async () => {
            localStorage.setItem("save", "not-valid-json{{")
            const { saveManager } = await loadSaveManagerModule()
            const data = saveManager.load()
            expect(data.version).toBe(2)
            expect(data.pinball.highScore).toBe(0)
        })

        it("writes back individual localStorage keys on load from save blob", async () => {
            const saveData: SaveData = {
                version: 1,
                savedAt: Date.now(),
                game: null,
                pinball: { highScore: 500 },
                preferences: {
                    theme: "c64",
                    colorScheme: "dark",
                    locale: "fr",
                },
                filesystem: { modified: {}, created: {}, deleted: [] },
                achievements: {
                    earned: {},
                    counters: {},
                    sets: {},
                    reported: [],
                },
            }
            localStorage.setItem("save", JSON.stringify(saveData))
            const { saveManager } = await loadSaveManagerModule()
            saveManager.load()
            expect(localStorage.getItem("theme")).toBe("c64")
            expect(localStorage.getItem("colorScheme")).toBe("dark")
            expect(localStorage.getItem("locale")).toBe("fr")
            expect(localStorage.getItem("pinball-high-score")).toBe("500")
        })

        it("migrates v1 filesystem paths to v2", async () => {
            const saveData: SaveData = {
                version: 1,
                savedAt: Date.now(),
                game: null,
                pinball: { highScore: 0 },
                preferences: {
                    theme: "win95",
                    colorScheme: "system",
                    locale: "en",
                },
                filesystem: {
                    modified: {
                        "C:\\WINDOWS\\system32\\memory.welt":
                            "modified content",
                        "C:\\Users\\Dana\\Desktop\\WELT\\examples\\hello.welt":
                            "hello",
                    },
                    created: {
                        "C:\\Users\\Dana\\Desktop\\WELT\\myfile.welt":
                            "new content",
                        "C:\\Program Files\\test.txt": "test",
                    },
                    deleted: [
                        "C:\\WINDOWS\\system32\\syslog.txt",
                        "C:\\Program Files\\HACKTERM\\readme.txt",
                    ],
                },
                achievements: {
                    earned: {},
                    counters: {},
                    sets: {},
                    reported: [],
                },
            }
            localStorage.setItem("save", JSON.stringify(saveData))
            const { saveManager } = await loadSaveManagerModule()
            const loaded = saveManager.load()

            expect(loaded.version).toBe(2)
            expect(loaded.filesystem.modified["3:\\DAS\\memory.welt"]).toBe(
                "modified content"
            )
            expect(
                loaded.filesystem.modified[
                    "3:\\Users\\Dana\\Desktop\\WELT\\examples\\hello.welt"
                ]
            ).toBe("hello")
            expect(
                loaded.filesystem.created[
                    "3:\\Users\\Dana\\Desktop\\WELT\\myfile.welt"
                ]
            ).toBe("new content")
            expect(loaded.filesystem.created["3:\\Programme\\test.txt"]).toBe(
                "test"
            )
            expect(loaded.filesystem.deleted).toContain("3:\\DAS\\syslog.txt")
            expect(loaded.filesystem.deleted).toContain(
                "3:\\Programme\\HACKTERM\\readme.txt"
            )
        })

        it("fills in missing fields with defaults", async () => {
            localStorage.setItem(
                "save",
                JSON.stringify({ version: 1, savedAt: 0 })
            )
            const { saveManager } = await loadSaveManagerModule()
            const data = saveManager.load()
            expect(data.pinball.highScore).toBe(0)
            expect(data.preferences.theme).toBe("win95")
            expect(data.achievements.earned).toEqual({})
        })
    })

    describe("save", () => {
        it("saves gathered data to localStorage", async () => {
            const { saveManager } = await loadSaveManagerModule()
            saveManager.load()
            saveManager.registerGatherFn(
                (): SaveData => ({
                    version: 1,
                    savedAt: Date.now(),
                    game: null,
                    pinball: { highScore: 1234 },
                    preferences: {
                        theme: "win95",
                        colorScheme: "system",
                        locale: "en",
                    },
                    filesystem: { modified: {}, created: {}, deleted: [] },
                    achievements: {
                        earned: {},
                        counters: {},
                        sets: {},
                        reported: [],
                    },
                })
            )
            saveManager.saveImmediate()
            const raw = localStorage.getItem("save")
            expect(raw).toBeDefined()
            const parsed = JSON.parse(raw!) as SaveData
            expect(parsed.pinball.highScore).toBe(1234)
        })

        it("writes back individual keys on save", async () => {
            const { saveManager } = await loadSaveManagerModule()
            saveManager.load()
            saveManager.registerGatherFn(
                (): SaveData => ({
                    version: 1,
                    savedAt: Date.now(),
                    game: null,
                    pinball: { highScore: 777 },
                    preferences: {
                        theme: "mac-classic",
                        colorScheme: "light",
                        locale: "es",
                    },
                    filesystem: { modified: {}, created: {}, deleted: [] },
                    achievements: {
                        earned: {},
                        counters: {},
                        sets: {},
                        reported: [],
                    },
                })
            )
            saveManager.saveImmediate()
            expect(localStorage.getItem("theme")).toBe("mac-classic")
            expect(localStorage.getItem("locale")).toBe("es")
            expect(localStorage.getItem("pinball-high-score")).toBe("777")
        })

        it("does not save without gather function", async () => {
            const { saveManager } = await loadSaveManagerModule()
            saveManager.load()
            const sizeBefore = localStorage.getItem("save")
            saveManager.saveImmediate()
            expect(localStorage.getItem("save")).toBe(sizeBefore)
        })
    })

    describe("hasSave and getSaveSize", () => {
        it("hasSave returns false when empty", async () => {
            const { saveManager } = await loadSaveManagerModule()
            expect(saveManager.hasSave()).toBe(false)
        })

        it("hasSave returns true after load", async () => {
            const { saveManager } = await loadSaveManagerModule()
            saveManager.load()
            expect(saveManager.hasSave()).toBe(true)
        })

        it("getSaveSize returns 0 when empty", async () => {
            const { saveManager } = await loadSaveManagerModule()
            expect(saveManager.getSaveSize()).toBe(0)
        })

        it("getSaveSize returns positive number after load", async () => {
            const { saveManager } = await loadSaveManagerModule()
            saveManager.load()
            expect(saveManager.getSaveSize()).toBeGreaterThan(0)
        })
    })
})
