import type { VercelRequest, VercelResponse } from "@vercel/node"

import { cachedRead, isConfigured } from "./lib/redisGateway"

const VISITOR_COUNT_CACHE_KEY = "cache:visitor-count"
const VISITOR_COUNT_CACHE_TTL = 60

export default async function handler(
    req: VercelRequest,
    res: VercelResponse
): Promise<void> {
    res.setHeader("Access-Control-Allow-Origin", "*")
    res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS")
    res.setHeader("Cache-Control", "public, s-maxage=60, stale-while-revalidate=300")

    if (req.method === "OPTIONS") {
        res.status(200).end()
        return
    }

    if (req.method !== "GET") {
        res.status(405).json({ ok: false, error: "Method not allowed" })
        return
    }

    if (!isConfigured()) {
        res.status(200).json({ ok: false, count: 0 })
        return
    }

    try {
        const result = await cachedRead<number>(
            VISITOR_COUNT_CACHE_KEY,
            VISITOR_COUNT_CACHE_TTL,
            async (client) => {
                const count = await client.get<number>("stats:views:total")
                return count ?? 0
            }
        )

        res.status(200).json({
            ok: true,
            count: result.data ?? 0,
        })
    } catch (error) {
        console.error("Visitor count error:", error)
        res.status(200).json({ ok: false, count: 0 })
    }
}
