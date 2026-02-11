/**
 * Deployment Divination System — computation script
 *
 * Run via: npx tsx scripts/divination.ts
 *
 * Reads git info from environment (GITHUB_SHA, or falls back to local git),
 * computes a 6-layer esoteric profile, and writes it to Upstash Redis.
 */

import { execSync } from "node:child_process"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { Redis } from "@upstash/redis"

import type {
    BiorhythmCycle,
    BiorhythmReading,
    DivinationProfile,
    Familiar,
    FamiliarBehavior,
    HoroscopeReading,
    IChingLine,
    IChingReading,
    NatalChartReading,
    NumerologyReading,
    PlanetPosition,
    TarotCard,
    TarotSpread,
} from "../src/lib/divination/types"

// ─── Data Loading ───────────────────────────────────────────────────────────

const DATA_DIR = join(__dirname, "data")

interface RawTarotCard {
    number: number
    name: string
    arcana: "major" | "minor"
    suit: string | null
    upright: string
    reversed: string
}

interface RawHexagram {
    number: number
    name: string
    trigrams: [string, string]
    lines: [number, number, number, number, number, number]
    judgment: string
    image: string
}

interface RawFamiliar {
    id: string
    name: string
    emoji: string
    traits: string[]
    behavior: FamiliarBehavior
}

const tarotDeck: RawTarotCard[] = JSON.parse(
    readFileSync(join(DATA_DIR, "tarot.json"), "utf-8"),
)
const hexagrams: RawHexagram[] = JSON.parse(
    readFileSync(join(DATA_DIR, "iching.json"), "utf-8"),
)
const familiarsList: RawFamiliar[] = JSON.parse(
    readFileSync(join(DATA_DIR, "familiars.json"), "utf-8"),
)

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Simple seeded PRNG (mulberry32) */
function mulberry32(seed: number): () => number {
    let s = seed | 0
    return () => {
        s = (s + 0x6d2b79f5) | 0
        let t = Math.imul(s ^ (s >>> 15), 1 | s)
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296
    }
}

/** Hash a string to a 32-bit integer */
function hashString(value: string): number {
    let hash = 0
    for (let i = 0; i < value.length; i++) {
        hash = ((hash << 5) - hash + value.charCodeAt(i)) | 0
    }
    return Math.abs(hash)
}

/** Pythagorean digit reduction: sum digits until single digit or master number */
function reduceToSingle(n: number): number {
    while (n > 9 && n !== 11 && n !== 22 && n !== 33) {
        let sum = 0
        while (n > 0) {
            sum += n % 10
            n = Math.floor(n / 10)
        }
        n = sum
    }
    return n
}

/** Sum hex digits of a SHA */
function sumHexDigits(sha: string): number {
    let sum = 0
    for (const ch of sha) {
        const val = parseInt(ch, 16)
        if (!isNaN(val)) sum += val
    }
    return sum
}

/** Sum digits of a numeric string */
function sumDigits(s: string): number {
    let sum = 0
    for (const ch of s) {
        const val = parseInt(ch, 10)
        if (!isNaN(val)) sum += val
    }
    return sum
}

// ─── Git Info ───────────────────────────────────────────────────────────────

function getGitSha(): string {
    if (process.env.GITHUB_SHA) return process.env.GITHUB_SHA
    try {
        return execSync("git rev-parse HEAD", { encoding: "utf-8" }).trim()
    } catch {
        return "0000000000000000000000000000000000000000"
    }
}

function getTimestamp(): string {
    return new Date().toISOString()
}

interface DiffStats {
    filesChanged: number
    insertions: number
    deletions: number
}

function getDiffStats(): DiffStats {
    try {
        const raw = execSync("git diff HEAD~1 --shortstat", {
            encoding: "utf-8",
        }).trim()
        const files = raw.match(/(\d+) files? changed/)
        const ins = raw.match(/(\d+) insertions?/)
        const del = raw.match(/(\d+) deletions?/)
        return {
            filesChanged: files ? parseInt(files[1]) : 0,
            insertions: ins ? parseInt(ins[1]) : 0,
            deletions: del ? parseInt(del[1]) : 0,
        }
    } catch {
        return { filesChanged: 1, insertions: 1, deletions: 1 }
    }
}

