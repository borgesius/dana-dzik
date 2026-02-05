import { LASTFM_POLL_INTERVAL } from "../config"

const LASTFM_API_KEY = import.meta.env.VITE_LASTFM_API_KEY
const LASTFM_USERNAME = import.meta.env.VITE_LASTFM_USERNAME

interface LastFmTrack {
    name: string
    artist: { "#text": string }
    "@attr"?: { nowplaying: string }
}

interface LastFmResponse {
    recenttracks: {
        track: LastFmTrack[]
    }
}

/** Initializes the "Now Playing" display with Last.fm data. */
export function initNowPlaying(): void {
    const container = document.getElementById("now-playing-text")
    if (!container) return

    if (!LASTFM_API_KEY || !LASTFM_USERNAME) {
        container.textContent = "Last.fm not configured"
        return
    }

    void fetchNowPlaying(container)
    setInterval(() => void fetchNowPlaying(container), LASTFM_POLL_INTERVAL)
}

async function fetchNowPlaying(container: HTMLElement): Promise<void> {
    try {
        const url = `https://ws.audioscrobbler.com/2.0/?method=user.getrecenttracks&user=${LASTFM_USERNAME}&api_key=${LASTFM_API_KEY}&format=json&limit=1`
        const response = await fetch(url)
        const data = (await response.json()) as LastFmResponse

        const track = data.recenttracks.track[0]
        if (track) {
            const isPlaying = track["@attr"]?.nowplaying === "true"
            const prefix = isPlaying ? "🎵 Now playing: " : "🎵 Last played: "
            container.textContent = `${prefix}${track.name} - ${track.artist["#text"]}`
        }
    } catch {
        container.textContent = "Could not load Last.fm data"
    }
}
