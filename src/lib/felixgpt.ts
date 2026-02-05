const MEOW_RESPONSES = ["Meow!", "Mrrrow?", "Meow meow!", "*purrs*", "Mew!"]

const SPECIAL_RESPONSES: Record<string, string[]> = {}

function getRandomItem<T>(arr: T[]): T {
    return arr[Math.floor(Math.random() * arr.length)]
}

function generateResponse(input: string): string {
    const lower = input.toLowerCase()

    for (const [keyword, responses] of Object.entries(SPECIAL_RESPONSES)) {
        if (lower.includes(keyword)) {
            return getRandomItem(responses)
        }
    }

    if (lower.includes("?")) {
        return getRandomItem([
            "Meow? *tilts head*",
            "Mrrrow... *contemplates*",
            "*stares blankly* Meow.",
            "Mew? *confused*",
        ])
    }

    return getRandomItem(MEOW_RESPONSES)
}

function addMessage(
    container: HTMLElement,
    text: string,
    isFelix: boolean
): void {
    const message = document.createElement("div")
    message.className = `message ${isFelix ? "felix" : "user"}`
    message.innerHTML = `<span class="message-text">${text}</span>`
    container.appendChild(message)
    container.scrollTop = container.scrollHeight
}

export function initFelixGPT(): void {
    const form = document.getElementById("felix-form") as HTMLFormElement | null
    const input = document.getElementById(
        "felix-input"
    ) as HTMLInputElement | null
    const messages = document.getElementById("felix-messages")

    if (!form || !input || !messages) return

    form.addEventListener("submit", (e) => {
        e.preventDefault()

        const text = input.value.trim()
        if (!text) return

        addMessage(messages, text, false)
        input.value = ""

        const thinkingTime = 500 + Math.random() * 1000
        setTimeout(() => {
            const response = generateResponse(text)
            addMessage(messages, response, true)
        }, thinkingTime)
    })

    input.focus()
}