function getFirstCommitDate(): string {
    try {
        return execSync('git log --reverse --format=%aI | head -1', {
            encoding: "utf-8",
        }).trim()
    } catch {
        return "2024-01-01T00:00:00Z"
    }
}

// ─── Layer 1: Numerology ────────────────────────────────────────────────────

const NUMEROLOGY_INTERPRETATIONS: Record<number, string> = {
    1: "The Independent. This deploy charts its own course — a pioneer build.",
    2: "The Diplomat. This deploy seeks harmony and balance in the codebase.",
    3: "The Communicator. This deploy brings creative expression and joy.",
    4: "The Builder. This deploy lays solid foundations for what comes next.",
    5: "The Adventurer. This deploy craves change and freedom — expect the unexpected.",
    6: "The Nurturer. This deploy cares for the codebase, healing and protecting.",
    7: "The Seeker. This deploy dives deep into mystery and hidden knowledge.",
    8: "The Powerhouse. This deploy manifests abundance and material mastery.",
    9: "The Humanitarian. This deploy serves the greater good of all users.",
    11: "Master Number 11: The Intuitive. This deploy channels higher inspiration.",
    22: "Master Number 22: The Master Builder. This deploy can manifest great visions.",
    33: "Master Number 33: The Master Teacher. This deploy illuminates and uplifts.",
}

function computeNumerology(sha: string, timestamp: string): NumerologyReading {
    const lifePath = reduceToSingle(sumHexDigits(sha))
    const destiny = reduceToSingle(sumDigits(timestamp.replace(/\D/g, "")))

    // Soul urge: hex digits at "vowel positions" (a=10, e=14 in hex)
    const vowelHex = sha
        .split("")
        .filter((ch) => ch === "a" || ch === "e")
    const soulUrge = reduceToSingle(
        vowelHex.reduce((s, ch) => s + parseInt(ch, 16), 0) || 1,
    )

    // Personality: non-vowel hex digits
    const consonantHex = sha
        .split("")
        .filter((ch) => ch !== "a" && ch !== "e" && /[0-9a-f]/.test(ch))
    const personality = reduceToSingle(
        consonantHex.reduce((s, ch) => s + parseInt(ch, 16), 0) || 1,
    )

    const masterNumbers = [lifePath, destiny, soulUrge, personality].filter(
        (n) => n === 11 || n === 22 || n === 33,
    )

    const interpretation =
        NUMEROLOGY_INTERPRETATIONS[lifePath] ??
        `Life path ${lifePath}: a unique vibrational frequency.`

    return {
        lifePath,
        destiny,
        soulUrge,
        personality,
        masterNumbers,
        interpretation,
    }
}

// ─── Layer 2: Tarot ─────────────────────────────────────────────────────────

const TAROT_SYNTHESIS_TEMPLATES = [
    "From {past} through {present} toward {future} — the code transforms.",
    "The cards reveal: {past} gave way to {present}, leading inevitably to {future}.",
    "{past} is behind you. {present} is your reality. {future} awaits.",
    "A journey from {past} to {future}, with {present} as the crossroads.",
]

function computeTarot(sha: string): TarotSpread {
    const rng = mulberry32(hashString(sha))
    const positions: Array<"past" | "present" | "future"> = [
        "past",
        "present",
        "future",
    ]
    const drawn: TarotCard[] = []
    const usedIndices = new Set<number>()

    for (const position of positions) {
        let idx: number
        do {
            idx = Math.floor(rng() * tarotDeck.length)
        } while (usedIndices.has(idx))
        usedIndices.add(idx)

        const raw = tarotDeck[idx]
        const isReversed = rng() < 0.35 // 35% chance reversed
        drawn.push({
            number: raw.number,
            name: raw.name,
            arcana: raw.arcana,
            suit: raw.suit,
            upright: raw.upright,
            reversed: raw.reversed,
            isReversed,
            position,
        })
    }

    const template =
        TAROT_SYNTHESIS_TEMPLATES[
            Math.floor(rng() * TAROT_SYNTHESIS_TEMPLATES.length)
        ]
    const synthesis = template
        .replace("{past}", drawn[0].name)
        .replace("{present}", drawn[1].name)
        .replace("{future}", drawn[2].name)

    return {
        cards: drawn as [TarotCard, TarotCard, TarotCard],
        synthesis,
    }
}

