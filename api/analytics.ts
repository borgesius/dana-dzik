import type { VercelRequest, VercelResponse } from "@vercel/node"
import type { Redis } from "@upstash/redis"

import { cachedRead, isConfigured, throttledWrite } from "./lib/redisGateway"

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
    res.setHeader(
        "Access-Control-Allow-Headers",
        "Content-Type, X-Analytics-Token, X-Visitor-Id"
    )

    if (req.method === "OPTIONS") {
        res.status(200).end()
        return
    }

    if (!isConfigured()) {
        res.status(200).json({ ok: false, error: "Analytics not configured" })
        return
    }

    try {
        if (req.method === "POST") {
            const token = req.headers["x-analytics-token"]
            if (token !== "dk-analytics-2026") {
                res.status(200).json({ ok: true, skipped: "unauthorized" })
                return
            }

            if (isBot(req.headers["user-agent"])) {
                res.status(200).json({ ok: true, skipped: "bot" })
                return
            }

            const event = req.body as AnalyticsEvent
            const visitorId =
                (req.headers["x-visitor-id"] as string) || "unknown"

            const result = await throttledWrite(
                visitorId,
                event.type,
                (client) => recordEvent(client, event)
            )

            res.status(200).json({
                ok: true,
                recorded: result.recorded,
                reason: result.reason,
            })
            return
        }

        if (req.method === "GET") {
            const result = await cachedRead<Stats>(
                STATS_CACHE_KEY,
                STATS_CACHE_TTL,
                getStats
            )

            if (!result.data) {
                res.status(200).json({
                    ok: true,
                    data: null,
                    error: "Stats temporarily unavailable",
                })
                return
            }

            res.status(200).json({
                ok: true,
                data: result.data,
                cached: result.fromCache,
            })
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

async function recordEvent(
    client: Redis,
    event: AnalyticsEvent
): Promise<void> {
    const today = new Date().toISOString().split("T")[0]

    switch (event.type) {
        case "pageview":
            await client.incr("stats:views:total")
            await client.incr(`stats:views:daily:${today}`)
            break

        case "window":
            if (event.windowId) {
                await client.hincrby("stats:windows", event.windowId, 1)
            }
            break

        case "funnel":
            if (event.funnelStep) {
                await client.hincrby("stats:funnel", event.funnelStep, 1)
            }
            break

        case "ab_assign":
            if (event.variant) {
                await client.hincrby("stats:ab:assigned", event.variant, 1)
            }
            break

        case "ab_convert":
            if (event.variant) {
                await client.hincrby("stats:ab:converted", event.variant, 1)
            }
            break

        case "perf":
            if (event.perf) {
                await client.hincrby("stats:perf:counts", event.perf.type, 1)
                await client.hincrby(
                    "stats:perf:totals",
                    event.perf.type,
                    event.perf.duration
                )
            }
            break
    }
}

async function getStats(client: Redis): Promise<Stats> {
    const [
        totalViews,
        windowViews,
        funnel,
        abAssigned,
        abConverted,
        perfCounts,
        perfTotals,
    ] = await Promise.all([
        client.get<number>("stats:views:total"),
        client.hgetall<Record<string, number>>("stats:windows"),
        client.hgetall<Record<string, number>>("stats:funnel"),
        client.hgetall<Record<string, number>>("stats:ab:assigned"),
        client.hgetall<Record<string, number>>("stats:ab:converted"),
        client.hgetall<Record<string, number>>("stats:perf:counts"),
        client.hgetall<Record<string, number>>("stats:perf:totals"),
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
        return { avgLoadTime: 0, byType: {} }
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

    const avgLoadTime =
        totalCount > 0 ? Math.round(totalDuration / totalCount) : 0

    return {
        avgLoadTime,
        byType,
    }
}
