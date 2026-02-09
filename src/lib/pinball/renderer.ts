import type { Ball, Bumper, Flipper, Launcher, Target, Wall } from "./entities"
import { LOGICAL_HEIGHT, LOGICAL_WIDTH } from "./physics"

const COLORS = {
    playfieldGradient1: "#2b1810",
    playfieldGradient2: "#3d2214",
    playfield: "#1a0e08",
    wall: "#8B7355",
    wallHighlight: "#C4A882",
    wallShadow: "#4A3728",
    ball: "#C0C0C0",
    ballHighlight: "#E8E8E8",
    ballShadow: "#707070",
    bumper: "#8B0000",
    bumperActive: "#FF4444",
    bumperHighlight: "#CC3333",
    flipper: "#8B7355",
    flipperHighlight: "#C4A882",
    flipperShadow: "#3D2214",
    target: "#DAA520",
    targetHit: "#FFD700",
    scorePanel: "#5C4033",
    text: "#FFD700",
    launcherChannel: "#0D0806",
}

export class PinballRenderer {
    private ctx: CanvasRenderingContext2D
    private canvasWidth: number
    private canvasHeight: number

    constructor(
        ctx: CanvasRenderingContext2D,
        canvasWidth: number,
        canvasHeight: number
    ) {
        this.ctx = ctx
        this.canvasWidth = canvasWidth
        this.canvasHeight = canvasHeight
    }

    public resize(canvasWidth: number, canvasHeight: number): void {
        this.canvasWidth = canvasWidth
        this.canvasHeight = canvasHeight
    }

    private applyScale(): void {
        const scaleX = this.canvasWidth / LOGICAL_WIDTH
        const scaleY = this.canvasHeight / LOGICAL_HEIGHT
        this.ctx.scale(scaleX, scaleY)
    }

    public beginFrame(): void {
        this.ctx.clearRect(0, 0, this.canvasWidth, this.canvasHeight)
        this.ctx.save()
        this.applyScale()
    }

    public endFrame(): void {
        this.ctx.restore()
    }

    public drawBackground(): void {
        const gradient = this.ctx.createLinearGradient(0, 0, 0, LOGICAL_HEIGHT)
        gradient.addColorStop(0, COLORS.playfieldGradient1)
        gradient.addColorStop(0.5, COLORS.playfieldGradient2)
        gradient.addColorStop(1, COLORS.playfield)

        this.ctx.fillStyle = gradient
        this.ctx.fillRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT)

        this.ctx.fillStyle = COLORS.launcherChannel
        this.ctx.save()
        this.ctx.beginPath()
        this.ctx.moveTo(248, 430)
        this.ctx.lineTo(245, 55)
        this.ctx.lineTo(270, 80)
        this.ctx.lineTo(325, 445)
        this.ctx.closePath()
        this.ctx.fill()
        this.ctx.restore()