// ─── Layer 3: I Ching ───────────────────────────────────────────────────────

function computeIChing(diff: DiffStats, sha: string): IChingReading {
    const rng = mulberry32(hashString(sha + "iching"))

    // Cast 6 lines from diff stats + rng
    const values = [
        diff.filesChanged,
        diff.insertions,
        diff.deletions,
        diff.filesChanged + diff.insertions,
        diff.insertions + diff.deletions,
        diff.filesChanged + diff.deletions,
    ]

    const lineTypes: IChingLine[] = values.map((v) => {
        const r = (v + Math.floor(rng() * 4)) % 4
        switch (r) {
            case 0:
                return "old_yin" // changing yin → yang
            case 1:
                return "young_yang"
            case 2:
                return "young_yin"
            case 3:
                return "old_yang" // changing yang → yin
            default:
                return "young_yang"
        }
    }) as [IChingLine, IChingLine, IChingLine, IChingLine, IChingLine, IChingLine]

    // Convert to binary lines (0=yin, 1=yang)
    const lines = lineTypes.map((lt) =>
        lt === "young_yang" || lt === "old_yang" ? 1 : 0,
    ) as [number, number, number, number, number, number]

    // Find hexagram by matching line pattern
    const hexagram =
        hexagrams.find(
            (h) => h.lines.every((l, i) => l === lines[i]),
        ) ?? hexagrams[0]

    // Compute changing hexagram if there are changing lines
    const hasChanging = lineTypes.some(
        (lt) => lt === "old_yin" || lt === "old_yang",
    )
    let changingTo: number | null = null
    if (hasChanging) {
        const changedLines = lineTypes.map((lt) => {
            if (lt === "old_yin") return 1 // yin → yang
            if (lt === "old_yang") return 0 // yang → yin
            return lt === "young_yang" ? 1 : 0
        })
        const changedHex = hexagrams.find((h) =>
            h.lines.every((l, i) => l === changedLines[i]),
        )
        if (changedHex) changingTo = changedHex.number
    }

    return {
        hexagramNumber: hexagram.number,
        name: hexagram.name,
        lines,
        lineTypes,
        trigrams: hexagram.trigrams,
        judgment: hexagram.judgment,
        image: hexagram.image,
        changingTo,
    }
}

// ─── Layer 4: Biorhythm ────────────────────────────────────────────────────

function computeBiorhythm(
    deployDate: Date,
    birthDateStr: string,
): BiorhythmReading {
    const birthDate = new Date(birthDateStr)
    const daysSinceBirth = Math.floor(
        (deployDate.getTime() - birthDate.getTime()) / (1000 * 60 * 60 * 24),
    )

    function makeCycle(
        label: string,
        period: number,
    ): BiorhythmCycle {
        const value = Math.sin((2 * Math.PI * daysSinceBirth) / period)
        const percentage = Math.round(((value + 1) / 2) * 100)
        const derivative = Math.cos((2 * Math.PI * daysSinceBirth) / period)

        let phase: string
        if (Math.abs(value) > 0.95) phase = value > 0 ? "peak" : "trough"
        else if (Math.abs(value) < 0.05) phase = "critical"
        else phase = derivative > 0 ? "ascending" : "descending"

        return { label, period, value: Math.round(value * 1000) / 1000, percentage, phase }
    }

    const physical = makeCycle("Physical", 23)
    const emotional = makeCycle("Emotional", 28)
    const intellectual = makeCycle("Intellectual", 33)

    return {
        birthDate: birthDateStr,
        dayNumber: daysSinceBirth,
        physical,
        emotional,
        intellectual,
        overallPercentage: Math.round(
            (physical.percentage + emotional.percentage + intellectual.percentage) / 3,
        ),
    }
}

// ─── Layer 5: Horoscope ─────────────────────────────────────────────────────

