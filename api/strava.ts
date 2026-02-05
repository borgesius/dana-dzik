import type { VercelRequest, VercelResponse } from "@vercel/node"
import { Redis } from "@upstash/redis"

interface TokenResponse {
    access_token: string
    refresh_token: string
    expires_at: number
    expires_in: number
}

interface StravaActivity {
    id: number
    name: string
    type: string
    distance: number
    moving_time: number
    elapsed_time: number
    start_date: string
    average_speed: number
    total_elevation_gain: number
    average_watts?: number
    weighted_average_watts?: number
    device_watts?: boolean
}

interface CachedTokens {
    accessToken: string
    refreshToken: string
    expiresAt: number
}

const REDIS_KEY = "strava_tokens"
const STATS_CACHE_KEY = "strava_stats"
const STATS_TTL_SECONDS = 6 * 60 * 60

function getRedis(): Redis | null {
    const url = process.env.UPSTASH_REDIS_REST_URL
    const token = process.env.UPSTASH_REDIS_REST_TOKEN
    if (!url || !token) return null
    return new Redis({ url, token })
}

async function getAccessToken(): Promise<string> {
    const now = Math.floor(Date.now() / 1000)
    const redis = getRedis()

    const cached = redis ? await redis.get<CachedTokens>(REDIS_KEY) : null
    if (cached && cached.expiresAt > now + 60) {
        return cached.accessToken
    }

    const clientId = process.env.STRAVA_CLIENT_ID
    const clientSecret = process.env.STRAVA_CLIENT_SECRET
    const refreshToken = cached?.refreshToken || process.env.STRAVA_REFRESH_TOKEN

    if (!clientId || !clientSecret || !refreshToken) {
        throw new Error("Strava credentials not configured")
    }

    const response = await fetch("https://www.strava.com/oauth/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
            client_id: clientId,
            client_secret: clientSecret,
            grant_type: "refresh_token",
            refresh_token: refreshToken,
        }),
    })

    if (!response.ok) {
        const body = await response.text()
        throw new Error(`Token refresh failed: ${response.status} - ${body}`)
    }

    const data = (await response.json()) as TokenResponse

    if (redis) {
        await redis.set<CachedTokens>(REDIS_KEY, {
            accessToken: data.access_token,
            refreshToken: data.refresh_token,
            expiresAt: data.expires_at,
        })
    }

    return data.access_token
}

async function fetchActivities(token: string): Promise<StravaActivity[]> {
    const response = await fetch(
        "https://www.strava.com/api/v3/athlete/activities?per_page=100",
        {
            headers: { Authorization: `Bearer ${token}` },
        }
    )

    if (!response.ok) {
        throw new Error(`Strava API error: ${response.status}`)
    }

    return (await response.json()) as StravaActivity[]
}

const THREE_MONTHS_MS = 90 * 24 * 60 * 60 * 1000

function calculateEquivalentTime(
    knownTime: number,
    knownDistance: number,
    targetDistance: number
): number {
    return knownTime * Math.pow(targetDistance / knownDistance, 1.06)
}

