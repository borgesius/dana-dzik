import {
    compileWeltProgram,
    getInitialMemory,
    runGrundProgram,
    runWeltProgram,
    WeltError,
} from "../welt"
import { EXERCISES } from "../welt/exercises"
import { runAllTests } from "../welt/testRunner"
import type { WeltValue } from "../welt/types"
import { SYS_MEMORY } from "./filesystem"
import {
    buildTree,
    changeDirectory,
    type FileSystem,
    type FileType,
    formatPath,
    getCurrentNode,
    getExecutableWindowId,
    getFileContent,
    getNode,
    getNodeAtPath,
    listDirectory,
    resolvePath,
} from "./filesystem"

export interface CommandContext {
    fs: FileSystem
    openWindow: (windowId: string) => void
    closeTerminal: () => void
    clearOutput: () => void
    print: (text: string, className?: string) => void
    printHtml: (html: string) => void
    startEditor: (filename: string) => void
    requestInput: () => Promise<string>
}

export interface CommandResult {
    output?: string
    html?: string
    className?: string
    action?: "clear" | "exit" | "sl"
}

type CommandHandler = (
    args: string[],
    ctx: CommandContext
) => CommandResult | Promise<CommandResult>

const SL_FRAMES = [
    `      ====        ________                ___________
  _D _|  |_______/        \\__I_I_____===__|_________|
   |(_)---  |   H\\________/ |   |        =|___ ___|
   /     |  |   H  |  |     |   |         ||_| |_||
  |      |  |   H  |__--------------------| [___] |
  | ________|___H__/__|_____/[][]~\\_______|       |
  |/ |   |-----------I_____I [][] []  D   |=======|__
__/ =| o |=-~~\\  /~~\\  /~~\\  /~~\\ ____Y___________|__
 |/-=|___|=    ||    ||    ||    |_____/~\\___/
  \\_/      \\O=====O=====O=====O_/      \\_/`,

    `       ====        ________                ___________
  _D _|  |_______/        \\__I_I_____===__|_________|
   |(_)---  |   H\\________/ |   |        =|___ ___|
   /     |  |   H  |  |     |   |         ||_| |_||
  |      |  |   H  |__--------------------| [___] |
  | ________|___H__/__|_____/[][]~\\_______|       |
  |/ |   |-----------I_____I [][] []  D   |=======|__
__/ =| o |=-O=====O=====O=====O \\ ____Y___________|__
 |/-=|___|=    ||    ||    ||    |_____/~\\___/
  \\_/      \\__/  \\__/  \\__/  \\__/      \\_/`,
]

