import {
    type Severity,
    validateSystemFile,
    type ValidationResult,
} from "../systemFileValidator"
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

    private containerEl!: HTMLElement
    private headerEl!: HTMLElement
    private gutterEl!: HTMLElement
    private textareaEl!: HTMLTextAreaElement
    private statusLeftEl!: HTMLElement
    private statusMsgEl!: HTMLElement
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

        void this.checkSystemFile(content)
    }

    private async checkSystemFile(content: string): Promise<void> {
        if (
            this.filePath.length < 4 ||
            this.filePath[0] !== "C:" ||
            this.filePath[1].toLowerCase() !== "windows" ||
            this.filePath[2].toLowerCase() !== "system32"
        ) {
            return
        }

        const filename = this.filePath[3].toLowerCase()
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
