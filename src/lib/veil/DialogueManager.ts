import type { DialogueNode, DialogueTree, VeilId } from "./types"
import { getDialogueForVeil } from "./dialogues"

const DEFAULT_TYPING_SPEED = 30 // ms per character

export class DialogueManager {
    private container: HTMLElement
    private tree: DialogueTree | null = null
    private typingInterval: number | null = null
    private isTyping: boolean = false
    private displayedText: string = ""
    private fullText: string = ""

    /** Called when dialogue completes with effect "complete" */
    public onComplete: (() => void) | null = null
    /** Called when dialogue triggers boss fight (effect "trigger_boss") */
    public onTriggerBoss: (() => void) | null = null
    /** Text resolver: returns localized text for a locale key, or the key itself */
    public textResolver: ((key: string) => string) | null = null

    constructor(container: HTMLElement) {
        this.container = container
    }

    public start(veilId: VeilId): void {
        this.tree = getDialogueForVeil(veilId) ?? null
        if (!this.tree) return

        this.container.innerHTML = ""
        this.container.className = "veil-dialogue"

        const startNode = this.tree.nodes[this.tree.startNode]
        if (startNode) {
            this.showNode(startNode)
        }
    }

    public destroy(): void {
        this.stopTyping()
        this.container.innerHTML = ""
        this.tree = null
    }

    private resolveText(key: string): string {
        return this.textResolver?.(key) ?? key
    }

    private showNode(node: DialogueNode): void {
        this.stopTyping()

        // Build node display
        const nodeEl = document.createElement("div")
        nodeEl.className = "veil-dialogue-node"

        // Speaker label
        const speaker = document.createElement("div")
        speaker.className = "veil-dialogue-speaker"
        speaker.textContent = node.speaker === "you" ? "> YOU" : `> ${node.speaker}`
        if (node.speaker === "T. PFERD") {
            speaker.classList.add("veil-speaker-pferd")
        } else if (node.speaker === "???") {
            speaker.classList.add("veil-speaker-unknown")
        }
        nodeEl.appendChild(speaker)

        // Text area
        const textEl = document.createElement("div")
        textEl.className = "veil-dialogue-text"
        nodeEl.appendChild(textEl)

        // Choices container (hidden until typing finishes)
        const choicesEl = document.createElement("div")
        choicesEl.className = "veil-dialogue-choices"
        choicesEl.style.display = "none"
        nodeEl.appendChild(choicesEl)

        this.container.appendChild(nodeEl)

        // Auto-scroll to latest node
        this.container.scrollTop = this.container.scrollHeight

        // Start typing
        this.fullText = this.resolveText(node.text)
        this.displayedText = ""
        this.isTyping = true

        const speed = node.typingSpeed ?? DEFAULT_TYPING_SPEED
        let charIndex = 0

        this.typingInterval = window.setInterval(() => {
            if (charIndex < this.fullText.length) {
                this.displayedText += this.fullText[charIndex]
                textEl.textContent = this.displayedText
                charIndex++
                this.container.scrollTop = this.container.scrollHeight
            } else {
                this.stopTyping()
                this.onTypingComplete(node, choicesEl)
            }
        }, speed)

        // Click to skip typing
        const skipHandler = (): void => {
            if (this.isTyping) {
                this.stopTyping()
                this.displayedText = this.fullText
                textEl.textContent = this.fullText
                this.onTypingComplete(node, choicesEl)
            }
            nodeEl.removeEventListener("click", skipHandler)
        }
        nodeEl.addEventListener("click", skipHandler)
    }

    private onTypingComplete(
        node: DialogueNode,
        choicesEl: HTMLElement
    ): void {
        this.isTyping = false

        // Handle spooky effects (fire-and-continue)
        if (node.effect === "spooky_reveal") {
            this.triggerSpookyReveal()
        }
        if (node.effect === "spooky_plan") {
            this.triggerSpookyPlan()
        }

        // Handle terminal effects
        if (node.effect === "complete") {
            // Show "continue" button, then fire complete
            choicesEl.style.display = "block"
            const btn = document.createElement("button")
            btn.className = "veil-dialogue-choice-btn"
            btn.textContent = this.resolveText("veil.ui.continue")
            btn.addEventListener("click", () => {
                this.onComplete?.()
            })
            choicesEl.appendChild(btn)
            this.container.scrollTop = this.container.scrollHeight
            return
        }

        if (node.effect === "trigger_boss") {
            choicesEl.style.display = "block"
            const btn = document.createElement("button")
            btn.className = "veil-dialogue-choice-btn veil-choice-boss"
            btn.textContent = this.resolveText("veil.ui.enter_facility")
            btn.addEventListener("click", () => {
                this.onTriggerBoss?.()
            })
            choicesEl.appendChild(btn)
            this.container.scrollTop = this.container.scrollHeight
            return
        }

        // Choices
        if (node.choices && node.choices.length > 0) {
            choicesEl.style.display = "block"
            for (const choice of node.choices) {
                const btn = document.createElement("button")
                btn.className = "veil-dialogue-choice-btn"
                btn.textContent = this.resolveText(choice.label)
                btn.addEventListener("click", () => {
                    this.advanceTo(choice.next)
                })
                choicesEl.appendChild(btn)
            }
            this.container.scrollTop = this.container.scrollHeight
            return
        }

        // Auto-advance
        if (node.next) {
            const nextId = node.next
            // Brief pause before auto-advancing
            setTimeout(() => {
                this.advanceTo(nextId)
            }, 600)
        }
    }

    private advanceTo(nodeId: string): void {
        if (!this.tree) return
        const node = this.tree.nodes[nodeId]
        if (node) {
            this.showNode(node)
        }
    }

    private stopTyping(): void {
        if (this.typingInterval !== null) {
            clearInterval(this.typingInterval)
            this.typingInterval = null
        }
        this.isTyping = false
    }

    // ── Spooky effects ─────────────────────────────────────────────────────

    /** Vampire horse reveal: screen flickers red, static burst, text distortion */
    private triggerSpookyReveal(): void {
        const overlay = this.container.closest(".veil-overlay")
        if (!overlay) return

        // Red flicker
        overlay.classList.add("veil-spooky-reveal")
        setTimeout(() => overlay.classList.remove("veil-spooky-reveal"), 2500)

        // Static burst
        const burst = document.createElement("div")
        burst.className = "veil-static-burst"
        overlay.appendChild(burst)
        setTimeout(() => burst.remove(), 800)

        // Briefly corrupt the dialogue text
        this.container.classList.add("veil-text-corrupt")
        setTimeout(() => this.container.classList.remove("veil-text-corrupt"), 1500)
    }

    /** Plan reveal: deeper red, screen shake, ambient dread */
    private triggerSpookyPlan(): void {
        const overlay = this.container.closest(".veil-overlay")
        if (!overlay) return

        overlay.classList.add("veil-spooky-dread")
        setTimeout(() => overlay.classList.remove("veil-spooky-dread"), 4000)

        // Screen shake
        overlay.classList.add("veil-shake")
        setTimeout(() => overlay.classList.remove("veil-shake"), 600)
    }
}
