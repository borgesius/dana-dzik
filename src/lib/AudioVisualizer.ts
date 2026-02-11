import { CanvasError } from "@/core/errors"

const BAR_COUNT = 16
const PEAK_DECAY_RATE = 0.4
const PEAK_HOLD_FRAMES = 12
const BAR_GAP = 1

const BIN_MAP = [0, 1, 2, 3, 4, 5, 7, 9, 12, 15, 19, 24, 30, 38, 48, 60]

interface PeakState {
    value: number
    holdFrames: number
}

export class AudioVisualizer {
    private canvas: HTMLCanvasElement
    private ctx: CanvasRenderingContext2D
    private analyser: AnalyserNode | null = null
    private frequencyData: Uint8Array<ArrayBuffer> | null = null
    private animationId: number | null = null
    private running = false
    private peaks: PeakState[] = []
    private barGradient: CanvasGradient | null = null
    private getAnalyser: () => AnalyserNode | null

    constructor(
        canvas: HTMLCanvasElement,
        getAnalyser: () => AnalyserNode | null
    ) {
        this.canvas = canvas
        const ctx = canvas.getContext("2d")
        if (!ctx) {
            throw new CanvasError("Failed to get canvas 2d context", {
                component: "AudioVisualizer",
            })
        }
        this.ctx = ctx
        this.getAnalyser = getAnalyser

        for (let i = 0; i < BAR_COUNT; i++) {
            this.peaks.push({ value: 0, holdFrames: 0 })
        }
    }

    public start(): void {
        if (this.running) return
        this.running = true

        this.analyser = this.getAnalyser()
        if (this.analyser) {
            this.frequencyData = new Uint8Array(this.analyser.frequencyBinCount)
        }

        this.buildGradient()
        this.draw()
    }

    public stop(): void {
        this.running = false
        if (this.animationId !== null) {
            cancelAnimationFrame(this.animationId)
            this.animationId = null
        }
    }

    public destroy(): void {
        this.stop()
        this.analyser = null
        this.frequencyData = null
        this.barGradient = null
    }

    private buildGradient(): void {
        const height = this.canvas.height
        this.barGradient = this.ctx.createLinearGradient(0, height, 0, 0)
        this.barGradient.addColorStop(0, "#00cc00")
        this.barGradient.addColorStop(0.5, "#cccc00")
        this.barGradient.addColorStop(0.8, "#cc6600")
        this.barGradient.addColorStop(1, "#cc0000")
    }

    private draw(): void {
        if (!this.running) return

        this.animationId = requestAnimationFrame(() => this.draw())

        if (!this.analyser && this.running) {
            this.analyser = this.getAnalyser()
            if (this.analyser) {
                const binCount = this.analyser.frequencyBinCount
                this.frequencyData = new Uint8Array(binCount)
            }
        }

        const { width, height } = this.canvas
        this.ctx.fillStyle = "#000000"
        this.ctx.fillRect(0, 0, width, height)

        if (!this.analyser || !this.frequencyData) return

        this.analyser.getByteFrequencyData(this.frequencyData)

        const totalGaps = (BAR_COUNT - 1) * BAR_GAP
        const barWidth = Math.max(1, (width - totalGaps) / BAR_COUNT)

        for (let i = 0; i < BAR_COUNT; i++) {
            const binIndex = BIN_MAP[i] ?? i
            const value = this.frequencyData[binIndex] ?? 0
            const normalized = value / 255
            const barHeight = Math.max(1, normalized * height)
            const x = i * (barWidth + BAR_GAP)
            const y = height - barHeight

            if (this.barGradient) {
                this.ctx.fillStyle = this.barGradient
            }
            this.ctx.fillRect(x, y, barWidth, barHeight)

            const peak = this.peaks[i]
            if (!peak) continue

            if (normalized >= peak.value) {
                peak.value = normalized
                peak.holdFrames = PEAK_HOLD_FRAMES
            } else if (peak.holdFrames > 0) {
                peak.holdFrames--
            } else {
                peak.value = Math.max(0, peak.value - PEAK_DECAY_RATE / 60)
            }

            if (peak.value > 0.01) {
                const peakY = height - peak.value * height
                this.ctx.fillStyle = "#ffffff"
                this.ctx.fillRect(x, peakY, barWidth, 1)
            }
        }
    }
}