const COMMANDS: Record<string, CommandHandler> = {
    help: (): CommandResult => ({
        output: `Available commands:

  Navigation:
    cd <path>     Change directory
    ls, dir       List directory contents
    pwd           Print working directory
    tree          Show directory tree

  Files:
    cat <file>    Display file contents
    type <file>   Display file contents
    open <file>   Open file/program
    edit <file>   Edit file (line editor)

  Programs:
    welt <file>        Run a .welt or .grund program
    welt --grund <f>   Compile .welt to GRUND assembly
    grund <file>       Run a .grund program

  Utilities:
    help          Show this message
    clear, cls    Clear terminal
    whoami        Display user info
    exit          Close terminal

  Tip: Type an .exe filename to run it directly`,
    }),

    cd: (args, ctx): CommandResult => {
        if (args.length === 0) {
            return { output: formatPath(ctx.fs.cwd) }
        }

        const result = changeDirectory(ctx.fs, args.join(" "))
        if (!result.success) {
            return { output: result.error, className: "error" }
        }

        return { output: "" }
    },

    ls: (_, ctx): CommandResult => {
        const result = listDirectory(ctx.fs)
        if (result.error) {
            return { output: result.error, className: "error" }
        }

        const lines = ["", ` Directory of ${formatPath(ctx.fs.cwd)}`, ""]

        for (const entry of result.entries) {
            const typeLabel = getTypeLabel(entry.type)
            lines.push(`    ${typeLabel}    ${entry.name}`)
        }

        lines.push("")
        return { output: lines.join("\n") }
    },

    dir: (args, ctx) => COMMANDS.ls(args, ctx),

    pwd: (_, ctx): CommandResult => ({
        output: formatPath(ctx.fs.cwd),
    }),

    tree: (_, ctx): CommandResult => ({
        output: buildTree(ctx.fs),
    }),

    cat: (args, ctx): CommandResult => {
        if (args.length === 0) {
            return {
                output: "Usage: cat [-n] <filename>",
                className: "error",
            }
        }

        const showLineNumbers = args[0] === "-n"
        const fileArgs = showLineNumbers ? args.slice(1) : args

        if (fileArgs.length === 0) {
            return {
                output: "Usage: cat [-n] <filename>",
                className: "error",
            }
        }

        const filename = fileArgs.join(" ")
        const result = getFileContent(ctx.fs, filename)

        if (result.error) {
            return { output: result.error, className: "error" }
        }

        if (result.content) {
            if (showLineNumbers) {
                const lines = result.content.split("\n")
                const numbered = lines
                    .map((line, i) => {
                        const num = String(i + 1).padStart(3, " ")
                        return `${num}| ${line}`
                    })
                    .join("\n")
                return { output: numbered }
            }
            return { output: result.content }
        }

        if (result.windowId) {
            return {
                output: `[Binary file - use 'open ${filename}' to run]`,
                className: "info",
            }
        }

        return { output: "[Empty file]" }
    },

    type: (args, ctx) => COMMANDS.cat(args, ctx),

    open: (args, ctx): CommandResult => {
        if (args.length === 0) {
            return { output: "Usage: open <filename>", className: "error" }
        }

        const filename = args.join(" ")
        const windowId = getExecutableWindowId(ctx.fs, filename)

        if (!windowId) {
            return {
                output: `Cannot open: ${filename}`,
                className: "error",
            }
        }

        ctx.openWindow(windowId)
        return {
            output: `[Opening ${filename}...]`,
            className: "success",
        }
    },

    edit: (args, ctx): CommandResult => {
        if (args.length === 0) {
            return { output: "Usage: edit <filename>", className: "error" }
        }

        const filename = args.join(" ")

        const resolved = resolvePath(ctx.fs, filename)
        if (resolved) {
            const node = getNode(ctx.fs, resolved)
            if (node?.readonly) {
                return {
                    output: `Access denied: ${filename} is read-only`,
                    className: "error",
                }
            }
        }

        ctx.startEditor(filename)
        return { output: "" }
    },

    welt: async (args, ctx): Promise<CommandResult> => {
        if (args.length === 0) {
            return {
                output: "Usage: welt [--grund] <filename>",
                className: "error",
            }
        }

        const compileMode = args[0] === "--grund"
        const fileArgs = compileMode ? args.slice(1) : args
        const filename = fileArgs.join(" ")

        if (!filename) {
            return {
                output: "Usage: welt --grund <filename>",
                className: "error",
            }
        }

        const result = getFileContent(ctx.fs, filename)

        if (result.error) {
            return { output: result.error, className: "error" }
        }

        if (!result.content) {
            return { output: `Empty file: ${filename}`, className: "error" }
        }

        if (compileMode) {
            return compileWeltCommand(result.content, filename, ctx)
        }

        if (filename.endsWith(".grund")) {
            return runGrundCommand(result.content, ctx)
        }

        const memoryNode = getNodeAtPath(ctx.fs, "3:\\DAS\\memory.welt")
        const memoryContent = memoryNode?.content ?? ""
        let initialMemory
        try {
            initialMemory = await getInitialMemory(memoryContent)
        } catch {
            initialMemory = undefined
        }

        return runWeltCommand(result.content, ctx, initialMemory)
    },

    grund: async (args, ctx): Promise<CommandResult> => {
        if (args.length === 0) {
            return { output: "Usage: grund <filename>", className: "error" }
        }

        const filename = args.join(" ")
        const result = getFileContent(ctx.fs, filename)

        if (result.error) {
            return { output: result.error, className: "error" }
        }

        if (!result.content) {
            return { output: `Empty file: ${filename}`, className: "error" }
        }

        return runGrundCommand(result.content, ctx)
    },

    clear: (): CommandResult => ({ action: "clear" }),

    cls: (): CommandResult => ({ action: "clear" }),

    whoami: (): CommandResult => ({
        output: `DANA\\Guest

User: Guest
Home: 3:\\Users\\Dana
Terminal: HACKTERM v1.0`,
    }),

    exit: (): CommandResult => ({ action: "exit" }),

    sl: (): CommandResult => ({ action: "sl" }),
}

