import { beforeEach, describe, expect, it, vi } from "vitest"

import {
    type CommandContext,
    executeCommand,
    getPrompt,
    getSLFrames,
} from "../lib/terminal/commands"
import type { FileSystem } from "../lib/terminal/filesystem"
import { createFileSystem } from "../lib/terminal/filesystemBuilder"

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
            startEditor: vi.fn(),
            requestInput: vi.fn().mockResolvedValue(""),
        }
    })

    describe("help command", () => {
        it("returns help text", async () => {
            const result = await executeCommand("help", ctx)
            expect(result.output).toContain("terminalCommands.availableCommands")
            expect(result.output).toContain("cd")
            expect(result.output).toContain("ls")
            expect(result.output).toContain("cat")
        })
    })

    describe("cd command", () => {
        it("changes directory", async () => {
            await executeCommand("cd 3:\\DAS", ctx)
            expect(fs.cwd).toEqual(["3:", "DAS"])
        })

        it("shows current directory when no args", async () => {
            const result = await executeCommand("cd", ctx)
            expect(result.output).toContain("3:\\Users\\Dana\\Desktop")
        })

        it("returns error for invalid path", async () => {
            const result = await executeCommand("cd 3:\\NonExistent", ctx)
            expect(result.output).toContain("filesystem.pathNotFound")
            expect(result.className).toBe("error")
        })

        it("handles relative paths", async () => {
            await executeCommand("cd ..", ctx)
            expect(fs.cwd).toEqual(["3:", "Users", "Dana"])
        })
    })

    describe("ls command", () => {
        it("lists directory contents", async () => {
            fs.cwd = ["3:", "DAS"]
            const result = await executeCommand("ls", ctx)
            expect(result.output).toContain("syslog.txt")
            expect(result.output).toContain("config.welt")
        })

        it("shows directory header", async () => {
            const result = await executeCommand("ls", ctx)
            expect(result.output).toContain("terminalCommands.directoryOf")
        })

        it("shows file type labels", async () => {
            const result = await executeCommand("ls", ctx)
            expect(result.output).toMatch(/terminalCommands\.dir|terminalCommands\.exe|terminalCommands\.lnk/)
        })
    })

    describe("dir command", () => {
        it("is alias for ls", async () => {
            const dirResult = await executeCommand("dir", ctx)
            expect(dirResult.output).toContain("terminalCommands.directoryOf")
        })
    })

    describe("pwd command", () => {
        it("shows current directory", async () => {
            const result = await executeCommand("pwd", ctx)
            expect(result.output).toBe("3:\\Users\\Dana\\Desktop")
        })

        it("updates after cd", async () => {
            await executeCommand("cd 3:\\DAS", ctx)
            const result = await executeCommand("pwd", ctx)
            expect(result.output).toBe("3:\\DAS")
        })
    })

    describe("tree command", () => {
        it("shows directory tree", async () => {
            fs.cwd = ["3:", "Programme", "HACKTERM"]
            const result = await executeCommand("tree", ctx)
            expect(result.output).toContain("HACKTERM")
            expect(result.output).toContain("readme.txt")
        })
    })

    describe("cat command", () => {
        it("shows file contents", async () => {
            const result = await executeCommand("cat 3:\\DAS\\syslog.txt", ctx)
            expect(result.output).toContain("SYSTEM LOG")
        })

        it("shows desktop file contents", async () => {
            const result = await executeCommand("cat about_me.doc", ctx)
            expect(result.output).toContain("ABOUT DANA")
        })

        it("returns error for no filename", async () => {
            const result = await executeCommand("cat", ctx)
            expect(result.output).toContain("terminalCommands.usageCat")
            expect(result.className).toBe("error")
        })

        it("returns error for non-existent file", async () => {
            const result = await executeCommand("cat nonexistent.txt", ctx)
            expect(result.output).toContain("filesystem.fileNotFound")
            expect(result.className).toBe("error")
        })

        it("returns error for directory", async () => {
            const result = await executeCommand("cat 3:\\Users", ctx)
            expect(result.output).toContain("filesystem.isADirectory")
            expect(result.className).toBe("error")
        })

        it("shows message for executable without content", async () => {
            const result = await executeCommand("cat guestbook.exe", ctx)
            expect(result.output).toContain("terminalCommands.binaryFile")
            expect(result.className).toBe("info")
        })
    })

    describe("cat -n flag", () => {
        it("shows line numbers with -n flag", async () => {
            fs.cwd = ["3:", "Programme", "HACKTERM"]
            const result = await executeCommand("cat -n readme.txt", ctx)
            expect(result.output).toMatch(/^\s*1\|/)
        })

        it("returns error when -n used without filename", async () => {
            const result = await executeCommand("cat -n", ctx)
            expect(result.output).toContain("terminalCommands.usageCat")
            expect(result.className).toBe("error")
        })

        it("shows content without line numbers by default", async () => {
            fs.cwd = ["3:", "Programme", "HACKTERM"]
            const result = await executeCommand("cat readme.txt", ctx)
            expect(result.output).not.toMatch(/^\s*1\|/)
        })
    })

    describe("type command", () => {
        it("is alias for cat", async () => {
            const result = await executeCommand("type 3:\\DAS\\syslog.txt", ctx)
            expect(result.output).toContain("SYSTEM LOG")
        })
    })

    describe("open command", () => {
        it("opens window for file with windowId", async () => {
            const result = await executeCommand("open about_me.doc", ctx)
            expect(ctx.openWindow).toHaveBeenCalledWith("about")
            expect(result.output).toContain("terminalCommands.opening")
            expect(result.className).toBe("success")
        })

        it("opens window for executable", async () => {
            await executeCommand("open terminal.exe", ctx)
            expect(ctx.openWindow).toHaveBeenCalledWith("terminal")
        })

        it("returns error for no filename", async () => {
            const result = await executeCommand("open", ctx)
            expect(result.output).toContain("terminalCommands.usageOpen")
            expect(result.className).toBe("error")
        })

        it("returns error for file without windowId", async () => {
            const result = await executeCommand(
                "open 3:\\DAS\\config.welt",
                ctx
            )
            expect(result.output).toContain("terminalCommands.cannotOpen")
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
            expect(result.output).toContain("terminalCommands.whoamiOutput")
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
            expect(result.output).toContain("terminalCommands.launching")
        })

        it("runs executable with ./ prefix", async () => {
            await executeCommand("./terminal.exe", ctx)
            expect(ctx.openWindow).toHaveBeenCalledWith("terminal")
        })

        it("returns error for unknown command", async () => {
            const result = await executeCommand("unknowncommand", ctx)
            expect(result.output).toContain("terminalCommands.notRecognized")
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
            expect(result1.output).toContain("terminalCommands.availableCommands")
            expect(result2.output).toContain("terminalCommands.availableCommands")
        })

        it("CD works uppercase", async () => {
            await executeCommand("CD 3:\\DAS", ctx)
            expect(fs.cwd).toEqual(["3:", "DAS"])
        })
    })

    describe("help command includes new commands", () => {
        it("mentions edit command", async () => {
            const result = await executeCommand("help", ctx)
            expect(result.output).toContain("edit")
        })

        it("mentions welt command", async () => {
            const result = await executeCommand("help", ctx)
            expect(result.output).toContain("welt")
        })
    })

    describe("edit command", () => {
        it("returns error for no filename", async () => {
            const result = await executeCommand("edit", ctx)
            expect(result.output).toContain("terminalCommands.usageEdit")
            expect(result.className).toBe("error")
        })

        it("calls startEditor with filename", async () => {
            await executeCommand("edit test.welt", ctx)
            expect(ctx.startEditor).toHaveBeenCalledWith("test.welt")
        })
    })

    describe("welt command", () => {
        it("returns error for no filename", async () => {
            const result = await executeCommand("welt", ctx)
            expect(result.output).toContain("terminalCommands.usageWelt")
            expect(result.className).toBe("error")
        })

        it("returns error for non-existent file", async () => {
            const result = await executeCommand("welt nonexistent.welt", ctx)
            expect(result.output).toContain("filesystem.fileNotFound")
            expect(result.className).toBe("error")
        })

        it("runs a valid welt program", async () => {
            fs.cwd = ["3:", "Users", "Dana", "Desktop", "WELT", "examples"]
            const result = await executeCommand("welt hello.welt", ctx)
            expect(ctx.print).toHaveBeenCalledWith("Hello, World!")
            expect(result.output).toBe("")
        })

        it("reports welt errors", async () => {
            fs.cwd = ["3:", "DAS"]
            const result = await executeCommand("welt syslog.txt", ctx)
            expect(result.output).toContain("terminalCommands.weltError")
            expect(result.className).toBe("error")
        })
    })

    describe("getPrompt", () => {
        it("returns prompt with current path", () => {
            const prompt = getPrompt(fs)
            expect(prompt).toBe("3:\\Users\\Dana\\Desktop> ")
        })

        it("updates after directory change", () => {
            fs.cwd = ["3:", "DAS"]
            const prompt = getPrompt(fs)
            expect(prompt).toBe("3:\\DAS> ")
        })

        it("shows root correctly", () => {
            fs.cwd = ["3:"]
            const prompt = getPrompt(fs)
            expect(prompt).toBe("3:\\> ")
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
