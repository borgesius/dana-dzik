import { emitAppEvent } from "../events"

export type CosmeticType =
    | "cursor-trail"
    | "wallpaper"
    | "window-chrome"
    | "theme"
    | "system-font"
    | "taskbar-style"
    | "window-animation"
    | "startup-sound"

export type CosmeticRarity = "common" | "uncommon" | "rare" | "legendary"

export interface CosmeticSaveData {
    unlocked: string[]
    active: Partial<Record<CosmeticType, string>>
}

type CosmeticCallback = (type: CosmeticType, id: string) => void

let instance: CosmeticManager | null = null

export function getCosmeticManager(): CosmeticManager {
    if (!instance) {
        instance = new CosmeticManager()
    }
    return instance
}

const PFERD_COSMETIC_IDS = new Set([
    "cursor-trail:earthen",
    "cursor-trail:instrumentalization",
    "wallpaper:pasture",
    "wallpaper:stable",
    "window-chrome:sanguine",
    "window-animation:viscous",
    "theme:nocturnal",
    "startup-sound:whinny",
])

export class CosmeticManager {
    private unlocked: Set<string> = new Set()
    private active: Map<CosmeticType, string> = new Map()
    private changeCallbacks: CosmeticCallback[] = []
    private dirtyCallback: (() => void) | null = null

    constructor() {
        this.unlocked.add("cursor-trail:default")
        this.unlocked.add("wallpaper:default")
        this.unlocked.add("window-chrome:default")
        this.unlocked.add("theme:win95")
        this.unlocked.add("theme:mac-classic")
        this.unlocked.add("theme:apple2")
        this.unlocked.add("theme:c64")
        this.unlocked.add("system-font:default")
        this.unlocked.add("taskbar-style:default")
        this.unlocked.add("window-animation:default")
        this.unlocked.add("startup-sound:none")

        this.active.set("cursor-trail", "default")
        this.active.set("wallpaper", "default")
        this.active.set("window-chrome", "default")
        this.active.set("theme", "win95")
        this.active.set("system-font", "default")
        this.active.set("taskbar-style", "default")
        this.active.set("window-animation", "default")
        this.active.set("startup-sound", "none")
    }

    public onChange(cb: CosmeticCallback): void {
        this.changeCallbacks.push(cb)
    }

    public setDirtyCallback(cb: () => void): void {
        this.dirtyCallback = cb
    }

    public unlock(type: CosmeticType, id: string): boolean {
        const key = `${type}:${id}`
        if (this.unlocked.has(key)) return false
        this.unlocked.add(key)
        this.dirtyCallback?.()
        emitAppEvent("cosmetic:unlocked", { type, id })
        return true
    }

    public isUnlocked(type: CosmeticType, id: string): boolean {
        return this.unlocked.has(`${type}:${id}`)
    }

    public setActive(type: CosmeticType, id: string): boolean {
        if (!this.isUnlocked(type, id)) return false
        this.active.set(type, id)
        this.changeCallbacks.forEach((cb) => cb(type, id))
        this.dirtyCallback?.()
        emitAppEvent("cosmetic:changed", { type, id })
        return true
    }

    public getActive(type: CosmeticType): string {
        return this.active.get(type) ?? "default"
    }

    public getUnlockedForType(type: CosmeticType): string[] {
        const prefix = `${type}:`
        return [...this.unlocked]
            .filter((k) => k.startsWith(prefix))
            .map((k) => k.slice(prefix.length))
    }

    public getUnlockedCount(): number {
        return this.unlocked.size
    }

    /** Count how many distinct non-default categories have an active cosmetic */
    public getActiveNonDefaultCount(): number {
        let count = 0
        for (const [type, id] of this.active) {
            const defaultId =
                type === "startup-sound"
                    ? "none"
                    : type === "theme"
                      ? "win95"
                      : "default"
            if (id !== defaultId) count++
        }
        return count
    }

    /** Count how many active Pferd-themed cosmetics are equipped */
    public getActivePferdCount(): number {
        let count = 0
        for (const [type, id] of this.active) {
            if (PFERD_COSMETIC_IDS.has(`${type}:${id}`)) count++
        }
        return count
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