async function runWeltCommand(
    source: string,
    ctx: CommandContext,
    initialMemory?: WeltValue[]
): Promise<CommandResult> {
    try {
        await runWeltProgram(
            source,
            {
                onOutput: (text) => ctx.print(text),
                onInput: () => ctx.requestInput(),
            },
            initialMemory
        )
        if (typeof document !== "undefined") {
            document.dispatchEvent(new CustomEvent("welt:completed"))
        }
        return { output: "" }
    } catch (err) {
        if (err instanceof WeltError) {
            const lineInfo = err.line > 0 ? ` (line ${err.line})` : ""
            const msg = err.message
            if (typeof document !== "undefined") {
                if (msg.includes("OVERHEAT")) {
                    document.dispatchEvent(
                        new CustomEvent("welt:error", {
                            detail: { type: "thermal" },
                        })
                    )
                } else if (msg.includes("DIVISION BY ZERO")) {
                    document.dispatchEvent(
                        new CustomEvent("welt:error", {
                            detail: { type: "divide-by-zero" },
                        })
                    )
                }
            }
            return {
                output: `WELT ERROR${lineInfo}: ${msg}`,
                className: "error",
            }
        }
        return {
            output: `SYSTEM FAULT: ${err instanceof Error ? err.message : "Unknown error"}`,
            className: "error",
        }
    }
}

function compileWeltCommand(
    source: string,
    filename: string,
    ctx: CommandContext
): CommandResult {
    try {
        const output = compileWeltProgram(source, filename)
        ctx.print(output)
        if (typeof document !== "undefined") {
            document.dispatchEvent(new CustomEvent("grund:compiled"))
        }
        return { output: "" }
    } catch (err) {
        if (err instanceof WeltError) {
            const lineInfo = err.line > 0 ? ` (line ${err.line})` : ""
            return {
                output: `WELT COMPILE ERROR${lineInfo}: ${err.message}`,
                className: "error",
            }
        }
        return {
            output: `SYSTEM FAULT: ${err instanceof Error ? err.message : "Unknown error"}`,
            className: "error",
        }
    }
}

async function runGrundCommand(
    source: string,
    ctx: CommandContext,
    initialMemory?: WeltValue[]
): Promise<CommandResult> {
    try {
        await runGrundProgram(
            source,
            {
                onOutput: (text) => ctx.print(text),
                onInput: () => ctx.requestInput(),
            },
            initialMemory
        )
        if (typeof document !== "undefined") {
            document.dispatchEvent(new CustomEvent("grund:executed"))
        }
        return { output: "" }
    } catch (err) {
        if (err instanceof WeltError) {
            const lineInfo = err.line > 0 ? ` (line ${err.line})` : ""
            const msg = err.message
            if (typeof document !== "undefined") {
                if (msg.includes("OVERHEAT")) {
                    document.dispatchEvent(
                        new CustomEvent("welt:error", {
                            detail: { type: "thermal" },
                        })
                    )
                } else if (msg.includes("DIVISION BY ZERO")) {
                    document.dispatchEvent(
                        new CustomEvent("welt:error", {
                            detail: { type: "divide-by-zero" },
                        })
                    )
                }
            }
            return {
                output: `GRUND ERROR${lineInfo}: ${msg}`,
                className: "error",
            }
        }
        return {
            output: `SYSTEM FAULT: ${err instanceof Error ? err.message : "Unknown error"}`,
            className: "error",
        }
    }
}

