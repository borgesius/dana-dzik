const MAX_PARTICLES = 120

export interface Particle {
    x: number
    y: number
    vx: number
    vy: number
    life: number
    maxLife: number
    color: string
    size: number
}

export interface FloatingText {
    x: number
    y: number
    text: string
    life: number
    maxLife: number
    color: string
}

export class ParticleSystem {
    public particles: Particle[] = []
    public floatingTexts: FloatingText[] = []

    public burst(
        x: number,
        y: number,
        count: number,
        color: string,
        speed: number = 2,
        size: number = 2,
        life: number = 30
    ): void {
        for (let i = 0; i < count; i++) {
            if (this.particles.length >= MAX_PARTICLES) break
            const angle = Math.random() * Math.PI * 2
            const spd = speed * (0.5 + Math.random() * 0.8)
            this.particles.push({
                x,
                y,
                vx: Math.cos(angle) * spd,
                vy: Math.sin(angle) * spd,
                life,
                maxLife: life,
                color,
                size: size * (0.6 + Math.random() * 0.6),
            })
        }
    }

    public trail(
        x: number,
        y: number,
        color: string,
        size: number = 1.5,
        life: number = 15
    ): void {
        if (this.particles.length >= MAX_PARTICLES) return
        this.particles.push({
            x: x + (Math.random() - 0.5) * 4,
            y: y + (Math.random() - 0.5) * 4,
            vx: (Math.random() - 0.5) * 0.5,
            vy: (Math.random() - 0.5) * 0.5,
            life,
            maxLife: life,
            color,
            size,
        })
    }

    public addFloatingText(
        x: number,
        y: number,
        text: string,
        color: string = "#FFD700",
        life: number = 50
    ): void {
        this.floatingTexts.push({ x, y, text, life, maxLife: life, color })
    }

    public update(dt: number = 1): void {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i]
            p.x += p.vx * dt
            p.y += p.vy * dt
            p.vy += 0.03 * dt // slight gravity on particles
            p.life -= dt
            if (p.life <= 0) {
                this.particles.splice(i, 1)
            }
        }

        for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
            const ft = this.floatingTexts[i]
            ft.y -= 0.6 * dt
            ft.life -= dt
            if (ft.life <= 0) {
                this.floatingTexts.splice(i, 1)
            }
        }
    }

    public clear(): void {
        this.particles.length = 0
        this.floatingTexts.length = 0
    }
}
