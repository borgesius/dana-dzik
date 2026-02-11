import { apiFetch } from "../../lib/api/client"
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
        const content = document.createElement("div")
        content.className = "widget-content recently-played"
        content.innerHTML = `<div class="rp-loading">Expand to load</div>`

        this.widget = createWidgetFrame(
            "🎧 Recently Played (3mo)",
            "now-playing-widget",
            {
                lazy: true,
                onFirstExpand: () => {
                    content.innerHTML = `<div class="rp-loading">Loading...</div>`
                    void this.fetchTopTracks(content)
                },
            }
        )

        this.widget.appendChild(content)
    }

    public getElement(): HTMLElement {
        return this.widget
    }

    private async fetchTopTracks(content: HTMLElement): Promise<void> {
        const res = await apiFetch<LastFmApiResponse>("/api/lastfm")

        if (!res.ok) {
            content.innerHTML = `<div class="rp-loading">Offline</div>`
            return
        }

        const result = res.data

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
    }
}
