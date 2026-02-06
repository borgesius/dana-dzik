import type { Ball, Bumper, Flipper, Launcher, Target, Wall } from "./entities"

const COLORS = {
    background: "#008080",
    playfield: "#1a1a2e",
    playfieldGradient1: "#16213e",
    playfieldGradient2: "#0f3460",
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
    launcher: "#800000",
    launcherPower: "#ff0000",
    text: "#00ff00",
    scorePanel: "#c0c0c0",
}

export class PinballRenderer {
    private ctx: CanvasRenderingContext2D
    private width: number
    private height: number

    constructor(ctx: CanvasRenderingContext2D, width: number, height: number) {
        this.ctx = ctx
        this.width = width
        this.height = height
    }

    public resize(width: number, height: number): void {
        this.width = width
        this.height = height
    }

    public clear(): void {
        const gradient = this.ctx.createLinearGradient(0, 0, 0, this.height)
        gradient.addColorStop(0, COLORS.playfieldGradient1)
        gradient.addColorStop(0.5, COLORS.playfieldGradient2)
        gradient.addColorStop(1, COLORS.playfield)

        this.ctx.fillStyle = gradient
        this.ctx.fillRect(0, 0, this.width, this.height)

        this.drawScanlines()
    }

    private drawScanlines(): void {
        this.ctx.fillStyle = "rgba(0, 0, 0, 0.1)"
        for (let y = 0; y < this.height; y += 4) {
            this.ctx.fillRect(0, y, this.width, 1)
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
        this.ctx.lineWidth = 1
        this.ctx.stroke()
    }

    public drawBumper(bumper: Bumper): void {
        const { x, y } = bumper.position
        const r = bumper.radius * (1 + bumper.hitAnimation * 0.2)

        this.ctx.beginPath()
        this.ctx.arc(x, y, r + 3, 0, Math.PI * 2)
        this.ctx.fillStyle = COLORS.wallHighlight
        this.ctx.fill()

        this.ctx.beginPath()
        this.ctx.arc(x + 2, y + 2, r + 2, 0, Math.PI * 2)
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
        this.ctx.lineWidth = 2
        this.ctx.stroke()

        this.ctx.fillStyle = "#ffffff"
        this.ctx.font = "bold 12px Tahoma, sans-serif"
        this.ctx.textAlign = "center"
        this.ctx.textBaseline = "middle"
        this.ctx.fillText(bumper.points.toString(), x, y)
    }

    public drawWall(wall: Wall): void {
        const { start, end } = wall

        this.ctx.beginPath()
        this.ctx.moveTo(start.x + 1, start.y + 1)
        this.ctx.lineTo(end.x + 1, end.y + 1)
        this.ctx.strokeStyle = COLORS.wallShadow
        this.ctx.lineWidth = 8
        this.ctx.lineCap = "round"
        this.ctx.stroke()

        this.ctx.beginPath()
        this.ctx.moveTo(start.x - 1, start.y - 1)
        this.ctx.lineTo(end.x - 1, end.y - 1)
        this.ctx.strokeStyle = COLORS.wallHighlight
        this.ctx.lineWidth = 8
        this.ctx.lineCap = "round"
        this.ctx.stroke()

        this.ctx.beginPath()
        this.ctx.moveTo(start.x, start.y)
        this.ctx.lineTo(end.x, end.y)
        this.ctx.strokeStyle = COLORS.wall
        this.ctx.lineWidth = 6
        this.ctx.lineCap = "round"
        this.ctx.stroke()
    }

    public drawFlipper(flipper: Flipper): void {
        const { pivot } = flipper
        const flipperWidth = 12

        this.ctx.save()
        this.ctx.translate(pivot.x, pivot.y)
        this.ctx.rotate(flipper.angle)

        this.ctx.beginPath()
        this.ctx.ellipse(0, 0, 8, 8, 0, 0, Math.PI * 2)
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
        this.ctx.lineWidth = 2
        this.ctx.stroke()

        this.ctx.beginPath()
        this.ctx.arc(0, 0, 5, 0, Math.PI * 2)
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
            2
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
            x - width / 2 - 5,
            y - 10,
            width + 10,
            height + 20,
            COLORS.scorePanel,
            3
        )

        this.ctx.fillStyle = "#000000"
        this.ctx.fillRect(x - width / 2, y, width, height)

        if (isCharging || power > 0) {
            const powerHeight = (power / maxPower) * (height - 10)
            const gradient = this.ctx.createLinearGradient(
                x,
                y + height - 5,
                x,
                y + height - 5 - powerHeight
            )
            gradient.addColorStop(0, "#800000")
            gradient.addColorStop(0.5, "#ff0000")
            gradient.addColorStop(1, "#ff8000")

            this.ctx.fillStyle = gradient
            this.ctx.fillRect(
                x - width / 2 + 5,
                y + height - 5 - powerHeight,
                width - 10,
                powerHeight
            )
        }

        this.ctx.fillStyle = "#ffffff"
        this.ctx.font = "bold 10px Tahoma, sans-serif"
        this.ctx.textAlign = "center"
        this.ctx.fillText("POWER", x, y + height + 15)
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
        const panelHeight = 50
        const panelY = 5

        this.drawBeveledRect(
            5,
            panelY,
            this.width - 10,
            panelHeight,
            COLORS.scorePanel,
            3
        )

        this.ctx.fillStyle = "#000000"
        this.ctx.fillRect(10, panelY + 8, 100, 20)

        this.ctx.fillStyle = COLORS.text
        this.ctx.font = "bold 14px 'Courier New', monospace"
        this.ctx.textAlign = "left"
        this.ctx.fillText(score.toString().padStart(8, "0"), 15, panelY + 22)

        this.ctx.fillStyle = "#000000"
        this.ctx.font = "10px Tahoma, sans-serif"
        this.ctx.fillText("SCORE", 10, panelY + 42)

        this.ctx.fillStyle = "#000000"
        this.ctx.fillRect(120, panelY + 8, 80, 20)

        this.ctx.fillStyle = "#ffff00"
        this.ctx.font = "bold 12px 'Courier New', monospace"
        this.ctx.fillText(
            highScore.toString().padStart(6, "0"),
            125,
            panelY + 22
        )

        this.ctx.fillStyle = "#000000"
        this.ctx.font = "10px Tahoma, sans-serif"
        this.ctx.fillText("HIGH", 120, panelY + 42)

        this.ctx.fillStyle = "#000000"
        this.ctx.font = "12px Tahoma, sans-serif"
        this.ctx.textAlign = "right"

        let ballsText = ""
        for (let i = 0; i < balls; i++) {
            ballsText += "●"
        }
        for (let i = balls; i < 3; i++) {
            ballsText += "○"
        }
        this.ctx.fillText(`BALL: ${ballsText}`, this.width - 15, panelY + 22)

        if (gameState !== "playing") {
            this.ctx.fillStyle = gameState === "idle" ? "#008000" : "#800000"
            this.ctx.fillText(
                gameState === "idle" ? "READY" : gameState.toUpperCase(),
                this.width - 15,
                panelY + 40
            )
        }
    }

