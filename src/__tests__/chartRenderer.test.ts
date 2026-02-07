import { beforeEach, describe, expect, it, vi } from "vitest"

import { ChartRenderer } from "../lib/marketGame/ChartRenderer"

interface MockSpies {
    fillRect: ReturnType<typeof vi.fn>
    beginPath: ReturnType<typeof vi.fn>
    setLineDash: ReturnType<typeof vi.fn>
}

function createMockCanvas(): {
    canvas: HTMLCanvasElement
    spies: MockSpies
} {
    const spies: MockSpies = {
        fillRect: vi.fn(),
        beginPath: vi.fn(),
        setLineDash: vi.fn(),
    }

    const ctx = {
        clearRect: vi.fn(),
        fillRect: spies.fillRect,
        fillText: vi.fn(),
        beginPath: spies.beginPath,
        moveTo: vi.fn(),
        lineTo: vi.fn(),
        stroke: vi.fn(),
        closePath: vi.fn(),
        setLineDash: spies.setLineDash,
        save: vi.fn(),
        restore: vi.fn(),
        translate: vi.fn(),
        rotate: vi.fn(),
        fill: vi.fn(),
        scale: vi.fn(),
        setTransform: vi.fn(),
        arc: vi.fn(),
        clip: vi.fn(),
        rect: vi.fn(),
        measureText: vi.fn().mockReturnValue({ width: 30 }),
        strokeStyle: "",
        fillStyle: "",
        lineWidth: 1,
        font: "",
        textAlign: "",
        textBaseline: "",
        globalAlpha: 1,
        lineCap: "",
        lineJoin: "",
    } as unknown as CanvasRenderingContext2D

    const canvas = {
        getContext: vi.fn().mockReturnValue(ctx),
        width: 400,
        height: 200,
        style: { width: "", height: "" },
    } as unknown as HTMLCanvasElement

    return { canvas, spies }
}

describe("ChartRenderer", () => {
    let canvas: HTMLCanvasElement
    let spies: MockSpies

    beforeEach(() => {
        const mock = createMockCanvas()
        canvas = mock.canvas
        spies = mock.spies
    })

    describe("construction", () => {
        it("creates a renderer from a canvas element", () => {
            const renderer = new ChartRenderer(canvas)
            expect(renderer).toBeDefined()
        })

        it("accepts custom options", () => {
            const renderer = new ChartRenderer(canvas, {
                width: 600,
                height: 300,
                showMovingAverage: true,
                showTrendArrow: true,
            })
            expect(renderer).toBeDefined()
        })
    })

    describe("render", () => {
        it("clears and redraws on render", () => {
            const renderer = new ChartRenderer(canvas)
            const history = [0.05, 0.06, 0.055, 0.07, 0.065]
            renderer.render("EMAIL", history)

            expect(spies.fillRect).toHaveBeenCalled()
            expect(spies.beginPath).toHaveBeenCalled()
        })

        it("handles empty history", () => {
            const renderer = new ChartRenderer(canvas)
            expect(() => renderer.render("EMAIL", [])).not.toThrow()
        })

        it("handles single data point", () => {
            const renderer = new ChartRenderer(canvas)
            expect(() => renderer.render("EMAIL", [0.05])).not.toThrow()
        })

        it("handles very long history", () => {
            const renderer = new ChartRenderer(canvas)
            const history = Array.from(
                { length: 1000 },
                (_, i) => Math.sin(i * 0.1) * 0.5 + 1
            )
            expect(() => renderer.render("EMAIL", history)).not.toThrow()
        })

        it("draws grid lines and price labels", () => {
            const renderer = new ChartRenderer(canvas)
            renderer.render("EMAIL", [0.05, 0.06, 0.055, 0.07, 0.065])

            expect(spies.beginPath).toHaveBeenCalled()
            expect(spies.fillRect).toHaveBeenCalled()
        })
    })

    describe("overlays", () => {
        it("renders moving average when enabled", () => {
            const renderer = new ChartRenderer(canvas)
            const history = Array.from(
                { length: 50 },
                (_, i) => Math.sin(i * 0.1) * 0.5 + 1
            )
            expect(() =>
                renderer.render("EMAIL", history, {
                    showMovingAverage: true,
                })
            ).not.toThrow()
        })

        it("renders trend arrow when enabled", () => {
            const renderer = new ChartRenderer(canvas)
            const history = [0.05, 0.06, 0.07, 0.08, 0.09, 0.1]
            expect(() =>
                renderer.render("EMAIL", history, {
                    showTrendArrow: true,
                })
            ).not.toThrow()
        })

        it("renders both overlays simultaneously", () => {
            const renderer = new ChartRenderer(canvas)
            const history = Array.from(
                { length: 50 },
                (_, i) => Math.sin(i * 0.1) * 0.5 + 1
            )
            expect(() =>
                renderer.render("EMAIL", history, {
                    showMovingAverage: true,
                    showTrendArrow: true,
                })
            ).not.toThrow()
        })
    })

    describe("resize", () => {
        it("resizes without error", () => {
            const renderer = new ChartRenderer(canvas)
            expect(() => renderer.resize(800, 400)).not.toThrow()
        })
    })
})
