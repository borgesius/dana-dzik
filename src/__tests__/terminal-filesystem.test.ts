import { beforeEach, describe, expect, it } from "vitest"

import {
    buildTree,
    changeDirectory,
    createFile,
    createFileSystem,
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

describe("Terminal Filesystem", () => {
    let fs: FileSystem

    beforeEach(() => {
        fs = createFileSystem()
    })

    describe("createFileSystem", () => {
        it("creates filesystem with root node", () => {
            expect(fs.root).toBeDefined()
            expect(fs.root.name).toBe("C:")
            expect(fs.root.type).toBe("directory")
        })

        it("starts in Desktop directory", () => {
            expect(fs.cwd).toEqual(["C:", "Users", "Dana", "Desktop"])
        })

        it("has Users directory structure", () => {
            expect(fs.root.children?.Users).toBeDefined()
            expect(fs.root.children?.Users.children?.Dana).toBeDefined()
            expect(
                fs.root.children?.Users.children?.Dana.children?.Desktop
            ).toBeDefined()
        })

        it("has Program Files directory", () => {
            expect(fs.root.children?.["Program Files"]).toBeDefined()
            expect(
                fs.root.children?.["Program Files"].children?.HACKTERM
            ).toBeDefined()
        })

        it("has WINDOWS directory", () => {
            expect(fs.root.children?.WINDOWS).toBeDefined()
            expect(fs.root.children?.WINDOWS.children?.system32).toBeDefined()
        })
    })

    describe("resolvePath", () => {
        it("resolves absolute paths with backslash", () => {
            const result = resolvePath(fs, "C:\\Users\\Dana")
            expect(result).toEqual(["C:", "Users", "Dana"])
        })

        it("resolves absolute paths with forward slash", () => {
            const result = resolvePath(fs, "C:/Users/Dana")
            expect(result).toEqual(["C:", "Users", "Dana"])
        })

        it("resolves root path", () => {
            expect(resolvePath(fs, "C:")).toEqual(["C:"])
            expect(resolvePath(fs, "C:\\")).toEqual(["C:"])
        })

        it("resolves relative paths", () => {
            fs.cwd = ["C:", "Users", "Dana"]
            const result = resolvePath(fs, "Desktop")
            expect(result).toEqual(["C:", "Users", "Dana", "Desktop"])
        })

        it("resolves . as current directory", () => {
            const result = resolvePath(fs, ".")
            expect(result).toEqual(fs.cwd)
        })

        it("resolves .. as parent directory", () => {
            fs.cwd = ["C:", "Users", "Dana", "Desktop"]
            const result = resolvePath(fs, "..")
            expect(result).toEqual(["C:", "Users", "Dana"])
        })

        it("resolves multiple .. segments", () => {
            fs.cwd = ["C:", "Users", "Dana", "Desktop"]
            const result = resolvePath(fs, "../..")
            expect(result).toEqual(["C:", "Users"])
        })

        it("does not go above root with ..", () => {
            fs.cwd = ["C:"]
            const result = resolvePath(fs, "..")
            expect(result).toEqual(["C:"])
        })

        it("resolves complex relative paths", () => {
            fs.cwd = ["C:", "Users", "Dana", "Desktop"]
            const result = resolvePath(fs, "..\\..\\..\\WINDOWS\\system32")
            expect(result).toEqual(["C:", "WINDOWS", "system32"])
        })
    })

    describe("getNode", () => {
        it("gets root node", () => {
            const node = getNode(fs, ["C:"])
            expect(node).toBe(fs.root)
        })

        it("gets nested directory", () => {
            const node = getNode(fs, ["C:", "Users", "Dana", "Desktop"])
            expect(node).toBeDefined()
            expect(node?.name).toBe("Desktop")
            expect(node?.type).toBe("directory")
        })

        it("returns null for non-existent path", () => {
            const node = getNode(fs, ["C:", "NonExistent"])
            expect(node).toBeNull()
        })

        it("returns null for empty path", () => {
            const node = getNode(fs, [])
            expect(node).toBeNull()
        })

        it("returns null for non-C: root", () => {
            const node = getNode(fs, ["D:", "Users"])
            expect(node).toBeNull()
        })
    })

    describe("getNodeAtPath", () => {
        it("gets node from path string", () => {
            const node = getNodeAtPath(fs, "C:\\WINDOWS\\system32")
            expect(node).toBeDefined()
            expect(node?.name).toBe("system32")
        })

        it("returns null for invalid path", () => {
            const node = getNodeAtPath(fs, "C:\\NonExistent\\Path")
            expect(node).toBeNull()
        })
    })

    describe("formatPath", () => {
        it("formats root as C:\\", () => {
            expect(formatPath(["C:"])).toBe("C:\\")
        })

        it("formats nested path with backslashes", () => {
            expect(formatPath(["C:", "Users", "Dana"])).toBe("C:\\Users\\Dana")
        })
    })

    describe("changeDirectory", () => {
        it("changes to absolute path", () => {
            const result = changeDirectory(fs, "C:\\WINDOWS\\system32")
            expect(result.success).toBe(true)
            expect(fs.cwd).toEqual(["C:", "WINDOWS", "system32"])
        })

        it("changes to relative path", () => {
            fs.cwd = ["C:", "Users", "Dana"]
            const result = changeDirectory(fs, "Desktop")
            expect(result.success).toBe(true)
            expect(fs.cwd).toEqual(["C:", "Users", "Dana", "Desktop"])
        })

        it("changes to parent directory", () => {
            fs.cwd = ["C:", "Users", "Dana", "Desktop"]
            const result = changeDirectory(fs, "..")
            expect(result.success).toBe(true)
            expect(fs.cwd).toEqual(["C:", "Users", "Dana"])
        })

        it("fails for non-existent path", () => {
            const result = changeDirectory(fs, "C:\\NonExistent")
            expect(result.success).toBe(false)
            expect(result.error).toContain("cannot find the path")
        })

        it("fails for file path", () => {
            const result = changeDirectory(
                fs,
                "C:\\WINDOWS\\system32\\secrets.txt"
            )
            expect(result.success).toBe(false)
            expect(result.error).toContain("Not a directory")
        })
    })

    describe("listDirectory", () => {
        it("lists current directory contents", () => {
            fs.cwd = ["C:", "WINDOWS", "system32"]
            const result = listDirectory(fs)
            expect(result.error).toBeUndefined()
            expect(result.entries.length).toBeGreaterThan(0)
            expect(result.entries.some((e) => e.name === "secrets.txt")).toBe(
                true
            )
        })

        it("sorts directories before files", () => {
            fs.cwd = ["C:"]
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
            fs.cwd = ["C:", "Users", "Dana", "Desktop"]
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
            const result = getFileContent(
                fs,
                "C:\\WINDOWS\\system32\\secrets.txt"
            )
            expect(result.error).toBeUndefined()
            expect(result.content).toContain("secret file")
        })

        it("gets content of desktop file", () => {
            fs.cwd = ["C:", "Users", "Dana", "Desktop"]
            const result = getFileContent(fs, "about_me.doc")
            expect(result.error).toBeUndefined()
            expect(result.content).toContain("ABOUT DANA")
            expect(result.windowId).toBe("about")
        })

        it("returns error for directory", () => {
            const result = getFileContent(fs, "C:\\Users")
            expect(result.error).toContain("is a directory")
        })

        it("returns error for non-existent file", () => {
            const result = getFileContent(fs, "nonexistent.txt")
            expect(result.error).toContain("File not found")
        })

        it("returns windowId for executable", () => {
            fs.cwd = ["C:", "Users", "Dana", "Desktop"]
            const result = getFileContent(fs, "guestbook.exe")
            expect(result.windowId).toBe("guestbook")
        })
    })

    describe("getExecutableWindowId", () => {
        it("gets windowId for executable on desktop", () => {
            fs.cwd = ["C:", "Users", "Dana", "Desktop"]
            const windowId = getExecutableWindowId(fs, "terminal.exe")
            expect(windowId).toBe("terminal")
        })

        it("gets windowId for shortcut", () => {
            fs.cwd = ["C:", "Users", "Dana", "Desktop"]
            const windowId = getExecutableWindowId(fs, "Internet Explorer.lnk")
            expect(windowId).toBe("welcome")
        })

        it("gets windowId for doc file", () => {
            fs.cwd = ["C:", "Users", "Dana", "Desktop"]
            const windowId = getExecutableWindowId(fs, "about_me.doc")
            expect(windowId).toBe("about")
        })

        it("returns null for non-existent file", () => {
            const windowId = getExecutableWindowId(fs, "nonexistent.exe")
            expect(windowId).toBeNull()
        })

        it("returns null for file without windowId", () => {
            const windowId = getExecutableWindowId(
                fs,
                "C:\\WINDOWS\\system32\\config.sys"
            )
            expect(windowId).toBeNull()
        })
    })

    describe("buildTree", () => {
        it("builds tree from current directory", () => {
            fs.cwd = ["C:", "Program Files", "HACKTERM"]
            const tree = buildTree(fs)
            expect(tree).toContain("HACKTERM")
            expect(tree).toContain("readme.txt")
        })

        it("shows nested directories", () => {
            fs.cwd = ["C:", "Program Files"]
            const tree = buildTree(fs)
            expect(tree).toContain("HACKTERM")
            expect(tree).toContain("Winamp")
        })

        it("uses tree connectors", () => {
            fs.cwd = ["C:", "WINDOWS"]
            const tree = buildTree(fs)
            expect(tree).toMatch(/[├└]/)
            expect(tree).toMatch(/──/)
        })
    })

    describe("writeFile", () => {
        it("writes content to existing file", () => {
            const result = writeFile(
                fs,
                "C:\\WINDOWS\\system32\\secrets.txt",
                "new content"
            )
            expect(result.success).toBe(true)
            const content = getFileContent(
                fs,
                "C:\\WINDOWS\\system32\\secrets.txt"
            )
            expect(content.content).toBe("new content")
        })

        it("returns error for non-existent file", () => {
            const result = writeFile(fs, "C:\\nonexistent.txt", "content")
            expect(result.success).toBe(false)
            expect(result.error).toContain("File not found")
        })

        it("returns error for directory", () => {
            const result = writeFile(fs, "C:\\WINDOWS", "content")
            expect(result.success).toBe(false)
            expect(result.error).toContain("is a directory")
        })
    })

    describe("createFile", () => {
        it("creates a new file in a directory", () => {
            fs.cwd = ["C:", "Users", "Dana", "Desktop"]
            const result = createFile(
                fs,
                "C:\\Users\\Dana\\Desktop",
                "test.txt",
                "test content"
            )
            expect(result.success).toBe(true)
            const content = getFileContent(fs, "test.txt")
            expect(content.content).toBe("test content")
        })

        it("returns error if file already exists", () => {
            const result = createFile(
                fs,
                "C:\\WINDOWS\\system32",
                "secrets.txt",
                "content"
            )
            expect(result.success).toBe(false)
            expect(result.error).toContain("already exists")
        })

        it("returns error for non-existent directory", () => {
            const result = createFile(
                fs,
                "C:\\NonExistent",
                "test.txt",
                "content"
            )
            expect(result.success).toBe(false)
            expect(result.error).toContain("not found")
        })

        it("returns error for non-directory path", () => {
            const result = createFile(
                fs,
                "C:\\WINDOWS\\system32\\secrets.txt",
                "test.txt",
                "content"
            )
            expect(result.success).toBe(false)
            expect(result.error).toContain("Not a directory")
        })
    })

    describe("WELT filesystem", () => {
        it("has WELT directory on Desktop", () => {
            const node = getNodeAtPath(fs, "C:\\Users\\Dana\\Desktop\\WELT")
            expect(node).toBeDefined()
            expect(node?.type).toBe("directory")
        })

        it("has welt.exe", () => {
            const node = getNodeAtPath(
                fs,
                "C:\\Users\\Dana\\Desktop\\WELT\\welt.exe"
            )
            expect(node).toBeDefined()
            expect(node?.type).toBe("executable")
        })

        it("has MANUAL.txt", () => {
            const node = getNodeAtPath(
                fs,
                "C:\\Users\\Dana\\Desktop\\WELT\\MANUAL.txt"
            )
            expect(node).toBeDefined()
            expect(node?.content).toContain("Schopenhauer")
        })

        it("has examples directory with programs", () => {
            const examples = getNodeAtPath(
                fs,
                "C:\\Users\\Dana\\Desktop\\WELT\\examples"
            )
            expect(examples).toBeDefined()
            expect(examples?.type).toBe("directory")
            expect(examples?.children?.["hello.welt"]).toBeDefined()
            expect(examples?.children?.["fizzbuzz.welt"]).toBeDefined()
            expect(examples?.children?.["quest.welt"]).toBeDefined()
        })
    })
})
