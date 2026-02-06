import { runWeltProgram, WeltError } from "../welt"
import {
    buildTree,
    changeDirectory,
    type FileSystem,
    type FileType,
    formatPath,
    getExecutableWindowId,
    getFileContent,
    listDirectory,
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
    welt <file>   Run a .welt program

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
            return { output: "Usage: cat <filename>", className: "error" }
        }

        const filename = args.join(" ")
        const result = getFileContent(ctx.fs, filename)

        if (result.error) {
            return { output: result.error, className: "error" }
        }

        if (result.content) {
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
        ctx.startEditor(filename)
        return { output: "" }
    },

    welt: (args, ctx): CommandResult | Promise<CommandResult> => {
        if (args.length === 0) {
            return { output: "Usage: welt <filename>", className: "error" }
        }

        const filename = args.join(" ")
        const result = getFileContent(ctx.fs, filename)

        if (result.error) {
            return { output: result.error, className: "error" }
        }

        if (!result.content) {
            return { output: `Empty file: ${filename}`, className: "error" }
        }

        return runWeltCommand(result.content, ctx)
    },

    clear: (): CommandResult => ({ action: "clear" }),

    cls: (): CommandResult => ({ action: "clear" }),

    whoami: (): CommandResult => ({
        output: `DANA\\Guest

User: Guest
Home: C:\\Users\\Dana
Terminal: HACKTERM v1.0`,
    }),

    exit: (): CommandResult => ({ action: "exit" }),

    sl: (): CommandResult => ({ action: "sl" }),
}

async function runWeltCommand(
    source: string,
    ctx: CommandContext
): Promise<CommandResult> {
    try {
        await runWeltProgram(source, {
            onOutput: (text) => ctx.print(text),
            onInput: () => ctx.requestInput(),
        })
        return { output: "" }
    } catch (err) {
        if (err instanceof WeltError) {
            const lineInfo = err.line > 0 ? ` (line ${err.line})` : ""
            return {
                output: `WELT ERROR${lineInfo}: ${err.message}`,
                className: "error",
            }
        }
        return {
            output: `SYSTEM FAULT: ${err instanceof Error ? err.message : "Unknown error"}`,
            className: "error",
        }
    }
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
): CommandResult | null {
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
