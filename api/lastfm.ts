import type { VercelRequest, VercelResponse } from "@vercel/node"

interface LastFmTopTrack {
    name: string
    playcount: string
    artist: { name: string }
    image: Array<{ "#text": string; size: string }>
}

interface LastFmTopTracksResponse {
    toptracks: {
        track: LastFmTopTrack[]
    }
}

function uniqueByArtist(
    tracks: LastFmTopTrack[],
    limit: number
): LastFmTopTrack[] {
    const seen = new Set<string>()
    const result: LastFmTopTrack[] = []

    for (const track of tracks) {
        if (result.length >= limit) break
        const artist = track.artist.name.toLowerCase()
        if (seen.has(artist)) continue
        seen.add(artist)
        result.push(track)
    }

    return result
}

export default async function handler(
    req: VercelRequest,
    res: VercelResponse
): Promise<void> {
    res.setHeader("Access-Control-Allow-Origin", "*")
    res.setHeader("Access-Control-Allow-Methods", "GET")
    res.setHeader(
        "Cache-Control",
        "s-maxage=3600, stale-while-revalidate=7200"
    )

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
        const url = `https://ws.audioscrobbler.com/2.0/?method=user.gettoptracks&user=${username}&api_key=${apiKey}&format=json&period=3month&limit=30`
        const response = await fetch(url)

        if (!response.ok) {
            throw new Error(`Last.fm API error: ${response.status}`)
        }

        const data = (await response.json()) as LastFmTopTracksResponse
        const rawTracks = data.toptracks.track

        if (!rawTracks?.length) {
            res.status(200).json({ ok: true, data: { tracks: [] } })
            return
        }

        const top5 = uniqueByArtist(rawTracks, 5)

        const tracks = top5.map((t) => {
            const image =
                t.image.find((i) => i.size === "large") ||
                t.image.find((i) => i.size === "medium")
            return {
                name: t.name,
                artist: t.artist.name,
                image: image?.["#text"] || null,
                playcount: parseInt(t.playcount, 10),
            }
        })

        res.status(200).json({
            ok: true,
            data: { tracks },
        })
    } catch (error) {
        console.error("Last.fm API error:", error)
        res.status(500).json({
            ok: false,
            error: error instanceof Error ? error.message : "Unknown error",
        })
    }
}
