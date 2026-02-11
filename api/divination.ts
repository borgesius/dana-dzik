import type { VercelRequest, VercelResponse } from "@vercel/node"
import { cachedRead } from "./lib/redisGateway"

export default async function handler(
    req: VercelRequest,
    res: VercelResponse,
): Promise<void> {
    res.setHeader("Access-Control-Allow-Origin", "*")
    res.setHeader("Access-Control-Allow-Methods", "GET")
    res.setHeader(
        "Cache-Control",
        "s-maxage=3600, stale-while-revalidate=7200",
    )

    if (req.method === "OPTIONS") {
        res.status(200).end()
        return
    }

    try {
        const sha = typeof req.query.sha === "string" ? req.query.sha : null
        const cacheKey = sha ? `divination:${sha}` : "divination:latest"

        const result = await cachedRead<string>(
            `cache:${cacheKey}`,
            3600,
            async (client) => {
                const raw = await client.get<string>(cacheKey)
                return raw ?? "null"
            },
        )

        if (!result.data || result.data === "null") {
            res.status(200).json({
                ok: false,
                error: "No divination reading available yet",
            })
            return
        }

        // The data is stored as a JSON string, parse it
        const profile =
            typeof result.data === "string"
                ? JSON.parse(result.data)
                : result.data

        res.status(200).json({ ok: true, data: profile })
    } catch (error) {
        console.error("Divination API error:", error)
        res.status(500).json({
            ok: false,
            error: error instanceof Error ? error.message : "Unknown error",
        })
    }
}
