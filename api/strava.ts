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
}

interface CachedTokens {
    accessToken: string
    refreshToken: string
    expiresAt: number
}

const REDIS_KEY = "strava_tokens"

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
        "https://www.strava.com/api/v3/athlete/activities?per_page=30",
        {
            headers: { Authorization: `Bearer ${token}` },
        }
    )

    if (!response.ok) {
        throw new Error(`Strava API error: ${response.status}`)
    }

    return (await response.json()) as StravaActivity[]
}

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

interface BestActivity {
    name: string
    date: string
    distance: number
    time: number
    equivalent5k: string
    equivalent10k: string
    equivalentHalf: string
    equivalentMarathon: string
}

function findBestActivity(activities: StravaActivity[]): BestActivity | null {
    const runs = activities.filter((a) => a.type === "Run" && a.distance >= 1000)

    if (runs.length === 0) return null

    let best: StravaActivity | null = null
    let bestScore = Infinity

    for (const activity of runs) {
        const eq5k = calculateEquivalentTime(activity.moving_time, activity.distance, 5000)
        if (eq5k < bestScore) {
            bestScore = eq5k
            best = activity
        }
    }

    if (!best) return null

    return {
        name: best.name,
        date: best.start_date,
        distance: best.distance,
        time: best.moving_time,
        equivalent5k: formatTime(calculateEquivalentTime(best.moving_time, best.distance, 5000)),
        equivalent10k: formatTime(calculateEquivalentTime(best.moving_time, best.distance, 10000)),
        equivalentHalf: formatTime(calculateEquivalentTime(best.moving_time, best.distance, 21097.5)),
        equivalentMarathon: formatTime(calculateEquivalentTime(best.moving_time, best.distance, 42195)),
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

    try {
        const token = await getAccessToken()
        const activities = await fetchActivities(token)
        const best = findBestActivity(activities)

        if (!best) {
            res.status(200).json({ ok: true, data: null })
            return
        }

        res.status(200).json({ ok: true, data: best })
    } catch (error) {
        console.error("Strava API error:", error)
        res.status(500).json({
            ok: false,
            error: error instanceof Error ? error.message : "Unknown error",
        })
    }
}
