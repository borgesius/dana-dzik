import type { VercelRequest, VercelResponse } from "@vercel/node"
import { Redis } from "@upstash/redis"

function getRedis(): Redis | null {
    const url = process.env.UPSTASH_REDIS_REST_URL
    const token = process.env.UPSTASH_REDIS_REST_TOKEN
    if (!url || !token) return null
    return new Redis({ url, token })
}

interface AnalyticsEvent {
    type: "pageview" | "window" | "funnel" | "ab_assign" | "ab_convert"
    windowId?: string
    funnelStep?: string
    variant?: string
}

interface Stats {
    totalViews: number
    uniqueVisitors: number
    windowViews: Record<string, number>
    funnel: Record<string, number>
    abTest: {
        name: string
        variants: Record<string, { assigned: number; converted: number }>
    }
}

export default async function handler(
    req: VercelRequest,
    res: VercelResponse
): Promise<void> {
    res.setHeader("Access-Control-Allow-Origin", "*")
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
    res.setHeader("Access-Control-Allow-Headers", "Content-Type")

    if (req.method === "OPTIONS") {
        res.status(200).end()
        return
    }

    const redis = getRedis()
    if (!redis) {
        res.status(200).json({ ok: false, error: "Analytics not configured" })
        return
    }

    try {
        if (req.method === "POST") {
            const event = req.body as AnalyticsEvent
            await recordEvent(redis, event)
            res.status(200).json({ ok: true })
            return
        }

        if (req.method === "GET") {
            const stats = await getStats(redis)
            res.status(200).json({ ok: true, data: stats })
            return
        }

        res.status(405).json({ ok: false, error: "Method not allowed" })
    } catch (error) {
        console.error("Analytics error:", error)
        res.status(500).json({
            ok: false,
            error: error instanceof Error ? error.message : "Unknown error",
        })
    }
}

async function recordEvent(redis: Redis, event: AnalyticsEvent): Promise<void> {
    const today = new Date().toISOString().split("T")[0]

    switch (event.type) {
        case "pageview":
            await redis.incr("stats:views:total")
            await redis.incr(`stats:views:daily:${today}`)
            break

        case "window":
            if (event.windowId) {
                await redis.hincrby("stats:windows", event.windowId, 1)
            }
            break

        case "funnel":
            if (event.funnelStep) {
                await redis.hincrby("stats:funnel", event.funnelStep, 1)
            }
            break

        case "ab_assign":
            if (event.variant) {
                await redis.hincrby("stats:ab:assigned", event.variant, 1)
            }
            break

        case "ab_convert":
            if (event.variant) {
                await redis.hincrby("stats:ab:converted", event.variant, 1)
            }
            break
    }
}

async function getStats(redis: Redis): Promise<Stats> {
    const [totalViews, windowViews, funnel, abAssigned, abConverted] =
        await Promise.all([
            redis.get<number>("stats:views:total"),
            redis.hgetall<Record<string, number>>("stats:windows"),
            redis.hgetall<Record<string, number>>("stats:funnel"),
            redis.hgetall<Record<string, number>>("stats:ab:assigned"),
            redis.hgetall<Record<string, number>>("stats:ab:converted"),
        ])

    const variants: Record<string, { assigned: number; converted: number }> = {}
    const variantKeys = new Set([
        ...Object.keys(abAssigned || {}),
        ...Object.keys(abConverted || {}),
    ])

    for (const key of variantKeys) {
        variants[key] = {
            assigned: (abAssigned || {})[key] || 0,
            converted: (abConverted || {})[key] || 0,
        }
    }

    return {
        totalViews: totalViews || 0,
        uniqueVisitors: 0,
        windowViews: windowViews || {},
        funnel: funnel || {},
        abTest: {
            name: "welcome_cta",
            variants,
        },
    }
}
