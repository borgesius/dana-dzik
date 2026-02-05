/**
 * Strava integration with race equivalency calculations.
 *
 * Race equivalency uses the Riegel formula: T2 = T1 × (D2/D1)^1.06
 * This predicts equivalent race times across different distances.
 */

/** Standard race distances in meters */
const RACE_DISTANCES = {
    "5K": 5000,
    "10K": 10000,
    "Half Marathon": 21097.5,
    Marathon: 42195,
} as const

type RaceDistance = keyof typeof RACE_DISTANCES

interface StravaActivity {
    id: number
    name: string
    type: string
    distance: number
    moving_time: number
    elapsed_time: number
    start_date: string
    average_speed: number
}

interface RaceEquivalent {
    distance: RaceDistance
    predictedTime: number
    formattedTime: string
}

interface BestActivity {
    activity: StravaActivity
    equivalentTimes: RaceEquivalent[]
    bestEquivalent: RaceEquivalent
    fitnessScore: number
}

interface StravaApiResponse {
    ok: boolean
    data: {
        name: string
        date: string
        equivalent5k: string
        equivalent10k: string
        equivalentHalf: string
        equivalentMarathon: string
    } | null
}

/**
 * Calculates race equivalency using Riegel formula.
 * @param knownTime - Known time in seconds
 * @param knownDistance - Known distance in meters
 * @param targetDistance - Target distance in meters
 */
export function calculateEquivalentTime(
    knownTime: number,
    knownDistance: number,
    targetDistance: number
): number {
    return knownTime * Math.pow(targetDistance / knownDistance, 1.06)
}

/**
 * Formats seconds into HH:MM:SS or MM:SS.
 */
export function formatTime(seconds: number): string {
    const hrs = Math.floor(seconds / 3600)
    const mins = Math.floor((seconds % 3600) / 60)
    const secs = Math.floor(seconds % 60)

    if (hrs > 0) {
        return `${hrs}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
    }
    return `${mins}:${secs.toString().padStart(2, "0")}`
}

/**
 * Calculates a fitness score based on 5K equivalent time.
 * Lower is better (faster runner).
 */
function calculateFitnessScore(activity: StravaActivity): number {
    const equivalent5K = calculateEquivalentTime(
        activity.moving_time,
        activity.distance,
        RACE_DISTANCES["5K"]
    )
    return equivalent5K
}

/**
 * Gets race equivalents for an activity.
 */
function getRaceEquivalents(activity: StravaActivity): RaceEquivalent[] {
    return (Object.entries(RACE_DISTANCES) as [RaceDistance, number][]).map(
        ([distance, meters]) => {
            const predictedTime = calculateEquivalentTime(
                activity.moving_time,
                activity.distance,
                meters
            )
            return {
                distance,
                predictedTime,
                formattedTime: formatTime(predictedTime),
            }
        }
    )
}

/**
 * Finds the best recent activity by race equivalency.
 * "Best" = fastest equivalent 5K time.
 */
export function findBestActivity(
    activities: StravaActivity[]
): BestActivity | null {
    const runs = activities.filter(
        (a) => a.type === "Run" && a.distance >= 1000
    )

    if (runs.length === 0) return null

    let bestActivity: StravaActivity | null = null
    let bestScore = Infinity

    for (const activity of runs) {
        const score = calculateFitnessScore(activity)
        if (score < bestScore) {
            bestScore = score
            bestActivity = activity
        }
    }

    if (!bestActivity) return null

    const equivalentTimes = getRaceEquivalents(bestActivity)
    const bestEquivalent = equivalentTimes[0]

    return {
        activity: bestActivity,
        equivalentTimes,
        bestEquivalent,
        fitnessScore: bestScore,
    }
}

/**
 * Initializes Strava display in the toolbar using the serverless API.
 */
export async function initStrava(): Promise<void> {
    const container = document.getElementById("strava-activity")
    if (!container) return

    try {
        const response = await fetch("/api/strava")

        const contentType = response.headers.get("content-type")
        if (!contentType?.includes("application/json")) {
            return
        }

        if (!response.ok) return

        const result = (await response.json()) as StravaApiResponse
        if (!result.ok || !result.data) return

        const best = result.data
        const date = new Date(best.date).toLocaleDateString()
        container.textContent = `🏃 Best: ${best.equivalent5k} 5K eq (${date})`
        container.title = `${best.name}\n5K: ${best.equivalent5k}\n10K: ${best.equivalent10k}\nHalf: ${best.equivalentHalf}\nMarathon: ${best.equivalentMarathon}`
    } catch {
        // Silently fail - Strava is optional
    }
}
