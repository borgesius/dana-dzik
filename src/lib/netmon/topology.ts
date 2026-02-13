import { CanvasError } from "@/core/errors"

import { SERVICES } from "./services"
import type { Packet, Protocol, Service } from "./types"

// ── Node layout ─────────────────────────────────────────────────────────

interface NodeLayout {
    service: Service
    x: number // 0-1 normalized
    y: number // 0-1 normalized
    label: string
    registered: boolean
}

const NODES: NodeLayout[] = [
    {
        service: SERVICES.SYSTEM,
        x: 0.5,
        y: 0.5,
        label: "SYSTEM",
        registered: true,
    },
    {
        service: SERVICES.MARKET,
        x: 0.2,
        y: 0.25,
        label: "TRADING-FLOOR",
        registered: true,
    },
    {
        service: SERVICES.FACTORY,
        x: 0.2,
        y: 0.75,
        label: "PRODUCTION",
        registered: true,
    },
    {
        service: SERVICES.SYMPOSIUM,
        x: 0.8,
        y: 0.25,
        label: "COMBAT-SIM",
        registered: true,
    },
    {
        service: SERVICES.WELT_VM,
        x: 0.8,
        y: 0.75,
        label: "DAS-RUNTIME",
        registered: true,
    },
    {
        service: SERVICES.PRESTIGE,
        x: 0.35,
        y: 0.12,
        label: "LIFECYCLE-MGR",
        registered: true,
    },
    {
        service: SERVICES.CAREER,
        x: 0.65,
        y: 0.88,
        label: "HUMAN-RESOURCES",
        registered: true,
    },
    {
        service: SERVICES.COSMETICS,
        x: 0.12,
        y: 0.5,
        label: "APPEARANCE-SVC",
        registered: true,
    },
    {
        service: SERVICES.VEIL,
        x: 0.88,
        y: 0.5,
        label: "????",
        registered: true,
    },
    {
        service: SERVICES.PERSISTENCE,
        x: 0.5,
        y: 0.08,
        label: "LOCAL-DB",
        registered: true,
    },
    // Unregistered facility node — peripheral, dim, unlabeled
    {
        service: SERVICES.FACILITY_A,
        x: 0.06,
        y: 0.06,
        label: "",
        registered: false,
    },
]

// ── Protocol colors ─────────────────────────────────────────────────────

const PROTOCOL_COLORS: Record<Protocol, string> = {
    HTTP: "#5b9bd5",
    WS: "#70c070",
    UDP: "#e0a030",
    FTP: "#60c8c8",
    SMTP: "#d080b0",
    ICMP: "#888888",
    "???": "#555555",
}

function getProtocolColor(proto: Protocol): string {
    return PROTOCOL_COLORS[proto] ?? "#666666"
}

// ── Animated particles ──────────────────────────────────────────────────

interface Particle {
    srcIdx: number
    dstIdx: number
    progress: number // 0-1
    color: string
    startTime: number
}

const PARTICLE_DURATION_MS = 800

// ── Traffic heat ────────────────────────────────────────────────────────

interface TrafficEdge {
    srcAddr: string
    dstAddr: string
    lastSeen: number
    count: number
}

// ── Renderer ────────────────────────────────────────────────────────────

export class TopologyRenderer {
    private canvas: HTMLCanvasElement
    private ctx: CanvasRenderingContext2D
    private particles: Particle[] = []
    private trafficMap: Map<string, TrafficEdge> = new Map()
    private animFrameId = 0
    private facilityVisible = false
    private facilityFadeStart = 0
    private hoveredNodeIdx = -1
    private selectedNodeAddr = ""
    private onNodeClick: ((addr: string) => void) | null = null
    private dpr = 1

    constructor(canvas: HTMLCanvasElement) {
        this.canvas = canvas
        const ctx = canvas.getContext("2d")
        if (!ctx)
            throw new CanvasError("Canvas 2d context unavailable", {
                component: "TopologyRenderer",
            })
        this.ctx = ctx
        this.dpr = window.devicePixelRatio || 1
        this.resize()
        this.setupInteraction()
    }

    public resize(): void {
        const rect = this.canvas.parentElement?.getBoundingClientRect()
        if (!rect) return
        const w = rect.width
        const h = rect.height
        this.dpr = window.devicePixelRatio || 1
        this.canvas.width = w * this.dpr
        this.canvas.height = h * this.dpr
        this.canvas.style.width = `${w}px`
        this.canvas.style.height = `${h}px`
    }

