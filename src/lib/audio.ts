const SOUND_URLS: Record<string, string> = {
    startup: "/assets/sounds/startup.mp3",
    click: "/assets/sounds/click.mp3",
    error: "/assets/sounds/error.mp3",
    popup: "/assets/sounds/popup.mp3",
    close: "/assets/sounds/close.mp3",
    notify: "/assets/sounds/notify.mp3",
}

export interface Track {
    name: string
    artist: string
    url: string
}

const PLAYLIST: Track[] = [
    {
        name: "Liftoff",
        artist: "Lazer Dice",
        url: "/assets/music/Lazer Dice - DMCA free and royalty free music (439 tracks) - Happy Hardcore - 01 Liftoff.mp3",
    },
    {
        name: "Pirates",
        artist: "Lazer Dice",
        url: "/assets/music/Lazer Dice - DMCA free and royalty free music (439 tracks) - Happy Hardcore - 02 Pirates.mp3",
    },
    {
        name: "Happy Sphere",
        artist: "Lazer Dice",
        url: "/assets/music/Lazer Dice - DMCA free and royalty free music (439 tracks) - Happy Hardcore - 03 Happy Sphere.mp3",
    },
    {
        name: "Boom",
        artist: "Lazer Dice",
        url: "/assets/music/Lazer Dice - DMCA free and royalty free music (439 tracks) - Happy Hardcore - 04 Boom.mp3",
    },
    {
        name: "Light",
        artist: "Lazer Dice",
        url: "/assets/music/Lazer Dice - DMCA free and royalty free music (439 tracks) - Happy Hardcore - 05 Light.mp3",
    },
    {
        name: "Crono",
        artist: "Lazer Dice",
        url: "/assets/music/Lazer Dice - DMCA free and royalty free music (439 tracks) - Happy Hardcore - 06 Crono.mp3",
    },
    {
        name: "Universal",
        artist: "Lazer Dice",
        url: "/assets/music/Lazer Dice - DMCA free and royalty free music (439 tracks) - Happy Hardcore - 07 Universal.mp3",
    },
]

type AudioEventCallback = () => void

export class AudioManager {
    private sounds: Map<string, HTMLAudioElement> = new Map()
    private player: HTMLAudioElement | null = null
    private enabled = false
    private isPlaying = false
    private initialized = false
    private currentTrackIndex = 0
    private autoplayAttempts = 0
    private maxAutoplayAttempts = 10
    private autoplayInterval: ReturnType<typeof setInterval> | null = null

    private onTrackChangeCallbacks: AudioEventCallback[] = []
    private onPlayStateChangeCallbacks: AudioEventCallback[] = []

    constructor() {
        document.addEventListener(
            "click",
            () => {
                if (!this.initialized) {
                    this.initialize()
                }
            },
            { once: true }
        )
    }

    private initialize(): void {
        this.initialized = true
        this.enabled = true

        Object.entries(SOUND_URLS).forEach(([name, url]) => {
            const audio = new Audio()
            audio.src = url
            audio.preload = "auto"
            audio.volume = 0.3
            this.sounds.set(name, audio)
        })

        this.player = new Audio()
        this.player.volume = 0.25

        this.player.addEventListener("ended", () => {
            this.nextTrack()
        })

        this.player.addEventListener("error", () => {
            if (this.isPlaying) {
                setTimeout(() => this.nextTrack(), 1000)
            }
        })

        this.playSound("startup")
        this.aggressiveAutoplay()
    }

    private aggressiveAutoplay(): void {
        this.autoplayAttempts = 0
        this.tryAutoplay()

        this.autoplayInterval = setInterval(() => {
            if (
                this.isPlaying ||
                this.autoplayAttempts >= this.maxAutoplayAttempts
            ) {
                if (this.autoplayInterval) {
                    clearInterval(this.autoplayInterval)
                    this.autoplayInterval = null
                }
                return
            }
            this.tryAutoplay()
        }, 500)
    }

    private tryAutoplay(): void {
        if (!this.enabled || !this.player || this.isPlaying) return

        this.autoplayAttempts++
        const track = PLAYLIST[this.currentTrackIndex]
        if (!track) return

        this.player.src = track.url
        this.player
            .play()
            .then(() => {
                this.isPlaying = true
                this.notifyPlayStateChange()
                this.notifyTrackChange()
                if (this.autoplayInterval) {
                    clearInterval(this.autoplayInterval)
                    this.autoplayInterval = null
                }
            })
            .catch(() => {})
    }

    public playSound(name: string): void {
        if (!this.enabled) return

        const sound = this.sounds.get(name)
        if (sound) {
            sound.currentTime = 0
            sound.play().catch(() => {})
        }
    }

    public play(): void {
        if (!this.enabled || !this.player) return

        const track = PLAYLIST[this.currentTrackIndex]
        if (!track) return

        if (this.player.src !== location.origin + track.url) {
            this.player.src = track.url
        }

        this.player
            .play()
            .then(() => {
                this.isPlaying = true
                this.notifyPlayStateChange()
                this.notifyTrackChange()
            })
            .catch(() => {})
    }

    public pause(): void {
        if (this.player) {
            this.player.pause()
            this.isPlaying = false
            this.notifyPlayStateChange()
        }
    }

    public stop(): void {
        if (this.player) {
            this.player.pause()
            this.player.currentTime = 0
            this.isPlaying = false
            this.notifyPlayStateChange()
        }
    }

    public togglePlay(): void {
        if (this.isPlaying) {
            this.pause()
        } else {
            this.play()
        }
    }

    public nextTrack(): void {
        this.currentTrackIndex = (this.currentTrackIndex + 1) % PLAYLIST.length
        this.notifyTrackChange()
        if (this.isPlaying || this.player?.paused === false) {
            this.isPlaying = false
            this.play()
        }
    }

    public previousTrack(): void {
        this.currentTrackIndex =
            (this.currentTrackIndex - 1 + PLAYLIST.length) % PLAYLIST.length
        this.notifyTrackChange()
        if (this.isPlaying || this.player?.paused === false) {
            this.isPlaying = false
            this.play()
        }
    }

    public playTrack(index: number): void {
        if (index < 0 || index >= PLAYLIST.length) return
        this.currentTrackIndex = index
        this.notifyTrackChange()
        this.isPlaying = false
        this.play()
    }

    public getCurrentTrack(): Track | null {
        return PLAYLIST[this.currentTrackIndex] ?? null
    }

    public getCurrentTrackIndex(): number {
        return this.currentTrackIndex
    }

    public getPlaylistLength(): number {
        return PLAYLIST.length
    }

    public getIsPlaying(): boolean {
        return this.isPlaying
    }

    public onTrackChange(callback: AudioEventCallback): void {
        this.onTrackChangeCallbacks.push(callback)
    }

    public onPlayStateChange(callback: AudioEventCallback): void {
        this.onPlayStateChangeCallbacks.push(callback)
    }

    private notifyTrackChange(): void {
        this.onTrackChangeCallbacks.forEach((cb) => cb())
    }

    private notifyPlayStateChange(): void {
        this.onPlayStateChangeCallbacks.forEach((cb) => cb())
    }

    public setEnabled(enabled: boolean): void {
        this.enabled = enabled
        if (!enabled) {
            this.stop()
        }
    }

    public toggleMidi(): void {
        this.togglePlay()
    }

    public stopMidi(): void {
        this.stop()
    }
}

export function createAudioManager(): AudioManager {
    const manager = new AudioManager()
    ;(window as unknown as { audioManager: AudioManager }).audioManager =
        manager
    return manager
}
