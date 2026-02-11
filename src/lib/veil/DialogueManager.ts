import { getDialogueForVeil } from "./dialogues"
import type { DialogueNode, DialogueTree, VeilId } from "./types"

const DEFAULT_TYPING_SPEED = 30 // ms per character

export class DialogueManager {
    private container: HTMLElement
    private tree: DialogueTree | null = null
    private typingInterval: number | null = null
    private isTyping: boolean = false
    private displayedText: string = ""
    private fullText: string = ""
    /** Incremented each time showNode is called; used to scope skip/complete to the correct node */
    private nodeGeneration: number = 0
    /** True while a choice click is being processed (prevents double-clicks) */
    private isTransitioning: boolean = false

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
        this.isTransitioning = false

        const startNode = this.tree.nodes[this.tree.startNode]
        if (startNode) {
            this.showNode(startNode)
        }
    }

    public destroy(): void {
        this.stopTyping()
        this.container.innerHTML = ""
        this.tree = null
        this.isTransitioning = false
    }

    private resolveText(key: string): string {
        return this.textResolver?.(key) ?? key
    }

    private scrollToBottom(): void {
        this.container.scrollTo({
            top: this.container.scrollHeight,
            behavior: "smooth",
        })
    }

    private speakerLabel(speaker: DialogueNode["speaker"]): string {
        if (speaker === "you") return "> YOU"
        if (speaker === "T. PFERD") return "\u25C6 T. PFERD"
        return "\u2022 ???"
    }

    private showNode(node: DialogueNode): void {
        this.stopTyping()
        this.clearTypingCursors()

        // Bump generation so stale skip-handlers and interval callbacks become no-ops
        const gen = ++this.nodeGeneration

        const nodeEl = document.createElement("div")
        nodeEl.className = "veil-dialogue-node veil-dialogue-entering"

        const speaker = document.createElement("div")
        speaker.className = "veil-dialogue-speaker"
        speaker.textContent = this.speakerLabel(node.speaker)
        if (node.speaker === "T. PFERD") {
            speaker.classList.add("veil-speaker-pferd")
        } else if (node.speaker === "???") {
            speaker.classList.add("veil-speaker-unknown")
        }
        nodeEl.appendChild(speaker)

        const textEl = document.createElement("div")
        textEl.className = "veil-dialogue-text veil-dialogue-typing"
        nodeEl.appendChild(textEl)

        const choicesEl = document.createElement("div")
        choicesEl.className = "veil-dialogue-choices"
        choicesEl.style.display = "none"
        choicesEl.style.flexDirection = "column"
        nodeEl.appendChild(choicesEl)

        this.container.appendChild(nodeEl)
        this.scrollToBottom()

        this.fullText = this.resolveText(node.text)
        this.displayedText = ""
        this.isTyping = true

        // Track whether onTypingComplete has already fired for THIS node
        let typingCompleted = false

        const completeOnce = (): void => {
            if (typingCompleted || gen !== this.nodeGeneration) return
            typingCompleted = true
            this.onTypingComplete(node, choicesEl, gen)
        }

        const speed = node.typingSpeed ?? DEFAULT_TYPING_SPEED
        let charIndex = 0

        this.typingInterval = window.setInterval(() => {
            // Stale interval guard
            if (gen !== this.nodeGeneration) {
                clearInterval(this.typingInterval!)
                return
            }
            if (charIndex < this.fullText.length) {
                this.displayedText += this.fullText[charIndex]
                textEl.textContent = this.displayedText
                charIndex++
                this.scrollToBottom()
            } else {
                this.stopTyping()
                completeOnce()
            }
        }, speed)

        const skipHandler = (): void => {
            // Only skip if this is still the active node and typing hasn't completed
            if (
                this.isTyping &&
                gen === this.nodeGeneration &&
                !typingCompleted
            ) {
                this.stopTyping()
                this.displayedText = this.fullText
                textEl.textContent = this.fullText
                completeOnce()
            }
            nodeEl.removeEventListener("click", skipHandler)
        }
        nodeEl.addEventListener("click", skipHandler)
    }

    private clearTypingCursors(): void {
        const active = this.container.querySelectorAll(".veil-dialogue-typing")
        for (const el of active) {
            el.classList.remove("veil-dialogue-typing")
        }
    }

    private onTypingComplete(
        node: DialogueNode,
        choicesEl: HTMLElement,
        gen: number
    ): void {
        this.isTyping = false
        this.clearTypingCursors()

        // If a newer node has started, bail out
        if (gen !== this.nodeGeneration) return

        // Handle spooky effects (fire-and-continue)
        if (node.effect === "spooky_reveal") {
            this.triggerSpookyReveal()
        }
        if (node.effect === "spooky_plan") {
            this.triggerSpookyPlan()
        }

        if (node.effect === "complete") {
            choicesEl.style.display = "flex"
            const btn = document.createElement("button")
            btn.className = "veil-dialogue-choice-btn"
            btn.innerHTML = `<span class="veil-choice-prefix">&gt;</span> ${this.escapeHtml(this.resolveText("veil.ui.continue"))}`
            btn.addEventListener("click", () => {
                if (this.isTransitioning) return
                this.isTransitioning = true
                btn.classList.add("veil-choice-selected")
                this.onComplete?.()
            })
            choicesEl.appendChild(btn)
            this.scrollToBottom()
            return
        }

        if (node.effect === "trigger_boss") {
            choicesEl.style.display = "flex"
            const btn = document.createElement("button")
            btn.className = "veil-dialogue-choice-btn veil-choice-boss"
            btn.innerHTML = `<span class="veil-choice-prefix">&gt;</span> ${this.escapeHtml(this.resolveText("veil.ui.enter_facility"))}`
            btn.addEventListener("click", () => {
                if (this.isTransitioning) return
                this.isTransitioning = true
                btn.classList.add("veil-choice-selected")
                this.onTriggerBoss?.()
            })
            choicesEl.appendChild(btn)
            this.scrollToBottom()
            return
        }

        if (node.choices && node.choices.length > 0) {
            choicesEl.style.display = "flex"
            for (const choice of node.choices) {
                const btn = document.createElement("button")
                btn.className = "veil-dialogue-choice-btn"
                btn.innerHTML = `<span class="veil-choice-prefix">&gt;</span> ${this.escapeHtml(this.resolveText(choice.label))}`
                btn.addEventListener("click", () => {
                    if (this.isTransitioning) return
                    this.isTransitioning = true
                    // Visually mark the chosen option and disable all siblings
                    btn.classList.add("veil-choice-selected")
                    for (const sibling of choicesEl.querySelectorAll(
                        ".veil-dialogue-choice-btn"
                    )) {
                        ;(sibling as HTMLButtonElement).disabled = true
                    }
                    this.advanceTo(choice.next)
                })
                choicesEl.appendChild(btn)
            }
            this.scrollToBottom()
            return
        }

        // Auto-advance
        if (node.next) {
            const nextId = node.next
            // Brief pause before auto-advancing
            setTimeout(() => {
                if (gen !== this.nodeGeneration) return
                this.advanceTo(nextId)
            }, 600)
        }
    }

    private advanceTo(nodeId: string): void {
        if (!this.tree) return
        this.isTransitioning = false
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

    private escapeHtml(text: string): string {
        const el = document.createElement("span")
        el.textContent = text
        return el.innerHTML
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
        setTimeout(
            () => this.container.classList.remove("veil-text-corrupt"),
            1500
        )
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
