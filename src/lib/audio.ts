const SOUND_URLS: Record<string, string> = {
    startup: "/assets/sounds/startup.mp3",
    click: "/assets/sounds/click.mp3",
    error: "/assets/sounds/error.mp3",
    popup: "/assets/sounds/popup.mp3",
    close: "/assets/sounds/close.mp3",
    notify: "/assets/sounds/notify.mp3",
}

const MIDI_URL = "/assets/midi/background.mid"

export class AudioManager {
    private sounds: Map<string, HTMLAudioElement> = new Map()
    private midiPlayer: HTMLAudioElement | null = null
    private enabled = false
    private midiEnabled = false
    private initialized = false

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

        this.playSound("startup")

        setTimeout(() => {
            this.startMidi()
        }, 2000)
    }

    public playSound(name: string): void {
        if (!this.enabled) return

        const sound = this.sounds.get(name)
        if (sound) {
            sound.currentTime = 0
            sound.play().catch(() => {})
        }
    }

    public startMidi(): void {
        if (this.midiEnabled || !this.enabled) return

        this.midiPlayer = new Audio(MIDI_URL)
        this.midiPlayer.loop = true
        this.midiPlayer.volume = 0.2
        this.midiPlayer.play().catch(() => {})

        this.midiEnabled = true
    }

    public stopMidi(): void {
        if (this.midiPlayer) {
            this.midiPlayer.pause()
            this.midiPlayer.currentTime = 0
        }
        this.midiEnabled = false
    }

    public toggleMidi(): void {
        if (this.midiEnabled) {
            this.stopMidi()
        } else {
            this.startMidi()
        }
    }

    public setEnabled(enabled: boolean): void {
        this.enabled = enabled
        if (!enabled) {
            this.stopMidi()
        }
    }
}

export function createAudioManager(): AudioManager {
    const manager = new AudioManager()
    ;(window as unknown as { audioManager: AudioManager }).audioManager =
        manager
    return manager
}
