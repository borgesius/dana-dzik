interface TopTrack {
    name: string
    artist: string
    image: string | null
    playcount: number
}

interface LastFmApiResponse {
    ok: boolean
    data: {
        tracks: TopTrack[]
    } | null
}

export function initNowPlaying(): void {
    const container = document.getElementById("now-playing-text")
    if (!container) return

    void fetchTopTracks(container)
}

async function fetchTopTracks(container: HTMLElement): Promise<void> {
    try {
        const response = await fetch("/api/lastfm")

        const contentType = response.headers.get("content-type")
        if (!contentType?.includes("application/json")) {
            container.textContent = "API not available"
            return
        }

        const result = (await response.json()) as LastFmApiResponse

        if (!result.ok || !result.data?.tracks.length) {
            container.textContent = "No recent tracks"
            return
        }

        const lines = result.data.tracks
            .map((t, i) => `${i + 1}. ${t.name} – ${t.artist}`)
            .join("\n")

        container.textContent = lines
        container.style.whiteSpace = "pre-line"
    } catch {
        container.textContent = "Could not load Last.fm data"
    }
}
