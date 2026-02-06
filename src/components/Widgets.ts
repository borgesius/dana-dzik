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
        const widget = this.createWidgetFrame("WINAMP", "audio-widget")
        widget.classList.add("winamp-widget")

        const content = document.createElement("div")
        content.className = "widget-content audio-player winamp"
        content.innerHTML = `
            <div class="winamp-main">
                <div class="winamp-album-art">
                    <img src="/assets/music/cover.png" alt="Album Art" />
                </div>
                <div class="winamp-right">
                    <div class="winamp-display">
                        <div class="winamp-visualizer">
                            <div class="bar"></div>
                            <div class="bar"></div>
                            <div class="bar"></div>
                            <div class="bar"></div>
                            <div class="bar"></div>
                            <div class="bar"></div>
                            <div class="bar"></div>
                            <div class="bar"></div>
                            <div class="bar"></div>
                            <div class="bar"></div>
                            <div class="bar"></div>
                            <div class="bar"></div>
                            <div class="bar"></div>
                            <div class="bar"></div>
                            <div class="bar"></div>
                            <div class="bar"></div>
                        </div>
                    </div>
                    <div class="winamp-info">
                        <div class="winamp-status">STOPPED</div>
                        <div class="winamp-track-num">--/--</div>
                    </div>
                </div>
            </div>
            <div class="winamp-ticker">
                <span class="ticker-text">Click to start playback...</span>
            </div>
            <div class="winamp-controls">
                <button class="winamp-btn" id="audio-prev" title="Previous">⏮</button>
                <button class="winamp-btn play-btn" id="audio-play" title="Play">▶</button>
                <button class="winamp-btn" id="audio-pause" title="Pause">⏸</button>
                <button class="winamp-btn" id="audio-stop" title="Stop">⏹</button>
                <button class="winamp-btn" id="audio-next" title="Next">⏭</button>
            </div>
            <div class="winamp-playlist">
                <div class="playlist-item" data-index="0">01. Liftoff</div>
                <div class="playlist-item" data-index="1">02. Pirates</div>
                <div class="playlist-item" data-index="2">03. Happy Sphere</div>
                <div class="playlist-item" data-index="3">04. Boom</div>
                <div class="playlist-item" data-index="4">05. Light</div>
                <div class="playlist-item" data-index="5">06. Crono</div>
                <div class="playlist-item" data-index="6">07. Universal</div>
            </div>
        `

        widget.appendChild(content)
        this.container.appendChild(widget)

        this.initAudioControls(content)
    }

    private initAudioControls(content: HTMLElement): void {
        const playBtn = content.querySelector(
            "#audio-play"
        ) as HTMLButtonElement
        const pauseBtn = content.querySelector(
            "#audio-pause"
        ) as HTMLButtonElement
        const stopBtn = content.querySelector(
            "#audio-stop"
        ) as HTMLButtonElement
        const prevBtn = content.querySelector(
            "#audio-prev"
        ) as HTMLButtonElement
        const nextBtn = content.querySelector(
            "#audio-next"
        ) as HTMLButtonElement
        const statusEl = content.querySelector(".winamp-status") as HTMLElement
        const trackNumEl = content.querySelector(
            ".winamp-track-num"
        ) as HTMLElement
        const tickerText = content.querySelector(".ticker-text") as HTMLElement
        const visualizer = content.querySelector(
            ".winamp-visualizer"
        ) as HTMLElement

        const playlistItems = content.querySelectorAll(".playlist-item")

        type AudioManagerType = {
            togglePlay: () => void
            play: () => void
            pause: () => void
            stop: () => void
            nextTrack: () => void
            previousTrack: () => void
            playTrack: (index: number) => void
            getCurrentTrack: () => { name: string; artist: string } | null
            getCurrentTrackIndex: () => number
            getPlaylistLength: () => number
            getIsPlaying: () => boolean
            onTrackChange: (cb: () => void) => void
            onPlayStateChange: (cb: () => void) => void
        }

        const getAudioManager = (): AudioManagerType | undefined => {
            return (window as unknown as { audioManager?: AudioManagerType })
                .audioManager
        }

        const updateUI = (): void => {
            const audioManager = getAudioManager()
            if (!audioManager) return

            const isPlaying = audioManager.getIsPlaying()
            const track = audioManager.getCurrentTrack()
            const trackIndex = audioManager.getCurrentTrackIndex()
            const playlistLength = audioManager.getPlaylistLength()

            if (isPlaying) {
                statusEl.textContent = "PLAYING"
                statusEl.classList.add("playing")
                visualizer.classList.add("playing")
            } else {
                statusEl.textContent = "PAUSED"
                statusEl.classList.remove("playing")
                visualizer.classList.remove("playing")
            }

            trackNumEl.textContent = `${String(trackIndex + 1).padStart(2, "0")}/${String(playlistLength).padStart(2, "0")}`

            if (track) {
                tickerText.textContent = `${track.artist} - ${track.name}    ★    ${track.artist} - ${track.name}    ★    `
            }

            playlistItems.forEach((item, index) => {
                if (index === trackIndex) {
                    item.classList.add("active")
                } else {
                    item.classList.remove("active")
                }
            })
        }

        setTimeout(() => {
            const audioManager = getAudioManager()
            if (audioManager) {
                audioManager.onTrackChange(updateUI)
                audioManager.onPlayStateChange(updateUI)
                updateUI()
            }
        }, 100)

        playBtn.addEventListener("click", () => {
            const audioManager = getAudioManager()
            if (audioManager) {
                audioManager.play()
            }
        })

        pauseBtn.addEventListener("click", () => {
            const audioManager = getAudioManager()
            if (audioManager) {
                audioManager.pause()
            }
        })

        stopBtn.addEventListener("click", () => {
            const audioManager = getAudioManager()
            if (audioManager) {
                audioManager.stop()
                statusEl.textContent = "STOPPED"
                statusEl.classList.remove("playing")
                visualizer.classList.remove("playing")
            }
        })

        prevBtn.addEventListener("click", () => {
            const audioManager = getAudioManager()
            if (audioManager) {
                audioManager.previousTrack()
            }
        })

        nextBtn.addEventListener("click", () => {
            const audioManager = getAudioManager()
            if (audioManager) {
                audioManager.nextTrack()
            }
        })

        playlistItems.forEach((item) => {
            item.addEventListener("click", () => {
                const audioManager = getAudioManager()
                const index = parseInt(
                    (item as HTMLElement).dataset.index ?? "0",
                    10
                )
                if (audioManager) {
                    audioManager.playTrack(index)
                }
            })
        })
    }

    private createNowPlayingWidget(): void {
        const widget = this.createWidgetFrame(
            "🎧 Recently Played (3mo)",
            "now-playing-widget"
        )

        const content = document.createElement("div")
        content.className = "widget-content recently-played"
        content.innerHTML = `<div class="rp-loading">Loading...</div>`

        widget.appendChild(content)
        this.container.appendChild(widget)

        void this.fetchTopTracks(content)
    }

    private async fetchTopTracks(content: HTMLElement): Promise<void> {
        try {
            const response = await fetch("/api/lastfm")

            const contentType = response.headers.get("content-type")
            if (!contentType?.includes("application/json")) {
                content.innerHTML = `<div class="rp-loading">API not available</div>`
                return
            }

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
