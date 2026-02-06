import { describe, expect, it } from "vitest"

import { ROUTABLE_WINDOWS } from "../config"
import { DESKTOP_ITEMS, type DesktopItem } from "../lib/desktopItems"
import {
    createFileSystem,
    getExecutableWindowId,
    getFileContent,
    listDirectory,
} from "../lib/terminal/filesystem"

describe("Desktop Items Shared Config", () => {
    describe("DESKTOP_ITEMS structure", () => {
        it("is a non-empty array", () => {
            expect(Array.isArray(DESKTOP_ITEMS)).toBe(true)
            expect(DESKTOP_ITEMS.length).toBeGreaterThan(0)
        })

        it("each item has required properties", () => {
            DESKTOP_ITEMS.forEach((item: DesktopItem) => {
                expect(item.id).toBeDefined()
                expect(typeof item.id).toBe("string")

                expect(item.label).toBeDefined()
                expect(typeof item.label).toBe("string")

                expect(item.filename).toBeDefined()
                expect(typeof item.filename).toBe("string")

                expect(item.icon).toBeDefined()
                expect(typeof item.icon).toBe("string")

                expect(item.windowId).toBeDefined()
                expect(typeof item.windowId).toBe("string")

                expect(item.fileType).toBeDefined()
                expect([
                    "file",
                    "directory",
                    "executable",
                    "shortcut",
                ]).toContain(item.fileType)
            })
        })

        it("all windowIds are valid routable windows", () => {
            DESKTOP_ITEMS.forEach((item) => {
                expect(ROUTABLE_WINDOWS).toContain(item.windowId)
            })
        })

        it("all ids are unique", () => {
            const ids = DESKTOP_ITEMS.map((item) => item.id)
            const uniqueIds = new Set(ids)
            expect(uniqueIds.size).toBe(ids.length)
        })

        it("all filenames are unique", () => {
            const filenames = DESKTOP_ITEMS.map((item) => item.filename)
            const uniqueFilenames = new Set(filenames)
            expect(uniqueFilenames.size).toBe(filenames.length)
        })
    })

    describe("specific items exist", () => {
        it("has Internet Explorer", () => {
            const ie = DESKTOP_ITEMS.find((i) => i.id === "internet-explorer")
            expect(ie).toBeDefined()
            expect(ie?.windowId).toBe("welcome")
            expect(ie?.fileType).toBe("shortcut")
        })

        it("has about_me.doc", () => {
            const about = DESKTOP_ITEMS.find((i) => i.id === "about-me")
            expect(about).toBeDefined()
            expect(about?.windowId).toBe("about")
            expect(about?.fileType).toBe("file")
            expect(about?.content).toContain("ABOUT DANA")
        })

        it("has terminal.exe", () => {
            const terminal = DESKTOP_ITEMS.find((i) => i.id === "terminal")
            expect(terminal).toBeDefined()
            expect(terminal?.windowId).toBe("terminal")
            expect(terminal?.fileType).toBe("executable")
        })

        it("has guestbook.exe", () => {
            const guestbook = DESKTOP_ITEMS.find((i) => i.id === "guestbook")
            expect(guestbook).toBeDefined()
            expect(guestbook?.windowId).toBe("guestbook")
            expect(guestbook?.fileType).toBe("executable")
        })

        it("has FelixGPT.exe", () => {
            const felix = DESKTOP_ITEMS.find((i) => i.id === "felixgpt")
            expect(felix).toBeDefined()
            expect(felix?.windowId).toBe("felixgpt")
        })
    })

    describe("file type conventions", () => {
        it("executables end with .exe", () => {
            const executables = DESKTOP_ITEMS.filter(
                (i) => i.fileType === "executable"
            )
            executables.forEach((exe) => {
                expect(exe.filename.toLowerCase()).toMatch(/\.exe$/)
            })
        })

        it("shortcuts end with .lnk or .url", () => {
            const shortcuts = DESKTOP_ITEMS.filter(
                (i) => i.fileType === "shortcut"
            )
            shortcuts.forEach((shortcut) => {
                expect(shortcut.filename.toLowerCase()).toMatch(/\.(lnk|url)$/)
            })
        })
    })
})

describe("Desktop Items Synchronization", () => {
    describe("filesystem reflects DESKTOP_ITEMS", () => {
        it("Desktop directory contains all items from DESKTOP_ITEMS", () => {
            const fs = createFileSystem()
            fs.cwd = ["C:", "Users", "Dana", "Desktop"]
            const result = listDirectory(fs)

            const filenames = result.entries.map((e) => e.name)

            DESKTOP_ITEMS.forEach((item) => {
                expect(filenames).toContain(item.filename)
            })
        })

        it("Desktop directory has same count as DESKTOP_ITEMS", () => {
            const fs = createFileSystem()
            fs.cwd = ["C:", "Users", "Dana", "Desktop"]
            const result = listDirectory(fs)

            expect(result.entries.length).toBe(DESKTOP_ITEMS.length)
        })

        it("file types match between config and filesystem", () => {
            const fs = createFileSystem()
            fs.cwd = ["C:", "Users", "Dana", "Desktop"]
            const result = listDirectory(fs)

            DESKTOP_ITEMS.forEach((item) => {
                const fsEntry = result.entries.find(
                    (e) => e.name === item.filename
                )
                expect(fsEntry).toBeDefined()
                expect(fsEntry?.type).toBe(item.fileType)
            })
        })

        it("windowIds match between config and filesystem", () => {
            const fs = createFileSystem()
            fs.cwd = ["C:", "Users", "Dana", "Desktop"]

            DESKTOP_ITEMS.forEach((item) => {
                const windowId = getExecutableWindowId(fs, item.filename)
                expect(windowId).toBe(item.windowId)
            })
        })

        it("content matches between config and filesystem", () => {
            const fs = createFileSystem()
            fs.cwd = ["C:", "Users", "Dana", "Desktop"]

            DESKTOP_ITEMS.filter((item) => item.content).forEach((item) => {
                const result = getFileContent(fs, item.filename)
                expect(result.content).toBe(item.content)
            })
        })
    })

    describe("adding a new item would sync correctly", () => {
        it("DESKTOP_ITEMS is the source of truth for Desktop contents", () => {
            const fs = createFileSystem()
            const desktopNode =
                fs.root.children?.Users?.children?.Dana?.children?.Desktop

            expect(desktopNode).toBeDefined()
            expect(desktopNode?.children).toBeDefined()

            const fsFilenames = Object.keys(desktopNode?.children || {})
            const configFilenames = DESKTOP_ITEMS.map((i) => i.filename)

            expect(fsFilenames.sort()).toEqual(configFilenames.sort())
        })
    })
})

describe("Desktop to filesystem mapping", () => {
    it("each desktop item can be opened in terminal", () => {
        const fs = createFileSystem()
        fs.cwd = ["C:", "Users", "Dana", "Desktop"]

        DESKTOP_ITEMS.forEach((item) => {
            const windowId = getExecutableWindowId(fs, item.filename)
            expect(windowId).toBe(item.windowId)
        })
    })

    it("each desktop item can be read in terminal", () => {
        const fs = createFileSystem()
        fs.cwd = ["C:", "Users", "Dana", "Desktop"]

        DESKTOP_ITEMS.forEach((item) => {
            const result = getFileContent(fs, item.filename)
            expect(result.error).toBeUndefined()
            expect(result.windowId).toBe(item.windowId)
        })
    })
})
