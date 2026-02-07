import { createWidgetFrame } from "./WidgetFrame"

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
    error?: string
}

export class NowPlayingWidget {
    private widget: HTMLElement

    constructor() {
        this.widget = createWidgetFrame(
            "🎧 Recently Played (3mo)",
            "now-playing-widget"
        )

        const content = document.createElement("div")
        content.className = "widget-content recently-played"
        content.innerHTML = `<div class="rp-loading">Loading...</div>`

        this.widget.appendChild(content)
        void this.fetchTopTracks(content)
    }

    public getElement(): HTMLElement {
        return this.widget
    }

    private async fetchTopTracks(content: HTMLElement): Promise<void> {
        try {
            const response = await fetch("/api/lastfm")

            const contentType = response.headers.get("content-type")
            if (!contentType?.includes("application/json")) {
                content.innerHTML = `<div class="rp-loading">API not available</div>`
                return
            }

            // SAFETY: response shape controlled by our /api/lastfm endpoint
            const result = (await response.json()) as LastFmApiResponse

            if (!result.ok || !result.data?.tracks.length) {
                content.innerHTML = `<div class="rp-loading">No data</div>`
                return
            }

            const [top, ...rest] = result.data.tracks

            const restHtml = rest
                .map(
                    (t, i) => `
                <div class="rp-item">
                    <span class="rp-rank">${i + 2}</span>
                    <div class="rp-item-info">
                        <span class="rp-item-track">${t.name}</span>
                        <span class="rp-item-artist">${t.artist}</span>
                    </div>
                </div>`
                )
                .join("")

            content.innerHTML = `
                <div class="rp-top">
                    <img class="rp-cover" src="${top.image || "/assets/icons/cd.png"}" alt="Album" onerror="this.src='/assets/icons/cd.png'" />
                    <div class="rp-top-info">
                        <span class="rp-top-rank">1</span>
                        <div class="rp-top-text">
                            <div class="rp-top-track">${top.name}</div>
                            <div class="rp-top-artist">${top.artist}</div>
                        </div>
                    </div>
                </div>
                <div class="rp-list">${restHtml}</div>
            `
        } catch {
            content.innerHTML = `<div class="rp-loading">Offline</div>`
        }
    }
}