const ZODIAC_SIGNS = [
    { sign: "Capricorn", emoji: "♑", range: "Dec 22 – Jan 19", start: [12, 22], end: [1, 19] },
    { sign: "Aquarius", emoji: "♒", range: "Jan 20 – Feb 18", start: [1, 20], end: [2, 18] },
    { sign: "Pisces", emoji: "♓", range: "Feb 19 – Mar 20", start: [2, 19], end: [3, 20] },
    { sign: "Aries", emoji: "♈", range: "Mar 21 – Apr 19", start: [3, 21], end: [4, 19] },
    { sign: "Taurus", emoji: "♉", range: "Apr 20 – May 20", start: [4, 20], end: [5, 20] },
    { sign: "Gemini", emoji: "♊", range: "May 21 – Jun 20", start: [5, 21], end: [6, 20] },
    { sign: "Cancer", emoji: "♋", range: "Jun 21 – Jul 22", start: [6, 21], end: [7, 22] },
    { sign: "Leo", emoji: "♌", range: "Jul 23 – Aug 22", start: [7, 23], end: [8, 22] },
    { sign: "Virgo", emoji: "♍", range: "Aug 23 – Sep 22", start: [8, 23], end: [9, 22] },
    { sign: "Libra", emoji: "♎", range: "Sep 23 – Oct 22", start: [9, 23], end: [10, 22] },
    { sign: "Scorpio", emoji: "♏", range: "Oct 23 – Nov 21", start: [10, 23], end: [11, 21] },
    { sign: "Sagittarius", emoji: "♐", range: "Nov 22 – Dec 21", start: [11, 22], end: [12, 21] },
]

function getZodiacSign(date: Date) {
    const month = date.getMonth() + 1
    const day = date.getDate()
    const md = month * 100 + day

    if (md >= 120 && md <= 218) return ZODIAC_SIGNS[1]  // Aquarius
    if (md >= 219 && md <= 320) return ZODIAC_SIGNS[2]  // Pisces
    if (md >= 321 && md <= 419) return ZODIAC_SIGNS[3]  // Aries
    if (md >= 420 && md <= 520) return ZODIAC_SIGNS[4]  // Taurus
    if (md >= 521 && md <= 620) return ZODIAC_SIGNS[5]  // Gemini
    if (md >= 621 && md <= 722) return ZODIAC_SIGNS[6]  // Cancer
    if (md >= 723 && md <= 822) return ZODIAC_SIGNS[7]  // Leo
    if (md >= 823 && md <= 922) return ZODIAC_SIGNS[8]  // Virgo
    if (md >= 923 && md <= 1022) return ZODIAC_SIGNS[9] // Libra
    if (md >= 1023 && md <= 1121) return ZODIAC_SIGNS[10] // Scorpio
    if (md >= 1122 && md <= 1221) return ZODIAC_SIGNS[11] // Sagittarius
    return ZODIAC_SIGNS[0] // Capricorn
}

const HOROSCOPE_TEMPLATES = [
    "The alignment of commits suggests a period of great productivity. Trust the diff.",
    "Your codebase enters a transformative phase. Old patterns dissolve; new architectures emerge.",
    "Mercury's influence on your deploy pipeline brings unexpected clarity to long-standing bugs.",
    "The stars favor bold refactoring today. What was tangled becomes elegant.",
    "A critical dependency update approaches. Prepare your lock files accordingly.",
    "The celestial debugger smiles upon this build. Tests shall pass on the first attempt.",
    "Beware of scope creep during this lunar phase. Keep PRs small and focused.",
    "An old technical debt resurfaces. The cosmos demands you address it now.",
    "Creative energy flows through your IDE. This is the deploy of inspiration.",
    "The universe suggests pair programming today. Two cursors are better than one.",
    "Your deployment karma is strong. Ship with confidence.",
    "The void between sprints reveals hidden truths about your architecture.",
]

const MOODS = [
    "Optimistic", "Contemplative", "Energetic", "Cautious", "Inspired",
    "Restless", "Focused", "Playful", "Determined", "Serene",
]

const COLORS = [
    "Cerulean", "Crimson", "Emerald", "Amber", "Violet",
    "Indigo", "Coral", "Sage", "Obsidian", "Gold",
]

const LUCKY_TIMES = [
    "2:00 AM", "4:44 AM", "7:30 AM", "11:11 AM", "1:37 PM",
    "3:33 PM", "5:55 PM", "8:08 PM", "10:10 PM", "11:59 PM",
]