    private setupInteraction(): void {
        this.canvas.addEventListener("mousemove", (e) => {
            const rect = this.canvas.getBoundingClientRect()
            const mx = (e.clientX - rect.left) / rect.width
            const my = (e.clientY - rect.top) / rect.height
            this.hoveredNodeIdx = this.hitTestNode(mx, my)
            this.canvas.style.cursor =
                this.hoveredNodeIdx >= 0 ? "pointer" : "default"
        })

        this.canvas.addEventListener("click", (e) => {
            const rect = this.canvas.getBoundingClientRect()
            const mx = (e.clientX - rect.left) / rect.width
            const my = (e.clientY - rect.top) / rect.height
            const idx = this.hitTestNode(mx, my)
            if (idx >= 0) {
                const node = NODES[idx]
                this.selectedNodeAddr =
                    this.selectedNodeAddr === node.service.addr
                        ? ""
                        : node.service.addr
                this.onNodeClick?.(this.selectedNodeAddr)
            } else {
                this.selectedNodeAddr = ""
                this.onNodeClick?.("")
            }
        })

        this.canvas.addEventListener("mouseleave", () => {
            this.hoveredNodeIdx = -1
            this.canvas.style.cursor = "default"
        })
    }

    private hitTestNode(nx: number, ny: number): number {
        const hitRadius = 0.04
        for (let i = 0; i < NODES.length; i++) {
            const n = NODES[i]
            if (!n.registered && !this.facilityVisible) continue
            const dx = nx - n.x
            const dy = ny - n.y
            if (Math.sqrt(dx * dx + dy * dy) < hitRadius) return i
        }
        return -1
    }

    public setOnNodeClick(fn: (addr: string) => void): void {
        this.onNodeClick = fn
    }

    /** Called when a new packet arrives. Spawn a particle and update traffic heat. */
    public ingestPacket(packet: Packet): void {
        const srcIdx = NODES.findIndex(
            (n) => n.service.addr === packet.src.addr
        )
        const dstIdx = NODES.findIndex(
            (n) => n.service.addr === packet.dst.addr
        )

        // If either endpoint is a facility host, make the facility node visible
        if (!NODES[srcIdx]?.registered || !NODES[dstIdx]?.registered) {
            this.facilityVisible = true
            this.facilityFadeStart = Date.now()
        }

        if (srcIdx >= 0 && dstIdx >= 0 && srcIdx !== dstIdx) {
            this.particles.push({
                srcIdx,
                dstIdx,
                progress: 0,
                color: getProtocolColor(packet.protocol),
                startTime: Date.now(),
            })
        }

        const key = `${packet.src.addr}->${packet.dst.addr}`
        const existing = this.trafficMap.get(key)
        if (existing) {
            existing.lastSeen = Date.now()
            existing.count++
        } else {
            this.trafficMap.set(key, {
                srcAddr: packet.src.addr,
                dstAddr: packet.dst.addr,
                lastSeen: Date.now(),
                count: 1,
            })
        }
    }

    public start(): void {
        const loop = (): void => {
            this.draw()
            this.animFrameId = requestAnimationFrame(loop)
        }
        this.animFrameId = requestAnimationFrame(loop)
    }

    public stop(): void {
        if (this.animFrameId) {
            cancelAnimationFrame(this.animFrameId)
            this.animFrameId = 0
        }
    }

    private draw(): void {
        const c = this.ctx
        const w = this.canvas.width
        const h = this.canvas.height
        c.save()
        c.scale(this.dpr, this.dpr)
        const lw = w / this.dpr
        const lh = h / this.dpr

        // Background
        c.fillStyle = "#0a0e14"
        c.fillRect(0, 0, lw, lh)

        const now = Date.now()

        if (this.facilityVisible && now - this.facilityFadeStart > 8000) {
            this.facilityVisible = false
        }

        this.drawEdges(c, lw, lh, now)

        this.drawParticles(c, lw, lh, now)

        this.drawNodes(c, lw, lh, now)

        c.restore()
    }

    private drawEdges(
        c: CanvasRenderingContext2D,
        w: number,
        h: number,
        now: number
    ): void {
        const fadeMs = 5000
        for (const edge of this.trafficMap.values()) {
            const age = now - edge.lastSeen
            if (age > fadeMs) continue

            const srcNode = NODES.find((n) => n.service.addr === edge.srcAddr)
            const dstNode = NODES.find((n) => n.service.addr === edge.dstAddr)
            if (!srcNode || !dstNode) continue
            if (
                (!srcNode.registered || !dstNode.registered) &&
                !this.facilityVisible
            )
                continue

            const alpha = Math.max(0, 1 - age / fadeMs) * 0.3
            c.strokeStyle = `rgba(100, 140, 180, ${alpha})`
            c.lineWidth = 1
            c.beginPath()
            c.moveTo(srcNode.x * w, srcNode.y * h)
            c.lineTo(dstNode.x * w, dstNode.y * h)
            c.stroke()
        }
    }

