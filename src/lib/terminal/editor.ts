import {
    type Severity,
    validateSystemFile,
    type ValidationResult,
} from "../systemFileValidator"
import {
    EXERCISE_4_BREAK_AFTER,
    EXERCISE_5_SCHOPENHAUER_ESSAY,
    getFreakGPTSolution,
    glitchLine,
    isExerciseFile,
    LINE_DELAY_MS,
    NETWORK_ERROR_DELAY_MS,
    NETWORK_ERRORS,
    NETWORK_RETRY_DELAY_MS,
} from "../welt/freakgpt"
import {
    createFile,
    type FileSystem,
    formatPath,
    getNode,
    resolvePath,
    writeFile,
} from "./filesystem"

const BROKEN_WARNINGS: Record<string, string> = {
    "kernel-modified": "KERNEL INTEGRITY CHECK FAILED",
    "boot-modified": "BOOT SEQUENCE MODIFIED -- REBOOT REQUIRED",
    "resolution-width": "RESOLUTION WIDTH MISMATCH",
    "resolution-height": "RESOLUTION HEIGHT MISMATCH",
    "color-depth": "COLOR PALETTE DEPTH CHANGED",
    "refresh-rate": "CRT REFRESH RATE ALTERED",
    "palette-loop": "COLOR PALETTE INIT DESTROYED",
    "vsync-loop": "VSYNC LOOP DESTROYED",
    "pit-divisor": "PIT DIVISOR MISCALIBRATED",
    "tick-rate": "TICK RATE DESYNCHRONIZED",
    "calibration-loop": "CALIBRATION LOOP MISSING",
    "rtc-sync": "RTC SYNC MODULE MISSING",
    "bank-count": "MEMORY BANK COUNT ALTERED",
    "scan-loop": "HEAP SCAN LOOP DESTROYED",
    "page-table": "PAGE TABLE INIT MISSING",
    "heap-ready": "HEAP_READY FLAG NOT SET",
    "runtime-error": "EXECUTION FAILED -- FATAL",
    "wrong-output": "SELF-CHECK FAILED",
}

const SEVERITY_HEADERS: Record<Severity, string[]> = {
    none: [],
    minor: ["SYSTEM FILE CHECK: PASSED"],
    moderate: ["WARNING: SYSTEM FILE COMPROMISED"],
    critical: ["CRITICAL: SYSTEM FILE CORRUPTED", "FATAL EXCEPTION IMMINENT"],
}

export interface EditorCallbacks {
    container: HTMLElement
    onExit: () => void
    print: (text: string, className?: string) => void
}

const STATUS_MESSAGE_DURATION_MS = 2000

export class Editor {
    private filename: string
    private filePath: string[]
    private fs: FileSystem
    private callbacks: EditorCallbacks
    private isNewFile = false
    private originalContent = ""
    private confirmingQuit = false
    private freakGenerating = false
    private destroyed = false

    private containerEl!: HTMLElement
    private headerEl!: HTMLElement
    private gutterEl!: HTMLElement
    private textareaEl!: HTMLTextAreaElement
    private statusLeftEl!: HTMLElement
    private statusMsgEl!: HTMLElement
    private freakBtnEl: HTMLButtonElement | null = null
    private statusTimerId: ReturnType<typeof setTimeout> | null = null
    private keydownHandler: ((e: KeyboardEvent) => void) | null = null

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

        if (node && node.type === "directory") {
            callbacks.print(`Cannot edit a directory: ${filename}`, "error")
            callbacks.onExit()
            return
        }

        if (node && node.type !== "directory") {
            this.originalContent = node.content ?? ""
            this.isNewFile = false
        } else {
            this.originalContent = ""
            this.isNewFile = true
        }

        this.createUI()
        this.textareaEl.value = this.originalContent
        this.updateGutter()
        this.updateStatus()
        this.updateHeader()

