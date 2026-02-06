import {
    type CommandContext,
    executeCommand,
    getCompletions,
    getPrompt,
    getSLFrames,
} from "../lib/terminal/commands"
import { Editor } from "../lib/terminal/editor"
import {
    changeDirectory,
    createFileSystem,
    type FileSystem,
} from "../lib/terminal/filesystem"

let pendingInit: { cwd?: string; command?: string } | null = null

export function setTerminalInit(init: {
    cwd?: string
    command?: string
}): void {
    pendingInit = init
}

function consumeTerminalInit(): {
    cwd?: string
    command?: string
} | null {
    const init = pendingInit
    pendingInit = null
    return init
}

export interface TerminalCallbacks {
    openWindow: (windowId: string) => void
    closeTerminal: () => void
}

type TerminalMode = "normal" | "editor" | "program-input"

export class Terminal {
    private container: HTMLElement
    private outputEl: HTMLElement
    private inputEl: HTMLInputElement
    private fs: FileSystem
    private callbacks: TerminalCallbacks
    private commandHistory: string[] = []
    private historyIndex = -1
    private tempInput = ""
    private mode: TerminalMode = "normal"
    private editor: Editor | null = null
    private inputResolver: ((value: string) => void) | null = null

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

        const init = consumeTerminalInit()
        if (init) {
            if (init.cwd) {
                changeDirectory(this.fs, init.cwd)
                this.updatePrompt()
            }
            if (init.command) {
                setTimeout(() => void this.processCommand(init.command!), 150)
            }
        }

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
            this.handleEnter()
        } else if (e.key === "ArrowUp") {
            e.preventDefault()
            if (this.mode === "normal") {
                this.navigateHistory(-1)
            }
        } else if (e.key === "ArrowDown") {
            e.preventDefault()
            if (this.mode === "normal") {
                this.navigateHistory(1)
            }
        } else if (e.key === "Tab") {
            e.preventDefault()
            if (this.mode === "normal") {
                this.handleTabComplete()
            }
        } else if (e.key === "c" && e.ctrlKey) {
            e.preventDefault()
            if (this.mode === "program-input" && this.inputResolver) {
                this.printLine("^C", "dim")
                this.inputResolver("")
                this.inputResolver = null
                this.setMode("normal")
            } else if (this.mode === "editor") {
                this.printLine("^C", "dim")
                this.editor = null
                this.setMode("normal")
            } else {
                this.printLine("^C", "dim")
                this.inputEl.value = ""
                this.updatePrompt()
            }
        }
    }

    private handleEnter(): void {
        const input = this.inputEl.value
        this.inputEl.value = ""

        switch (this.mode) {
            case "normal":
                this.echoInput(input)
                void this.processCommand(input)
                break
            case "editor":
                this.echoInput(input, "EDIT> ")
                if (this.editor) {
                    this.editor.handleInput(input)
                }
                this.scrollToBottom()
                break
            case "program-input":
                this.echoInput(input, "? ")
                if (this.inputResolver) {
                    const resolver = this.inputResolver
                    this.inputResolver = null
                    resolver(input)
                }
                break
        }
    }

    private echoInput(input: string, promptOverride?: string): void {
        const prompt = promptOverride ?? getPrompt(this.fs)
        this.printLine(`${prompt}${input}`)
    }

    private handleTabComplete(): void {
        const input = this.inputEl.value
        if (!input) return

        const matches = getCompletions(input, this.fs)
        if (matches.length === 0) return

        if (matches.length === 1) {
            const parts = input.split(/\s+/)
            parts[parts.length - 1] = matches[0]
            this.inputEl.value = parts.join(" ")
        } else {
            const parts = input.split(/\s+/)
            const prefix = this.commonPrefix(matches)
            if (prefix.length > parts[parts.length - 1].length) {
                parts[parts.length - 1] = prefix
                this.inputEl.value = parts.join(" ")
            } else {
                this.printLine(getPrompt(this.fs) + input)
                this.printLine(matches.join("  "), "dim")
            }
        }

        setTimeout(() => {
            this.inputEl.setSelectionRange(
                this.inputEl.value.length,
                this.inputEl.value.length
            )
        }, 0)
    }

    private commonPrefix(strings: string[]): string {
        if (strings.length === 0) return ""
        let prefix = strings[0]
        for (let i = 1; i < strings.length; i++) {
            while (!strings[i].toLowerCase().startsWith(prefix.toLowerCase())) {
                prefix = prefix.slice(0, -1)
            }
        }
        return prefix
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

    private async processCommand(input: string): Promise<void> {
        if (input.trim()) {
            this.commandHistory.push(input)
        }
        this.historyIndex = -1
        this.tempInput = ""

        const ctx: CommandContext = {
            fs: this.fs,
            openWindow: (windowId) => this.callbacks.openWindow(windowId),
            closeTerminal: () => this.callbacks.closeTerminal(),
            clearOutput: () => this.clearOutput(),
            print: (text, className) => this.printLine(text, className),
            printHtml: (html) => this.printHtml(html),
            startEditor: (filename) => this.startEditor(filename),
            requestInput: () => this.requestInput(),
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

        if (this.mode === "normal") {
            this.updatePrompt()
        }
        this.scrollToBottom()
    }

    private startEditor(filename: string): void {
        this.setMode("editor")
        this.editor = new Editor(this.fs, filename, {
            print: (text: string, className?: string): void => {
                this.printLine(text, className)
            },
            updatePrompt: (prompt: string): void => {
                this.setPromptText(prompt)
            },
            onExit: (): void => {
                this.editor = null
                this.setMode("normal")
            },
        })
    }

    private requestInput(): Promise<string> {
        this.setMode("program-input")
        this.setPromptText("? ")
        return new Promise<string>((resolve) => {
            this.inputResolver = resolve
        })
    }

    private setMode(mode: TerminalMode): void {
        this.mode = mode
        if (mode === "normal") {
            this.updatePrompt()
        }
    }

    private printWelcome(): void {
        const welcome = `
HACKTERM v1.0 - UNAUTHORIZED ACCESS DETECTED
=============================================
Type 'help' for available commands.

Tip: Check out the WELT folder on the Desktop.
     cd WELT && cat README.txt
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

    private setPromptText(text: string): void {
        const promptSpan = this.container.querySelector(".terminal-prompt")
        if (promptSpan) {
            promptSpan.textContent = text
        }
    }

    private updatePrompt(): void {
        this.setPromptText(getPrompt(this.fs))
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
