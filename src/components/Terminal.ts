import {
    type CommandContext,
    executeCommand,
    getPrompt,
    getSLFrames,
} from "../lib/terminal/commands"
import { createFileSystem, type FileSystem } from "../lib/terminal/filesystem"

export interface TerminalCallbacks {
    openWindow: (windowId: string) => void
    closeTerminal: () => void
}

export class Terminal {
    private container: HTMLElement
    private outputEl: HTMLElement
    private inputEl: HTMLInputElement
    private fs: FileSystem
    private callbacks: TerminalCallbacks
    private commandHistory: string[] = []
    private historyIndex = -1
    private tempInput = ""

    constructor(container: HTMLElement, callbacks: TerminalCallbacks) {
        this.container = container
        this.callbacks = callbacks
        this.fs = createFileSystem()

        this.container.innerHTML = ""
        this.container.className = "terminal-container"

        this.outputEl = document.createElement("div")
        this.outputEl.className = "terminal-output"
        this.container.appendChild(this.outputEl)

        const inputLine = document.createElement("div")
        inputLine.className = "terminal-input-line"

        const promptSpan = document.createElement("span")
        promptSpan.className = "terminal-prompt"
        promptSpan.textContent = getPrompt(this.fs)
        inputLine.appendChild(promptSpan)

        this.inputEl = document.createElement("input")
        this.inputEl.type = "text"
        this.inputEl.className = "terminal-input"
        this.inputEl.spellcheck = false
        this.inputEl.autocomplete = "off"
        inputLine.appendChild(this.inputEl)

        this.container.appendChild(inputLine)

        this.setupEventListeners()
        this.printWelcome()

        setTimeout(() => this.inputEl.focus(), 100)
    }

    private setupEventListeners(): void {
        this.inputEl.addEventListener("keydown", (e) => this.handleKeyDown(e))

        this.container.addEventListener("click", () => {
            this.inputEl.focus()
        })
    }

    private handleKeyDown(e: KeyboardEvent): void {
        if (e.key === "Enter") {
            e.preventDefault()
            void this.processCommand()
        } else if (e.key === "ArrowUp") {
            e.preventDefault()
            this.navigateHistory(-1)
        } else if (e.key === "ArrowDown") {
            e.preventDefault()
            this.navigateHistory(1)
        } else if (e.key === "Tab") {
            e.preventDefault()
        } else if (e.key === "c" && e.ctrlKey) {
            e.preventDefault()
            this.printLine(`^C`, "dim")
            this.inputEl.value = ""
            this.updatePrompt()
        }
    }

    private navigateHistory(direction: number): void {
        if (this.commandHistory.length === 0) return

        if (this.historyIndex === -1 && direction === -1) {
            this.tempInput = this.inputEl.value
            this.historyIndex = this.commandHistory.length - 1
        } else {
            this.historyIndex += direction
        }

        if (this.historyIndex < 0) {
            this.historyIndex = -1
            this.inputEl.value = this.tempInput
        } else if (this.historyIndex >= this.commandHistory.length) {
            this.historyIndex = -1
            this.inputEl.value = this.tempInput
        } else {
            this.inputEl.value = this.commandHistory[this.historyIndex]
        }

        setTimeout(() => {
            this.inputEl.setSelectionRange(
                this.inputEl.value.length,
                this.inputEl.value.length
            )
        }, 0)
    }

    private async processCommand(): Promise<void> {
        const input = this.inputEl.value
        const prompt = getPrompt(this.fs)

        this.printLine(`${prompt}${input}`)

        if (input.trim()) {
            this.commandHistory.push(input)
        }
        this.historyIndex = -1
        this.tempInput = ""
        this.inputEl.value = ""

        const ctx: CommandContext = {
            fs: this.fs,
            openWindow: (windowId) => this.callbacks.openWindow(windowId),
            closeTerminal: () => this.callbacks.closeTerminal(),
            clearOutput: () => this.clearOutput(),
            print: (text, className) => this.printLine(text, className),
            printHtml: (html) => this.printHtml(html),
        }

        const result = await executeCommand(input, ctx)

        if (result.action === "clear") {
            this.clearOutput()
        } else if (result.action === "exit") {
            this.callbacks.closeTerminal()
        } else if (result.action === "sl") {
            await this.playSLAnimation()
        } else if (result.html) {
            this.printHtml(result.html)
        } else if (result.output) {
            this.printLine(result.output, result.className)
        }

        this.updatePrompt()
        this.scrollToBottom()
    }

    private printWelcome(): void {
        const welcome = `
HACKTERM v1.0 - UNAUTHORIZED ACCESS DETECTED
=============================================
Type 'help' for available commands.
`
        this.printLine(welcome, "terminal-header")
    }

    private printLine(text: string, className?: string): void {
        const line = document.createElement("div")
        line.className = `terminal-line${className ? ` ${className}` : ""}`
        line.textContent = text
        this.outputEl.appendChild(line)
        this.scrollToBottom()
    }

    private printHtml(html: string): void {
        const wrapper = document.createElement("div")
        wrapper.className = "terminal-line"
        wrapper.innerHTML = html
        this.outputEl.appendChild(wrapper)
        this.scrollToBottom()
    }

    private clearOutput(): void {
        this.outputEl.innerHTML = ""
    }

    private updatePrompt(): void {
        const promptSpan = this.container.querySelector(".terminal-prompt")
        if (promptSpan) {
            promptSpan.textContent = getPrompt(this.fs)
        }
    }

    private scrollToBottom(): void {
        this.outputEl.scrollTop = this.outputEl.scrollHeight
    }

    private async playSLAnimation(): Promise<void> {
        const frames = getSLFrames()
        const animContainer = document.createElement("div")
        animContainer.className = "sl-animation"
        this.outputEl.appendChild(animContainer)

        const train = document.createElement("div")
        train.className = "sl-train"
        train.textContent = frames[0]
        animContainer.appendChild(train)

        let frameIndex = 0
        const frameInterval = setInterval(() => {
            frameIndex = (frameIndex + 1) % frames.length
            train.textContent = frames[frameIndex]
        }, 200)

        await new Promise<void>((resolve) => {
            setTimeout(() => {
                clearInterval(frameInterval)
                resolve()
            }, 4000)
        })

        this.scrollToBottom()
    }

    public focus(): void {
        this.inputEl.focus()
    }
}

export function initTerminal(callbacks: TerminalCallbacks): void {
    const container = document.getElementById("terminal-content")
    if (container) {
        new Terminal(container, callbacks)
    }
}
