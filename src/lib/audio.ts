const SOUND_URLS: Record<string, string> = {
    startup: "/assets/sounds/retro_misc_05.ogg",
    click: "/assets/sounds/shot_01.ogg",
    error: "/assets/sounds/retro_die_01.ogg",
    popup_1: "/assets/sounds/synth_beep_01.ogg",
    popup_2: "/assets/sounds/synth_beep_02.ogg",
    popup_3: "/assets/sounds/synth_beep_03.ogg",
    close: "/assets/sounds/shot_02.ogg",
    notify: "/assets/sounds/retro_coin_01.ogg",
    pinball_flipper: "/assets/sounds/shot_01.ogg",
    pinball_bumper: "/assets/sounds/retro_coin_01.ogg",
    pinball_launch: "/assets/sounds/synth_beep_01.ogg",
    pinball_wall: "/assets/sounds/shot_02.ogg",
    pinball_target: "/assets/sounds/synth_beep_02.ogg",
    pinball_drain: "/assets/sounds/retro_die_01.ogg",
    pinball_gameover: "/assets/sounds/retro_die_01.ogg",
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
    private userEngaged = false

    private audioContext: AudioContext | null = null
    private analyser: AnalyserNode | null = null
    private sourceNode: MediaElementAudioSourceNode | null = null

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

        this.currentTrackIndex = Math.floor(Math.random() * PLAYLIST.length)

        this.player.addEventListener("ended", () => {
            if (this.userEngaged) {
                this.nextTrack()
            } else {
                this.isPlaying = false
                this.notifyPlayStateChange()
            }
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

    public playRandomPopup(): void {
        const popupSounds = ["popup_1", "popup_2", "popup_3"]
        const randomSound =
            popupSounds[Math.floor(Math.random() * popupSounds.length)]
        this.playSound(randomSound)
    }

    public play(fromUser = false): void {
        if (fromUser) this.userEngaged = true
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
        this.userEngaged = true
        if (this.player) {
            this.player.pause()
            this.isPlaying = false
            this.notifyPlayStateChange()
        }
    }

    public stop(): void {
        this.userEngaged = true
        if (this.player) {
            this.player.pause()
            this.player.currentTime = 0
            this.isPlaying = false
            this.notifyPlayStateChange()
        }
    }

    public togglePlay(): void {
        this.userEngaged = true
        if (this.isPlaying) {
            this.pause()
        } else {
            this.play(true)
        }
    }

    public nextTrack(fromUser = false): void {
        if (fromUser) this.userEngaged = true
        this.currentTrackIndex = (this.currentTrackIndex + 1) % PLAYLIST.length
        this.notifyTrackChange()
        if (this.isPlaying || this.player?.paused === false) {
            this.isPlaying = false
            this.play()
        }
    }

    public previousTrack(): void {
        this.userEngaged = true
        this.currentTrackIndex =
            (this.currentTrackIndex - 1 + PLAYLIST.length) % PLAYLIST.length
        this.notifyTrackChange()
        if (this.isPlaying || this.player?.paused === false) {
            this.isPlaying = false
            this.play()
        }
    }

    public playTrack(index: number): void {
        this.userEngaged = true
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

    public getAnalyser(): AnalyserNode | null {
        if (!this.player) return null

        if (!this.audioContext) {
            try {
                this.audioContext = new AudioContext()
            } catch {
                return null
            }
        }

        if (!this.sourceNode) {
            try {
                this.sourceNode = this.audioContext.createMediaElementSource(
                    this.player
                )
                this.analyser = this.audioContext.createAnalyser()
                this.analyser.fftSize = 256
                this.analyser.smoothingTimeConstant = 0.7
                this.sourceNode.connect(this.analyser)
                this.analyser.connect(this.audioContext.destination)
            } catch {
                return null
            }
        }

        if (this.audioContext.state === "suspended") {
            this.audioContext.resume().catch(() => {})
        }

        return this.analyser
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
