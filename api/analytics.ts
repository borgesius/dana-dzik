import type { VercelRequest, VercelResponse } from "@vercel/node"
import { Redis } from "@upstash/redis"

const BOT_PATTERNS = [
    "bot",
    "crawl",
    "spider",
    "slurp",
    "facebookexternalhit",
    "linkedinbot",
    "twitterbot",
    "googlebot",
    "bingbot",
    "yandex",
    "baidu",
    "semrush",
    "ahref",
    "mj12bot",
    "dotbot",
    "petalbot",
    "bytespider",
    "gptbot",
    "claudebot",
    "headless",
    "phantom",
    "selenium",
    "puppeteer",
    "playwright",
    "lighthouse",
    "pagespeed",
]

function isBot(userAgent: string | undefined): boolean {
    if (!userAgent) return true
    const ua = userAgent.toLowerCase()
    return BOT_PATTERNS.some((pattern) => ua.includes(pattern))
}

function getRedis(): Redis | null {
    const url = process.env.UPSTASH_REDIS_REST_URL
    const token = process.env.UPSTASH_REDIS_REST_TOKEN
    if (!url || !token) return null
    return new Redis({ url, token })
}

interface AnalyticsEvent {
    type: "pageview" | "window" | "funnel" | "ab_assign" | "ab_convert" | "perf"
    windowId?: string
    funnelStep?: string
    variant?: string
    perf?: {
        resource: string
        duration: number
        type: string
    }
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
    perf: {
        avgLoadTime: number
        p95LoadTime: number
        byType: Record<string, { avg: number; count: number }>
    }
}

const STATS_CACHE_KEY = "stats:cache"
const STATS_CACHE_TTL = 300

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
            if (isBot(req.headers["user-agent"])) {
                res.status(200).json({ ok: true, skipped: "bot" })
                return
            }

            const event = req.body as AnalyticsEvent
            await recordEvent(redis, event)
            res.status(200).json({ ok: true })
            return
        }

        if (req.method === "GET") {
            const cached = await redis.get<Stats>(STATS_CACHE_KEY)
            if (cached) {
                res.status(200).json({ ok: true, data: cached, cached: true })
                return
            }

            const stats = await getStats(redis)
            await redis.set(STATS_CACHE_KEY, stats, { ex: STATS_CACHE_TTL })
            res.status(200).json({ ok: true, data: stats, cached: false })
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

        case "perf":
            if (event.perf) {
                await redis.hincrby("stats:perf:counts", event.perf.type, 1)
                await redis.hincrby(
                    "stats:perf:totals",
                    event.perf.type,
                    event.perf.duration
                )
            }
            break
    }
}

async function getStats(redis: Redis): Promise<Stats> {
    const [
        totalViews,
        windowViews,
        funnel,
        abAssigned,
        abConverted,
        perfCounts,
        perfTotals,
    ] = await Promise.all([
        redis.get<number>("stats:views:total"),
        redis.hgetall<Record<string, number>>("stats:windows"),
        redis.hgetall<Record<string, number>>("stats:funnel"),
        redis.hgetall<Record<string, number>>("stats:ab:assigned"),
        redis.hgetall<Record<string, number>>("stats:ab:converted"),
        redis.hgetall<Record<string, number>>("stats:perf:counts"),
        redis.hgetall<Record<string, number>>("stats:perf:totals"),
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

    const perf = computePerfStats(perfCounts || {}, perfTotals || {})

    return {
        totalViews: totalViews || 0,
        uniqueVisitors: 0,
        windowViews: windowViews || {},
        funnel: funnel || {},
        abTest: {
            name: "welcome_cta",
            variants,
        },
        perf,
    }
}

function computePerfStats(
    counts: Record<string, number>,
    totals: Record<string, number>
): Stats["perf"] {
    const types = Object.keys(counts)

    if (types.length === 0) {
        return { avgLoadTime: 0, p95LoadTime: 0, byType: {} }
    }

    const byType: Record<string, { avg: number; count: number }> = {}
    let totalCount = 0
    let totalDuration = 0

    for (const type of types) {
        const count = counts[type] || 0
        const total = totals[type] || 0
        const avg = count > 0 ? Math.round(total / count) : 0

        byType[type] = { avg, count }
        totalCount += count
        totalDuration += total
    }

    const avgLoadTime = totalCount > 0 ? Math.round(totalDuration / totalCount) : 0

    return {
        avgLoadTime,
        p95LoadTime: 0,
        byType,
    }
}
