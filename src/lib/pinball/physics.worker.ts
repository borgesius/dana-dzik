/**
 * Web Worker that runs pinball physics off the main thread.
 *
 * Receives a PhysicsInput snapshot, runs the physics step, and returns
 * a PhysicsOutput with updated state and events (hits, sounds, etc.).
 */

import {
    circleCircleCollision,
    circleLineCollision,
    clampVelocity,
    FRICTION,
    GRAVITY,
    FLIPPER_FORCE,
    BUMPER_FORCE,
    LOGICAL_HEIGHT,
    reflectVelocity,
    SUBSTEPS,
    Vector2D,
} from "./physics"
import type {
    BallState,
    BumperState,
    FlipperState,
    HitEvent,
    LauncherState,
    PhysicsInput,
    PhysicsOutput,
    PostState,
    SlingshotState,
    TargetState,
    Vec2,
} from "./physicsTypes"

// ── Helpers ──────────────────────────────────────────────────────────────────

function v(p: Vec2): Vector2D {
    return new Vector2D(p.x, p.y)
}

// ── Physics step ─────────────────────────────────────────────────────────────

function stepPhysics(input: PhysicsInput): PhysicsOutput {
    const {
        gameSpeed: speed,
        paused,
        gameState,
    } = input

    const ball: BallState = { ...input.ball, position: { ...input.ball.position }, velocity: { ...input.ball.velocity } }
    const flippers: FlipperState[] = input.flippers.map((f) => ({ ...f, pivot: { ...f.pivot } }))
    const bumpers: BumperState[] = input.bumpers.map((b) => ({ ...b, position: { ...b.position } }))
    const targets: TargetState[] = input.targets.map((t) => ({ ...t, position: { ...t.position } }))
    const posts: PostState[] = input.posts.map((p) => ({ ...p, position: { ...p.position } }))
    const slingshots: SlingshotState[] = input.slingshots.map((s) => ({
        ...s,
        vertices: [{ ...s.vertices[0] }, { ...s.vertices[1] }, { ...s.vertices[2] }] as [Vec2, Vec2, Vec2],
    }))
    const launcher: LauncherState = { ...input.launcher, position: { ...input.launcher.position } }

    let {
        ballSaveFrames,
        comboCount,
        comboTimer,
        multiplier,
        feverActive,
        feverTimer,
        ballsRemaining,
        score,
        launcherSettleFrames,
    } = input

    const hits: HitEvent[] = []
    let ballLost = false
    let ballSaved = false
    let gameOver = false
    let allTargetsHit = false
    let drainBurst = false

    if (paused || gameState === "idle" || gameState === "gameOver") {
        return {
            ball, flippers, bumpers, targets, posts, slingshots, launcher,
            hits, ballLost, ballSaved, gameOver, allTargetsHit,
            ballSaveFrames, comboCount, comboTimer, multiplier,
            feverActive, feverTimer, ballsRemaining, score,
            launcherSettleFrames, drainBurst,
        }
    }

    // Update entities
    if (launcher.isCharging && launcher.power < launcher.maxPower) {
        launcher.power += 0.12 * speed
    }

    for (const f of flippers) {
        const targetAngle = f.isPressed ? f.activeAngle : f.restAngle
        const diff = targetAngle - f.angle
        if (Math.abs(diff) > 0.02) {
            f.angularVelocity = diff * 0.35
            f.angle += f.angularVelocity * speed
        } else {
            f.angle = targetAngle
            f.angularVelocity = 0
        }
    }

    for (const b of bumpers) {
        if (b.hitAnimation > 0) b.hitAnimation = Math.max(0, b.hitAnimation - 0.08 * speed)
    }
    for (const t of targets) {
        if (t.hitAnimation > 0) t.hitAnimation = Math.max(0, t.hitAnimation - 0.04 * speed)
    }
    for (const s of slingshots) {
        if (s.hitAnimation > 0) s.hitAnimation = Math.max(0, s.hitAnimation - 0.1 * speed)
    }
    for (const p of posts) {
        if (p.hitAnimation > 0) p.hitAnimation = Math.max(0, p.hitAnimation - 0.12 * speed)
    }

    // Physics substeps
    const ballPos = v(ball.position)
    const ballVel = v(ball.velocity)
    let bx = ballPos.x
    let by = ballPos.y
    let vx = ballVel.x
    let vy = ballVel.y

    for (let step = 0; step < SUBSTEPS; step++) {
        if (ball.active) {
            // Apply gravity and friction
            vy += GRAVITY * speed
            vx *= Math.pow(FRICTION, speed)
            vy *= Math.pow(FRICTION, speed)
            const vel = clampVelocity(new Vector2D(vx, vy))
            vx = vel.x
            vy = vel.y
            bx += vx * speed
            by += vy * speed
        }

        if (!ball.active) continue

        const bRadius = ball.radius
        const bPos = new Vector2D(bx, by)

        // Wall collisions
        for (const wall of input.walls) {
            const c = circleLineCollision(bPos, bRadius, v(wall.start), v(wall.end))
            if (c.collided) {
                const newPos = bPos.add(c.normal.multiply(c.overlap + 0.5))
                bx = newPos.x
                by = newPos.y
                const ref = reflectVelocity(new Vector2D(vx, vy), c.normal, wall.damping)
                vx = ref.x
                vy = ref.y
            }
        }

        // Guide rail collisions
        for (const rail of input.guideRails) {
            const c = circleLineCollision(new Vector2D(bx, by), bRadius, v(rail.start), v(rail.end))
            if (c.collided) {
                const newPos = new Vector2D(bx, by).add(c.normal.multiply(c.overlap + 0.5))
                bx = newPos.x
                by = newPos.y
                const ref = reflectVelocity(new Vector2D(vx, vy), c.normal, rail.damping)
                vx = ref.x
                vy = ref.y
            }
        }

        // One-way wall collisions
        for (const ow of input.oneWayWalls) {
            const c = circleLineCollision(new Vector2D(bx, by), bRadius, v(ow.start), v(ow.end))
            if (c.collided) {
                const bn = v(ow.blockNormal)
                if (c.normal.dot(bn) > 0) {
                    const newPos = new Vector2D(bx, by).add(c.normal.multiply(c.overlap + 0.5))
                    bx = newPos.x
                    by = newPos.y
                    const ref = reflectVelocity(new Vector2D(vx, vy), c.normal, ow.damping)
                    vx = ref.x
                    vy = ref.y
                }
            }
        }

        // Flipper collisions
        for (const f of flippers) {
            const end = new Vector2D(
                f.pivot.x + Math.cos(f.angle) * f.length,
                f.pivot.y + Math.sin(f.angle) * f.length
            )
            const c = circleLineCollision(new Vector2D(bx, by), bRadius, v(f.pivot), end)
            if (c.collided) {
                const newPos = new Vector2D(bx, by).add(c.normal.multiply(c.overlap + 2))
                bx = newPos.x
                by = newPos.y

                if (f.isPressed && Math.abs(f.angularVelocity) > 0.05) {
                    const distFromPivot = Vector2D.distance(c.point, v(f.pivot))
                    const leverMult = Math.max(0.4, distFromPivot / f.length)
                    const flipDir = f.side === "left"
                        ? new Vector2D(0.4, -1).normalize()
                        : new Vector2D(-0.4, -1).normalize()
                    const result = flipDir.multiply(FLIPPER_FORCE * leverMult)
                    vx = result.x
                    vy = result.y
                } else {
                    const ref = reflectVelocity(new Vector2D(vx, vy), c.normal, 0.5)
                    vx = ref.x
                    vy = ref.y
                }
            }
        }

        // Bumper collisions
        for (const b of bumpers) {
            const c = circleCircleCollision(new Vector2D(bx, by), bRadius, v(b.position), b.radius)
            if (c.collided) {
                const newPos = new Vector2D(bx, by).add(c.normal.multiply(c.overlap + 1))
                bx = newPos.x
                by = newPos.y
                const bVec = c.normal.multiply(BUMPER_FORCE)
                vx = bVec.x
                vy = bVec.y
                b.hitAnimation = 1
                hits.push({ points: b.points, x: b.position.x, y: b.position.y, color: "#FF4444", particleSize: 8, sound: "pinball_bumper" })
            }
        }

        // Target collisions
        for (const t of targets) {
            if (t.isHit) continue
            const halfW = t.width / 2
            const halfH = t.height / 2
            const cx = Math.max(t.position.x - halfW, Math.min(bx, t.position.x + halfW))
            const cy = Math.max(t.position.y - halfH, Math.min(by, t.position.y + halfH))
            const dx = bx - cx
            const dy = by - cy
            if (dx * dx + dy * dy < bRadius * bRadius) {
                t.isHit = true
                t.hitAnimation = 1
                hits.push({ points: t.points, x: t.position.x, y: t.position.y, color: "#FFD700", particleSize: 12, sound: "pinball_target" })
                if (targets.every((tt) => tt.isHit)) {
                    allTargetsHit = true
                }
            }
        }

        // Slingshot collisions
        for (const s of slingshots) {
            const walls = [
                [s.vertices[0], s.vertices[1]],
                [s.vertices[1], s.vertices[2]],
                [s.vertices[2], s.vertices[0]],
            ]
            for (const [start, end] of walls) {
                const c = circleLineCollision(new Vector2D(bx, by), bRadius, v(start), v(end))
                if (c.collided) {
                    const newPos = new Vector2D(bx, by).add(c.normal.multiply(c.overlap + 1))
                    bx = newPos.x
                    by = newPos.y
                    const ref = reflectVelocity(new Vector2D(vx, vy), c.normal, s.damping)
                    vx = ref.x
                    vy = ref.y
                    s.hitAnimation = 1
                    const scx = (s.vertices[0].x + s.vertices[1].x + s.vertices[2].x) / 3
                    const scy = (s.vertices[0].y + s.vertices[1].y + s.vertices[2].y) / 3
                    hits.push({ points: s.points, x: scx, y: scy, color: "#C4A882", particleSize: 6, sound: "pinball_bumper" })
                    break
                }
            }
        }

        // Post collisions
        for (const p of posts) {
            const c = circleCircleCollision(new Vector2D(bx, by), bRadius, v(p.position), p.radius)
            if (c.collided) {
                const newPos = new Vector2D(bx, by).add(c.normal.multiply(c.overlap + 1))
                bx = newPos.x
                by = newPos.y
                const ref = reflectVelocity(new Vector2D(vx, vy), c.normal, p.damping)
                vx = ref.x
                vy = ref.y
                p.hitAnimation = 1
                hits.push({ points: p.points, x: p.position.x, y: p.position.y, color: "#B8B8B8", particleSize: 4, sound: "pinball_bumper" })
            }
        }
    }

    ball.position = { x: bx, y: by }
    ball.velocity = { x: vx, y: vy }

    // Ball save timer
    if (ballSaveFrames > 0) {
        ballSaveFrames -= speed
    }

    // Launcher settle detection
    if (ball.active && bx > 248 && by > 350 && Math.sqrt(vx * vx + vy * vy) < 1.5) {
        launcherSettleFrames += speed
        if (launcherSettleFrames > 45) {
            ball.position = { x: 285, y: 380 }
            ball.velocity = { x: 0, y: 0 }
            ball.active = false
            launcherSettleFrames = 0
        }
    } else {
        launcherSettleFrames = 0
    }

    // Ball lost detection
    if (ball.active && by > LOGICAL_HEIGHT + ball.radius) {
        if (ballSaveFrames > 0) {
            ballSaved = true
            ballSaveFrames = 0
            ball.position = { x: 285, y: 380 }
            ball.velocity = { x: 0, y: 0 }
            ball.active = false
        } else {
            ballLost = true
            drainBurst = true
            comboCount = 0
            comboTimer = 0
            multiplier = 1
            feverActive = false
            feverTimer = 0
            ballsRemaining--

            if (ballsRemaining <= 0) {
                gameOver = true
            } else {
                ball.position = { x: 285, y: 380 }
                ball.velocity = { x: 0, y: 0 }
                ball.active = false
                for (const t of targets) {
                    t.isHit = false
                    t.hitAnimation = 0
                }
            }
        }
    }

    return {
        ball, flippers, bumpers, targets, posts, slingshots, launcher,
        hits, ballLost, ballSaved, gameOver, allTargetsHit,
        ballSaveFrames, comboCount, comboTimer, multiplier,
        feverActive, feverTimer, ballsRemaining, score,
        launcherSettleFrames, drainBurst,
    }
}

// ── Worker message handler ───────────────────────────────────────────────────

self.onmessage = (event: MessageEvent<PhysicsInput>): void => {
    const result = stepPhysics(event.data)
    self.postMessage(result)
}
