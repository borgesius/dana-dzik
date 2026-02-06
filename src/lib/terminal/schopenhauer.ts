const QUOTES: string[] = [
    "Life is a business that does not cover the costs.",
    "Life swings like a pendulum backward and forward between pain and boredom.",
    "The subject of willing is thus constantly stretched on the revolving wheel of Ixion, pours water into the sieve of the Danaids, is the ever-longing Tantalus.",
]

export function randomSchopenhauer(): string {
    const index = Math.floor(Math.random() * QUOTES.length)
    return `"${QUOTES[index]}" -- Schopenhauer`
}