async function computeHoroscope(
    deployDate: Date,
    sha: string,
): Promise<HoroscopeReading> {
    const zodiac = getZodiacSign(deployDate)
    const rng = mulberry32(hashString(sha + "horoscope"))

    // Try aztro API first
    try {
        const controller = new AbortController()
        const timeout = setTimeout(() => controller.abort(), 5000)

        const response = await fetch(
            `https://aztro.sameerkumar.website/?sign=${zodiac.sign.toLowerCase()}&day=today`,
            { method: "POST", signal: controller.signal },
        )
        clearTimeout(timeout)

        if (response.ok) {
            const data = (await response.json()) as {
                description: string
                mood: string
                lucky_number: string
                lucky_time: string
                color: string
                compatibility: string
            }
            return {
                sign: zodiac.sign,
                signEmoji: zodiac.emoji,
                dateRange: zodiac.range,
                horoscope: data.description,
                mood: data.mood,
                luckyNumber: parseInt(data.lucky_number) || Math.floor(rng() * 99) + 1,
                luckyTime: data.lucky_time,
                color: data.color,
                compatibility: data.compatibility,
            }
        }
    } catch {
        // Fallback to generated horoscope
    }

    // Fallback: deterministic from SHA
    const compatSigns = ZODIAC_SIGNS.filter((z) => z.sign !== zodiac.sign)

    return {
        sign: zodiac.sign,
        signEmoji: zodiac.emoji,
        dateRange: zodiac.range,
        horoscope: HOROSCOPE_TEMPLATES[Math.floor(rng() * HOROSCOPE_TEMPLATES.length)],
        mood: MOODS[Math.floor(rng() * MOODS.length)],
        luckyNumber: Math.floor(rng() * 99) + 1,
        luckyTime: LUCKY_TIMES[Math.floor(rng() * LUCKY_TIMES.length)],
        color: COLORS[Math.floor(rng() * COLORS.length)],
        compatibility: compatSigns[Math.floor(rng() * compatSigns.length)].sign,
    }
}

// ─── Layer 6: Natal Chart ───────────────────────────────────────────────────

const ASTRO_SIGNS = [
    "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
    "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces",
]

const PLANETS = [
    "Sun", "Moon", "Mercury", "Venus", "Mars",
    "Jupiter", "Saturn", "Uranus", "Neptune", "Pluto",
]

async function computeNatalChart(
    deployDate: Date,
    sha: string,
): Promise<NatalChartReading | null> {
    // Vercel iad1 = Ashburn, VA
    const lat = 39.0438
    const lon = -77.4874
    const apiKey = process.env.FREEASTRO_API_KEY

    // Try FreeAstroAPI
    if (apiKey) {
        try {
            const controller = new AbortController()
            const timeout = setTimeout(() => controller.abort(), 8000)

            const params = new URLSearchParams({
                year: String(deployDate.getFullYear()),
                month: String(deployDate.getMonth() + 1),
                day: String(deployDate.getDate()),
                hour: String(deployDate.getHours()),
                minute: String(deployDate.getMinutes()),
                latitude: String(lat),
                longitude: String(lon),
            })

            const response = await fetch(
                `https://api.freeastroapi.com/v1/natal-chart?${params}`,
                {
                    headers: { "X-Api-Key": apiKey },
                    signal: controller.signal,
                },
            )
            clearTimeout(timeout)

            if (response.ok) {
                const data = (await response.json()) as {
                    planets?: Array<{
                        name: string
                        sign: string
                        degree: number
                        house: number
                    }>
                    ascendant?: { sign: string }
                }
                if (data.planets) {
                    const sunPlanet = data.planets.find((p) => p.name === "Sun")
                    const moonPlanet = data.planets.find((p) => p.name === "Moon")

                    return {
                        location: "Ashburn, VA (Vercel iad1)",
                        sunSign: sunPlanet?.sign ?? getZodiacSign(deployDate).sign,
                        moonSign: moonPlanet?.sign ?? "Unknown",
                        risingSign: data.ascendant?.sign ?? "Unknown",
                        planets: data.planets.map((p) => ({
                            planet: p.name,
                            sign: p.sign,
                            degree: Math.round(p.degree * 100) / 100,
                            house: p.house,
                        })),
                    }
                }
            }
        } catch {
            // Fallback to generated chart
        }
    }

    // Deterministic fallback from SHA
    const rng = mulberry32(hashString(sha + "natal"))
    const planets: PlanetPosition[] = PLANETS.map((planet, i) => ({
        planet,
        sign: ASTRO_SIGNS[(hashString(sha + planet) + i) % 12],
        degree: Math.round(rng() * 29 * 100) / 100,
        house: (Math.floor(rng() * 12) + 1),
    }))

    const zodiac = getZodiacSign(deployDate)

    return {
        location: "Ashburn, VA (Vercel iad1)",
        sunSign: zodiac.sign,
        moonSign: planets.find((p) => p.planet === "Moon")?.sign ?? "Pisces",
        risingSign: ASTRO_SIGNS[Math.floor(rng() * 12)],
        planets,
    }
}