        setTimeout(() => this.textareaEl.focus(), 0)
    }

    private createUI(): void {
        this.containerEl = document.createElement("div")
        this.containerEl.className = "editor-container"

        this.headerEl = document.createElement("div")
        this.headerEl.className = "editor-header"
        this.containerEl.appendChild(this.headerEl)

        const bodyEl = document.createElement("div")
        bodyEl.className = "editor-body"

        this.gutterEl = document.createElement("div")
        this.gutterEl.className = "editor-gutter"
        bodyEl.appendChild(this.gutterEl)

        this.textareaEl = document.createElement("textarea")
        this.textareaEl.className = "editor-textarea"
        this.textareaEl.spellcheck = false
        this.textareaEl.autocomplete = "off"
        this.textareaEl.setAttribute("autocorrect", "off")
        this.textareaEl.setAttribute("autocapitalize", "off")
        this.textareaEl.wrap = "off"
        bodyEl.appendChild(this.textareaEl)

        const btnGroup = document.createElement("div")
        btnGroup.className = "editor-btn-group"

        if (isExerciseFile(this.filename)) {
            this.freakBtnEl = document.createElement("button")
            this.freakBtnEl.className = "editor-freakgpt-btn"
            this.freakBtnEl.textContent = "\u{1F525} FreakGPT"
            this.freakBtnEl.title = "the gpt that gets a little freaky"
            this.freakBtnEl.addEventListener("click", () => {
                void this.runFreakGPT()
            })
            btnGroup.appendChild(this.freakBtnEl)
        }

        const felixBtn = document.createElement("button")
        felixBtn.className = "editor-felix-btn"
        felixBtn.textContent = "\u{1F431} FelixGPT"
        felixBtn.title = "meow"
        felixBtn.addEventListener("click", () => {
            this.runFelixGPT()
        })
        btnGroup.appendChild(felixBtn)

        bodyEl.appendChild(btnGroup)

        this.containerEl.appendChild(bodyEl)

        const statusEl = document.createElement("div")
        statusEl.className = "editor-status"

        this.statusLeftEl = document.createElement("span")
        this.statusLeftEl.className = "editor-status-left"
        statusEl.appendChild(this.statusLeftEl)

        this.statusMsgEl = document.createElement("span")
        this.statusMsgEl.className = "editor-status-msg"
        statusEl.appendChild(this.statusMsgEl)

        const statusRight = document.createElement("span")
        statusRight.className = "editor-status-right"
        statusRight.textContent = "^S Save  ^Q Quit"
        statusEl.appendChild(statusRight)

        this.containerEl.appendChild(statusEl)

        this.callbacks.container.appendChild(this.containerEl)

        this.setupEventListeners()
    }

    private setupEventListeners(): void {
        this.textareaEl.addEventListener("input", () => {
            this.confirmingQuit = false
            this.updateGutter()
            this.updateStatus()
            this.updateHeader()
        })

        this.textareaEl.addEventListener("scroll", () => {
            this.gutterEl.scrollTop = this.textareaEl.scrollTop
        })

        this.textareaEl.addEventListener("mouseup", () => {
            this.updateStatus()
        })

        this.textareaEl.addEventListener("keyup", (e: KeyboardEvent) => {
            if (
                e.key === "ArrowUp" ||
                e.key === "ArrowDown" ||
                e.key === "ArrowLeft" ||
                e.key === "ArrowRight" ||
                e.key === "Home" ||
                e.key === "End" ||
                e.key === "PageUp" ||
                e.key === "PageDown"
            ) {
                this.updateStatus()
            }
        })

        this.keydownHandler = (e: KeyboardEvent): void => {
            if (this.freakGenerating) {
                e.preventDefault()
                return
            }
            if (e.ctrlKey && e.key === "s") {
                e.preventDefault()
                this.save()
            } else if (e.ctrlKey && e.key === "q") {
                e.preventDefault()
                this.handleQuit()
            } else if (e.key === "Escape") {
                e.preventDefault()
                this.handleQuit()
            } else if (e.key === "Tab") {
                e.preventDefault()
                this.insertTab()
            }
        }

        this.textareaEl.addEventListener("keydown", this.keydownHandler)
    }

    private insertTab(): void {
        const start = this.textareaEl.selectionStart
        const end = this.textareaEl.selectionEnd
        const value = this.textareaEl.value

        this.textareaEl.value =
            value.substring(0, start) + "    " + value.substring(end)

        this.textareaEl.selectionStart = start + 4
        this.textareaEl.selectionEnd = start + 4

        this.updateGutter()
        this.updateStatus()
        this.updateHeader()
    }

    private handleQuit(): void {
        if (!this.isDirty()) {
            this.destroy()
            return
        }

        if (this.confirmingQuit) {
            this.destroy()
            return
        }

        this.confirmingQuit = true
        this.showStatusMessage(
            "Unsaved changes! ^Q again to discard, ^S to save",
            "warning"
        )
    }

    private isDirty(): boolean {
        return this.textareaEl.value !== this.originalContent
    }

    private updateHeader(): void {
        const dirtyMarker = this.isDirty() ? " [modified]" : ""
        this.headerEl.textContent = `EDIT - ${this.filename}${dirtyMarker}`
    }

    private updateGutter(): void {
        const lineCount = this.textareaEl.value.split("\n").length
        const lines: string[] = []
        for (let i = 1; i <= lineCount; i++) {
            lines.push(String(i))
        }
        this.gutterEl.textContent = lines.join("\n")
    }

    private updateStatus(): void {
        const value = this.textareaEl.value
        const pos = this.textareaEl.selectionStart
        const textBefore = value.substring(0, pos)
        const linesBefore = textBefore.split("\n")
        const line = linesBefore.length
        const col = linesBefore[linesBefore.length - 1].length + 1

        this.statusLeftEl.textContent = `Ln ${line}, Col ${col}`
    }

    private showStatusMessage(
        message: string,
        type: "info" | "warning" = "info"
    ): void {
        if (this.statusTimerId !== null) {
            clearTimeout(this.statusTimerId)
        }

        this.statusMsgEl.textContent = message
        this.statusMsgEl.className =
            type === "warning"
                ? "editor-status-msg warning"
                : "editor-status-msg info"

        this.statusTimerId = setTimeout(() => {
            this.statusMsgEl.textContent = ""
            this.statusMsgEl.className = "editor-status-msg"
            this.statusTimerId = null
        }, STATUS_MESSAGE_DURATION_MS)
    }

    private sleep(ms: number): Promise<void> {
        return new Promise((resolve) => setTimeout(resolve, ms))
    }

    private appendLine(line: string): void {
        const current = this.textareaEl.value
        this.textareaEl.value = current ? `${current}\n${line}` : line
        this.updateGutter()
        this.updateHeader()
        this.textareaEl.scrollTop = this.textareaEl.scrollHeight
    }

    private async runFreakGPT(): Promise<void> {
        if (this.freakGenerating) return

        const solution = getFreakGPTSolution(this.filename)
        if (!solution) return

        this.freakGenerating = true
        this.textareaEl.readOnly = true

        if (typeof document !== "undefined") {
            document.dispatchEvent(new CustomEvent("freak:used"))
        }
        if (this.freakBtnEl) {
            this.freakBtnEl.disabled = true
            this.freakBtnEl.textContent = "\u{1F525} Generating..."
        }

        this.textareaEl.value = ""
        this.updateGutter()
        this.updateHeader()

        this.showStatusMessage(
            "\u{1F525} FreakGPT: Hey there, gorgeous. \u{1F60F}",
            "info"
        )
        await this.sleep(500)

        if (this.filename === "exercise4.welt") {
            await this.typeExercise4(solution)
        } else if (this.filename === "exercise5.welt") {
            await this.typeExercise5(solution)
        } else {
            await this.typeLines(solution)
        }

        if (this.destroyed) return

        this.freakGenerating = false
        this.textareaEl.readOnly = false
        if (this.freakBtnEl) {
            this.freakBtnEl.textContent = "\u{1F525} FreakGPT"
            this.freakBtnEl.disabled = false
        }
        this.showStatusMessage(
            "\u{1F525} FreakGPT: All done, hot stuff. \u{1F618}",
            "info"
        )
        this.textareaEl.focus()
    }

    private runFelixGPT(): void {
        if (this.freakGenerating) return

        const pool = [
            "; meow",
            "; mrrr",
            "; mrow",
            "; prrrr",
            "; mrrp",
            "; meow meow meow",
            "; prrrrrrr",
            "; mew",
            "; mrrrrow",
            "; mrrp mrrp",
        ]

        const count = 3 + Math.floor(Math.random() * 3)
        const lines: string[] = []
        for (let i = 0; i < count; i++) {
            lines.push(pool[Math.floor(Math.random() * pool.length)])
        }

        const pos = this.textareaEl.selectionStart
        const value = this.textareaEl.value
        const block = lines.join("\n")
        const before = value.substring(0, pos)
        const after = value.substring(pos)
        const needsNewlineBefore = before.length > 0 && !before.endsWith("\n")
        const needsNewlineAfter = after.length > 0 && !after.startsWith("\n")
        const insert =
            (needsNewlineBefore ? "\n" : "") +
            block +
            (needsNewlineAfter ? "\n" : "")

        this.textareaEl.value = before + insert + after
        this.textareaEl.selectionStart = pos + insert.length
        this.textareaEl.selectionEnd = pos + insert.length

        this.updateGutter()
        this.updateHeader()
        this.textareaEl.focus()

        if (typeof document !== "undefined") {
            document.dispatchEvent(new CustomEvent("felix:message"))
            document.dispatchEvent(new CustomEvent("felix:editor"))
        }
    }

    private async typeLines(lines: string[]): Promise<void> {
        for (const line of lines) {
            if (this.destroyed) return
            this.appendLine(line)
            await this.sleep(LINE_DELAY_MS)
        }
    }

    private async typeExercise4(solution: string[]): Promise<void> {
        for (
            let i = 0;
            i < EXERCISE_4_BREAK_AFTER && i < solution.length;
            i++
        ) {
            if (this.destroyed) return
            this.appendLine(solution[i])
            await this.sleep(LINE_DELAY_MS)
        }

        await this.sleep(NETWORK_ERROR_DELAY_MS)

        for (const errMsg of NETWORK_ERRORS) {
            if (this.destroyed) return
            this.showStatusMessage(errMsg, "warning")
            await this.sleep(NETWORK_RETRY_DELAY_MS)
        }

        for (let i = EXERCISE_4_BREAK_AFTER; i < solution.length; i++) {
            if (this.destroyed) return
            this.appendLine(solution[i])
            await this.sleep(LINE_DELAY_MS)
        }
    }

    private async typeExercise5(solution: string[]): Promise<void> {
        const essayStart = solution.indexOf(EXERCISE_5_SCHOPENHAUER_ESSAY[0])
        const essayEnd =
            essayStart >= 0
                ? essayStart + EXERCISE_5_SCHOPENHAUER_ESSAY.length
                : -1

        for (let i = 0; i < solution.length; i++) {
            if (this.destroyed) return

            if (i === essayStart) {
                this.showStatusMessage(
                    "\u{1F525} FreakGPT: Adding some context... \u{1F914}",
                    "info"
                )
                await this.sleep(500)
            }

            if (i >= essayStart && i < essayEnd) {
                const essayIdx = i - essayStart
                const prevLine =
                    essayIdx > 0
                        ? EXERCISE_5_SCHOPENHAUER_ESSAY[essayIdx - 1]
                        : ""
                const displayLines = glitchLine(solution[i], essayIdx, prevLine)

                for (let d = 0; d < displayLines.length; d++) {
                    if (this.destroyed) return
                    if (d < displayLines.length - 1) {
                        this.appendLine(displayLines[d])
                        await this.sleep(LINE_DELAY_MS)
                        await this.sleep(80)
                        const lines = this.textareaEl.value.split("\n")
                        lines.pop()
                        this.textareaEl.value = lines.join("\n")
                        this.updateGutter()
                    }
                    this.appendLine(displayLines[displayLines.length - 1])
                    await this.sleep(LINE_DELAY_MS)
                    break
                }
            } else {
                this.appendLine(solution[i])
                await this.sleep(LINE_DELAY_MS)
            }
        }
    }

    private save(): void {
        const content = this.textareaEl.value
        const dirPath = this.filePath.slice(0, -1)
        const dirPathStr = formatPath(dirPath)
        const fileName = this.filePath[this.filePath.length - 1]

        if (this.isNewFile) {
            const result = createFile(this.fs, dirPathStr, fileName, content)
            if (!result.success) {
                this.showStatusMessage(
                    `Save failed: ${result.error}`,
                    "warning"
                )
                return
            }
            this.isNewFile = false
        } else {
            const pathStr = formatPath(this.filePath)
            const result = writeFile(this.fs, pathStr, content)
            if (!result.success) {
                this.showStatusMessage(
                    `Save failed: ${result.error}`,
                    "warning"
                )
                return
            }
        }

        this.originalContent = content
        this.confirmingQuit = false
        const lineCount = content.split("\n").length
        this.showStatusMessage(`Saved ${this.filename} (${lineCount} lines)`)
        this.updateHeader()

        document.dispatchEvent(
            new CustomEvent("terminal:file-saved", {
                detail: {
                    filename: this.filename,
                    path: formatPath(this.filePath),
                    isNew: false,
                },
            })
        )

        void this.checkSystemFile(content)
    }

    private async checkSystemFile(content: string): Promise<void> {
        if (
            this.filePath.length < 3 ||
            this.filePath[0] !== "3:" ||
            this.filePath[1].toLowerCase() !== "das"
        ) {
            return
        }

        const filename = this.filePath[2].toLowerCase()
        const result = await validateSystemFile(filename, content)
        if (!result || result.severity === "none") return

        this.printValidationWarnings(result)

        const warningCount =
            SEVERITY_HEADERS[result.severity].length + result.broken.length
        const totalDelay = 300 + warningCount * 300 + 500

        setTimeout(() => {
            document.dispatchEvent(
                new CustomEvent("system-file-modified", {
                    detail: {
                        filename,
                        severity: result.severity,
                        broken: result.broken,
                        values: result.values,
                    },
                })
            )
        }, totalDelay)
    }

    private printValidationWarnings(result: ValidationResult): void {
        const headers = SEVERITY_HEADERS[result.severity]
        const className = result.severity === "minor" ? "dim" : "error"

        let delay = 300
        for (const header of headers) {
            setTimeout(() => {
                this.callbacks.print("")
                this.callbacks.print(`*** ${header} ***`, className)
            }, delay)
            delay += 300
        }

        if (result.severity === "minor") return

        for (const item of result.broken) {
            const msg = BROKEN_WARNINGS[item] ?? item.toUpperCase()
            setTimeout(() => {
                this.callbacks.print(`  ${msg}`, "error")
            }, delay)
            delay += 300
        }
    }

    public destroy(): void {
        this.destroyed = true

        if (this.statusTimerId !== null) {
            clearTimeout(this.statusTimerId)
        }

        this.containerEl.remove()
        this.callbacks.onExit()
    }

    public focusTextarea(): void {
        this.textareaEl.focus()
    }
}
