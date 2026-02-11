// ─── Numerology ─────────────────────────────────────────────────────────────

export interface NumerologyReading {
    /** Pythagorean reduction of the git SHA hex digits */
    lifePath: number
    /** Pythagorean reduction of the deploy timestamp digits */
    destiny: number
    /** Derived from SHA vowel-position hex digits (a, e) */
    soulUrge: number
    /** Derived from SHA consonant-position hex digits */
    personality: number
    /** Whether any core number is a master number (11, 22, 33) */
    masterNumbers: number[]
    /** Human-readable interpretation */
    interpretation: string
}

// ─── Tarot ──────────────────────────────────────────────────────────────────

export interface TarotCard {
    number: number
    name: string
    arcana: "major" | "minor"
    suit: string | null
    upright: string
    reversed: string
    /** Whether this card was drawn reversed in the spread */
    isReversed: boolean
    /** Position label in the spread */
    position: "past" | "present" | "future"
}

export interface TarotSpread {
    cards: [TarotCard, TarotCard, TarotCard]
    /** One-line synthesis of the spread */
    synthesis: string
}

// ─── I Ching ────────────────────────────────────────────────────────────────

export type IChingLine = "old_yin" | "young_yang" | "young_yin" | "old_yang"

export interface IChingReading {
    hexagramNumber: number
    name: string
    /** 6 lines from bottom to top: 0 = yin (broken), 1 = yang (solid) */
    lines: [number, number, number, number, number, number]
    /** Line types including changing lines */
    lineTypes: [
        IChingLine,
        IChingLine,
        IChingLine,
        IChingLine,
        IChingLine,
        IChingLine,
    ]
    trigrams: [string, string]
    judgment: string
    image: string
    /** Changing hexagram number, if any lines are changing */
    changingTo: number | null
}

// ─── Biorhythm ──────────────────────────────────────────────────────────────

export interface BiorhythmCycle {
    label: string
    /** Period in days */
    period: number
    /** Current value from -1 to 1 */
    value: number
    /** Percentage 0-100 */
    percentage: number
    /** "ascending" | "descending" | "peak" | "trough" | "critical" */
    phase: string
}

export interface BiorhythmReading {
    /** The origin date (repo first commit) */
    birthDate: string
    /** Days since birth */
    dayNumber: number
    physical: BiorhythmCycle
    emotional: BiorhythmCycle
    intellectual: BiorhythmCycle
    /** Average of all three percentages */
    overallPercentage: number
}

// ─── Horoscope ──────────────────────────────────────────────────────────────

export interface HoroscopeReading {
    sign: string
    signEmoji: string
    dateRange: string
    horoscope: string
    mood: string
    luckyNumber: number
    luckyTime: string
    color: string
    compatibility: string
}

// ─── Natal Chart ────────────────────────────────────────────────────────────

export interface PlanetPosition {
    planet: string
    sign: string
    degree: number
    house: number
}

export interface NatalChartReading {
    /** Deploy location used for chart */
    location: string
    sunSign: string
    moonSign: string
    risingSign: string
    planets: PlanetPosition[]
}

// ─── Familiar ───────────────────────────────────────────────────────────────

export interface FamiliarBehavior {
    /** Movement speed 1-10 */
    speed: number
    /** How often it sleeps 1-10 */
    sleepiness: number
    /** How much it explores 1-10 */
    curiosity: number
    /** Whether it runs from the cursor */
    fleesCursor: boolean
}

export interface Familiar {
    id: string
    name: string
    emoji: string
    traits: string[]
    behavior: FamiliarBehavior
}

// ─── Full Profile ───────────────────────────────────────────────────────────

export interface DivinationProfile {
    sha: string
    timestamp: string
    numerology: NumerologyReading
    tarot: TarotSpread
    iching: IChingReading
    biorhythm: BiorhythmReading
    horoscope: HoroscopeReading
    natalChart: NatalChartReading | null
    familiar: Familiar
}
