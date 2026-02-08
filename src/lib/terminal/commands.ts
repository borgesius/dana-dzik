import type { RoutableWindow } from "../../config/routing"
import { emitAppEvent } from "../events"
import { getLocaleManager } from "../localeManager"
import { EXERCISES } from "../welt/exercises"
import {
    compileWeltProgram,
    getInitialMemory,
    runGrundProgram,
    runWeltProgram,
    WeltError,
} from "../welt/runner"
import { runAllTests } from "../welt/testRunner"
import type { WeltValue } from "../welt/types"
import { SYS_MEMORY } from "./content/systemFiles"
import {
    buildTree,
    changeDirectory,
    createDirectory,
    createFile,
    deleteFile,
    type FileSystem,
    type FileType,
    formatPath,
    getCurrentNode,
    getExecutableWindowId,
    getFileContent,
    getNode,
    getNodeAtPath,
    listDirectory,
    renameFile,
    resolvePath,
} from "./filesystem"

export interface CommandContext {
    fs: FileSystem
    openWindow: (windowId: RoutableWindow) => void
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
    help: (): CommandResult => {
        const lm = getLocaleManager()
        return {
            output: `${lm.t("terminalCommands.availableCommands")}

  ${lm.t("terminalCommands.navigation")}
    cd <path>     Change directory
    ls, dir       List directory contents
    pwd           Print working directory
    tree          Show directory tree

  ${lm.t("terminalCommands.files")}
    cat <file>    Display file contents
    type <file>   Display file contents
    open <file>   Open file/program
    edit <file>   Edit file (line editor)
    touch <name>  Create empty file
    mkdir <name>  Create directory
    rm <file>     Delete file or empty directory
    mv <f> <new>  Rename file or directory

  ${lm.t("terminalCommands.programs")}
    welt <file>        Run a .welt or .grund program
    welt --grund <f>   Compile .welt to GRUND assembly
    grund <file>       Run a .grund program

  ${lm.t("terminalCommands.utilities")}
    help          Show this message
    clear, cls    Clear terminal
    whoami        Display user info
    exit          Close terminal

  ${lm.t("terminalCommands.tip")} Type an .exe filename to run it directly`,
        }
    },

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

        const lines = [
            "",
            getLocaleManager().t("terminalCommands.directoryOf", {
                path: formatPath(ctx.fs.cwd),
            }),
            "",
        ]

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
        const lm = getLocaleManager()
        if (args.length === 0) {
            return {
                output: lm.t("terminalCommands.usageCat"),
                className: "error",
            }
        }

        const showLineNumbers = args[0] === "-n"
        const fileArgs = showLineNumbers ? args.slice(1) : args

        if (fileArgs.length === 0) {
            return {
                output: lm.t("terminalCommands.usageCat"),
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
                output: lm.t("terminalCommands.binaryFile", { filename }),
                className: "info",
            }
        }