function formatTime(seconds: number): string {
    const hrs = Math.floor(seconds / 3600)
    const mins = Math.floor((seconds % 3600) / 60)
    const secs = Math.floor(seconds % 60)

    if (hrs > 0) {
        return `${hrs}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
    }
    return `${mins}:${secs.toString().padStart(2, "0")}`
}

function formatDistance(meters: number): string {
    const miles = meters / 1609.34
    return `${miles.toFixed(1)} mi`
}

function formatPace(metersPerSecond: number): string {
    const minPerMile = 1609.34 / metersPerSecond / 60
    const mins = Math.floor(minPerMile)
    const secs = Math.round((minPerMile - mins) * 60)
    return `${mins}:${secs.toString().padStart(2, "0")}/mi`
}

function formatSpeed(metersPerSecond: number): string {
    const mph = metersPerSecond * 2.237
    return `${mph.toFixed(1)} mph`
}

interface ActivitySummary {
    name: string
    date: string
    value: string
    detail?: string
}

interface StravaStats {
    bestRun: ActivitySummary | null
    bestRide: ActivitySummary | null
    longestRide: ActivitySummary | null
}

function filterRecent(activities: StravaActivity[]): StravaActivity[] {
    const cutoff = Date.now() - THREE_MONTHS_MS
    return activities.filter((a) => new Date(a.start_date).getTime() > cutoff)
}

function findBestRun(activities: StravaActivity[]): ActivitySummary | null {
    const runs = activities.filter((a) => a.type === "Run" && a.distance >= 1000)
    if (runs.length === 0) return null

    let best: StravaActivity | null = null
    let bestScore = Infinity

    for (const run of runs) {
        const eq5k = calculateEquivalentTime(run.moving_time, run.distance, 5000)
        if (eq5k < bestScore) {
            bestScore = eq5k
            best = run
        }
    }

    if (!best) return null

    return {
        name: best.name,
        date: best.start_date,
        value: `${formatDistance(best.distance)} in ${formatTime(best.moving_time)}`,
        detail: formatPace(best.average_speed),
    }
}

function formatElevation(meters: number): string {
    const feet = meters * 3.281
    return `${Math.round(feet).toLocaleString()} ft`
}

function findBestRide(activities: StravaActivity[]): ActivitySummary | null {
    const rides = activities.filter(
        (a) =>
            a.type === "Ride" &&
            a.moving_time >= 600 &&
            (a.distance >= 5000 || a.device_watts)
    )
    if (rides.length === 0) return null

    const ridesWithPower = rides.filter((r) => r.device_watts && r.weighted_average_watts)

    if (ridesWithPower.length > 0) {
        let best: StravaActivity | null = null
        let bestPower = 0

        for (const ride of ridesWithPower) {
            const np = ride.weighted_average_watts ?? 0
            if (np > bestPower) {
                bestPower = np
                best = ride
            }
        }

        if (best) {
            return {
                name: best.name,
                date: best.start_date,
                value: `${best.weighted_average_watts}W NP`,
                detail: `${formatDistance(best.distance)} ↑${formatElevation(best.total_elevation_gain)}`,
            }
        }
    }

    let best: StravaActivity | null = null
    let bestSpeed = 0

    for (const ride of rides) {
        if (ride.average_speed > bestSpeed) {
            bestSpeed = ride.average_speed
            best = ride
        }
    }

    if (!best) return null

    return {
        name: best.name,
        date: best.start_date,
        value: `${formatSpeed(best.average_speed)} avg`,
        detail: `${formatDistance(best.distance)} ↑${formatElevation(best.total_elevation_gain)}`,
    }
}

function findLongestRide(activities: StravaActivity[]): ActivitySummary | null {
    const rides = activities.filter((a) => a.type === "Ride")
    if (rides.length === 0) return null

    let longest: StravaActivity | null = null
    let maxDistance = 0

    for (const ride of rides) {
        if (ride.distance > maxDistance) {
            maxDistance = ride.distance
            longest = ride
        }
    }

    if (!longest) return null

    return {
        name: longest.name,
        date: longest.start_date,
        value: formatDistance(longest.distance),
        detail: `${formatTime(longest.moving_time)} @ ${formatSpeed(longest.average_speed)}`,
    }
}

function computeStats(activities: StravaActivity[]): StravaStats {
    const recent = filterRecent(activities)
    return {
        bestRun: findBestRun(recent),
        bestRide: findBestRide(recent),
        longestRide: findLongestRide(recent),
    }
}

export default async function handler(
    req: VercelRequest,
    res: VercelResponse
): Promise<void> {
    res.setHeader("Access-Control-Allow-Origin", "*")
    res.setHeader("Access-Control-Allow-Methods", "GET")
    res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=600")

    if (req.method === "OPTIONS") {
        res.status(200).end()
        return
    }

    const redis = getRedis()

    try {
        const forceRefresh = req.query.refresh === "true"

        if (!forceRefresh && redis) {
            const cached = await redis.get<StravaStats>(STATS_CACHE_KEY)
            if (cached) {
                res.status(200).json({ ok: true, data: cached, cached: true })
                return
            }
        }

        const token = await getAccessToken()
        const activities = await fetchActivities(token)
        const stats = computeStats(activities)

        if (redis) {
            await redis.set(STATS_CACHE_KEY, stats, { ex: STATS_TTL_SECONDS })
        }

        res.status(200).json({ ok: true, data: stats, cached: false })
    } catch (error) {
        console.error("Strava API error:", error)
        res.status(500).json({
            ok: false,
            error: error instanceof Error ? error.message : "Unknown error",
        })
    }
}
