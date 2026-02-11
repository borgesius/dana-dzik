import type { Packet } from "./types"

const CAPACITY = 200

type PacketListener = (packet: Packet) => void

class PacketBuffer {
    private buffer: Packet[] = []
    private nextId = 1
    private listeners: PacketListener[] = []

    push(packet: Omit<Packet, "id">): Packet {
        const p: Packet = { ...packet, id: this.nextId++ }
        if (this.buffer.length >= CAPACITY) {
            this.buffer.shift()
        }
        this.buffer.push(p)
        for (const fn of this.listeners) {
            fn(p)
        }
        return p
    }

    snapshot(): Packet[] {
        return [...this.buffer]
    }

    recent(n: number): Packet[] {
        return this.buffer.slice(-n)
    }

    subscribe(fn: PacketListener): () => void {
        this.listeners.push(fn)
        return () => {
            const idx = this.listeners.indexOf(fn)
            if (idx >= 0) this.listeners.splice(idx, 1)
        }
    }

    get size(): number {
        return this.buffer.length
    }

    get totalCount(): number {
        return this.nextId - 1
    }
}

let instance: PacketBuffer | null = null

export function getPacketBuffer(): PacketBuffer {
    if (!instance) {
        instance = new PacketBuffer()
    }
    return instance
}
