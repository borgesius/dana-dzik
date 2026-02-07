import type { CosmeticType } from "./CosmeticManager"

export interface CosmeticDefinition {
    id: string
    type: CosmeticType
    name: string
    description: string
    unlockHint: string
    icon: string
    /** CSS class suffix applied to desktop/body for wallpaper/chrome */
    cssClass?: string
    /** Particle config for cursor trails */
    trailConfig?: TrailConfig
}

export interface TrailConfig {
    colors: string[]
    shapes: string[]
    /** Size range [min, max] */
    size: [number, number]
}

export const COSMETIC_DEFINITIONS: CosmeticDefinition[] = [
    // ── Cursor Trails ─────────────────────────────────────────────────────

    {
        id: "default",
        type: "cursor-trail",
        name: "Sparkle",
        description: "The classic sparkle trail",
        unlockHint: "Always unlocked",
        icon: "✨",
        trailConfig: {
            colors: ["#ffd700", "#ff6b35", "#ff1744", "#aa00ff"],
            shapes: ["✦", "✧", "⬥"],
            size: [6, 12],
        },
    },
    {
        id: "quickdraw",
        type: "cursor-trail",
        name: "Quickdraw",
        description: "Bullet and fire particles",
        unlockHint: "Complete the Quickdraw faction collection",
        icon: "🔫",
        trailConfig: {
            colors: ["#ff4500", "#ff8c00", "#ffd700", "#8b0000"],
            shapes: ["•", "◦", "🔥"],
            size: [5, 10],
        },
    },
    {
        id: "deputies",
        type: "cursor-trail",
        name: "Deputies",
        description: "Star and badge particles",
        unlockHint: "Complete the Deputies faction collection",
        icon: "⭐",
        trailConfig: {
            colors: ["#4169e1", "#c0c0c0", "#ffd700", "#191970"],
            shapes: ["★", "☆", "⬡"],
            size: [6, 11],
        },
    },
    {
        id: "clockwork",
        type: "cursor-trail",
        name: "Clockwork",
        description: "Gear and cog particles",
        unlockHint: "Complete the Clockwork faction collection",
        icon: "⚙️",
        trailConfig: {
            colors: ["#b87333", "#cd7f32", "#daa520", "#8b7355"],
            shapes: ["⚙", "⊛", "◎"],
            size: [7, 13],
        },
    },
    {
        id: "prospectors",
        type: "cursor-trail",
        name: "Prospectors",
        description: "Bone and ghost particles",
        unlockHint: "Complete the Prospectors faction collection",
        icon: "💀",
        trailConfig: {
            colors: ["#9370db", "#00ff7f", "#483d8b", "#2e8b57"],
            shapes: ["💀", "👻", "◆"],
            size: [6, 12],
        },
    },

    // ── Desktop Wallpapers ────────────────────────────────────────────────

    {
        id: "default",
        type: "wallpaper",
        name: "Default",
        description: "The standard desktop background",
        unlockHint: "Always unlocked",
        icon: "🖥️",
        cssClass: "",
    },
    {
        id: "quickdraw-sunset",
        type: "wallpaper",
        name: "Quickdraw Sunset",
        description: "Dusty orange gradient",
        unlockHint: "Win a run with majority Quickdraw units",
        icon: "🌅",
        cssClass: "wp-quickdraw-sunset",
    },
    {
        id: "deputies-badge",
        type: "wallpaper",
        name: "Deputies Badge",
        description: "Steel blue pattern",
        unlockHint: "Win a run with majority Deputies units",
        icon: "🛡️",
        cssClass: "wp-deputies-badge",
    },
    {
        id: "clockwork-gears",
        type: "wallpaper",
        name: "Clockwork Gears",
        description: "Brass and copper pattern",
        unlockHint: "Win a run with majority Clockwork units",
        icon: "⚙️",
        cssClass: "wp-clockwork-gears",
    },
    {
        id: "prospectors-mine",
        type: "wallpaper",
        name: "Prospectors Mine",
        description: "Dark purple and green pattern",
        unlockHint: "Win a run with majority Prospectors units",
        icon: "⛏️",
        cssClass: "wp-prospectors-mine",
    },
    {
        id: "prestige-gold",
        type: "wallpaper",
        name: "Prestige Gold",
        description: "Gold gradient",
        unlockHint: "Prestige 3 or more times",
        icon: "🏆",
        cssClass: "wp-prestige-gold",
    },

    // ── Window Chrome ─────────────────────────────────────────────────────

    {
        id: "default",
        type: "window-chrome",
        name: "Default",
        description: "The standard window chrome",
        unlockHint: "Always unlocked",
        icon: "🪟",
    },
    {
        id: "frontier",
        type: "window-chrome",
        name: "Frontier",
        description: "Wood and leather title bars",
        unlockHint: "Become a chrome frontiersman",
        icon: "🤠",
        cssClass: "chrome-frontier",
    },
    {
        id: "corporate",
        type: "window-chrome",
        name: "Corporate",
        description: "Dark glass title bars",
        unlockHint: "Reach player level 25",
        icon: "🏢",
        cssClass: "chrome-corporate",
    },
    {
        id: "vintage",
        type: "window-chrome",
        name: "Vintage",
        description: "Sepia-toned chrome",
        unlockHint: "Earn 50 or more achievements",
        icon: "📜",
        cssClass: "chrome-vintage",
    },
]

/** Get all definitions for a cosmetic type */
export function getCosmeticsForType(type: CosmeticType): CosmeticDefinition[] {
    return COSMETIC_DEFINITIONS.filter((d) => d.type === type)
}

/** Get a specific cosmetic definition */
export function getCosmeticDef(
    type: CosmeticType,
    id: string
): CosmeticDefinition | undefined {
    return COSMETIC_DEFINITIONS.find((d) => d.type === type && d.id === id)
}