    public drawMessage(message: string, subMessage?: string): void {
        const centerX = this.width / 2
        const centerY = this.height / 2

        this.ctx.fillStyle = "rgba(0, 0, 0, 0.7)"
        this.ctx.fillRect(
            centerX - 120,
            centerY - 40,
            240,
            subMessage ? 80 : 50
        )

        this.drawBeveledRect(
            centerX - 122,
            centerY - 42,
            244,
            subMessage ? 84 : 54,
            "transparent",
            2
        )

        this.ctx.fillStyle = "#ffffff"
        this.ctx.font = "bold 20px Tahoma, sans-serif"
        this.ctx.textAlign = "center"
        this.ctx.textBaseline = "middle"
        this.ctx.fillText(message, centerX, centerY - (subMessage ? 10 : 0))

        if (subMessage) {
            this.ctx.fillStyle = "#c0c0c0"
            this.ctx.font = "12px Tahoma, sans-serif"
            this.ctx.fillText(subMessage, centerX, centerY + 20)
        }
    }

    public drawInstructions(): void {
        const instructions = [
            "Z / ← : Left Flipper",
            "X / → : Right Flipper",
            "SPACE : Launch Ball",
        ]

        const startY = this.height - 60
        this.ctx.fillStyle = "rgba(255, 255, 255, 0.7)"
        this.ctx.font = "10px Tahoma, sans-serif"
        this.ctx.textAlign = "center"

        instructions.forEach((text, i) => {
            this.ctx.fillText(text, this.width / 2, startY + i * 14)
        })
    }
}