type HandlerFn = (ctx: CommandContext) => Promise<CommandResult>

const HANDLERS: Record<string, HandlerFn> = {
    welttest: handleWelttest,
    reset: handleReset,
}

async function handleWelttest(ctx: CommandContext): Promise<CommandResult> {
    ctx.print("WELT Test Runner v1.0")
    ctx.print("=====================")
    ctx.print("")

    const currentNode = getCurrentNode(ctx.fs)
    if (!currentNode?.children) {
        return { output: "No files in current directory.", className: "error" }
    }

    const exerciseSources: Record<string, string> = {}
    const welttestSources: Record<string, string> = {}

    for (const [name, node] of Object.entries(currentNode.children)) {
        if (
            (name.endsWith(".welt") || name.endsWith(".grund")) &&
            node.content !== undefined
        ) {
            exerciseSources[name] = node.content
        }
        if (
            (name.endsWith(".welttest") || name.endsWith(".grundtest")) &&
            node.content !== undefined
        ) {
            welttestSources[name] = node.content
        }
    }

    const memoryNode = getNodeAtPath(ctx.fs, "3:\\DAS\\memory.welt")
    const memoryContent = memoryNode?.content ?? ""

    const result = await runAllTests(
        exerciseSources,
        welttestSources,
        memoryContent
    )

    if (result.tampered.length > 0) {
        ctx.print("INTEGRITY CHECK FAILED", "error")
        ctx.print("")
        for (const file of result.tampered) {
            ctx.print(`  TAMPERED: ${file}`, "error")
        }
        ctx.print("")
        ctx.print("Test files must not be modified.", "error")
        ctx.print("Run reset.exe to restore originals.")
        return { output: "" }
    }

    for (const r of result.results) {
        if (r.passed) {
            ctx.print(`  PASS  ${r.name}`, "success")
        } else {
            ctx.print(`  FAIL  ${r.name}: ${r.error ?? "unknown"}`, "error")
        }
    }

    ctx.print("")

    const passedCount = result.results.filter((r) => r.passed).length

    if (typeof document !== "undefined") {
        document.dispatchEvent(
            new CustomEvent("welt:exercises-tested", {
                detail: { passed: passedCount, total: result.results.length },
            })
        )

        for (const r of result.results) {
            if (r.passed) {
                const num = parseInt(r.name.replace("exercise", ""), 10)
                if (!isNaN(num)) {
                    document.dispatchEvent(
                        new CustomEvent("welt:exercise-passed", {
                            detail: { exercise: num },
                        })
                    )
                }
            }
        }
    }

    if (result.allPassed) {
        ctx.print("=====================", "success")
        ctx.print("  ALL TESTS PASSED", "success")
        ctx.print("=====================", "success")
        ctx.print("")
        ctx.print("Die Welt als Wille und Vorstellung.", "success")
        ctx.print("You have mastered the WELT language.", "success")
        if (typeof document !== "undefined") {
            document.dispatchEvent(new CustomEvent("welt:all-exercises-passed"))
        }
    } else {
        ctx.print(`${passedCount}/${result.results.length} exercises passed.`)
    }

    return { output: "" }
}