// ─── Familiar Selection ─────────────────────────────────────────────────────

function selectFamiliar(
    lifePath: number,
    deployHour: number,
): Familiar {
    const idx = (lifePath * 7 + deployHour) % familiarsList.length
    const raw = familiarsList[idx]
    return {
        id: raw.id,
        name: raw.name,
        emoji: raw.emoji,
        traits: raw.traits,
        behavior: raw.behavior,
    }
}

// ─── Main ───────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
    console.log("🔮 Deployment Divination System")
    console.log("================================\n")

    const sha = getGitSha()
    const timestamp = getTimestamp()
    const deployDate = new Date(timestamp)
    const diff = getDiffStats()
    const birthDate = getFirstCommitDate()

    console.log(`SHA: ${sha}`)
    console.log(`Timestamp: ${timestamp}`)
    console.log(`Diff: ${diff.filesChanged} files, +${diff.insertions} -${diff.deletions}`)
    console.log(`Repo birth: ${birthDate}\n`)

    // Compute all layers
    console.log("Computing numerology...")
    const numerology = computeNumerology(sha, timestamp)

    console.log("Drawing tarot spread...")
    const tarot = computeTarot(sha)

    console.log("Casting I Ching hexagram...")
    const iching = computeIChing(diff, sha)

    console.log("Calculating biorhythm...")
    const biorhythm = computeBiorhythm(deployDate, birthDate)

    console.log("Consulting the stars for horoscope...")
    const horoscope = await computeHoroscope(deployDate, sha)

    console.log("Charting the natal sky...")
    const natalChart = await computeNatalChart(deployDate, sha)

    console.log("Summoning familiar...")
    const familiar = selectFamiliar(numerology.lifePath, deployDate.getHours())

    const profile: DivinationProfile = {
        sha,
        timestamp,
        numerology,
        tarot,
        iching,
        biorhythm,
        horoscope,
        natalChart,
        familiar,
    }

    // Write to Redis
    const redisUrl = process.env.UPSTASH_REDIS_REST_URL
    const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN

    if (redisUrl && redisToken) {
        console.log("\nWriting to Redis...")
        const redis = new Redis({ url: redisUrl, token: redisToken })

        // Store latest
        await redis.set("divination:latest", JSON.stringify(profile))

        // Store by SHA (30 day expiry)
        await redis.set(`divination:${sha.slice(0, 8)}`, JSON.stringify(profile), {
            ex: 30 * 24 * 60 * 60,
        })

        // Add to history sorted set (score = timestamp)
        await redis.zadd("divination:history", {
            score: deployDate.getTime(),
            member: sha.slice(0, 8),
        })

        // Trim history to last 20
        const count = await redis.zcard("divination:history")
        if (count > 20) {
            await redis.zremrangebyrank("divination:history", 0, count - 21)
        }

        console.log("✅ Divination written to Redis")
    } else {
        console.log("\n⚠️  No Redis credentials found. Printing profile to stdout:\n")
        console.log(JSON.stringify(profile, null, 2))
    }

    // Summary
    console.log("\n═══════════════════════════════")
    console.log(`🔢 Life Path: ${numerology.lifePath} — ${numerology.interpretation}`)
    console.log(`🃏 Tarot: ${tarot.cards.map((c) => c.name).join(" → ")}`)
    console.log(`☯️  I Ching: Hexagram ${iching.hexagramNumber} — ${iching.name}`)
    console.log(`📊 Biorhythm: ${biorhythm.overallPercentage}% overall`)
    console.log(`${horoscope.signEmoji} Horoscope: ${horoscope.sign} — Mood: ${horoscope.mood}`)
    console.log(`${familiar.emoji} Familiar: ${familiar.name}`)
    console.log("═══════════════════════════════\n")
}

main().catch((err) => {
    console.error("Divination failed:", err)
    process.exit(1)
})
