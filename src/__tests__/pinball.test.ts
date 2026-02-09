/**
 * @vitest-environment jsdom
 */
import { beforeEach, describe, expect, it, vi } from "vitest"

import {
    Ball,
    Bumper,
    Flipper,
    Launcher,
    Target,
    Wall,
} from "../lib/pinball/entities"
import {
    circleCircleCollision,
    circleLineCollision,
    clampVelocity,
    MAX_VELOCITY,
    reflectVelocity,
    Vector2D,
} from "../lib/pinball/physics"

describe("Pinball", () => {
    describe("Group 1: Physics", () => {
        describe("Vector2D arithmetic", () => {
            it("adds two vectors", () => {
                const a = new Vector2D(1, 2)
                const b = new Vector2D(3, 4)
                const result = a.add(b)
                expect(result.x).toBe(4)
                expect(result.y).toBe(6)
            })

            it("subtracts two vectors", () => {
                const a = new Vector2D(5, 7)
                const b = new Vector2D(2, 3)
                const result = a.subtract(b)
                expect(result.x).toBe(3)
                expect(result.y).toBe(4)
            })

            it("multiplies by scalar", () => {
                const v = new Vector2D(3, 4)
                const result = v.multiply(2)
                expect(result.x).toBe(6)
                expect(result.y).toBe(8)
            })

            it("computes dot product", () => {
                const a = new Vector2D(1, 2)
                const b = new Vector2D(3, 4)
                expect(a.dot(b)).toBe(11)
            })
        })

        describe("Vector2D magnitude and normalize", () => {
            it("computes magnitude of (3, 4) as 5", () => {
                const v = new Vector2D(3, 4)
                expect(v.magnitude()).toBe(5)
            })

            it("normalizes to unit vector", () => {
                const v = new Vector2D(3, 4)
                const n = v.normalize()
                expect(n.magnitude()).toBeCloseTo(1, 5)
                expect(n.x).toBeCloseTo(0.6, 5)
                expect(n.y).toBeCloseTo(0.8, 5)
            })

            it("returns zero vector when normalizing zero vector", () => {
                const v = new Vector2D(0, 0)
                const n = v.normalize()
                expect(n.x).toBe(0)
                expect(n.y).toBe(0)
            })
        })

        describe("Vector2D.distance", () => {
            it("computes distance between two points", () => {
                const a = new Vector2D(0, 0)
                const b = new Vector2D(3, 4)
                expect(Vector2D.distance(a, b)).toBe(5)
            })
        })

        describe("circleCircleCollision", () => {
            it("detects overlapping circles", () => {
                const result = circleCircleCollision(
                    new Vector2D(0, 0),
                    10,
                    new Vector2D(15, 0),
                    10
                )
                expect(result.collided).toBe(true)
                expect(result.overlap).toBeCloseTo(5)
                expect(result.normal.x).toBeCloseTo(-1)
            })

            it("returns false for non-overlapping circles", () => {
                const result = circleCircleCollision(
                    new Vector2D(0, 0),
                    10,
                    new Vector2D(25, 0),
                    10
                )
                expect(result.collided).toBe(false)
            })

            it("returns false for touching circles (no overlap)", () => {
                const result = circleCircleCollision(
                    new Vector2D(0, 0),
                    10,
                    new Vector2D(20, 0),
                    10
                )
                expect(result.collided).toBe(false)
            })

            it("returns false for coincident centers", () => {
                const result = circleCircleCollision(
                    new Vector2D(5, 5),
                    10,
                    new Vector2D(5, 5),
                    10
                )
                expect(result.collided).toBe(false)
            })
        })

        describe("circleLineCollision", () => {
            it("detects collision with line segment", () => {
                const result = circleLineCollision(
                    new Vector2D(50, 5),
                    10,
                    new Vector2D(0, 0),
                    new Vector2D(100, 0)
                )
                expect(result.collided).toBe(true)
                expect(result.normal.y).toBeGreaterThan(0)
            })

            it("returns false when circle is far from line", () => {
                const result = circleLineCollision(
                    new Vector2D(50, 50),
                    10,
                    new Vector2D(0, 0),
                    new Vector2D(100, 0)
                )
                expect(result.collided).toBe(false)
            })

            it("handles collision near line endpoint", () => {
                const result = circleLineCollision(
                    new Vector2D(5, 5),
                    10,
                    new Vector2D(0, 0),
                    new Vector2D(100, 0)
                )
                expect(result.collided).toBe(true)
            })
        })

        describe("reflectVelocity", () => {
            it("reflects off horizontal surface with damping", () => {
                const velocity = new Vector2D(3, -5)
                const normal = new Vector2D(0, 1)
                const result = reflectVelocity(velocity, normal, 0.5)
                expect(result.y).toBeGreaterThan(0)
                expect(result.x).toBeCloseTo(1.5)
            })
        })

        describe("clampVelocity", () => {
            it("clamps velocity above MAX_VELOCITY", () => {
                const v = new Vector2D(100, 100)
                const result = clampVelocity(v)
                expect(result.magnitude()).toBeCloseTo(MAX_VELOCITY)
            })

            it("leaves velocity below MAX_VELOCITY unchanged", () => {
                const v = new Vector2D(1, 1)
                const result = clampVelocity(v)
                expect(result.x).toBe(1)
                expect(result.y).toBe(1)
            })
        })
    })

    describe("Group 2: Entities", () => {
        describe("Ball", () => {
            it("applies gravity on update", () => {
                const ball = new Ball(100, 100)
                ball.active = true
                ball.velocity = new Vector2D(0, 0)
                ball.update()
                expect(ball.velocity.y).toBeGreaterThan(0)
            })

            it("does not update when inactive", () => {
                const ball = new Ball(100, 100)
                ball.active = false
                ball.velocity = new Vector2D(5, 5)
                const oldPos = ball.position.clone()
                ball.update()
                expect(ball.position.x).toBe(oldPos.x)
                expect(ball.position.y).toBe(oldPos.y)
            })

            it("launches with upward velocity", () => {
                const ball = new Ball(100, 100)
                ball.launch(10)
                expect(ball.active).toBe(true)
                expect(ball.velocity.y).toBe(-10)
            })

            it("resets to inactive with zero velocity", () => {
                const ball = new Ball(100, 100)
                ball.launch(10)
                ball.reset(50, 50)
                expect(ball.active).toBe(false)
                expect(ball.velocity.x).toBe(0)
                expect(ball.velocity.y).toBe(0)
                expect(ball.position.x).toBe(50)
                expect(ball.position.y).toBe(50)
            })
        })

        describe("Bumper", () => {
            it("detects collision and awards points", () => {
                const bumper = new Bumper(100, 100, 18, 200)
                const ball = new Ball(100, 120, 8)
                ball.active = true
                const result = bumper.checkCollision(ball)
                expect(result.hit).toBe(true)
                expect(result.points).toBe(200)
                expect(bumper.hitAnimation).toBe(1)
            })

            it("returns no hit when ball is far away", () => {
                const bumper = new Bumper(100, 100, 18, 200)
                const ball = new Ball(200, 200, 8)
                ball.active = true
                const result = bumper.checkCollision(ball)
                expect(result.hit).toBe(false)
                expect(result.points).toBe(0)
            })

            it("pushes ball out of overlap on hit", () => {
                const bumper = new Bumper(100, 100, 18, 100)
                const ball = new Ball(100, 118, 8)
                ball.active = true
                bumper.checkCollision(ball)
                const dist = Vector2D.distance(ball.position, bumper.position)
                expect(dist).toBeGreaterThanOrEqual(bumper.radius + ball.radius)
            })
        })

        describe("Wall", () => {
            it("reflects ball velocity on collision", () => {
                const wall = new Wall(0, 100, 200, 100)
                const ball = new Ball(50, 96, 8)
                ball.active = true
                ball.velocity = new Vector2D(0, 5)
                const hit = wall.checkCollision(ball)
                expect(hit).toBe(true)
                expect(ball.velocity.y).toBeLessThan(0)
            })

            it("pushes ball out of wall", () => {
                const wall = new Wall(0, 100, 200, 100)
                const ball = new Ball(50, 98, 8)
                ball.active = true
                ball.velocity = new Vector2D(0, 5)
                wall.checkCollision(ball)
                expect(ball.position.y).toBeLessThan(100 - ball.radius)
            })
        })

        describe("Flipper", () => {
            it("left flipper rest angle points down-right", () => {
                const flipper = new Flipper(100, 450, 48, "left")
                const endpoint = flipper.getEndPoint()
                expect(endpoint.x).toBeGreaterThan(flipper.pivot.x)
                expect(endpoint.y).toBeGreaterThan(flipper.pivot.y)
            })

            it("right flipper rest angle points down-left", () => {
                const flipper = new Flipper(200, 450, 48, "right")
                const endpoint = flipper.getEndPoint()
                expect(endpoint.x).toBeLessThan(flipper.pivot.x)
                expect(endpoint.y).toBeGreaterThan(flipper.pivot.y)
            })

            it("moves toward active angle when pressed", () => {
                const flipper = new Flipper(100, 450, 48, "left")
                flipper.isPressed = true
                const restAngle = flipper.angle
                for (let i = 0; i < 20; i++) flipper.update()
                expect(flipper.angle).toBeLessThan(restAngle)
            })

            it("returns to rest angle when released", () => {
                const flipper = new Flipper(100, 450, 48, "left")
                flipper.isPressed = true
                for (let i = 0; i < 20; i++) flipper.update()
                flipper.isPressed = false
                for (let i = 0; i < 20; i++) flipper.update()
                expect(flipper.angle).toBeCloseTo(flipper.restAngle, 1)
            })

            it("deflects ball when active", () => {
                const flipper = new Flipper(100, 450, 48, "left")
                flipper.isPressed = true
                for (let i = 0; i < 20; i++) flipper.update()
                flipper.angularVelocity = -0.3

                const end = flipper.getEndPoint()
                const ball = new Ball(end.x, end.y - 5, 8)
                ball.active = true
                ball.velocity = new Vector2D(0, 5)
                const hit = flipper.checkCollision(ball)
                expect(hit).toBe(true)
                expect(ball.velocity.y).toBeLessThan(0)
            })
        })

        describe("Launcher", () => {
            it("charges power over time", () => {
                const launcher = new Launcher(320, 370)
                launcher.startCharge()
                const initial = launcher.power
                for (let i = 0; i < 10; i++) launcher.update()
                expect(launcher.power).toBeGreaterThan(initial)
            })

            it("release returns accumulated power and resets", () => {
                const launcher = new Launcher(320, 370)
                launcher.startCharge()
                for (let i = 0; i < 10; i++) launcher.update()
                const power = launcher.release()
                expect(power).toBeGreaterThan(0)
                expect(launcher.power).toBe(0)
                expect(launcher.isCharging).toBe(false)
            })
        })

        describe("Target", () => {
            it("detects first hit and sets isHit", () => {
                const target = new Target(100, 100, 12, 30, 500)
                const ball = new Ball(100, 100, 8)
                ball.active = true
                const result = target.checkCollision(ball)
                expect(result.hit).toBe(true)
                expect(result.points).toBe(500)
                expect(target.isHit).toBe(true)
            })

            it("does not detect subsequent hits", () => {
                const target = new Target(100, 100, 12, 30, 500)
                const ball = new Ball(100, 100, 8)
                ball.active = true
                target.checkCollision(ball)
                const result2 = target.checkCollision(ball)
                expect(result2.hit).toBe(false)
            })

            it("allows re-hitting after reset", () => {
                const target = new Target(100, 100, 12, 30, 500)
                const ball = new Ball(100, 100, 8)
                ball.active = true
                target.checkCollision(ball)
                target.reset()
                expect(target.isHit).toBe(false)
                const result = target.checkCollision(ball)
                expect(result.hit).toBe(true)
            })
        })
    })

    describe("Group 3: Playfield layout", () => {
        function createMockCanvas(): HTMLCanvasElement {
            const canvas = document.createElement("canvas")
            canvas.width = 350
            canvas.height = 500

            const ctx = {
                save: vi.fn(),
                restore: vi.fn(),
                scale: vi.fn(),
                clearRect: vi.fn(),
                fillRect: vi.fn(),
                fillText: vi.fn(),
                beginPath: vi.fn(),
                closePath: vi.fn(),
                moveTo: vi.fn(),
                lineTo: vi.fn(),
                arc: vi.fn(),
                ellipse: vi.fn(),
                fill: vi.fn(),
                stroke: vi.fn(),
                translate: vi.fn(),
                rotate: vi.fn(),
                createLinearGradient: vi.fn(() => ({
                    addColorStop: vi.fn(),
                })),
                createRadialGradient: vi.fn(() => ({
                    addColorStop: vi.fn(),
                })),
                fillStyle: "",
                strokeStyle: "",
                lineWidth: 0,
                lineCap: "butt" as CanvasLineCap,
                font: "",
                textAlign: "start" as CanvasTextAlign,
                textBaseline: "alphabetic" as CanvasTextBaseline,
            }

            vi.spyOn(canvas, "getContext").mockReturnValue(
                ctx as unknown as CanvasRenderingContext2D
            )
            return canvas
        }

        it("ball launched from launcher enters play area via angled wall", async () => {
            const { PinballGame } = await import("../lib/pinball/PinballGame")
            const canvas = createMockCanvas()
            const game = new PinballGame(canvas)

            game.startGame()

            const ball = game.getBall()
            ball.reset(300, 420)
            ball.active = true
            ball.velocity = new Vector2D(0, -6)

            let enteredPlayArea = false
            for (let i = 0; i < 1000; i++) {
                game.stepPhysics()
                if (ball.active && ball.position.x < 245) {
                    enteredPlayArea = true
                    break
                }
            }

            expect(enteredPlayArea).toBe(true)
        })

        it("ball cannot escape through left wall", async () => {
            const { PinballGame } = await import("../lib/pinball/PinballGame")
            const canvas = createMockCanvas()
            const game = new PinballGame(canvas)

            game.startGame()
            const ball = game.getBall()
            ball.reset(50, 200)
            ball.active = true
            ball.velocity = new Vector2D(-10, 0)

            for (let i = 0; i < 60; i++) {
                game.stepPhysics()
            }

            expect(ball.position.x).toBeGreaterThan(10)
        })

        it("ball cannot escape through top wall", async () => {
            const { PinballGame } = await import("../lib/pinball/PinballGame")
            const canvas = createMockCanvas()
            const game = new PinballGame(canvas)

            game.startGame()
            const ball = game.getBall()
            ball.reset(130, 200)
            ball.active = true
            ball.velocity = new Vector2D(0, -10)

            for (let i = 0; i < 60; i++) {
                game.stepPhysics()
            }

            expect(ball.position.y).toBeGreaterThan(40)
        })

        it("ball drains through flipper gap when flippers are up", async () => {
            const { PinballGame } = await import("../lib/pinball/PinballGame")
            const canvas = createMockCanvas()
            const game = new PinballGame(canvas)

            game.startGame()
            expect(game.ballsRemaining).toBe(3)

            const ball = game.getBall()
            ball.reset(148, 485)
            ball.active = true
            ball.velocity = new Vector2D(0, 5)

            for (let i = 0; i < 120; i++) {
                game.stepPhysics()
            }

            expect(game.ballsRemaining).toBeLessThan(3)
        })

        it("ball does not sit between flippers at rest", async () => {
            const { PinballGame } = await import("../lib/pinball/PinballGame")
            const canvas = createMockCanvas()
            const game = new PinballGame(canvas)

            game.startGame()
            expect(game.ballsRemaining).toBe(3)

            const ball = game.getBall()
            const flippers = game.getFlippers()
            const midX = (flippers[0].pivot.x + flippers[1].pivot.x) / 2
            ball.reset(midX, flippers[0].pivot.y - 5)
            ball.active = true
            ball.velocity = new Vector2D(0, 1)

            for (let i = 0; i < 300; i++) {
                game.stepPhysics()
            }

            expect(game.ballsRemaining).toBeLessThan(3)
        })

        it("flippers prevent drain when pressed", async () => {
            const { PinballGame } = await import("../lib/pinball/PinballGame")
            const canvas = createMockCanvas()
            const game = new PinballGame(canvas)

            game.startGame()
            const flippers = game.getFlippers()
            flippers[0].isPressed = true
            flippers[1].isPressed = true

            for (let i = 0; i < 10; i++) {
                game.stepPhysics()
            }

            const ball = game.getBall()
            ball.reset(130, 445)
            ball.active = true
            ball.velocity = new Vector2D(0, 3)

            for (let i = 0; i < 30; i++) {
                game.stepPhysics()
            }

            expect(ball.position.y).toBeLessThan(500)
        })
    })

    describe("Group 4: Game state machine", () => {
        function createMockCanvas(): HTMLCanvasElement {
            const canvas = document.createElement("canvas")
            canvas.width = 350
            canvas.height = 500

            const ctx = {
                save: vi.fn(),
                restore: vi.fn(),
                scale: vi.fn(),
                clearRect: vi.fn(),
                fillRect: vi.fn(),
                fillText: vi.fn(),
                beginPath: vi.fn(),
                closePath: vi.fn(),
                moveTo: vi.fn(),
                lineTo: vi.fn(),
                arc: vi.fn(),
                ellipse: vi.fn(),
                fill: vi.fn(),
                stroke: vi.fn(),
                translate: vi.fn(),
                rotate: vi.fn(),
                createLinearGradient: vi.fn(() => ({
                    addColorStop: vi.fn(),
                })),
                createRadialGradient: vi.fn(() => ({
                    addColorStop: vi.fn(),
                })),
                fillStyle: "",
                strokeStyle: "",
                lineWidth: 0,
                lineCap: "butt" as CanvasLineCap,
                font: "",
                textAlign: "start" as CanvasTextAlign,
                textBaseline: "alphabetic" as CanvasTextBaseline,
            }

            vi.spyOn(canvas, "getContext").mockReturnValue(
                ctx as unknown as CanvasRenderingContext2D
            )
            return canvas
        }

        let canvas: HTMLCanvasElement

        beforeEach(() => {
            canvas = createMockCanvas()
            localStorage.clear()
        })

        it("initial state is idle with score=0 and 3 balls", async () => {
            const { PinballGame } = await import("../lib/pinball/PinballGame")
            const game = new PinballGame(canvas)
            expect(game.gameState).toBe("idle")
            expect(game.score).toBe(0)
            expect(game.ballsRemaining).toBe(3)
        })

        it("transitions from idle to playing", async () => {
            const { PinballGame } = await import("../lib/pinball/PinballGame")
            const game = new PinballGame(canvas)
            game.startGame()
            expect(game.gameState).toBe("playing")
        })

        it("ball drain reduces lives", async () => {
            const { PinballGame } = await import("../lib/pinball/PinballGame")
            const game = new PinballGame(canvas)
            game.startGame()
            expect(game.ballsRemaining).toBe(3)

            const ball = game.getBall()
            ball.active = true
            ball.position = new Vector2D(150, 600)

            game.stepPhysics()
            expect(game.ballsRemaining).toBe(2)
        })

        it("game over when last ball drains", async () => {
            const { PinballGame } = await import("../lib/pinball/PinballGame")
            const game = new PinballGame(canvas)
            game.startGame()

            for (let i = 0; i < 3; i++) {
                const ball = game.getBall()
                ball.active = true
                ball.position = new Vector2D(150, 600)
                game.stepPhysics()
            }

            expect(game.gameState).toBe("gameOver")
            expect(game.ballsRemaining).toBe(0)
        })

        it("score increases on bumper hit", async () => {
            const { PinballGame } = await import("../lib/pinball/PinballGame")
            const game = new PinballGame(canvas)
            game.startGame()

            const ball = game.getBall()
            const bumpers = game.getBumpers()
            const bumper = bumpers[0]

            ball.active = true
            ball.position = bumper.position.add(
                new Vector2D(0, bumper.radius + ball.radius - 2)
            )
            ball.velocity = new Vector2D(0, -3)

            game.stepPhysics()
            expect(game.score).toBe(bumper.points)
        })

        it("high score is saved to localStorage", async () => {
            const { PinballGame } = await import("../lib/pinball/PinballGame")
            const game = new PinballGame(canvas)
            game.startGame()

            const ball = game.getBall()
            const bumper = game.getBumpers()[0]
            ball.active = true
            ball.position = bumper.position.add(
                new Vector2D(0, bumper.radius + ball.radius - 2)
            )
            ball.velocity = new Vector2D(0, -3)
            game.stepPhysics()

            for (let i = 0; i < 3; i++) {
                const b = game.getBall()
                b.active = true
                b.position = new Vector2D(150, 600)
                game.stepPhysics()
            }

            expect(game.highScore).toBe(bumper.points)
            expect(localStorage.getItem("pinball-high-score")).toBe(
                bumper.points.toString()
            )
        })

        it("resize with zero dimensions is rejected", async () => {
            const { PinballGame } = await import("../lib/pinball/PinballGame")
            const game = new PinballGame(canvas)
            game.startGame()

            game.resize(0, 0)
            expect(game.gameState).toBe("playing")
            expect(game.ballsRemaining).toBe(3)
        })

        it("pause stops physics, resume allows them", async () => {
            const { PinballGame } = await import("../lib/pinball/PinballGame")
            const game = new PinballGame(canvas)
            game.startGame()

            const ball = game.getBall()
            ball.active = true
            ball.position = new Vector2D(150, 200)
            ball.velocity = new Vector2D(0, 5)

            game.pause()
            const posBefore = ball.position.clone()
            game.stepPhysics()
            expect(ball.position.x).toBe(posBefore.x)
            expect(ball.position.y).toBe(posBefore.y)

            game.resume()
            game.stepPhysics()
            expect(ball.position.y).not.toBe(posBefore.y)
        })
    })

    describe("Group 5: Integration tests", () => {
        function createMockCanvas(): HTMLCanvasElement {
            const canvas = document.createElement("canvas")
            canvas.width = 350
            canvas.height = 500

            const ctx = {
                save: vi.fn(),
                restore: vi.fn(),
                scale: vi.fn(),
                clearRect: vi.fn(),
                fillRect: vi.fn(),
                fillText: vi.fn(),
                beginPath: vi.fn(),
                closePath: vi.fn(),
                moveTo: vi.fn(),
                lineTo: vi.fn(),
                arc: vi.fn(),
                ellipse: vi.fn(),
                fill: vi.fn(),
                stroke: vi.fn(),
                translate: vi.fn(),
                rotate: vi.fn(),
                createLinearGradient: vi.fn(() => ({
                    addColorStop: vi.fn(),
                })),
                createRadialGradient: vi.fn(() => ({
                    addColorStop: vi.fn(),
                })),
                fillStyle: "",
                strokeStyle: "",
                lineWidth: 0,
                lineCap: "butt" as CanvasLineCap,
                font: "",
                textAlign: "start" as CanvasTextAlign,
                textBaseline: "alphabetic" as CanvasTextBaseline,
            }

            vi.spyOn(canvas, "getContext").mockReturnValue(
                ctx as unknown as CanvasRenderingContext2D
            )
            return canvas
        }

        beforeEach(() => {
            localStorage.clear()
        })

        it("power 6 (min practical) launch enters play area", async () => {
            const { PinballGame } = await import("../lib/pinball/PinballGame")
            const canvas = createMockCanvas()
            const game = new PinballGame(canvas)

            game.startGame()
            const ball = game.getBall()
            ball.reset(300, 420)
            ball.active = true
            ball.velocity = new Vector2D(0, -6)

            let enteredPlayArea = false
            for (let i = 0; i < 1000; i++) {
                game.stepPhysics()
                if (ball.active && ball.position.x < 245) {
                    enteredPlayArea = true
                    break
                }
            }

            expect(enteredPlayArea).toBe(true)
        })

        it("power 6 (mid) launch enters play area", async () => {
            const { PinballGame } = await import("../lib/pinball/PinballGame")
            const canvas = createMockCanvas()
            const game = new PinballGame(canvas)

            game.startGame()
            const ball = game.getBall()
            ball.reset(300, 420)
            ball.active = true
            ball.velocity = new Vector2D(0, -6)

            let enteredPlayArea = false
            for (let i = 0; i < 1000; i++) {
                game.stepPhysics()
                if (ball.active && ball.position.x < 245) {
                    enteredPlayArea = true
                    break
                }
            }

            expect(enteredPlayArea).toBe(true)
        })

        it("power 9 (max) launch enters play area", async () => {
            const { PinballGame } = await import("../lib/pinball/PinballGame")
            const canvas = createMockCanvas()
            const game = new PinballGame(canvas)

            game.startGame()
            const ball = game.getBall()
            ball.reset(300, 420)
            ball.active = true
            ball.velocity = new Vector2D(0, -9)

            let enteredPlayArea = false
            for (let i = 0; i < 300; i++) {
                game.stepPhysics()
                if (ball.active && ball.position.x < 245) {
                    enteredPlayArea = true
                    break
                }
            }

            expect(enteredPlayArea).toBe(true)
        })

        it("minimum launch power (6) enters play area", async () => {
            const { PinballGame } = await import("../lib/pinball/PinballGame")
            const canvas = createMockCanvas()
            const game = new PinballGame(canvas)

            game.startGame()
            const ball = game.getBall()
            ball.reset(300, 420)
            ball.active = true
            ball.velocity = new Vector2D(0, -6)

            let enteredPlayArea = false
            for (let i = 0; i < 1500; i++) {
                game.stepPhysics()
                if (ball.active && ball.position.x < 245) {
                    enteredPlayArea = true
                    break
                }
            }

            expect(enteredPlayArea).toBe(true)
        })

        it("ball touches angled wall and gains leftward velocity", async () => {
            const { PinballGame } = await import("../lib/pinball/PinballGame")
            const canvas = createMockCanvas()
            const game = new PinballGame(canvas)

            game.startGame()
            const ball = game.getBall()
            ball.reset(300, 420)
            ball.active = true
            ball.velocity = new Vector2D(0, -6)

            let hadLeftwardVelocity = false
            for (let i = 0; i < 30; i++) {
                game.stepPhysics()
                if (ball.active && ball.velocity.x < -0.1) {
                    hadLeftwardVelocity = true
                    break
                }
            }

            expect(hadLeftwardVelocity).toBe(true)
        })

        it("bumper scoring flow", async () => {
            const { PinballGame } = await import("../lib/pinball/PinballGame")
            const canvas = createMockCanvas()
            const game = new PinballGame(canvas)

            game.startGame()
            const ball = game.getBall()
            const bumper = game.getBumpers()[0]

            ball.active = true
            ball.position = bumper.position.add(
                new Vector2D(0, bumper.radius + ball.radius - 3)
            )
            ball.velocity = new Vector2D(0, -5)

            const scoreBefore = game.score
            game.stepPhysics()

            expect(game.score).toBe(scoreBefore + bumper.points)
        })

        it("flipper save flow: flipper prevents drain", async () => {
            const { PinballGame } = await import("../lib/pinball/PinballGame")
            const canvas = createMockCanvas()
            const game = new PinballGame(canvas)

            game.startGame()
            const flippers = game.getFlippers()
            const leftFlipper = flippers[0]

            leftFlipper.isPressed = true
            for (let i = 0; i < 15; i++) {
                game.stepPhysics()
            }

            const ball = game.getBall()
            const flipperEnd = leftFlipper.getEndPoint()
            ball.active = true
            ball.position = new Vector2D(
                flipperEnd.x,
                flipperEnd.y - ball.radius - 1
            )
            ball.velocity = new Vector2D(0, 4)

            for (let i = 0; i < 20; i++) {
                game.stepPhysics()
            }

            expect(ball.position.y).toBeLessThan(500)
        })

        it("drain and re-launch flow", async () => {
            const { PinballGame } = await import("../lib/pinball/PinballGame")
            const canvas = createMockCanvas()
            const game = new PinballGame(canvas)

            game.startGame()
            expect(game.ballsRemaining).toBe(3)

            const ball = game.getBall()
            ball.active = true
            ball.position = new Vector2D(150, 600)
            game.stepPhysics()

            expect(game.ballsRemaining).toBe(2)
            expect(ball.active).toBe(false)

            ball.launch(10)
            expect(ball.active).toBe(true)
        })

        it("full game lifecycle: play through to game over and restart", async () => {
            const { PinballGame } = await import("../lib/pinball/PinballGame")
            const canvas = createMockCanvas()
            const game = new PinballGame(canvas)

            expect(game.gameState).toBe("idle")

            game.startGame()
            expect(game.gameState).toBe("playing")
            expect(game.score).toBe(0)
            expect(game.ballsRemaining).toBe(3)

            for (let i = 0; i < 3; i++) {
                const ball = game.getBall()
                ball.active = true
                ball.position = new Vector2D(150, 600)
                game.stepPhysics()
            }

            expect(game.gameState).toBe("gameOver")

            game.startGame()
            expect(game.gameState).toBe("playing")
            expect(game.score).toBe(0)
            expect(game.ballsRemaining).toBe(3)
        })

        it("multi-bumper combo accumulates score", async () => {
            const { PinballGame } = await import("../lib/pinball/PinballGame")
            const canvas = createMockCanvas()
            const game = new PinballGame(canvas)

            game.startGame()
            const ball = game.getBall()
            const bumpers = game.getBumpers()
            let expectedScore = 0

            for (const bumper of bumpers.slice(0, 3)) {
                ball.active = true
                ball.position = bumper.position.add(
                    new Vector2D(0, bumper.radius + ball.radius - 3)
                )
                ball.velocity = new Vector2D(0, -5)
                game.stepPhysics()
                expectedScore += bumper.points

                ball.velocity = new Vector2D(0, 0)
                ball.position = new Vector2D(150, 300)
            }

            expect(game.score).toBe(expectedScore)
        })

        it("ball saver prevents life loss shortly after launch", async () => {
            const { PinballGame } = await import("../lib/pinball/PinballGame")
            const canvas = createMockCanvas()
            const game = new PinballGame(canvas)

            game.startGame()
            expect(game.ballsRemaining).toBe(3)

            canvas.dispatchEvent(
                new KeyboardEvent("keydown", { key: " ", code: "Space" })
            )
            for (let i = 0; i < 5; i++) game.stepPhysics()
            canvas.dispatchEvent(
                new KeyboardEvent("keyup", { key: " ", code: "Space" })
            )

            const ball = game.getBall()
            expect(ball.active).toBe(true)
            expect(game.ballSaveActive).toBe(true)

            ball.position = new Vector2D(150, 600)
            game.stepPhysics()

            expect(game.ballsRemaining).toBe(3)
            expect(ball.active).toBe(false)
            expect(game.ballSaveActive).toBe(false)
        })

        it("ball saver does not activate without launch handler", async () => {
            const { PinballGame } = await import("../lib/pinball/PinballGame")
            const canvas = createMockCanvas()
            const game = new PinballGame(canvas)

            game.startGame()
            expect(game.ballSaveActive).toBe(false)

            const ball = game.getBall()
            ball.active = true
            ball.position = new Vector2D(150, 600)
            game.stepPhysics()

            expect(game.ballsRemaining).toBe(2)
        })

        it("target hit and reset across balls", async () => {
            const { PinballGame } = await import("../lib/pinball/PinballGame")
            const canvas = createMockCanvas()
            const game = new PinballGame(canvas)

            game.startGame()
            const ball = game.getBall()
            const target = game.getTargets()[0]

            ball.active = true
            ball.position = target.position.clone()
            ball.velocity = new Vector2D(0, 0)
            game.stepPhysics()
            expect(game.score).toBe(target.points)
            expect(target.isHit).toBe(true)

            ball.position = new Vector2D(150, 600)
            game.stepPhysics()

            expect(target.isHit).toBe(false)
            expect(game.ballsRemaining).toBe(2)

            ball.active = true
            ball.position = target.position.clone()
            ball.velocity = new Vector2D(0, 0)
            game.stepPhysics()

            expect(game.score).toBe(target.points * 2)
        })
    })
})
