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

interface DeezerSearchResponse {
    data?: Array<{
        album: { cover_big?: string; cover_medium?: string }
        artist: { picture_big?: string; picture_medium?: string }
    }>
}

const LASTFM_DEFAULT_IMAGE_HASH = "2a96cbd8b46e442fc41c2b86b821562f"

function isDefaultImage(url: string | null): boolean {
    return !url || url.includes(LASTFM_DEFAULT_IMAGE_HASH)
}

function pickLastFmImage(
    images: Array<{ "#text": string; size: string }>
): string | null {
    const img =
        images.find((i) => i.size === "large") ||
        images.find((i) => i.size === "medium")
    const url = img?.["#text"] || null
    return isDefaultImage(url) ? null : url
}

async function fetchDeezerArt(
    track: string,
    artist: string
): Promise<string | null> {
    try {
        const query = encodeURIComponent(`artist:"${artist}" track:"${track}"`)
        const url = `https://api.deezer.com/search?q=${query}&limit=1`
        const response = await fetch(url)
        if (!response.ok) return null

        const data = (await response.json()) as DeezerSearchResponse
        const hit = data.data?.[0]
        if (!hit) return null

        return (
            hit.album?.cover_big ||
            hit.album?.cover_medium ||
            hit.artist?.picture_big ||
            hit.artist?.picture_medium ||
            null
        )
    } catch {
        return null
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

        const tracks = await Promise.all(
            top5.map(async (t) => {
                let image = pickLastFmImage(t.image)

                if (!image) {
                    image = await fetchDeezerArt(t.name, t.artist.name)
                }

                return {
                    name: t.name,
                    artist: t.artist.name,
                    image,
                    playcount: parseInt(t.playcount, 10),
                }
            })
        )

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