        return { output: lm.t("terminalCommands.emptyFile") }
    },

    type: (args, ctx) => COMMANDS.cat(args, ctx),

    open: (args, ctx): CommandResult => {
        const lm = getLocaleManager()
        if (args.length === 0) {
            return {
                output: lm.t("terminalCommands.usageOpen"),
                className: "error",
            }
        }

        const filename = args.join(" ")
        const windowId = getExecutableWindowId(
            ctx.fs,
            filename
        ) as RoutableWindow | null

        if (!windowId) {
            return {
                output: lm.t("terminalCommands.cannotOpen", { filename }),
                className: "error",
            }
        }

        ctx.openWindow(windowId)
        return {
            output: lm.t("terminalCommands.opening", { filename }),
            className: "success",
        }
    },

    edit: (args, ctx): CommandResult => {
        const lm = getLocaleManager()
        if (args.length === 0) {
            return {
                output: lm.t("terminalCommands.usageEdit"),
                className: "error",
            }
        }

        const filename = args.join(" ")

        const resolved = resolvePath(ctx.fs, filename)
        if (resolved) {
            const node = getNode(ctx.fs, resolved)
            if (node?.readonly) {
                return {
                    output: lm.t("terminalCommands.accessDenied", { filename }),
                    className: "error",
                }
            }
        }

        ctx.startEditor(filename)
        return { output: "" }
    },

    welt: async (args, ctx): Promise<CommandResult> => {
        const lm = getLocaleManager()
        if (args.length === 0) {
            return {
                output: lm.t("terminalCommands.usageWelt"),
                className: "error",
            }
        }

        const compileMode = args[0] === "--grund"
        const fileArgs = compileMode ? args.slice(1) : args
        const filename = fileArgs.join(" ")

        if (!filename) {
            return {
                output: lm.t("terminalCommands.usageWeltGrund"),
                className: "error",
            }
        }

        const result = getFileContent(ctx.fs, filename)

        if (result.error) {
            return { output: result.error, className: "error" }
        }

        if (!result.content) {
            return {
                output: lm.t("terminalCommands.emptyFileEdit", { filename }),
                className: "error",
            }
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
        const lm = getLocaleManager()
        if (args.length === 0) {
            return {
                output: lm.t("terminalCommands.usageGrund"),
                className: "error",
            }
        }

        const filename = args.join(" ")
        const result = getFileContent(ctx.fs, filename)

        if (result.error) {
            return { output: result.error, className: "error" }
        }

        if (!result.content) {
            return {
                output: lm.t("terminalCommands.emptyFileEdit", { filename }),
                className: "error",
            }
        }

        return runGrundCommand(result.content, ctx)
    },

    clear: (): CommandResult => ({ action: "clear" }),

    cls: (): CommandResult => ({ action: "clear" }),

    whoami: (): CommandResult => ({
        output: getLocaleManager().t("terminalCommands.whoamiOutput"),
    }),

    exit: (): CommandResult => ({ action: "exit" }),

    touch: (args, ctx): CommandResult => {
        const lm = getLocaleManager()
        if (args.length === 0) {
            return {
                output: lm.t("terminalCommands.usageTouch"),
                className: "error",
            }
        }

        const filename = args.join(" ")
        const dirPath = formatPath(ctx.fs.cwd)
        const result = createFile(ctx.fs, dirPath, filename, "")
        if (!result.success) {
            return { output: result.error, className: "error" }
        }

        return {
            output: lm.t("terminalCommands.created", { name: filename }),
            className: "success",
        }
    },

    mkdir: (args, ctx): CommandResult => {
        const lm = getLocaleManager()
        if (args.length === 0) {
            return {
                output: lm.t("terminalCommands.usageMkdir"),
                className: "error",
            }
        }

        const dirname = args.join(" ")
        const dirPath = formatPath(ctx.fs.cwd)
        const result = createDirectory(ctx.fs, dirPath, dirname)
        if (!result.success) {
            return { output: result.error, className: "error" }
        }

        return {
            output: lm.t("terminalCommands.created", { name: dirname }),
            className: "success",
        }
    },

    rm: (args, ctx): CommandResult => {
        const lm = getLocaleManager()
        if (args.length === 0) {
            return {
                output: lm.t("terminalCommands.usageRm"),
                className: "error",
            }
        }

        const filename = args.join(" ")
        const resolved = resolvePath(ctx.fs, filename)
        if (resolved) {
            const node = getNode(ctx.fs, resolved)
            if (node?.readonly) {
                return {
                    output: lm.t("terminalCommands.accessDenied", { filename }),
                    className: "error",
                }
            }
        }

        const result = deleteFile(ctx.fs, filename)
        if (!result.success) {
            return { output: result.error, className: "error" }
        }

        return {
            output: lm.t("terminalCommands.deleted", { name: filename }),
            className: "success",
        }
    },

    del: (args, ctx) => COMMANDS.rm(args, ctx),

    mv: (args, ctx): CommandResult => {
        const lm = getLocaleManager()
        if (args.length < 2) {
            return {
                output: lm.t("terminalCommands.usageMv"),
                className: "error",
            }
        }

        const source = args.slice(0, -1).join(" ")
        const newName = args[args.length - 1]

        const resolved = resolvePath(ctx.fs, source)
        if (resolved) {
            const node = getNode(ctx.fs, resolved)
            if (node?.readonly) {
                return {
                    output: lm.t("terminalCommands.accessDenied", {
                        filename: source,
                    }),
                    className: "error",
                }
            }
        }

        const result = renameFile(ctx.fs, source, newName)
        if (!result.success) {
            return { output: result.error, className: "error" }
        }

        return {
            output: lm.t("terminalCommands.renamed", {
                from: source,
                to: newName,
            }),
            className: "success",
        }
    },

    ren: (args, ctx) => COMMANDS.mv(args, ctx),
    rename: (args, ctx) => COMMANDS.mv(args, ctx),

    sl: (): CommandResult => ({ action: "sl" }),
}