        this.drawWoodGrain()
    }

    private drawWoodGrain(): void {
        this.ctx.strokeStyle = "rgba(139, 115, 85, 0.06)"
        this.ctx.lineWidth = 0.5
        for (let y = 0; y < LOGICAL_HEIGHT; y += 5) {
            const offset = Math.sin(y * 0.1) * 3
            this.ctx.beginPath()
            this.ctx.moveTo(0, y + offset)
            this.ctx.lineTo(LOGICAL_WIDTH, y + offset + 1)
            this.ctx.stroke()
        }
    }

    public drawBall(ball: Ball): void {
        if (!ball.active) return

        const { x, y } = ball.position
        const r = ball.radius

        const gradient = this.ctx.createRadialGradient(
            x - r * 0.3,
            y - r * 0.3,
            0,
            x,
            y,
            r
        )
        gradient.addColorStop(0, COLORS.ballHighlight)
        gradient.addColorStop(0.5, COLORS.ball)
        gradient.addColorStop(1, COLORS.ballShadow)

        this.ctx.beginPath()
        this.ctx.arc(x, y, r, 0, Math.PI * 2)
        this.ctx.fillStyle = gradient
        this.ctx.fill()

        this.ctx.strokeStyle = "#555555"
        this.ctx.lineWidth = 0.5
        this.ctx.stroke()
    }

    private drawStar(
        cx: number,
        cy: number,
        outerR: number,
        innerR: number
    ): void {
        this.ctx.beginPath()
        for (let i = 0; i < 10; i++) {
            const r = i % 2 === 0 ? outerR : innerR
            const angle = (Math.PI / 5) * i - Math.PI / 2
            const sx = cx + Math.cos(angle) * r
            const sy = cy + Math.sin(angle) * r
            if (i === 0) {
                this.ctx.moveTo(sx, sy)
            } else {
                this.ctx.lineTo(sx, sy)
            }
        }
        this.ctx.closePath()
    }

    public drawBumper(bumper: Bumper): void {
        const { x, y } = bumper.position
        const r = bumper.radius * (1 + bumper.hitAnimation * 0.15)

        this.ctx.beginPath()
        this.ctx.arc(x, y, r + 2, 0, Math.PI * 2)
        this.ctx.fillStyle = COLORS.wallHighlight
        this.ctx.fill()

        this.ctx.beginPath()
        this.ctx.arc(x + 1, y + 1, r + 1, 0, Math.PI * 2)
        this.ctx.fillStyle = COLORS.wallShadow
        this.ctx.fill()

        const gradient = this.ctx.createRadialGradient(
            x - r * 0.3,
            y - r * 0.3,
            0,
            x,
            y,
            r
        )

        if (bumper.hitAnimation > 0) {
            gradient.addColorStop(0, "#FF6666")
            gradient.addColorStop(0.5, COLORS.bumperActive)
            gradient.addColorStop(1, "#3D0000")
        } else {
            gradient.addColorStop(0, COLORS.bumperHighlight)
            gradient.addColorStop(0.5, COLORS.bumper)
            gradient.addColorStop(1, "#3D0000")
        }

        this.ctx.beginPath()
        this.ctx.arc(x, y, r, 0, Math.PI * 2)
        this.ctx.fillStyle = gradient
        this.ctx.fill()

        this.ctx.strokeStyle = COLORS.wallShadow
        this.ctx.lineWidth = 1.5
        this.ctx.stroke()

        this.ctx.fillStyle = COLORS.text
        this.drawStar(x, y, r * 0.5, r * 0.2)
        this.ctx.fill()

        if (bumper.points > 0) {
            this.ctx.fillStyle = "#FFFFFF"
            this.ctx.font = "bold 8px Tahoma, sans-serif"
            this.ctx.textAlign = "center"
            this.ctx.textBaseline = "middle"
            this.ctx.fillText(bumper.points.toString(), x, y)
        }
    }

    public drawWall(wall: Wall): void {
        const { start, end: wallEnd } = wall

        this.ctx.beginPath()
        this.ctx.moveTo(start.x + 1, start.y + 1)
        this.ctx.lineTo(wallEnd.x + 1, wallEnd.y + 1)
        this.ctx.strokeStyle = COLORS.wallShadow
        this.ctx.lineWidth = 6
        this.ctx.lineCap = "round"
        this.ctx.stroke()

        this.ctx.beginPath()
        this.ctx.moveTo(start.x - 1, start.y - 1)
        this.ctx.lineTo(wallEnd.x - 1, wallEnd.y - 1)
        this.ctx.strokeStyle = COLORS.wallHighlight
        this.ctx.lineWidth = 6
        this.ctx.lineCap = "round"
        this.ctx.stroke()

        this.ctx.beginPath()
        this.ctx.moveTo(start.x, start.y)
        this.ctx.lineTo(wallEnd.x, wallEnd.y)
        this.ctx.strokeStyle = COLORS.wall
        this.ctx.lineWidth = 4
        this.ctx.lineCap = "round"
        this.ctx.stroke()
    }

    public drawFlipper(flipper: Flipper): void {
        const { pivot } = flipper
        const flipperWidth = 13

        this.ctx.save()
        this.ctx.translate(pivot.x, pivot.y)
        this.ctx.rotate(flipper.angle)

        this.ctx.beginPath()
        this.ctx.ellipse(0, 0, 5, 5, 0, 0, Math.PI * 2)
        this.ctx.moveTo(0, -flipperWidth / 2)
        this.ctx.lineTo(flipper.length - 10, -4)
        this.ctx.arc(flipper.length - 10, 0, 4, -Math.PI / 2, Math.PI / 2)
        this.ctx.lineTo(0, flipperWidth / 2)
        this.ctx.closePath()

        const gradient = this.ctx.createLinearGradient(
            0,
            -flipperWidth,
            0,
            flipperWidth
        )
        gradient.addColorStop(0, COLORS.flipperHighlight)
        gradient.addColorStop(0.5, COLORS.flipper)
        gradient.addColorStop(1, COLORS.flipperShadow)

        this.ctx.fillStyle = gradient
        this.ctx.fill()

        this.ctx.strokeStyle = COLORS.wallShadow
        this.ctx.lineWidth = 1.5
        this.ctx.stroke()

        this.ctx.beginPath()
        this.ctx.arc(0, 0, 3, 0, Math.PI * 2)
        this.ctx.fillStyle = "#2A1A0E"
        this.ctx.fill()

        this.ctx.restore()
    }

    public drawTarget(target: Target): void {
        const { x, y } = target.position
        const halfW = target.width / 2
        const halfH = target.height / 2

        this.drawBeveledRect(
            x - halfW,
            y - halfH,
            target.width,
            target.height,
            target.isHit ? COLORS.targetHit : COLORS.target,
            1.5
        )

        if (!target.isHit) {
            this.ctx.fillStyle = "#FFF8DC"
            const ds = Math.min(halfW, halfH) * 0.5
            this.ctx.save()
            this.ctx.translate(x, y)
            this.ctx.rotate(Math.PI / 4)
            this.ctx.fillRect(-ds, -ds, ds * 2, ds * 2)
            this.ctx.restore()
        }

        if (target.hitAnimation > 0) {
            this.ctx.fillStyle = `rgba(255, 215, 0, ${target.hitAnimation * 0.6})`
            this.ctx.fillRect(x - halfW, y - halfH, target.width, target.height)
        }
    }

    public drawLauncher(launcher: Launcher): void {
        const { x, y } = launcher.position
        const { width, height, power, maxPower, isCharging } = launcher

        this.drawBeveledRect(
            x - width / 2 - 3,
            y - 5,
            width + 6,
            height + 12,
            COLORS.scorePanel,
            2
        )

        this.ctx.fillStyle = "#1A0E08"
        this.ctx.fillRect(x - width / 2, y, width, height)

        if (isCharging || power > 0) {
            const powerHeight = (power / maxPower) * (height - 6)
            const gradient = this.ctx.createLinearGradient(
                x,
                y + height - 3,
                x,
                y + height - 3 - powerHeight
            )
            gradient.addColorStop(0, "#800000")
            gradient.addColorStop(0.5, "#CC3333")
            gradient.addColorStop(1, "#FF6633")

            this.ctx.fillStyle = gradient
            this.ctx.fillRect(
                x - width / 2 + 3,
                y + height - 3 - powerHeight,
                width - 6,
                powerHeight
            )
        }

        this.ctx.fillStyle = COLORS.text
        this.ctx.font = "bold 8px Tahoma, sans-serif"
        this.ctx.textAlign = "center"
        this.ctx.fillText("PWR", x, y + height + 12)
    }

    public drawBeveledRect(
        x: number,
        y: number,
        width: number,
        height: number,
        fillColor: string,
        bevelSize: number = 2
    ): void {
        this.ctx.fillStyle = fillColor
        this.ctx.fillRect(x, y, width, height)

        this.ctx.fillStyle = COLORS.wallHighlight
        this.ctx.fillRect(x, y, width, bevelSize)
        this.ctx.fillRect(x, y, bevelSize, height)

        this.ctx.fillStyle = COLORS.wallShadow
        this.ctx.fillRect(x, y + height - bevelSize, width, bevelSize)
        this.ctx.fillRect(x + width - bevelSize, y, bevelSize, height)
    }

    public drawScorePanel(
        score: number,
        highScore: number,
        balls: number,
        gameState: string
    ): void {
        const panelHeight = 45
        const panelY = 5

        this.drawBeveledRect(
            5,
            panelY,
            LOGICAL_WIDTH - 10,
            panelHeight,
            COLORS.scorePanel,
            2
        )

        this.ctx.fillStyle = "#1A0E08"
        this.ctx.fillRect(10, panelY + 6, 85, 18)

        this.ctx.fillStyle = COLORS.text
        this.ctx.font = "bold 12px 'Courier New', monospace"
        this.ctx.textAlign = "left"
        this.ctx.fillText(score.toString().padStart(8, "0"), 13, panelY + 18)

        this.ctx.fillStyle = "#C4A882"
        this.ctx.font = "9px Tahoma, sans-serif"
        this.ctx.fillText("BOUNTY", 10, panelY + 38)

        this.ctx.fillStyle = "#1A0E08"
        this.ctx.fillRect(105, panelY + 6, 70, 18)

        this.ctx.fillStyle = COLORS.text
        this.ctx.font = "bold 10px 'Courier New', monospace"
        this.ctx.fillText(
            highScore.toString().padStart(6, "0"),
            108,
            panelY + 18
        )

        this.ctx.fillStyle = "#C4A882"
        this.ctx.font = "9px Tahoma, sans-serif"
        this.ctx.fillText("RECORD", 105, panelY + 38)

        this.ctx.fillStyle = "#C4A882"
        this.ctx.font = "11px Tahoma, sans-serif"
        this.ctx.textAlign = "right"

        let ballsText = ""
        for (let i = 0; i < balls; i++) {
            ballsText += "\u25CF"
        }
        for (let i = balls; i < 3; i++) {
            ballsText += "\u25CB"
        }
        this.ctx.fillText(`BALL ${ballsText}`, LOGICAL_WIDTH - 60, panelY + 18)

        if (gameState !== "playing") {
            this.ctx.fillStyle = gameState === "idle" ? COLORS.text : "#CC3333"
            this.ctx.fillText(
                gameState === "idle" ? "DRAW!" : gameState.toUpperCase(),
                LOGICAL_WIDTH - 60,
                panelY + 36
            )
        }
    }

    public drawMessage(message: string, subMessage?: string): void {
        const centerX = LOGICAL_WIDTH / 2
        const centerY = LOGICAL_HEIGHT / 2

        this.ctx.fillStyle = "rgba(26, 14, 8, 0.85)"
        const boxH = subMessage ? 70 : 45
        this.ctx.fillRect(centerX - 110, centerY - 30, 220, boxH)

        this.drawBeveledRect(
            centerX - 112,
            centerY - 32,
            224,
            boxH + 4,
            "transparent",
            2
        )

        this.ctx.fillStyle = COLORS.text
        this.ctx.font = "bold 18px Tahoma, sans-serif"
        this.ctx.textAlign = "center"
        this.ctx.textBaseline = "middle"
        this.ctx.fillText(message, centerX, centerY - (subMessage ? 5 : 0))

        if (subMessage) {
            this.ctx.fillStyle = "#C4A882"
            this.ctx.font = "11px Tahoma, sans-serif"
            this.ctx.fillText(subMessage, centerX, centerY + 20)
        }
    }

    public drawInstructions(): void {
        const instructions = [
            "Z / \u2190 : Left Flipper",
            "X / \u2192 : Right Flipper",
            "SPACE : Launch Ball",
        ]

        const startY = LOGICAL_HEIGHT - 55
        this.ctx.fillStyle = "rgba(196, 168, 130, 0.7)"
        this.ctx.font = "9px Tahoma, sans-serif"
        this.ctx.textAlign = "center"

        instructions.forEach((text, i) => {
            this.ctx.fillText(text, LOGICAL_WIDTH / 2 - 25, startY + i * 13)
        })
    }
}
