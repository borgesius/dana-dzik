const QUOTES: string[] = [
    "The world is my representation.",
    "Placeholder quote 2.",
    "Placeholder quote 3.",
    "Placeholder quote 4.",
    "Placeholder quote 5.",
]

export function randomSchopenhauer(): string {
    const index = Math.floor(Math.random() * QUOTES.length)
    return `"${QUOTES[index]}" -- Schopenhauer`
}
