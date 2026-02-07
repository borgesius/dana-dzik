/**
 * @vitest-environment jsdom
 */
import { describe, expect, it } from "vitest"

import {
    createFile,
    deleteFile,
    type FileSystem,
    getFileContent,
    renameFile,
    writeFile,
} from "../lib/terminal/filesystem"
import { createFileSystem } from "../lib/terminal/filesystemBuilder"
import { diffFilesystem, patchFilesystem } from "../lib/terminal/filesystemDiff"

const HACKTERM_README = "3:\\Programme\\HACKTERM\\readme.txt"
const HACKTERM_DIR = "3:\\Programme\\HACKTERM"
const DESKTOP_DIR = "3:\\Users\\Dana\\Desktop"

function freshFs(): FileSystem {
    return createFileSystem()
}

describe("Filesystem diff/patch", () => {
    describe("diffFilesystem", () => {
        it("returns near-empty diff for unmodified filesystem", () => {
            const fs = freshFs()
            const diff = diffFilesystem(fs)
            const modifiedKeys = Object.keys(diff.modified)
            const nonManualMods = modifiedKeys.filter(
                (k) => !k.includes("MANUAL.txt")
            )
            expect(nonManualMods).toHaveLength(0)
            expect(Object.keys(diff.created)).toHaveLength(0)
            expect(diff.deleted).toHaveLength(0)
        })

        it("detects modified files", () => {
            const fs = freshFs()
            writeFile(fs, HACKTERM_README, "changed!")
            const diff = diffFilesystem(fs)
            expect(diff.modified[HACKTERM_README]).toBe("changed!")
        })

        it("detects created files", () => {
            const fs = freshFs()
            createFile(fs, DESKTOP_DIR, "newfile.txt", "hello")
            const diff = diffFilesystem(fs)
            expect(diff.created[`${DESKTOP_DIR}\\newfile.txt`]).toBe("hello")
        })

        it("detects deleted files", () => {
            const fs = freshFs()
            deleteFile(fs, HACKTERM_README)
            const diff = diffFilesystem(fs)
            expect(diff.deleted).toContain(HACKTERM_README)
        })
    })

    describe("patchFilesystem", () => {
        it("applies modified files", () => {
            const fs = freshFs()
            patchFilesystem(fs, {
                modified: { [HACKTERM_README]: "patched content" },
                created: {},
                deleted: [],
            })
            const result = getFileContent(fs, HACKTERM_README)
            expect(result.content).toBe("patched content")
        })

        it("applies created files", () => {
            const fs = freshFs()
            const path = `${DESKTOP_DIR}\\newfile.txt`
            patchFilesystem(fs, {
                modified: {},
                created: { [path]: "new content" },
                deleted: [],
            })
            const result = getFileContent(fs, path)
            expect(result.content).toBe("new content")
        })

        it("applies deleted files", () => {
            const fs = freshFs()
            patchFilesystem(fs, {
                modified: {},
                created: {},
                deleted: [HACKTERM_README],
            })
            const result = getFileContent(fs, HACKTERM_README)
            expect(result.error).toBeDefined()
        })

        it("round-trips diff and patch", () => {
            const original = freshFs()
            writeFile(original, HACKTERM_README, "modified")
            createFile(original, DESKTOP_DIR, "test.txt", "test data")

            const diff = diffFilesystem(original)

            const restored = freshFs()
            patchFilesystem(restored, diff)

            const modified = getFileContent(restored, HACKTERM_README)
            expect(modified.content).toBe("modified")

            const created = getFileContent(restored, `${DESKTOP_DIR}\\test.txt`)
            expect(created.content).toBe("test data")
        })
    })

    describe("file size limits", () => {
        it("rejects files exceeding 4KB", () => {
            const fs = freshFs()
            const bigContent = "x".repeat(5000)
            const result = writeFile(fs, HACKTERM_README, bigContent)
            expect(result.success).toBe(false)
            expect(result.error).toContain("4096")
        })

        it("rejects creation of files exceeding 4KB", () => {
            const fs = freshFs()
            const bigContent = "x".repeat(5000)
            const result = createFile(fs, DESKTOP_DIR, "big.txt", bigContent)
            expect(result.success).toBe(false)
            expect(result.error).toContain("4096")
        })

        it("allows files at exactly 4KB", () => {
            const fs = freshFs()
            const content = "x".repeat(4096)
            const result = writeFile(fs, HACKTERM_README, content)
            expect(result.success).toBe(true)
        })
    })

    describe("deleteFile", () => {
        it("deletes a file", () => {
            const fs = freshFs()
            const result = deleteFile(fs, HACKTERM_README)
            expect(result.success).toBe(true)
        })

        it("fails for non-existent file", () => {
            const fs = freshFs()
            const result = deleteFile(fs, `${DESKTOP_DIR}\\nofile.txt`)
            expect(result.success).toBe(false)
        })

        it("fails for non-empty directory", () => {
            const fs = freshFs()
            const result = deleteFile(fs, HACKTERM_DIR)
            expect(result.success).toBe(false)
            expect(result.error).toContain("not empty")
        })

        it("refuses to delete root", () => {
            const fs = freshFs()
            const result = deleteFile(fs, "3:")
            expect(result.success).toBe(false)
        })
    })

    describe("renameFile", () => {
        it("renames a file", () => {
            const fs = freshFs()
            const result = renameFile(fs, HACKTERM_README, "renamed.txt")
            expect(result.success).toBe(true)
            const content = getFileContent(fs, `${HACKTERM_DIR}\\renamed.txt`)
            expect(content.error).toBeUndefined()
        })

        it("fails when target name exists", () => {
            const fs = freshFs()
            createFile(fs, HACKTERM_DIR, "conflict.txt", "x")
            const result = renameFile(fs, HACKTERM_README, "conflict.txt")
            expect(result.success).toBe(false)
            expect(result.error).toContain("Already exists")
        })

        it("fails for non-existent source", () => {
            const fs = freshFs()
            const result = renameFile(
                fs,
                `${DESKTOP_DIR}\\nofile.txt`,
                "new.txt"
            )
            expect(result.success).toBe(false)
        })
    })
})