async function runWeltCommand(
    source: string,
    ctx: CommandContext,
    initialMemory?: WeltValue[]
): Promise<CommandResult> {
    const lm = getLocaleManager()
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
            emitAppEvent("welt:completed")
        }
        return { output: "" }
    } catch (err) {
        if (err instanceof WeltError) {
            const lineInfo = err.line > 0 ? ` (line ${err.line})` : ""
            const msg = err.message
            if (typeof document !== "undefined") {
                if (msg.includes("OVERHEAT")) {
                    emitAppEvent("welt:error", { type: "thermal" })
                } else if (msg.includes("DIVISION BY ZERO")) {
                    emitAppEvent("welt:error", { type: "divide-by-zero" })
                }
            }
            return {
                output: lm.t("terminalCommands.weltError", {
                    lineInfo,
                    message: msg,
                }),
                className: "error",
            }
        }
        return {
            output: lm.t("terminalCommands.systemFault", {
                message: err instanceof Error ? err.message : "Unknown error",
            }),
            className: "error",
        }
    }
}

function compileWeltCommand(
    source: string,
    filename: string,
    ctx: CommandContext
): CommandResult {
    const lm = getLocaleManager()
    try {
        const output = compileWeltProgram(source, filename)
        ctx.print(output)
        if (typeof document !== "undefined") {
            emitAppEvent("grund:compiled")
        }
        return { output: "" }
    } catch (err) {
        if (err instanceof WeltError) {
            const lineInfo = err.line > 0 ? ` (line ${err.line})` : ""
            return {
                output: lm.t("terminalCommands.weltCompileError", {
                    lineInfo,
                    message: err.message,
                }),
                className: "error",
            }
        }
        return {
            output: lm.t("terminalCommands.systemFault", {
                message: err instanceof Error ? err.message : "Unknown error",
            }),
            className: "error",
        }
    }
}

