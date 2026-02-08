import { emitAppEvent } from "../events"

export type CosmeticType = "cursor-trail" | "wallpaper" | "window-chrome"

export interface CosmeticSaveData {
    unlocked: string[]
    active: Record<string, string>
}

type CosmeticCallback = (type: CosmeticType, id: string) => void

let instance: CosmeticManager | null = null

export function getCosmeticManager(): CosmeticManager {
    if (!instance) {
        instance = new CosmeticManager()
    }
    return instance
}

export class CosmeticManager {
    private unlocked: Set<string> = new Set()
    private active: Map<CosmeticType, string> = new Map()
    private changeCallbacks: CosmeticCallback[] = []
    private dirtyCallback: (() => void) | null = null

    constructor() {
        // Defaults are always unlocked
        this.unlocked.add("cursor-trail:default")
        this.unlocked.add("wallpaper:default")
        this.unlocked.add("window-chrome:default")
        this.active.set("cursor-trail", "default")
        this.active.set("wallpaper", "default")
        this.active.set("window-chrome", "default")
    }

    /** Register a callback for cosmetic changes */
    public onChange(cb: CosmeticCallback): void {
        this.changeCallbacks.push(cb)
    }

    public setDirtyCallback(cb: () => void): void {
        this.dirtyCallback = cb
    }

    /** Unlock a cosmetic */
    public unlock(type: CosmeticType, id: string): boolean {
        const key = `${type}:${id}`
        if (this.unlocked.has(key)) return false
        this.unlocked.add(key)
        this.dirtyCallback?.()
        emitAppEvent("cosmetic:unlocked", { type, id })
        return true
    }

    /** Check if a cosmetic is unlocked */
    public isUnlocked(type: CosmeticType, id: string): boolean {
        return this.unlocked.has(`${type}:${id}`)
    }

    /** Set the active cosmetic for a type */
    public setActive(type: CosmeticType, id: string): boolean {
        if (!this.isUnlocked(type, id)) return false
        this.active.set(type, id)
        this.changeCallbacks.forEach((cb) => cb(type, id))
        this.dirtyCallback?.()
        return true
    }

    /** Get the active cosmetic for a type */
    public getActive(type: CosmeticType): string {
        return this.active.get(type) ?? "default"
    }

    /** Get all unlocked cosmetics for a type */
    public getUnlockedForType(type: CosmeticType): string[] {
        const prefix = `${type}:`
        return [...this.unlocked]
            .filter((k) => k.startsWith(prefix))
            .map((k) => k.slice(prefix.length))
    }

    /** Get total number of unlocked cosmetics */
    public getUnlockedCount(): number {
        return this.unlocked.size
    }

    // ── Serialization ─────────────────────────────────────────────────────

    public serialize(): CosmeticSaveData {
        return {
            unlocked: [...this.unlocked],
            active: Object.fromEntries(this.active),
        }
    }

    public deserialize(data?: CosmeticSaveData): void {
        if (!data) return
        if (data.unlocked) {
            for (const key of data.unlocked) {
                this.unlocked.add(key)
            }
        }
        if (data.active) {
            for (const [type, id] of Object.entries(data.active)) {
                if (this.unlocked.has(`${type}:${id}`)) {
                    this.active.set(type as CosmeticType, id)
                }
            }
        }
    }
}
