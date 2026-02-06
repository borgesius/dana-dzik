import { beforeEach, describe, expect, it, vi } from "vitest"

import {
    type CommandContext,
    executeCommand,
    getPrompt,
    getSLFrames,
} from "../lib/terminal/commands"
import { createFileSystem, type FileSystem } from "../lib/terminal/filesystem"

describe("Terminal Commands", () => {
    let fs: FileSystem
    let ctx: CommandContext

    beforeEach(() => {
        fs = createFileSystem()

        ctx = {
            fs,
            openWindow: vi.fn(),
            closeTerminal: vi.fn(),
            clearOutput: vi.fn(),
            print: vi.fn(),
            printHtml: vi.fn(),
        }
    })

    describe("help command", () => {
        it("returns help text", async () => {
            const result = await executeCommand("help", ctx)
            expect(result.output).toContain("Available commands")
            expect(result.output).toContain("cd")
            expect(result.output).toContain("ls")
            expect(result.output).toContain("cat")
        })
    })

    describe("cd command", () => {
        it("changes directory", async () => {
            await executeCommand("cd C:\\WINDOWS", ctx)
            expect(fs.cwd).toEqual(["C:", "WINDOWS"])
        })

        it("shows current directory when no args", async () => {
            const result = await executeCommand("cd", ctx)
            expect(result.output).toContain("C:\\Users\\Dana\\Desktop")
        })

        it("returns error for invalid path", async () => {
            const result = await executeCommand("cd C:\\NonExistent", ctx)
            expect(result.output).toContain("cannot find the path")
            expect(result.className).toBe("error")
        })

        it("handles relative paths", async () => {
            await executeCommand("cd ..", ctx)
            expect(fs.cwd).toEqual(["C:", "Users", "Dana"])
        })
    })

    describe("ls command", () => {
        it("lists directory contents", async () => {
            fs.cwd = ["C:", "WINDOWS", "system32"]
            const result = await executeCommand("ls", ctx)
            expect(result.output).toContain("secrets.txt")
            expect(result.output).toContain("config.sys")
        })

        it("shows directory header", async () => {
            const result = await executeCommand("ls", ctx)
            expect(result.output).toContain("Directory of")
            expect(result.output).toContain("C:\\Users\\Dana\\Desktop")
        })

        it("shows file type labels", async () => {
            const result = await executeCommand("ls", ctx)
            expect(result.output).toMatch(/<DIR>|<EXE>|<LNK>/)
        })
    })

    describe("dir command", () => {
        it("is alias for ls", async () => {
            const dirResult = await executeCommand("dir", ctx)
            expect(dirResult.output).toContain("Directory of")
        })
    })

    describe("pwd command", () => {
        it("shows current directory", async () => {
            const result = await executeCommand("pwd", ctx)
            expect(result.output).toBe("C:\\Users\\Dana\\Desktop")
        })

        it("updates after cd", async () => {
            await executeCommand("cd C:\\WINDOWS", ctx)
            const result = await executeCommand("pwd", ctx)
            expect(result.output).toBe("C:\\WINDOWS")
        })
    })

    describe("tree command", () => {
        it("shows directory tree", async () => {
            fs.cwd = ["C:", "Program Files", "HACKTERM"]
            const result = await executeCommand("tree", ctx)
            expect(result.output).toContain("HACKTERM")
            expect(result.output).toContain("readme.txt")
        })
    })

    describe("cat command", () => {
        it("shows file contents", async () => {
            const result = await executeCommand(
                "cat C:\\WINDOWS\\system32\\secrets.txt",
                ctx
            )
            expect(result.output).toContain("secret file")
        })

        it("shows desktop file contents", async () => {
            const result = await executeCommand("cat about_me.doc", ctx)
            expect(result.output).toContain("ABOUT DANA")
        })

        it("returns error for no filename", async () => {
            const result = await executeCommand("cat", ctx)
            expect(result.output).toContain("Usage:")
            expect(result.className).toBe("error")
        })

        it("returns error for non-existent file", async () => {
            const result = await executeCommand("cat nonexistent.txt", ctx)
            expect(result.output).toContain("File not found")
            expect(result.className).toBe("error")
        })

        it("returns error for directory", async () => {
            const result = await executeCommand("cat C:\\Users", ctx)
            expect(result.output).toContain("is a directory")
            expect(result.className).toBe("error")
        })

        it("shows message for executable without content", async () => {
            const result = await executeCommand("cat guestbook.exe", ctx)
            expect(result.output).toContain("Binary file")
            expect(result.className).toBe("info")
        })
    })

    describe("type command", () => {
        it("is alias for cat", async () => {
            const result = await executeCommand(
                "type C:\\WINDOWS\\system32\\secrets.txt",
                ctx
            )
            expect(result.output).toContain("secret file")
        })
    })

    describe("open command", () => {
        it("opens window for file with windowId", async () => {
            const result = await executeCommand("open about_me.doc", ctx)
            expect(ctx.openWindow).toHaveBeenCalledWith("about")
            expect(result.output).toContain("Opening")
            expect(result.className).toBe("success")
        })

        it("opens window for executable", async () => {
            await executeCommand("open terminal.exe", ctx)
            expect(ctx.openWindow).toHaveBeenCalledWith("terminal")
        })

        it("returns error for no filename", async () => {
            const result = await executeCommand("open", ctx)
            expect(result.output).toContain("Usage:")
            expect(result.className).toBe("error")
        })

        it("returns error for file without windowId", async () => {
            const result = await executeCommand(
                "open C:\\WINDOWS\\system32\\config.sys",
                ctx
            )
            expect(result.output).toContain("Cannot open")
            expect(result.className).toBe("error")
        })
    })

    describe("clear/cls commands", () => {
        it("clear returns clear action", async () => {
            const result = await executeCommand("clear", ctx)
            expect(result.action).toBe("clear")
        })

        it("cls returns clear action", async () => {
            const result = await executeCommand("cls", ctx)
            expect(result.action).toBe("clear")
        })
    })

    describe("whoami command", () => {
        it("shows user info", async () => {
            const result = await executeCommand("whoami", ctx)
            expect(result.output).toContain("DANA")
            expect(result.output).toContain("Guest")
            expect(result.output).toContain("HACKTERM")
        })
    })

    describe("exit command", () => {
        it("returns exit action", async () => {
            const result = await executeCommand("exit", ctx)
            expect(result.action).toBe("exit")
        })
    })

    describe("sl command (easter egg)", () => {
        it("returns sl action", async () => {
            const result = await executeCommand("sl", ctx)
            expect(result.action).toBe("sl")
        })
    })

    describe("executing files directly", () => {
        it("runs executable by name", async () => {
            const result = await executeCommand("guestbook.exe", ctx)
            expect(ctx.openWindow).toHaveBeenCalledWith("guestbook")
            expect(result.output).toContain("Launching")
        })

        it("runs executable with ./ prefix", async () => {
            await executeCommand("./terminal.exe", ctx)
            expect(ctx.openWindow).toHaveBeenCalledWith("terminal")
        })

        it("returns error for unknown command", async () => {
            const result = await executeCommand("unknowncommand", ctx)
            expect(result.output).toContain("is not recognized")
            expect(result.className).toBe("error")
        })
    })

    describe("empty input", () => {
        it("returns empty output", async () => {
            const result = await executeCommand("", ctx)
            expect(result.output).toBe("")
        })

        it("handles whitespace-only input", async () => {
            const result = await executeCommand("   ", ctx)
            expect(result.output).toBe("")
        })
    })

    describe("case insensitivity", () => {
        it("commands are case insensitive", async () => {
            const result1 = await executeCommand("HELP", ctx)
            const result2 = await executeCommand("Help", ctx)
            expect(result1.output).toContain("Available commands")
            expect(result2.output).toContain("Available commands")
        })

        it("CD works uppercase", async () => {
            await executeCommand("CD C:\\WINDOWS", ctx)
            expect(fs.cwd).toEqual(["C:", "WINDOWS"])
        })
    })

    describe("getPrompt", () => {
        it("returns prompt with current path", () => {
            const prompt = getPrompt(fs)
            expect(prompt).toBe("C:\\Users\\Dana\\Desktop> ")
        })

        it("updates after directory change", () => {
            fs.cwd = ["C:", "WINDOWS"]
            const prompt = getPrompt(fs)
            expect(prompt).toBe("C:\\WINDOWS> ")
        })

        it("shows root correctly", () => {
            fs.cwd = ["C:"]
            const prompt = getPrompt(fs)
            expect(prompt).toBe("C:\\> ")
        })
    })

    describe("getSLFrames", () => {
        it("returns array of ASCII frames", () => {
            const frames = getSLFrames()
            expect(Array.isArray(frames)).toBe(true)
            expect(frames.length).toBeGreaterThan(0)
        })

        it("frames contain train ASCII art", () => {
            const frames = getSLFrames()
            expect(frames[0]).toContain("====")
        })
    })
})
