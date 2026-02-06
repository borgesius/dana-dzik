import { LASTFM_POLL_INTERVAL } from "../config"

interface LastFmApiResponse {
    ok: boolean
    data: {
        name: string
        artist: string
        album: string
        image: string | null
        isPlaying: boolean
    } | null
    error?: string
}

interface ActivitySummary {
    name: string
    date: string
    value: string
    detail?: string
}

interface StravaApiResponse {
    ok: boolean
    data: {
        bestRun: ActivitySummary | null
        bestRide: ActivitySummary | null
        longestRide: ActivitySummary | null
    } | null
    error?: string
}

export class Widgets {
    private container: HTMLElement

    constructor(parent: HTMLElement) {
        this.container = document.createElement("div")
        this.container.className = "widgets-container"
        parent.appendChild(this.container)

        this.createAudioWidget()
        this.createNowPlayingWidget()
        this.createStravaWidget()
    }

    private createAudioWidget(): void {
        const widget = this.createWidgetFrame("🎵 Audio Player", "audio-widget")

        const content = document.createElement("div")
        content.className = "widget-content audio-player"
        content.innerHTML = `
            <div class="audio-visualizer">
                <div class="bar"></div>
                <div class="bar"></div>
                <div class="bar"></div>
                <div class="bar"></div>
                <div class="bar"></div>
                <div class="bar"></div>
                <div class="bar"></div>
                <div class="bar"></div>
            </div>
            <div class="audio-title">background.mid</div>
            <div class="audio-controls">
                <button class="audio-btn" id="audio-prev" title="Previous">⏮</button>
                <button class="audio-btn play-btn" id="audio-play" title="Play/Pause">▶</button>
                <button class="audio-btn" id="audio-next" title="Next">⏭</button>
                <button class="audio-btn" id="audio-stop" title="Stop">⏹</button>
            </div>
            <div class="audio-status">Stopped</div>
        `

        widget.appendChild(content)
        this.container.appendChild(widget)

        this.initAudioControls(content)
    }

    private initAudioControls(content: HTMLElement): void {
        const playBtn = content.querySelector(
            "#audio-play"
        ) as HTMLButtonElement
        const stopBtn = content.querySelector(
            "#audio-stop"
        ) as HTMLButtonElement
        const statusEl = content.querySelector(".audio-status") as HTMLElement
        const visualizer = content.querySelector(
            ".audio-visualizer"
        ) as HTMLElement

        let isPlaying = false

        const updateUI = (): void => {
            if (isPlaying) {
                playBtn.textContent = "⏸"
                statusEl.textContent = "Playing..."
                visualizer.classList.add("playing")
            } else {
                playBtn.textContent = "▶"
                statusEl.textContent = "Stopped"
                visualizer.classList.remove("playing")
            }
        }

        playBtn.addEventListener("click", () => {
            const audioManager = (
                window as unknown as {
                    audioManager?: {
                        toggleMidi: () => void
                        midiEnabled: boolean
                    }
                }
            ).audioManager
            if (audioManager) {
                audioManager.toggleMidi()
                isPlaying = !isPlaying
                updateUI()
            }
        })

        stopBtn.addEventListener("click", () => {
            const audioManager = (
                window as unknown as {
                    audioManager?: { stopMidi: () => void }
                }
            ).audioManager
            if (audioManager) {
                audioManager.stopMidi()
                isPlaying = false
                updateUI()
            }
        })
    }

    private createNowPlayingWidget(): void {
        const widget = this.createWidgetFrame(
            "🎧 Last.fm",
            "now-playing-widget"
        )

        const content = document.createElement("div")
        content.className = "widget-content now-playing"
        content.innerHTML = `
            <div class="np-album-art">
                <img src="/assets/icons/cd.png" alt="Album" onerror="this.src='/assets/cat-placeholder.svg'" />
            </div>
            <div class="np-info">
                <div class="np-status">Loading...</div>
                <div class="np-track">---</div>
                <div class="np-artist">---</div>
            </div>
        `

        widget.appendChild(content)
        this.container.appendChild(widget)

        void this.fetchNowPlaying(content)
        setInterval(
            () => void this.fetchNowPlaying(content),
            LASTFM_POLL_INTERVAL
        )
    }

