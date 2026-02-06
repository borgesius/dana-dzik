import {
    createFile,
    type FileSystem,
    formatPath,
    getNode,
    resolvePath,
    writeFile,
} from "./filesystem"

export interface EditorCallbacks {
    print: (text: string, className?: string) => void
    updatePrompt: (prompt: string) => void
    onExit: () => void
}

export class Editor {
    private lines: string[] = []
    private filename: string
    private filePath: string[]
    private fs: FileSystem
    private callbacks: EditorCallbacks
    private dirty = false
    private isNewFile = false

    constructor(fs: FileSystem, filename: string, callbacks: EditorCallbacks) {
        this.fs = fs
        this.filename = filename
        this.callbacks = callbacks

        const resolved = resolvePath(fs, filename)
        if (!resolved) {
            this.filePath = [...fs.cwd, filename]
        } else {
            this.filePath = resolved
        }

        const node = resolved ? getNode(fs, resolved) : null

        if (node && node.type !== "directory") {
            this.lines = (node.content ?? "").split("\n")
            this.isNewFile = false
        } else if (node && node.type === "directory") {
            callbacks.print(`Cannot edit a directory: ${filename}`, "error")
            callbacks.onExit()
            return
        } else {
            this.lines = [""]
            this.isNewFile = true
        }

        this.printHeader()
        this.printLines()
        callbacks.updatePrompt("EDIT> ")
    }

    public handleInput(input: string): void {
        const trimmed = input.trim()

        if (trimmed === ":q") {
            if (this.dirty) {
                this.callbacks.print(
                    "Unsaved changes. Use :wq to save and quit, or :q! to discard.",
                    "error"
                )
                return
            }
            this.exit()
            return
        }

        if (trimmed === ":q!") {
            this.exit()
            return
        }

        if (trimmed === ":w") {
            this.save()
            return
        }

        if (trimmed === ":wq") {
            this.save()
            this.exit()
            return
        }

        if (trimmed === ":p") {
            this.printLines()
            return
        }

        if (trimmed.startsWith(":d ")) {
            const lineNum = parseInt(trimmed.slice(3), 10)
            this.deleteLine(lineNum)
            return
        }

        if (trimmed.startsWith(":i ")) {
            const rest = trimmed.slice(3)
            const spaceIdx = rest.indexOf(" ")
            if (spaceIdx === -1) {
                this.callbacks.print("Usage: :i N text", "error")
                return
            }
            const lineNum = parseInt(rest.slice(0, spaceIdx), 10)
            const text = rest.slice(spaceIdx + 1)
            this.insertLine(lineNum, text)
            return
        }

        if (trimmed.startsWith(":r ")) {
            const rest = trimmed.slice(3)
            const spaceIdx = rest.indexOf(" ")
            if (spaceIdx === -1) {
                this.callbacks.print("Usage: :r N text", "error")
                return
            }
            const lineNum = parseInt(rest.slice(0, spaceIdx), 10)
            const text = rest.slice(spaceIdx + 1)
            this.replaceLine(lineNum, text)
            return
        }

        if (trimmed === ":a") {
            this.callbacks.print("Usage: :a text", "error")
            return
        }

        if (trimmed.startsWith(":a ")) {
            const text = trimmed.slice(3)
            this.appendLine(text)
            return
        }

        if (trimmed === ":h" || trimmed === ":help") {
            this.printHelp()
            return
        }

        if (trimmed.startsWith(":")) {
            this.callbacks.print(`Unknown command: ${trimmed}`, "error")
            return
        }

        this.appendLine(input)
    }

    private printHeader(): void {
        const status = this.isNewFile
            ? "(new file)"
            : `(${this.lines.length} lines)`
        this.callbacks.print(`EDIT v1.0 - ${this.filename} ${status}`, "info")
        this.callbacks.print("Type :h for help", "dim")
        this.callbacks.print("")
    }

    private printHelp(): void {
        this.callbacks.print(
            `Commands:
  :p          Print all lines
  :a text     Append line at end
  :i N text   Insert text before line N
  :r N text   Replace line N with text
  :d N        Delete line N
  :w          Save
  :q          Quit (warns if unsaved)
  :q!         Quit without saving
  :wq         Save and quit
  :h          Show this help

  Typing text without a : prefix appends it as a new line.`
        )
    }

    private printLines(): void {
        if (
            this.lines.length === 0 ||
            (this.lines.length === 1 && this.lines[0] === "")
        ) {
            this.callbacks.print("  (empty file)", "dim")
            return
        }
        for (let i = 0; i < this.lines.length; i++) {
            const num = String(i + 1).padStart(3, " ")
            this.callbacks.print(`${num}| ${this.lines[i]}`)
        }
    }

    private appendLine(text: string): void {
        if (this.lines.length === 1 && this.lines[0] === "" && !this.dirty) {
            this.lines[0] = text
        } else {
            this.lines.push(text)
        }
        this.dirty = true
        const num = String(this.lines.length).padStart(3, " ")
        this.callbacks.print(`${num}| ${text}`, "dim")
    }

    private insertLine(lineNum: number, text: string): void {
        if (lineNum < 1 || lineNum > this.lines.length + 1) {
            this.callbacks.print(
                `Line ${lineNum} out of range (1-${this.lines.length + 1})`,
                "error"
            )
            return
        }
        this.lines.splice(lineNum - 1, 0, text)
        this.dirty = true
        this.callbacks.print(`Inserted at line ${lineNum}`, "dim")
    }

    private replaceLine(lineNum: number, text: string): void {
        if (lineNum < 1 || lineNum > this.lines.length) {
            this.callbacks.print(
                `Line ${lineNum} out of range (1-${this.lines.length})`,
                "error"
            )
            return
        }
        this.lines[lineNum - 1] = text
        this.dirty = true
        this.callbacks.print(`Replaced line ${lineNum}`, "dim")
    }

    private deleteLine(lineNum: number): void {
        if (lineNum < 1 || lineNum > this.lines.length) {
            this.callbacks.print(
                `Line ${lineNum} out of range (1-${this.lines.length})`,
                "error"
            )
            return
        }
        this.lines.splice(lineNum - 1, 1)
        if (this.lines.length === 0) {
            this.lines = [""]
        }
        this.dirty = true
        this.callbacks.print(`Deleted line ${lineNum}`, "dim")
    }

    private save(): void {
        const content = this.lines.join("\n")
        const dirPath = this.filePath.slice(0, -1)
        const dirPathStr = formatPath(dirPath)
        const fileName = this.filePath[this.filePath.length - 1]

        if (this.isNewFile) {
            const result = createFile(this.fs, dirPathStr, fileName, content)
            if (!result.success) {
                this.callbacks.print(`Save failed: ${result.error}`, "error")
                return
            }
            this.isNewFile = false
        } else {
            const pathStr = formatPath(this.filePath)
            const result = writeFile(this.fs, pathStr, content)
            if (!result.success) {
                this.callbacks.print(`Save failed: ${result.error}`, "error")
                return
            }
        }

        this.dirty = false
        this.callbacks.print(
            `Saved ${this.filename} (${this.lines.length} lines)`,
            "success"
        )
    }

    private exit(): void {
        this.callbacks.print("")
        this.callbacks.onExit()
    }
}