    private drawParticles(
        c: CanvasRenderingContext2D,
        w: number,
        h: number,
        now: number
    ): void {
        this.particles = this.particles.filter((p) => {
            const elapsed = now - p.startTime
            p.progress = elapsed / PARTICLE_DURATION_MS
            return p.progress <= 1
        })

        for (const p of this.particles) {
            const src = NODES[p.srcIdx]
            const dst = NODES[p.dstIdx]
            if (!src || !dst) continue
            if ((!src.registered || !dst.registered) && !this.facilityVisible)
                continue

            const x = src.x + (dst.x - src.x) * p.progress
            const y = src.y + (dst.y - src.y) * p.progress
            const alpha = 1 - p.progress * 0.5

            c.fillStyle = p.color
            c.globalAlpha = alpha
            c.beginPath()
            c.arc(x * w, y * h, 3, 0, Math.PI * 2)
            c.fill()
            c.globalAlpha = 1
        }
    }

    private drawNodes(
        c: CanvasRenderingContext2D,
        w: number,
        h: number,
        now: number
    ): void {
        const padding = 8
        const nodeH = 32
        c.textBaseline = "middle"

        for (let i = 0; i < NODES.length; i++) {
            const n = NODES[i]

            // Facility node: only show when visible, dim
            if (!n.registered) {
                if (!this.facilityVisible) continue
                const fadeAge = now - this.facilityFadeStart
                const alpha = Math.min(
                    1,
                    Math.max(0, 1 - (fadeAge - 6000) / 2000)
                )

                c.globalAlpha = alpha * 0.5
                c.fillStyle = "#333"
                c.beginPath()
                c.arc(n.x * w, n.y * h, 5, 0, Math.PI * 2)
                c.fill()

                // Tiny address label
                c.font = "9px monospace"
                c.fillStyle = "#555"
                c.fillText(n.service.addr, n.x * w + 8, n.y * h)
                c.globalAlpha = 1
                continue
            }

            const isHovered = i === this.hoveredNodeIdx
            const isSelected = this.selectedNodeAddr === n.service.addr
            const isVeil = n.service.addr === SERVICES.VEIL.addr

            // Glitch effect for VEIL node
            const glitchOffset = isVeil
                ? {
                      x: (Math.random() - 0.5) * 2,
                      y: (Math.random() - 0.5) * 2,
                  }
                : { x: 0, y: 0 }
            const glitchAlpha = isVeil && Math.random() > 0.85 ? 0.3 : 1

            c.font = "bold 10px monospace"
            const labelW = c.measureText(n.label).width
            c.font = "9px monospace"
            const addrW = c.measureText(n.service.addr).width
            const boxW = Math.max(labelW, addrW) + padding * 2
            const bx = n.x * w - boxW / 2 + glitchOffset.x
            const by = n.y * h - nodeH / 2 + glitchOffset.y

            c.globalAlpha = glitchAlpha

            if (isHovered || isSelected) {
                c.strokeStyle = isSelected
                    ? "rgba(100, 180, 255, 0.6)"
                    : "rgba(100, 180, 255, 0.3)"
                c.lineWidth = 2
                c.strokeRect(bx - 2, by - 2, boxW + 4, nodeH + 4)
            }

            // Background - darker/glitchier for VEIL
            c.fillStyle = isVeil
                ? "#0a0a14"
                : isSelected
                  ? "#1a2233"
                  : "#111822"
            c.fillRect(bx, by, boxW, nodeH)

            // Border - red tint for VEIL
            c.strokeStyle = isVeil ? "#3a1a2a" : "#2a3a4a"
            c.lineWidth = 1
            c.strokeRect(bx, by, boxW, nodeH)

            // Label - corrupted color for VEIL
            c.font = "bold 10px monospace"
            c.fillStyle = isVeil ? "#a88898" : "#c8d8e8"
            c.textAlign = "center"
            c.fillText(n.label, n.x * w + glitchOffset.x, n.y * h - 5)

            // Address
            c.font = "9px monospace"
            c.fillStyle = isVeil ? "#604858" : "#607888"
            c.fillText(
                n.service.addr,
                n.x * w + glitchOffset.x,
                n.y * h + 8
            )

            c.textAlign = "left"
            c.globalAlpha = 1
        }
    }
}
