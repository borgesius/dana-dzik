// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest"

import { Editor, type EditorCallbacks } from "../lib/terminal/editor"
import { createFileSystem, type FileSystem } from "../lib/terminal/filesystem"

describe("Editor", () => {
    let fs: FileSystem
    let container: HTMLElement
    let callbacks: EditorCallbacks

    beforeEach(() => {
        vi.restoreAllMocks()

        fs = createFileSystem()
        container = document.createElement("div")

        callbacks = {
            container,
            onExit: vi.fn(),
            print: vi.fn(),
        }
    })

    describe("constructor", () => {
        it("prints error and exits when trying to edit a directory", () => {
            fs.cwd = ["3:"]
            new Editor(fs, "Users", callbacks)

            expect(callbacks.print).toHaveBeenCalledWith(
                expect.stringContaining("Cannot edit a directory"),
                "error"
            )
            expect(callbacks.onExit).toHaveBeenCalled()
        })

        it("creates editor UI for existing file", () => {
            fs.cwd = ["3:", "Programme", "HACKTERM"]
            const editor = new Editor(fs, "readme.txt", callbacks)

            expect(container.querySelector(".editor-container")).toBeTruthy()
            expect(callbacks.onExit).not.toHaveBeenCalled()
            expect(editor).toBeDefined()
        })

        it("creates editor UI for new file", () => {
            fs.cwd = ["3:", "Users", "Dana", "Desktop"]
            const editor = new Editor(fs, "newfile.txt", callbacks)

            expect(container.querySelector(".editor-container")).toBeTruthy()
            expect(callbacks.onExit).not.toHaveBeenCalled()
            expect(editor).toBeDefined()
        })

        it("loads existing file content into textarea", () => {
            fs.cwd = ["3:", "Programme", "HACKTERM"]
            new Editor(fs, "readme.txt", callbacks)

            const textarea = container.querySelector(
                ".editor-textarea"
            ) as HTMLTextAreaElement
            expect(textarea).toBeTruthy()
            expect(textarea.value).toContain("HACKTERM")
        })

        it("starts with empty textarea for new file", () => {
            fs.cwd = ["3:", "Users", "Dana", "Desktop"]
            new Editor(fs, "newfile.txt", callbacks)

            const textarea = container.querySelector(
                ".editor-textarea"
            ) as HTMLTextAreaElement
            expect(textarea).toBeTruthy()
            expect(textarea.value).toBe("")
        })
    })

    describe("UI structure", () => {
        it("creates header, body with gutter and textarea, and status bar", () => {
            fs.cwd = ["3:", "Programme", "HACKTERM"]
            new Editor(fs, "readme.txt", callbacks)

            expect(container.querySelector(".editor-header")).toBeTruthy()
            expect(container.querySelector(".editor-body")).toBeTruthy()
            expect(container.querySelector(".editor-gutter")).toBeTruthy()
            expect(container.querySelector(".editor-textarea")).toBeTruthy()
            expect(container.querySelector(".editor-status")).toBeTruthy()
        })

        it("shows filename in header", () => {
            fs.cwd = ["3:", "Programme", "HACKTERM"]
            new Editor(fs, "readme.txt", callbacks)

            const header = container.querySelector(".editor-header")
            expect(header?.textContent).toContain("readme.txt")
        })

        it("shows line numbers in gutter", () => {
            fs.cwd = ["3:", "Programme", "HACKTERM"]
            new Editor(fs, "readme.txt", callbacks)

            const gutter = container.querySelector(".editor-gutter")
            expect(gutter?.textContent).toContain("1")
        })
    })

    describe("destroy", () => {
        it("calls onExit callback", () => {
            fs.cwd = ["3:", "Users", "Dana", "Desktop"]
            const editor = new Editor(fs, "newfile.txt", callbacks)

            editor.destroy()

            expect(callbacks.onExit).toHaveBeenCalledOnce()
        })

        it("removes editor container from DOM", () => {
            fs.cwd = ["3:", "Users", "Dana", "Desktop"]
            const editor = new Editor(fs, "newfile.txt", callbacks)

            expect(container.querySelector(".editor-container")).toBeTruthy()

            editor.destroy()

            expect(container.querySelector(".editor-container")).toBeFalsy()
        })
    })

    describe("focusTextarea", () => {
        it("does not throw", () => {
            fs.cwd = ["3:", "Users", "Dana", "Desktop"]
            const editor = new Editor(fs, "newfile.txt", callbacks)

            expect(() => editor.focusTextarea()).not.toThrow()
        })
    })
})
