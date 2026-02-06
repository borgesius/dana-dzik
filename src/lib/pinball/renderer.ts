import type { Ball, Bumper, Flipper, Launcher, Target, Wall } from "./entities"
import { LOGICAL_HEIGHT, LOGICAL_WIDTH } from "./physics"

const COLORS = {
    playfieldGradient1: "#16213e",
    playfieldGradient2: "#0f3460",
    playfield: "#1a1a2e",
    wall: "#c0c0c0",
    wallHighlight: "#ffffff",
    wallShadow: "#808080",
    ball: "#c0c0c0",
    ballHighlight: "#ffffff",
    ballShadow: "#606060",
    bumper: "#000080",
    bumperActive: "#0000ff",
    bumperHighlight: "#4040ff",
    flipper: "#808080",
    flipperHighlight: "#c0c0c0",
    flipperShadow: "#404040",
    target: "#008000",
    targetHit: "#00ff00",
    scorePanel: "#c0c0c0",
    text: "#00ff00",
    launcherChannel: "#0a0a1a",
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
        this.ctx.fillRect(295, 48, 50, LOGICAL_HEIGHT - 48)

        this.drawScanlines()
    }

    private drawScanlines(): void {
        this.ctx.fillStyle = "rgba(0, 0, 0, 0.08)"
        for (let y = 0; y < LOGICAL_HEIGHT; y += 3) {
            this.ctx.fillRect(0, y, LOGICAL_WIDTH, 1)
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

        this.ctx.strokeStyle = COLORS.wallShadow
        this.ctx.lineWidth = 0.5
        this.ctx.stroke()
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
            gradient.addColorStop(0, "#8080ff")
            gradient.addColorStop(0.5, COLORS.bumperActive)
            gradient.addColorStop(1, "#000040")
        } else {
            gradient.addColorStop(0, COLORS.bumperHighlight)
            gradient.addColorStop(0.5, COLORS.bumper)
            gradient.addColorStop(1, "#000040")
        }

        this.ctx.beginPath()
        this.ctx.arc(x, y, r, 0, Math.PI * 2)
        this.ctx.fillStyle = gradient
        this.ctx.fill()

        this.ctx.strokeStyle = COLORS.wallShadow
        this.ctx.lineWidth = 1.5
        this.ctx.stroke()

        this.ctx.fillStyle = "#ffffff"
        this.ctx.font = "bold 10px Tahoma, sans-serif"
        this.ctx.textAlign = "center"
        this.ctx.textBaseline = "middle"
        this.ctx.fillText(bumper.points.toString(), x, y)
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
        const flipperWidth = 10

        this.ctx.save()
        this.ctx.translate(pivot.x, pivot.y)
        this.ctx.rotate(flipper.angle)

        this.ctx.beginPath()
        this.ctx.ellipse(0, 0, 7, 7, 0, 0, Math.PI * 2)
        this.ctx.moveTo(0, -flipperWidth / 2)
        this.ctx.lineTo(flipper.length - 8, -3)
        this.ctx.arc(flipper.length - 8, 0, 3, -Math.PI / 2, Math.PI / 2)
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
        this.ctx.arc(0, 0, 4, 0, Math.PI * 2)
        this.ctx.fillStyle = "#404040"
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

        if (target.hitAnimation > 0) {
            this.ctx.fillStyle = `rgba(0, 255, 0, ${target.hitAnimation * 0.5})`
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

        this.ctx.fillStyle = "#000000"
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
            gradient.addColorStop(0.5, "#ff0000")
            gradient.addColorStop(1, "#ff8000")

            this.ctx.fillStyle = gradient
            this.ctx.fillRect(
                x - width / 2 + 3,
                y + height - 3 - powerHeight,
                width - 6,
                powerHeight
            )
        }

        this.ctx.fillStyle = "#ffffff"
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

        this.ctx.fillStyle = "#000000"
        this.ctx.fillRect(10, panelY + 6, 85, 18)

        this.ctx.fillStyle = COLORS.text
        this.ctx.font = "bold 12px 'Courier New', monospace"
        this.ctx.textAlign = "left"
        this.ctx.fillText(score.toString().padStart(8, "0"), 13, panelY + 18)

        this.ctx.fillStyle = "#000000"
        this.ctx.font = "9px Tahoma, sans-serif"
        this.ctx.fillText("SCORE", 10, panelY + 38)

        this.ctx.fillStyle = "#000000"
        this.ctx.fillRect(105, panelY + 6, 70, 18)

        this.ctx.fillStyle = "#ffff00"
        this.ctx.font = "bold 10px 'Courier New', monospace"
        this.ctx.fillText(
            highScore.toString().padStart(6, "0"),
            108,
            panelY + 18
        )

        this.ctx.fillStyle = "#000000"
        this.ctx.font = "9px Tahoma, sans-serif"
        this.ctx.fillText("HIGH", 105, panelY + 38)

        this.ctx.fillStyle = "#000000"
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
            this.ctx.fillStyle = gameState === "idle" ? "#008000" : "#800000"
            this.ctx.fillText(
                gameState === "idle" ? "READY" : gameState.toUpperCase(),
                LOGICAL_WIDTH - 60,
                panelY + 36
            )
        }
    }

    public drawMessage(message: string, subMessage?: string): void {
        const centerX = LOGICAL_WIDTH / 2
        const centerY = LOGICAL_HEIGHT / 2

        this.ctx.fillStyle = "rgba(0, 0, 0, 0.75)"
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

        this.ctx.fillStyle = "#ffffff"
        this.ctx.font = "bold 18px Tahoma, sans-serif"
        this.ctx.textAlign = "center"
        this.ctx.textBaseline = "middle"
        this.ctx.fillText(message, centerX, centerY - (subMessage ? 5 : 0))

        if (subMessage) {
            this.ctx.fillStyle = "#c0c0c0"
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
        this.ctx.fillStyle = "rgba(255, 255, 255, 0.6)"
        this.ctx.font = "9px Tahoma, sans-serif"
        this.ctx.textAlign = "center"

        instructions.forEach((text, i) => {
            this.ctx.fillText(text, LOGICAL_WIDTH / 2 - 25, startY + i * 13)
        })
    }
}
