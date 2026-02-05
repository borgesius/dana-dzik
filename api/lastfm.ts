import type { VercelRequest, VercelResponse } from "@vercel/node"

interface LastFmTrack {
    name: string
    artist: { "#text": string }
    album: { "#text": string }
    image: Array<{ "#text": string; size: string }>
    "@attr"?: { nowplaying: string }
}

interface LastFmResponse {
    recenttracks: {
        track: LastFmTrack[]
    }
}

export default async function handler(
    req: VercelRequest,
    res: VercelResponse
): Promise<void> {
    res.setHeader("Access-Control-Allow-Origin", "*")
    res.setHeader("Access-Control-Allow-Methods", "GET")
    res.setHeader("Cache-Control", "s-maxage=30, stale-while-revalidate=60")

    if (req.method === "OPTIONS") {
        res.status(200).end()
        return
    }

    const apiKey = process.env.LASTFM_API_KEY
    const username = process.env.LASTFM_USERNAME

    if (!apiKey || !username) {
        res.status(200).json({ ok: false, error: "Last.fm not configured" })
        return
    }

    try {
        const url = `https://ws.audioscrobbler.com/2.0/?method=user.getrecenttracks&user=${username}&api_key=${apiKey}&format=json&limit=1`
        const response = await fetch(url)

        if (!response.ok) {
            throw new Error(`Last.fm API error: ${response.status}`)
        }

        const data = (await response.json()) as LastFmResponse
        const track = data.recenttracks.track[0]

        if (!track) {
            res.status(200).json({ ok: true, data: null })
            return
        }

        const isPlaying = track["@attr"]?.nowplaying === "true"
        const image = track.image.find((i) => i.size === "medium")

        res.status(200).json({
            ok: true,
            data: {
                name: track.name,
                artist: track.artist["#text"],
                album: track.album["#text"],
                image: image?.["#text"] || null,
                isPlaying,
            },
        })
    } catch (error) {
        console.error("Last.fm API error:", error)
        res.status(500).json({
            ok: false,
            error: error instanceof Error ? error.message : "Unknown error",
        })
    }
}
