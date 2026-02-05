const MEOW_RESPONSES = [
    "Meow!",
    "Mrrrow?",
    "Meow meow!",
    "*purrs*",
    "Mew!",
    "Meooooow...",
    "*stares at you*",
    "Prrrr...",
    "*blinks slowly*",
    "Meow? Meow meow.",
    "*knocks something off your desk*",
    "Mrow!",
    "*stretches*",
    "Meow! *headbutts screen*",
    "*yawns*",
    "Mrrp!",
    "*flicks tail*",
    "Meow meow meow!",
    "*sits in your lap*",
    "Prrrrrrrr...",
    "*demands treats*",
    "Meow! (Translation: I require tuna)",
    "*judges you silently*",
    "Mew mew!",
    "*zooms away suddenly*",
    "Meow? *tilts head*",
    "*kneads your keyboard*",
    "Mrrrrow! *shows belly (it's a trap)*",
    "*chases invisible bug*",
    "Meow! *sits on your work*",
]

const SPECIAL_RESPONSES: Record<string, string[]> = {
    tuna: [
        "MEOW!!! 🐟",
        "*ears perk up* MEOW MEOW MEOW!",
        "*runs to kitchen* MRRROW!",
    ],
    treat: [
        "Meow! Meow! Meow! *spins in circle*",
        "*sits pretty* Mew!",
        "PRRRRRR! *drools*",
    ],
    "good boy": ["*purrs loudly* Prrrrrrr...", "Mrrrow! *rubs against screen*"],
    "good kitty": [
        "*purrs loudly* Prrrrrrr...",
        "Mrrrow! *rubs against screen*",
    ],
    hello: ["Mrrp! *chirps*", "Meow! *blinks slowly*"],
    hi: ["Mrrp! *chirps*", "Meow! *blinks slowly*"],
    love: ["*slow blink* Prrrr...", "*headbutts you* Mrrrow!"],
    pet: ["Prrrrrrr... *leans into it*", "*purrs intensely*"],
    hungry: ["MEOW! MEOW! *runs to food bowl*", "*screams* MRRROOOOW!"],
    sleep: ["*curls into ball* Prrrr...", "*yawns* Mrrr... zzz"],
    play: ["*pounces* Mrrrow!", "*wiggles butt* Meow!"],
}

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
