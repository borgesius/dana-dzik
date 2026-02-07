import { beforeEach, describe, expect, it } from "vitest"

import {
    buildTree,
    changeDirectory,
    createFile,
    type FileSystem,
    formatPath,
    getExecutableWindowId,
    getFileContent,
    getNode,
    getNodeAtPath,
    listDirectory,
    resolvePath,
    writeFile,
} from "../lib/terminal/filesystem"
import { createFileSystem } from "../lib/terminal/filesystemBuilder"

describe("Terminal Filesystem", () => {
    let fs: FileSystem

    beforeEach(() => {
        fs = createFileSystem()
    })

    describe("createFileSystem", () => {
        it("creates filesystem with root node", () => {
            expect(fs.root).toBeDefined()
            expect(fs.root.name).toBe("3:")
            expect(fs.root.type).toBe("directory")
        })

        it("starts in Desktop directory", () => {
            expect(fs.cwd).toEqual(["3:", "Users", "Dana", "Desktop"])
        })

        it("has Users directory structure", () => {
            expect(fs.root.children?.Users).toBeDefined()
            expect(fs.root.children?.Users.children?.Dana).toBeDefined()
            expect(
                fs.root.children?.Users.children?.Dana.children?.Desktop
            ).toBeDefined()
        })

        it("has Programme directory", () => {
            expect(fs.root.children?.["Programme"]).toBeDefined()
            expect(
                fs.root.children?.["Programme"].children?.HACKTERM
            ).toBeDefined()
        })

        it("has DAS directory", () => {
            expect(fs.root.children?.DAS).toBeDefined()
            expect(
                fs.root.children?.DAS.children?.["kernel.welt"]
            ).toBeDefined()
        })
    })

    describe("resolvePath", () => {
        it("resolves absolute paths with backslash", () => {
            const result = resolvePath(fs, "3:\\Users\\Dana")
            expect(result).toEqual(["3:", "Users", "Dana"])
        })

        it("resolves absolute paths with forward slash", () => {
            const result = resolvePath(fs, "3:/Users/Dana")
            expect(result).toEqual(["3:", "Users", "Dana"])
        })

        it("resolves root path", () => {
            expect(resolvePath(fs, "3:")).toEqual(["3:"])
            expect(resolvePath(fs, "3:\\")).toEqual(["3:"])
        })

        it("resolves relative paths", () => {
            fs.cwd = ["3:", "Users", "Dana"]
            const result = resolvePath(fs, "Desktop")
            expect(result).toEqual(["3:", "Users", "Dana", "Desktop"])
        })

        it("resolves . as current directory", () => {
            const result = resolvePath(fs, ".")
            expect(result).toEqual(fs.cwd)
        })

        it("resolves .. as parent directory", () => {
            fs.cwd = ["3:", "Users", "Dana", "Desktop"]
            const result = resolvePath(fs, "..")
            expect(result).toEqual(["3:", "Users", "Dana"])
        })

        it("resolves multiple .. segments", () => {
            fs.cwd = ["3:", "Users", "Dana", "Desktop"]
            const result = resolvePath(fs, "../..")
            expect(result).toEqual(["3:", "Users"])
        })

        it("does not go above root with ..", () => {
            fs.cwd = ["3:"]
            const result = resolvePath(fs, "..")
            expect(result).toEqual(["3:"])
        })

        it("resolves complex relative paths", () => {
            fs.cwd = ["3:", "Users", "Dana", "Desktop"]
            const result = resolvePath(fs, "..\\..\\..\\DAS")
            expect(result).toEqual(["3:", "DAS"])
        })
    })

    describe("getNode", () => {
        it("gets root node", () => {
            const node = getNode(fs, ["3:"])
            expect(node).toBe(fs.root)
        })

        it("gets nested directory", () => {
            const node = getNode(fs, ["3:", "Users", "Dana", "Desktop"])
            expect(node).toBeDefined()
            expect(node?.name).toBe("Desktop")
            expect(node?.type).toBe("directory")
        })

        it("returns null for non-existent path", () => {
            const node = getNode(fs, ["3:", "NonExistent"])
            expect(node).toBeNull()
        })

        it("returns null for empty path", () => {
            const node = getNode(fs, [])
            expect(node).toBeNull()
        })

        it("returns null for wrong root drive", () => {
            const node = getNode(fs, ["D:", "Users"])
            expect(node).toBeNull()
        })
    })

    describe("getNodeAtPath", () => {
        it("gets node from path string", () => {
            const node = getNodeAtPath(fs, "3:\\DAS")
            expect(node).toBeDefined()
            expect(node?.name).toBe("DAS")
        })

        it("returns null for invalid path", () => {
            const node = getNodeAtPath(fs, "3:\\NonExistent\\Path")
            expect(node).toBeNull()
        })
    })

    describe("formatPath", () => {
        it("formats root as 3:\\", () => {
            expect(formatPath(["3:"])).toBe("3:\\")
        })

        it("formats nested path with backslashes", () => {
            expect(formatPath(["3:", "Users", "Dana"])).toBe("3:\\Users\\Dana")
        })
    })

    describe("changeDirectory", () => {
        it("changes to absolute path", () => {
            const result = changeDirectory(fs, "3:\\DAS")
            expect(result.success).toBe(true)
            expect(fs.cwd).toEqual(["3:", "DAS"])
        })

        it("changes to relative path", () => {
            fs.cwd = ["3:", "Users", "Dana"]
            const result = changeDirectory(fs, "Desktop")
            expect(result.success).toBe(true)
            expect(fs.cwd).toEqual(["3:", "Users", "Dana", "Desktop"])
        })

        it("changes to parent directory", () => {
            fs.cwd = ["3:", "Users", "Dana", "Desktop"]
            const result = changeDirectory(fs, "..")
            expect(result.success).toBe(true)
            expect(fs.cwd).toEqual(["3:", "Users", "Dana"])
        })

        it("fails for non-existent path", () => {
            const result = changeDirectory(fs, "3:\\NonExistent")
            expect(result.success).toBe(false)
            expect(result.error).toContain("filesystem.pathNotFound")
        })

        it("fails for file path", () => {
            const result = changeDirectory(fs, "3:\\DAS\\syslog.txt")
            expect(result.success).toBe(false)
            expect(result.error).toContain("filesystem.notADirectory")
        })
    })

    describe("listDirectory", () => {
        it("lists current directory contents", () => {
            fs.cwd = ["3:", "DAS"]
            const result = listDirectory(fs)
            expect(result.error).toBeUndefined()
            expect(result.entries.length).toBeGreaterThan(0)
            expect(result.entries.some((e) => e.name === "syslog.txt")).toBe(
                true
            )
        })

        it("sorts directories before files", () => {
            fs.cwd = ["3:"]
            const result = listDirectory(fs)
            const firstNonDir = result.entries.findIndex(
                (e) => e.type !== "directory"
            )
            if (firstNonDir > 0) {
                const allDirsBefore = result.entries
                    .slice(0, firstNonDir)
                    .every((e) => e.type === "directory")
                expect(allDirsBefore).toBe(true)
            }
        })

        it("returns desktop items from shared config", () => {
            fs.cwd = ["3:", "Users", "Dana", "Desktop"]
            const result = listDirectory(fs)
            expect(result.entries.some((e) => e.name === "about_me.doc")).toBe(
                true
            )
            expect(result.entries.some((e) => e.name === "terminal.exe")).toBe(
                true
            )
        })
    })

    describe("getFileContent", () => {
        it("gets content of text file", () => {
            const result = getFileContent(fs, "3:\\DAS\\syslog.txt")
            expect(result.error).toBeUndefined()
            expect(result.content).toContain("SYSTEM LOG")
        })

        it("gets content of desktop file", () => {
            fs.cwd = ["3:", "Users", "Dana", "Desktop"]
            const result = getFileContent(fs, "about_me.doc")
            expect(result.error).toBeUndefined()
            expect(result.content).toContain("ABOUT DANA")
            expect(result.windowId).toBe("about")
        })

        it("returns error for directory", () => {
            const result = getFileContent(fs, "3:\\Users")
            expect(result.error).toContain("filesystem.isADirectory")
        })

        it("returns error for non-existent file", () => {
            const result = getFileContent(fs, "nonexistent.txt")
            expect(result.error).toContain("filesystem.fileNotFound")
        })

        it("returns windowId for executable", () => {
            fs.cwd = ["3:", "Users", "Dana", "Desktop"]
            const result = getFileContent(fs, "guestbook.exe")
            expect(result.windowId).toBe("guestbook")
        })
    })

    describe("getExecutableWindowId", () => {
        it("gets windowId for executable on desktop", () => {
            fs.cwd = ["3:", "Users", "Dana", "Desktop"]
            const windowId = getExecutableWindowId(fs, "terminal.exe")
            expect(windowId).toBe("terminal")
        })

        it("gets windowId for shortcut", () => {
            fs.cwd = ["3:", "Users", "Dana", "Desktop"]
            const windowId = getExecutableWindowId(fs, "Internet Explorer.lnk")
            expect(windowId).toBe("welcome")
        })

        it("gets windowId for doc file", () => {
            fs.cwd = ["3:", "Users", "Dana", "Desktop"]
            const windowId = getExecutableWindowId(fs, "about_me.doc")
            expect(windowId).toBe("about")
        })

        it("returns null for non-existent file", () => {
            const windowId = getExecutableWindowId(fs, "nonexistent.exe")
            expect(windowId).toBeNull()
        })

        it("returns null for file without windowId", () => {
            const windowId = getExecutableWindowId(fs, "3:\\DAS\\config.welt")
            expect(windowId).toBeNull()
        })
    })

    describe("buildTree", () => {
        it("builds tree from current directory", () => {
            fs.cwd = ["3:", "Programme", "HACKTERM"]
            const tree = buildTree(fs)
            expect(tree).toContain("HACKTERM")
            expect(tree).toContain("readme.txt")
        })

        it("shows nested directories", () => {
            fs.cwd = ["3:", "Programme"]
            const tree = buildTree(fs)
            expect(tree).toContain("HACKTERM")
            expect(tree).toContain("Winamp")
        })

        it("uses tree connectors", () => {
            fs.cwd = ["3:", "DAS"]
            const tree = buildTree(fs)
            expect(tree).toMatch(/[├└]/)
            expect(tree).toMatch(/──/)
        })
    })

    describe("writeFile", () => {
        it("writes content to existing file", () => {
            const result = writeFile(fs, "3:\\DAS\\syslog.txt", "new content")
            expect(result.success).toBe(true)
            const content = getFileContent(fs, "3:\\DAS\\syslog.txt")
            expect(content.content).toBe("new content")
        })

        it("returns error for non-existent file", () => {
            const result = writeFile(fs, "3:\\nonexistent.txt", "content")
            expect(result.success).toBe(false)
            expect(result.error).toContain("filesystem.fileNotFound")
        })

        it("returns error for directory", () => {
            const result = writeFile(fs, "3:\\DAS", "content")
            expect(result.success).toBe(false)
            expect(result.error).toContain("filesystem.isADirectory")
        })
    })

    describe("createFile", () => {
        it("creates a new file in a directory", () => {
            fs.cwd = ["3:", "Users", "Dana", "Desktop"]
            const result = createFile(
                fs,
                "3:\\Users\\Dana\\Desktop",
                "test.txt",
                "test content"
            )
            expect(result.success).toBe(true)
            const content = getFileContent(fs, "test.txt")
            expect(content.content).toBe("test content")
        })

        it("returns error if file already exists", () => {
            const result = createFile(fs, "3:\\DAS", "syslog.txt", "content")
            expect(result.success).toBe(false)
            expect(result.error).toContain("filesystem.fileExists")
        })

        it("returns error for non-existent directory", () => {
            const result = createFile(
                fs,
                "3:\\NonExistent",
                "test.txt",
                "content"
            )
            expect(result.success).toBe(false)
            expect(result.error).toContain("filesystem.dirNotFound")
        })

        it("returns error for non-directory path", () => {
            const result = createFile(
                fs,
                "3:\\DAS\\syslog.txt",
                "test.txt",
                "content"
            )
            expect(result.success).toBe(false)
            expect(result.error).toContain("filesystem.notADirectory")
        })
    })

    describe("WELT filesystem", () => {
        it("has WELT directory on Desktop", () => {
            const node = getNodeAtPath(fs, "3:\\Users\\Dana\\Desktop\\WELT")
            expect(node).toBeDefined()
            expect(node?.type).toBe("directory")
        })

        it("has welt.exe", () => {
            const node = getNodeAtPath(
                fs,
                "3:\\Users\\Dana\\Desktop\\WELT\\welt.exe"
            )
            expect(node).toBeDefined()
            expect(node?.type).toBe("executable")
        })

        it("has MANUAL.txt", () => {
            const node = getNodeAtPath(
                fs,
                "3:\\Users\\Dana\\Desktop\\WELT\\MANUAL.txt"
            )
            expect(node).toBeDefined()
            expect(node?.content).toContain("Schopenhauer")
        })

        it("has examples directory with programs", () => {
            const examples = getNodeAtPath(
                fs,
                "3:\\Users\\Dana\\Desktop\\WELT\\examples"
            )
            expect(examples).toBeDefined()
            expect(examples?.type).toBe("directory")
            expect(examples?.children?.["hello.welt"]).toBeDefined()
            expect(examples?.children?.["fizzbuzz.welt"]).toBeDefined()
            expect(examples?.children?.["quest.welt"]).toBeDefined()
        })
    })
})
