export class Vector2D {
    constructor(
        public x: number,
        public y: number
    ) {}

    public add(v: Vector2D): Vector2D {
        return new Vector2D(this.x + v.x, this.y + v.y)
    }

    public subtract(v: Vector2D): Vector2D {
        return new Vector2D(this.x - v.x, this.y - v.y)
    }

    public multiply(scalar: number): Vector2D {
        return new Vector2D(this.x * scalar, this.y * scalar)
    }

    public dot(v: Vector2D): number {
        return this.x * v.x + this.y * v.y
    }

    public magnitude(): number {
        return Math.sqrt(this.x * this.x + this.y * this.y)
    }

    public normalize(): Vector2D {
        const mag = this.magnitude()
        if (mag === 0) return new Vector2D(0, 0)
        return new Vector2D(this.x / mag, this.y / mag)
    }

    public rotate(angle: number): Vector2D {
        const cos = Math.cos(angle)
        const sin = Math.sin(angle)
        return new Vector2D(
            this.x * cos - this.y * sin,
            this.x * sin + this.y * cos
        )
    }

    public clone(): Vector2D {
        return new Vector2D(this.x, this.y)
    }

    public static distance(a: Vector2D, b: Vector2D): number {
        return a.subtract(b).magnitude()
    }
}

export const LOGICAL_WIDTH = 350
export const LOGICAL_HEIGHT = 500

export const SUBSTEPS = 4
export const GRAVITY = 0.03
export const FRICTION = 0.984
export const FLIPPER_FORCE = 7
export const BUMPER_FORCE = 3
export const WALL_DAMPING = 0.92
export const MAX_VELOCITY = 5

export function circleCircleCollision(
    pos1: Vector2D,
    radius1: number,
    pos2: Vector2D,
    radius2: number
): { collided: boolean; normal: Vector2D; overlap: number } {
    const diff = pos1.subtract(pos2)
    const distance = diff.magnitude()
    const minDist = radius1 + radius2

    if (distance < minDist && distance > 0) {
        return {
            collided: true,
            normal: diff.normalize(),
            overlap: minDist - distance,
        }
    }

    return { collided: false, normal: new Vector2D(0, 0), overlap: 0 }
}

export function pointToLineDistance(
    point: Vector2D,
    lineStart: Vector2D,
    lineEnd: Vector2D
): { distance: number; closest: Vector2D; t: number } {
    const lineVec = lineEnd.subtract(lineStart)
    const pointVec = point.subtract(lineStart)
    const lineLength = lineVec.magnitude()

    if (lineLength === 0) {
        return {
            distance: pointVec.magnitude(),
            closest: lineStart.clone(),
            t: 0,
        }
    }

    let t = pointVec.dot(lineVec) / (lineLength * lineLength)
    t = Math.max(0, Math.min(1, t))

    const closest = lineStart.add(lineVec.multiply(t))
    const distance = Vector2D.distance(point, closest)

    return { distance, closest, t }
}

export function circleLineCollision(
    circlePos: Vector2D,
    radius: number,
    lineStart: Vector2D,
    lineEnd: Vector2D
): { collided: boolean; normal: Vector2D; overlap: number; point: Vector2D } {
    const { distance, closest } = pointToLineDistance(
        circlePos,
        lineStart,
        lineEnd
    )

    if (distance < radius && distance > 0) {
        const normal = circlePos.subtract(closest).normalize()
        return {
            collided: true,
            normal,
            overlap: radius - distance,
            point: closest,
        }
    }

    return {
        collided: false,
        normal: new Vector2D(0, 0),
        overlap: 0,
        point: closest,
    }
}

export function reflectVelocity(
    velocity: Vector2D,
    normal: Vector2D,
    damping: number = WALL_DAMPING
): Vector2D {
    const dot = velocity.dot(normal)
    return velocity.subtract(normal.multiply(2 * dot)).multiply(damping)
}

export function clampVelocity(velocity: Vector2D): Vector2D {
    const mag = velocity.magnitude()
    if (mag > MAX_VELOCITY) {
        return velocity.normalize().multiply(MAX_VELOCITY)
    }
    return velocity
}