function handleReset(ctx: CommandContext): Promise<CommandResult> {
    ctx.print("Resetting exercises...")
    ctx.print("")

    const currentNode = getCurrentNode(ctx.fs)
    if (!currentNode?.children) {
        return Promise.resolve({
            output: "No files in current directory.",
            className: "error",
        })
    }

    for (const exercise of EXERCISES) {
        const srcExt = exercise.grund ? ".grund" : ".welt"
        const testExt = exercise.grund ? ".grundtest" : ".welttest"
        const srcName = `${exercise.name}${srcExt}`
        const testName = `${exercise.name}${testExt}`

        if (currentNode.children[srcName]) {
            currentNode.children[srcName].content = exercise.stub
            if (exercise.locked) {
                currentNode.children[srcName].readonly = true
            }
            ctx.print(`  Restored ${srcName}`)
        }

        if (currentNode.children[testName]) {
            currentNode.children[testName].content = exercise.test
            ctx.print(`  Restored ${testName}`)
        }
    }

    const memoryNode = getNodeAtPath(ctx.fs, "3:\\DAS\\memory.welt")
    if (memoryNode) {
        memoryNode.content = SYS_MEMORY
        ctx.print("  Restored memory.welt")
    }

    ctx.print("")
    ctx.print("All exercises and system files restored.", "success")
    return Promise.resolve({ output: "" })
}

function getTypeLabel(type: FileType): string {
    switch (type) {
        case "directory":
            return "<DIR> "
        case "executable":
            return "<EXE> "
        case "shortcut":
            return "<LNK> "
        default:
            return "      "
    }
}

function tryExecuteFile(
    filename: string,
    ctx: CommandContext
): CommandResult | Promise<CommandResult> | null {
    const resolved = resolvePath(ctx.fs, filename)
    if (resolved) {
        const node = getNode(ctx.fs, resolved)
        if (node?.handler) {
            const handler = HANDLERS[node.handler]
            if (handler) {
                return handler(ctx)
            }
        }
    }

    const windowId = getExecutableWindowId(ctx.fs, filename)
    if (windowId) {
        ctx.openWindow(windowId)
        return {
            output: `[Launching ${filename}...]`,
            className: "success",
        }
    }
    return null
}

export function executeCommand(
    input: string,
    ctx: CommandContext
): CommandResult | Promise<CommandResult> {
    const trimmed = input.trim()
    if (!trimmed) {
        return { output: "" }
    }

    const parts = trimmed.split(/\s+/)
    const cmd = parts[0].toLowerCase()
    const args = parts.slice(1)

    if (COMMANDS[cmd]) {
        return COMMANDS[cmd](args, ctx)
    }

    const execResult = tryExecuteFile(trimmed, ctx)
    if (execResult) {
        return execResult
    }

    const cleanCmd = cmd.replace(/^\.\//, "")
    const execResult2 = tryExecuteFile(cleanCmd, ctx)
    if (execResult2) {
        return execResult2
    }

    return {
        output: `'${parts[0]}' is not recognized as an internal or external command,
operable program or batch file.`,
        className: "error",
    }
}

export function getSLFrames(): string[] {
    return SL_FRAMES
}

export function getPrompt(fs: FileSystem): string {
    return `${formatPath(fs.cwd)}> `
}

export function getCompletions(partial: string, fs: FileSystem): string[] {
    const parts = partial.split(/\s+/)

    if (parts.length <= 1) {
        const prefix = parts[0].toLowerCase()
        const cmdMatches = Object.keys(COMMANDS).filter((c) =>
            c.startsWith(prefix)
        )
        const fileMatches = getFileCompletions(prefix, fs)
        return [...cmdMatches, ...fileMatches]
    }

    const argPrefix = parts[parts.length - 1]
    return getFileCompletions(argPrefix, fs)
}

function getFileCompletions(prefix: string, fs: FileSystem): string[] {
    const current = getCurrentNode(fs)
    if (!current || !current.children) return []

    const lower = prefix.toLowerCase()
    return Object.values(current.children)
        .filter((child) => child.name.toLowerCase().startsWith(lower))
        .map((child) =>
            child.type === "directory" ? child.name + "\\" : child.name
        )
}
