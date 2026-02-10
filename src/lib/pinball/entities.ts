import {
    BUMPER_FORCE,
    circleCircleCollision,
    circleLineCollision,
    clampVelocity,
    FLIPPER_FORCE,
    FRICTION,
    GRAVITY,
    reflectVelocity,
    Vector2D,
} from "./physics"

export class Ball {
    public position: Vector2D
    public velocity: Vector2D
    public radius: number
    public active: boolean

    constructor(x: number, y: number, radius: number = 8) {
        this.position = new Vector2D(x, y)
        this.velocity = new Vector2D(0, 0)
        this.radius = radius
        this.active = false
    }

    public update(dt: number = 1): void {
        if (!this.active) return

        this.velocity = new Vector2D(
            this.velocity.x,
            this.velocity.y + GRAVITY * dt
        )
        this.velocity = this.velocity.multiply(Math.pow(FRICTION, dt))
        this.velocity = clampVelocity(this.velocity)
        this.position = this.position.add(this.velocity.multiply(dt))
    }

    public reset(x: number, y: number): void {
        this.position = new Vector2D(x, y)
        this.velocity = new Vector2D(0, 0)
        this.active = false
    }

    public launch(power: number): void {
        this.active = true
        this.velocity = new Vector2D(0, -power)
    }
}

export class Bumper {
    public position: Vector2D
    public radius: number
    public points: number
    public hitAnimation: number

    constructor(
        x: number,
        y: number,
        radius: number = 18,
        points: number = 100
    ) {
        this.position = new Vector2D(x, y)
        this.radius = radius
        this.points = points
        this.hitAnimation = 0
    }

    public checkCollision(ball: Ball): { hit: boolean; points: number } {
        const collision = circleCircleCollision(
            ball.position,
            ball.radius,
            this.position,
            this.radius
        )

        if (collision.collided) {
            ball.position = ball.position.add(
                collision.normal.multiply(collision.overlap + 1)
            )
            ball.velocity = collision.normal.multiply(BUMPER_FORCE)
            this.hitAnimation = 1
            return { hit: true, points: this.points }
        }

        return { hit: false, points: 0 }
    }

    public update(dt: number = 1): void {
        if (this.hitAnimation > 0) {
            this.hitAnimation = Math.max(0, this.hitAnimation - 0.08 * dt)
        }
    }
}

export class Wall {
    public start: Vector2D
    public end: Vector2D
    public damping: number

    constructor(
        x1: number,
        y1: number,
        x2: number,
        y2: number,
        damping: number = 0.65
    ) {
        this.start = new Vector2D(x1, y1)
        this.end = new Vector2D(x2, y2)
        this.damping = damping
    }

    public checkCollision(ball: Ball): boolean {
        const collision = circleLineCollision(
            ball.position,
            ball.radius,
            this.start,
            this.end
        )

        if (collision.collided) {
            ball.position = ball.position.add(
                collision.normal.multiply(collision.overlap + 0.5)
            )
            ball.velocity = reflectVelocity(
                ball.velocity,
                collision.normal,
                this.damping
            )
            return true
        }

        return false
    }
}

export class Flipper {
    public pivot: Vector2D
    public length: number
    public angle: number
    public restAngle: number
    public activeAngle: number
    public side: "left" | "right"
    public isPressed: boolean
    public angularVelocity: number

    constructor(x: number, y: number, length: number, side: "left" | "right") {
        this.pivot = new Vector2D(x, y)
        this.length = length
        this.side = side
        this.isPressed = false
        this.angularVelocity = 0

        if (side === "left") {
            this.restAngle = 0.65
            this.activeAngle = -0.5
        } else {
            this.restAngle = Math.PI - 0.65
            this.activeAngle = Math.PI + 0.5
        }

        this.angle = this.restAngle
    }

    public getEndPoint(): Vector2D {
        return new Vector2D(
            this.pivot.x + Math.cos(this.angle) * this.length,
            this.pivot.y + Math.sin(this.angle) * this.length
        )
    }

    public update(dt: number = 1): void {
        const targetAngle = this.isPressed ? this.activeAngle : this.restAngle
        const diff = targetAngle - this.angle
        const speed = 0.35

        if (Math.abs(diff) > 0.02) {
            this.angularVelocity = diff * speed
            this.angle += this.angularVelocity * dt
        } else {
            this.angle = targetAngle
            this.angularVelocity = 0
        }
    }