async function runGrundCommand(
    source: string,
    ctx: CommandContext,
    initialMemory?: WeltValue[]
): Promise<CommandResult> {
    const lm = getLocaleManager()
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
            emitAppEvent("grund:executed")
        }
        return { output: "" }
    } catch (err) {
        if (err instanceof WeltError) {
            const lineInfo = err.line > 0 ? ` (line ${err.line})` : ""
            const msg = err.message
            if (typeof document !== "undefined") {
                if (msg.includes("OVERHEAT")) {
                    emitAppEvent("welt:error", { type: "thermal" })
                } else if (msg.includes("DIVISION BY ZERO")) {
                    emitAppEvent("welt:error", { type: "divide-by-zero" })
                }
            }
            return {
                output: lm.t("terminalCommands.grundError", {
                    lineInfo,
                    message: msg,
                }),
                className: "error",
            }
        }
        return {
            output: lm.t("terminalCommands.systemFault", {
                message: err instanceof Error ? err.message : "Unknown error",
            }),
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
    const lm = getLocaleManager()
    ctx.print(lm.t("terminalCommands.testRunnerTitle"))
    ctx.print(lm.t("terminalCommands.testRunnerSeparator"))
    ctx.print("")

    const currentNode = getCurrentNode(ctx.fs)
    if (!currentNode?.children) {
        return { output: lm.t("terminalCommands.noFiles"), className: "error" }
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
        ctx.print(lm.t("terminalCommands.integrityFailed"), "error")
        ctx.print("")
        for (const file of result.tampered) {
            ctx.print(lm.t("terminalCommands.tampered", { file }), "error")
        }
        ctx.print("")
        ctx.print(lm.t("terminalCommands.testFilesModified"), "error")
        ctx.print(lm.t("terminalCommands.runReset"))
        return { output: "" }
    }

    for (const r of result.results) {
        if (r.passed) {
            ctx.print(
                lm.t("terminalCommands.pass", { name: r.name }),
                "success"
            )
        } else {
            ctx.print(
                lm.t("terminalCommands.fail", {
                    name: r.name,
                    error: r.error ?? "unknown",
                }),
                "error"
            )
        }
    }

    ctx.print("")

    const passedCount = result.results.filter((r) => r.passed).length

    if (typeof document !== "undefined") {
        emitAppEvent("welt:exercises-tested", {
            passed: passedCount,
            total: result.results.length,
        })

        for (const r of result.results) {
            if (r.passed) {
                const num = parseInt(r.name.replace("exercise", ""), 10)
                if (!isNaN(num)) {
                    emitAppEvent("welt:exercise-passed", { exercise: num })
                }
            }
        }
    }

    if (result.allPassed) {
        ctx.print(lm.t("terminalCommands.testRunnerSeparator"), "success")
        ctx.print(lm.t("terminalCommands.allTestsPassed"), "success")
        ctx.print(lm.t("terminalCommands.testRunnerSeparator"), "success")
        ctx.print("")
        ctx.print(lm.t("terminalCommands.dieWelt"), "success")
        ctx.print(lm.t("terminalCommands.mastered"), "success")
        if (typeof document !== "undefined") {
            emitAppEvent("welt:all-exercises-passed")
        }
    } else {
        ctx.print(
            lm.t("terminalCommands.exercisesPassed", {
                passed: passedCount,
                total: result.results.length,
            })
        )
    }

    return { output: "" }
}

function handleReset(ctx: CommandContext): Promise<CommandResult> {
    const lm = getLocaleManager()
    ctx.print(lm.t("terminalCommands.resetting"))
    ctx.print("")

    const currentNode = getCurrentNode(ctx.fs)
    if (!currentNode?.children) {
        return Promise.resolve({
            output: lm.t("terminalCommands.noFiles"),
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
            ctx.print(lm.t("terminalCommands.restored", { file: srcName }))
        }

        if (currentNode.children[testName]) {
            currentNode.children[testName].content = exercise.test
            ctx.print(lm.t("terminalCommands.restored", { file: testName }))
        }
    }

    const memoryNode = getNodeAtPath(ctx.fs, "3:\\DAS\\memory.welt")
    if (memoryNode) {
        memoryNode.content = SYS_MEMORY
        ctx.print(lm.t("terminalCommands.restored", { file: "memory.welt" }))
    }

    ctx.print("")
    ctx.print(lm.t("terminalCommands.allRestored"), "success")
    return Promise.resolve({ output: "" })
}

function getTypeLabel(type: FileType): string {
    const lm = getLocaleManager()
    switch (type) {
        case "directory":
            return lm.t("terminalCommands.dir")
        case "executable":
            return lm.t("terminalCommands.exe")
        case "shortcut":
            return lm.t("terminalCommands.lnk")
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

    const windowId = getExecutableWindowId(
        ctx.fs,
        filename
    ) as RoutableWindow | null
    if (windowId) {
        ctx.openWindow(windowId)
        return {
            output: getLocaleManager().t("terminalCommands.launching", {
                filename,
            }),
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
        output: getLocaleManager().t("terminalCommands.notRecognized", {
            command: parts[0],
        }),
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
