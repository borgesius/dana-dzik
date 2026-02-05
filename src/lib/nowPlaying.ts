import { LASTFM_POLL_INTERVAL } from "../config"

interface LastFmApiResponse {
    ok: boolean
    data: {
        name: string
        artist: string
        isPlaying: boolean
    } | null
}

/** Initializes the "Now Playing" display with Last.fm data. */
export function initNowPlaying(): void {
    const container = document.getElementById("now-playing-text")
    if (!container) return

    void fetchNowPlaying(container)
    setInterval(() => void fetchNowPlaying(container), LASTFM_POLL_INTERVAL)
}

async function fetchNowPlaying(container: HTMLElement): Promise<void> {
    try {
        const response = await fetch("/api/lastfm")

        const contentType = response.headers.get("content-type")
        if (!contentType?.includes("application/json")) {
            container.textContent = "API not available"
            return
        }

        const result = (await response.json()) as LastFmApiResponse

        if (!result.ok || !result.data) {
            container.textContent = "No recent tracks"
            return
        }

        const track = result.data
        const prefix = track.isPlaying ? "🎵 Now playing: " : "🎵 Last played: "
        container.textContent = `${prefix}${track.name} - ${track.artist}`
    } catch {
        container.textContent = "Could not load Last.fm data"
    }
}
