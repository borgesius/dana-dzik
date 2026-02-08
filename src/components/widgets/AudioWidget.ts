import { getLocaleManager } from "../../lib/localeManager"
import { createWidgetFrame } from "./WidgetFrame"

type AudioManagerType = {
    togglePlay: () => void
    play: (fromUser?: boolean) => void
    pause: () => void
    stop: () => void
    nextTrack: (fromUser?: boolean) => void
    previousTrack: () => void
    playTrack: (index: number) => void
    getCurrentTrack: () => { name: string; artist: string } | null
    getCurrentTrackIndex: () => number
    getPlaylistLength: () => number
    getIsPlaying: () => boolean
    onTrackChange: (cb: () => void) => void
    onPlayStateChange: (cb: () => void) => void
}

export class AudioWidget {
    private widget: HTMLElement

    constructor() {
        this.widget = createWidgetFrame("WINAMP", "audio-widget")
        this.widget.classList.add("winamp-widget")

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

        this.widget.appendChild(content)
        this.initControls(content)
    }

    public getElement(): HTMLElement {
        return this.widget
    }

    private getAudioManager(): AudioManagerType | undefined {
        return (window as unknown as { audioManager?: AudioManagerType })
            .audioManager
    }

    private initControls(content: HTMLElement): void {
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

        const updateUI = (): void => {
            const audioManager = this.getAudioManager()
            if (!audioManager) return

            const isPlaying = audioManager.getIsPlaying()
            const track = audioManager.getCurrentTrack()
            const trackIndex = audioManager.getCurrentTrackIndex()
            const playlistLength = audioManager.getPlaylistLength()

            const lm = getLocaleManager()
            if (isPlaying) {
                statusEl.textContent = lm.t("widgets.winamp.playing")
                statusEl.classList.add("playing")
                visualizer.classList.add("playing")
            } else {
                statusEl.textContent = lm.t("widgets.winamp.paused")
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
            const audioManager = this.getAudioManager()
            if (audioManager) {
                audioManager.onTrackChange(updateUI)
                audioManager.onPlayStateChange(updateUI)
                updateUI()
            }
        }, 100)

        playBtn.addEventListener("click", () => {
            this.getAudioManager()?.play(true)
        })
        pauseBtn.addEventListener("click", () => {
            this.getAudioManager()?.pause()
        })
        stopBtn.addEventListener("click", () => {
            const audioManager = this.getAudioManager()
            if (audioManager) {
                audioManager.stop()
                statusEl.textContent = getLocaleManager().t(
                    "widgets.winamp.stopped"
                )
                statusEl.classList.remove("playing")
                visualizer.classList.remove("playing")
            }
        })
        prevBtn.addEventListener("click", () => {
            this.getAudioManager()?.previousTrack()
        })
        nextBtn.addEventListener("click", () => {
            this.getAudioManager()?.nextTrack(true)
        })

        playlistItems.forEach((item) => {
            item.addEventListener("click", () => {
                const index = parseInt(
                    (item as HTMLElement).dataset.index ?? "0",
                    10
                )
                this.getAudioManager()?.playTrack(index)
            })
        })
    }
}