    public checkCollision(ball: Ball): boolean {
        const end = this.getEndPoint()
        const collision = circleLineCollision(
            ball.position,
            ball.radius,
            this.pivot,
            end
        )

        if (collision.collided) {
            ball.position = ball.position.add(
                collision.normal.multiply(collision.overlap + 2)
            )

            if (this.isPressed && Math.abs(this.angularVelocity) > 0.05) {
                const hitPoint = collision.point
                const distFromPivot = Vector2D.distance(hitPoint, this.pivot)
                const leverMultiplier = Math.max(
                    0.4,
                    distFromPivot / this.length
                )

                const flipDirection =
                    this.side === "left"
                        ? new Vector2D(0.4, -1).normalize()
                        : new Vector2D(-0.4, -1).normalize()

                ball.velocity = flipDirection.multiply(
                    FLIPPER_FORCE * leverMultiplier
                )
            } else {
                ball.velocity = reflectVelocity(
                    ball.velocity,
                    collision.normal,
                    0.5
                )
            }

            return true
        }

        return false
    }
}

export class Target {
    public position: Vector2D
    public width: number
    public height: number
    public points: number
    public isHit: boolean
    public hitAnimation: number

    constructor(
        x: number,
        y: number,
        width: number,
        height: number,
        points: number = 500
    ) {
        this.position = new Vector2D(x, y)
        this.width = width
        this.height = height
        this.points = points
        this.isHit = false
        this.hitAnimation = 0
    }

    public checkCollision(ball: Ball): { hit: boolean; points: number } {
        if (this.isHit) return { hit: false, points: 0 }

        const halfWidth = this.width / 2
        const halfHeight = this.height / 2

        const closestX = Math.max(
            this.position.x - halfWidth,
            Math.min(ball.position.x, this.position.x + halfWidth)
        )
        const closestY = Math.max(
            this.position.y - halfHeight,
            Math.min(ball.position.y, this.position.y + halfHeight)
        )

        const distX = ball.position.x - closestX
        const distY = ball.position.y - closestY
        const distSquared = distX * distX + distY * distY

        if (distSquared < ball.radius * ball.radius) {
            this.isHit = true
            this.hitAnimation = 1
            return { hit: true, points: this.points }
        }

        return { hit: false, points: 0 }
    }

    public update(dt: number = 1): void {
        if (this.hitAnimation > 0) {
            this.hitAnimation = Math.max(0, this.hitAnimation - 0.04 * dt)
        }
    }

    public reset(): void {
        this.isHit = false
        this.hitAnimation = 0
    }
}

export class OneWayWall extends Wall {
    public blockNormal: Vector2D

    constructor(
        x1: number,
        y1: number,
        x2: number,
        y2: number,
        blockNormalX: number,
        blockNormalY: number,
        damping: number = 0.65
    ) {
        super(x1, y1, x2, y2, damping)
        this.blockNormal = new Vector2D(blockNormalX, blockNormalY).normalize()
    }

    public override checkCollision(ball: Ball): boolean {
        const collision = circleLineCollision(
            ball.position,
            ball.radius,
            this.start,
            this.end
        )

        if (collision.collided) {
            if (collision.normal.dot(this.blockNormal) > 0) {
                ball.position = ball.position.add(
                    collision.normal.multiply(collision.overlap + 0.5)
                )
                ball.velocity = reflectVelocity(
                    ball.velocity,
                    collision.normal,
                    this.damping
                )
                return true
            }
        }

        return false
    }
}

export class Launcher {
    public position: Vector2D
    public width: number
    public height: number
    public power: number
    public maxPower: number
    public isCharging: boolean

    constructor(x: number, y: number, width: number = 24, height: number = 70) {
        this.position = new Vector2D(x, y)
        this.width = width
        this.height = height
        this.power = 0
        this.maxPower = 9
        this.isCharging = false
    }

    public startCharge(): void {
        this.isCharging = true
        this.power = 6
    }

    public update(dt: number = 1): void {
        if (this.isCharging && this.power < this.maxPower) {
            this.power += 0.12 * dt
        }
    }

    public release(): number {
        const launchPower = Math.min(this.power, this.maxPower)
        this.isCharging = false
        this.power = 0
        return launchPower
    }
}
