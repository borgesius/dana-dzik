import type { VercelRequest, VercelResponse } from "@vercel/node"
import type { Redis } from "@upstash/redis"

import {
    cachedRead,
    getRedis,
    isConfigured,
    prefixKey,
} from "./lib/redisGateway"

// ─── Configuration ──────────────────────────────────────────────────────────

/** Max achievements a single POST can report */
const MAX_ACHIEVEMENTS_PER_REQUEST = 50

/** TTL for per-visitor dedup key (1 hour) */
const DEDUP_TTL_SECONDS = 3600

/** Cache TTL for the GET counts response (5 minutes) */
const COUNTS_CACHE_TTL = 300

const COUNTS_CACHE_KEY = "achiev:counts:cache"

// ─── Validation ─────────────────────────────────────────────────────────────

const VALID_ID_PATTERN = /^[a-z0-9-]+$/

function isValidAchievementId(id: unknown): id is string {
    return (
        typeof id === "string" &&
        id.length > 0 &&
        id.length <= 64 &&
        VALID_ID_PATTERN.test(id)
    )
}

// ─── Handler ────────────────────────────────────────────────────────────────

export default async function handler(
    req: VercelRequest,
    res: VercelResponse
): Promise<void> {
    res.setHeader("Access-Control-Allow-Origin", "*")
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
    res.setHeader(
        "Access-Control-Allow-Headers",
        "Content-Type, X-Visitor-Id"
    )

    if (req.method === "OPTIONS") {
        res.status(200).end()
        return
    }

    if (!isConfigured()) {
        res.status(200).json({ ok: false, error: "Not configured" })
        return
    }

    try {
        if (req.method === "POST") {
            await handlePost(req, res)
            return
        }

        if (req.method === "GET") {
            await handleGet(res)
            return
        }

        res.status(405).json({ ok: false, error: "Method not allowed" })
    } catch (error) {
        console.error("Achievement counts error:", error)
        res.status(500).json({
            ok: false,
            error: error instanceof Error ? error.message : "Unknown error",
        })
    }
}

// ─── POST: Report earned achievements ───────────────────────────────────────

async function handlePost(
    req: VercelRequest,
    res: VercelResponse
): Promise<void> {
    const visitorId = (req.headers["x-visitor-id"] as string) || ""
    if (!visitorId) {
        res.status(200).json({ ok: true, skipped: "no_visitor_id" })
        return
    }

    const body = req.body as { achievements?: unknown }
    if (
        !body?.achievements ||
        !Array.isArray(body.achievements) ||
        body.achievements.length === 0
    ) {
        res.status(200).json({ ok: true, skipped: "empty" })
        return
    }

    const ids = body.achievements
        .filter(isValidAchievementId)
        .slice(0, MAX_ACHIEVEMENTS_PER_REQUEST)

    if (ids.length === 0) {
        res.status(200).json({ ok: true, skipped: "invalid" })
        return
    }

    // Dedup: skip if this visitor already reported recently
    const client = getRedis()
    if (!client) {
        res.status(200).json({ ok: false, error: "no_redis" })
        return
    }

    const dedupKey = prefixKey(`achiev:dedup:${visitorId}`)
    const alreadyReported = await client.get<number>(dedupKey)
    if (alreadyReported) {
        // Still record new achievements even within dedup window,
        // but skip re-adding to active-users
        await recordAchievements(client, visitorId, ids, false)
        res.status(200).json({ ok: true, recorded: ids.length, dedup: true })
        return
    }

    await client.set(dedupKey, 1, { ex: DEDUP_TTL_SECONDS })
    await recordAchievements(client, visitorId, ids, true)

    res.status(200).json({ ok: true, recorded: ids.length })
}

async function recordAchievements(
    client: Redis,
    visitorId: string,
    ids: string[],
    addToActive: boolean
): Promise<void> {
    const pipeline = client.pipeline()

    for (const id of ids) {
        pipeline.sadd(prefixKey(`achiev:users:${id}`), visitorId)
    }

    if (addToActive) {
        pipeline.sadd(prefixKey("achiev:active-users"), visitorId)
    }

    await pipeline.exec()
}

// ─── GET: Fetch achievement completion counts ───────────────────────────────

interface AchievementCounts {
    counts: Record<string, number>
    totalUsers: number
}

async function handleGet(res: VercelResponse): Promise<void> {
    const result = await cachedRead<AchievementCounts>(
        COUNTS_CACHE_KEY,
        COUNTS_CACHE_TTL,
        fetchCounts
    )

    if (!result.data) {
        res.status(200).json({
            ok: true,
            data: { counts: {}, totalUsers: 0 },
            cached: false,
        })
        return
    }

    res.status(200).json({
        ok: true,
        data: result.data,
        cached: result.fromCache,
    })
}

async function fetchCounts(client: Redis): Promise<AchievementCounts> {
    const prefix = prefixKey("achiev:users:")
    const counts: Record<string, number> = {}

    let cursor = 0
    do {
        const [nextCursor, keys] = await client.scan(cursor, {
            match: `${prefix}*`,
            count: 200,
        })
        cursor = typeof nextCursor === "string" ? parseInt(nextCursor, 10) : nextCursor

        if (keys.length > 0) {
            const pipeline = client.pipeline()
            for (const key of keys) {
                pipeline.scard(key)
            }
            const results = await pipeline.exec<number[]>()

            for (let i = 0; i < keys.length; i++) {
                const id = keys[i].slice(prefix.length)
                counts[id] = results[i] ?? 0
            }
        }
    } while (cursor !== 0)

    const totalUsers = await client.scard(prefixKey("achiev:active-users"))

    return { counts, totalUsers }
}