    private async fetchNowPlaying(content: HTMLElement): Promise<void> {
        const statusEl = content.querySelector(".np-status") as HTMLElement
        const trackEl = content.querySelector(".np-track") as HTMLElement
        const artistEl = content.querySelector(".np-artist") as HTMLElement
        const albumArt = content.querySelector(
            ".np-album-art img"
        ) as HTMLImageElement

        try {
            const response = await fetch("/api/lastfm")

            const contentType = response.headers.get("content-type")
            if (!contentType?.includes("application/json")) {
                statusEl.textContent = "API not available"
                return
            }

            const result = (await response.json()) as LastFmApiResponse

            if (!result.ok || !result.data) {
                statusEl.textContent = "No data"
                return
            }

            const track = result.data
            statusEl.textContent = track.isPlaying
                ? "▶ Now Playing"
                : "⏸ Last Played"
            statusEl.className = `np-status ${track.isPlaying ? "playing" : ""}`
            trackEl.textContent = track.name
            artistEl.textContent = track.artist

            if (track.image) {
                albumArt.src = track.image
            }
        } catch {
            statusEl.textContent = "Offline"
            trackEl.textContent = "---"
            artistEl.textContent = "---"
        }
    }

    private createStravaWidget(): void {
        const widget = this.createWidgetFrame("🏃 Strava", "strava-widget")

        const content = document.createElement("div")
        content.className = "widget-content strava"
        content.innerHTML = `
            <div class="strava-loading">Loading activities...</div>
        `

        widget.appendChild(content)
        this.container.appendChild(widget)

        void this.fetchStrava(content)
    }

    private async fetchStrava(content: HTMLElement): Promise<void> {
        try {
            const response = await fetch("/api/strava")

            const contentType = response.headers.get("content-type")
            if (!contentType?.includes("application/json")) {
                content.innerHTML = `<div class="strava-empty">API not available (deploy to Vercel)</div>`
                return
            }

            if (!response.ok) {
                throw new Error(`API error: ${response.status}`)
            }

            const result = (await response.json()) as StravaApiResponse

            if (!result.ok || !result.data) {
                content.innerHTML = `<div class="strava-empty">No recent activities</div>`
                return
            }

            const { bestRun, bestRide, longestRide } = result.data

            content.innerHTML = `
                ${this.renderStravaStat("🏃 Best Run (3mo)", bestRun)}
                ${this.renderStravaStat("🚴 Best Ride (3mo)", bestRide)}
                ${this.renderStravaStat("🚴 Longest Ride (3mo)", longestRide)}
            `
        } catch (error) {
            console.error("[Widgets] Strava error:", error)
            content.innerHTML = `<div class="strava-error">Could not load</div>`
        }
    }

    private renderStravaStat(
        label: string,
        stat: ActivitySummary | null
    ): string {
        if (!stat) {
            return `<div class="strava-stat empty"><span class="stat-label">${label}</span><span class="stat-value">—</span></div>`
        }
        return `
            <div class="strava-stat">
                <span class="stat-label">${label}</span>
                <span class="stat-name">${stat.name}</span>
                <span class="stat-value">${stat.value}</span>
                <span class="stat-detail">${stat.detail || ""}</span>
            </div>
        `
    }

    private createWidgetFrame(title: string, id: string): HTMLElement {
        const widget = document.createElement("div")
        widget.className = "widget"
        widget.id = id

        const titlebar = document.createElement("div")
        titlebar.className = "widget-titlebar"
        titlebar.innerHTML = `
            <span class="widget-title">${title}</span>
            <button class="widget-btn minimize" title="Minimize">_</button>
        `

        const minimizeBtn = titlebar.querySelector(
            ".minimize"
        ) as HTMLButtonElement
        minimizeBtn.addEventListener("click", () => {
            widget.classList.toggle("minimized")
            minimizeBtn.textContent = widget.classList.contains("minimized")
                ? "□"
                : "_"
        })

        widget.appendChild(titlebar)
        return widget
    }
}
