import { getAchievementManager } from "../achievements/AchievementManager"
import type { AchievementId } from "../achievements/types"
import { onAppEvent } from "../events"
import type { CosmeticType } from "./CosmeticManager"
import { getCosmeticManager } from "./CosmeticManager"

interface CosmeticUnlockEntry {
    achievementId: AchievementId
    type: CosmeticType
    cosmeticId: string
}

const ACHIEVEMENT_COSMETIC_MAP: CosmeticUnlockEntry[] = [
    // ── Themes ─────────────────────────────────────────────────────────────
    { achievementId: "tourist", type: "theme", cosmeticId: "mac-classic" },
    { achievementId: "hacker", type: "theme", cosmeticId: "apple2" },
    { achievementId: "programmer", type: "theme", cosmeticId: "c64" },
    { achievementId: "choo-choo", type: "theme", cosmeticId: "amiga" },
    { achievementId: "full-stack", type: "theme", cosmeticId: "next" },
    { achievementId: "three-ways", type: "theme", cosmeticId: "vaporwave" },
    { achievementId: "windfall", type: "theme", cosmeticId: "golden" },
    {
        achievementId: "die-welt-als-wille",
        type: "theme",
        cosmeticId: "nocturnal",
    },
    { achievementId: "ecce-homo", type: "theme", cosmeticId: "void" },
    { achievementId: "arcana-world", type: "theme", cosmeticId: "arcana" },

    // ── Cursor Trails ─────────────────────────────────────────────────────
    {
        achievementId: "syndicate-complete",
        type: "cursor-trail",
        cosmeticId: "existentialist",
    },
    {
        achievementId: "deputies-complete",
        type: "cursor-trail",
        cosmeticId: "idealist",
    },
    {
        achievementId: "collective-complete",
        type: "cursor-trail",
        cosmeticId: "rationalist",
    },
    {
        achievementId: "prospectors-complete",
        type: "cursor-trail",
        cosmeticId: "post-structuralist",
    },
    {
        achievementId: "suffering",
        type: "cursor-trail",
        cosmeticId: "void-static",
    },
    {
        achievementId: "navigator",
        type: "cursor-trail",
        cosmeticId: "earthen",
    },
    {
        achievementId: "pinball-wizard",
        type: "cursor-trail",
        cosmeticId: "arcade",
    },
    {
        achievementId: "irrational-exuberance",
        type: "cursor-trail",
        cosmeticId: "gold-rush",
    },
    {
        achievementId: "from-nothing",
        type: "cursor-trail",
        cosmeticId: "matrix",
    },
    {
        achievementId: "full-moon",
        type: "cursor-trail",
        cosmeticId: "cosmic",
    },
    {
        achievementId: "promethean",
        type: "cursor-trail",
        cosmeticId: "philosophia",
    },
    {
        achievementId: "der-antichrist",
        type: "cursor-trail",
        cosmeticId: "instrumentalization",
    },
    {
        achievementId: "erlosung",
        type: "cursor-trail",
        cosmeticId: "typewriter",
    },

    // ── Wallpapers ────────────────────────────────────────────────────────
    {
        achievementId: "syndicate-complete",
        type: "wallpaper",
        cosmeticId: "existentialist-dusk",
    },
    {
        achievementId: "deputies-complete",
        type: "wallpaper",
        cosmeticId: "idealist-marble",
    },
    {
        achievementId: "collective-complete",
        type: "wallpaper",
        cosmeticId: "rationalist-blueprint",
    },
    {
        achievementId: "prospectors-complete",
        type: "wallpaper",
        cosmeticId: "post-structural-void",
    },
    {
        achievementId: "samsara",
        type: "wallpaper",
        cosmeticId: "prestige-gold",
    },
    {
        achievementId: "gotzen-dammerung",
        type: "wallpaper",
        cosmeticId: "beyond-the-veil",
    },
    {
        achievementId: "first-out-the-door",
        type: "wallpaper",
        cosmeticId: "pasture",
    },
    { achievementId: "calm-mode", type: "wallpaper", cosmeticId: "ocean" },
    {
        achievementId: "witness-protection",
        type: "wallpaper",
        cosmeticId: "terminal-green",
    },
    {
        achievementId: "assembly-line",
        type: "wallpaper",
        cosmeticId: "blueprint",
    },
    {
        achievementId: "denkwurdigkeiten",
        type: "wallpaper",
        cosmeticId: "stable",
    },
    {
        achievementId: "arcana-star",
        type: "wallpaper",
        cosmeticId: "starfield",
    },
    { achievementId: "level-50", type: "wallpaper", cosmeticId: "aurora" },
    {
        achievementId: "harvest-100000",
        type: "wallpaper",
        cosmeticId: "trading-floor",
    },

    // ── Window Chrome ─────────────────────────────────────────────────────
    {
        achievementId: "clean-desk",
        type: "window-chrome",
        cosmeticId: "minimal",
    },
    {
        achievementId: "rtfm",
        type: "window-chrome",
        cosmeticId: "terminal",
    },
    {
        achievementId: "full-spiral",
        type: "window-chrome",
        cosmeticId: "frontier",
    },
    {
        achievementId: "level-20",
        type: "window-chrome",
        cosmeticId: "corporate",
    },
    {
        achievementId: "completionist",
        type: "window-chrome",
        cosmeticId: "vintage",
    },
    {
        achievementId: "graveyard-shift",
        type: "window-chrome",
        cosmeticId: "sanguine",
    },
    {
        achievementId: "display-glitch",
        type: "window-chrome",
        cosmeticId: "neon",
    },
    {
        achievementId: "cost-7",
        type: "window-chrome",
        cosmeticId: "dial-up",
    },
    {
        achievementId: "endowed-chair",
        type: "window-chrome",
        cosmeticId: "arcane",
    },

    // ── System Fonts ──────────────────────────────────────────────────────
    {
        achievementId: "hacker",
        type: "system-font",
        cosmeticId: "monospace",
    },
    { achievementId: "author", type: "system-font", cosmeticId: "serif" },
    {
        achievementId: "signed",
        type: "system-font",
        cosmeticId: "handwritten",
    },
    {
        achievementId: "self-aware",
        type: "system-font",
        cosmeticId: "terminal",
    },
    {
        achievementId: "bounty-hunter",
        type: "system-font",
        cosmeticId: "pixel",
    },
    {
        achievementId: "der-deutsche-idealismus",
        type: "system-font",
        cosmeticId: "blackletter",
    },

    // ── Taskbar Styles ────────────────────────────────────────────────────
    {
        achievementId: "clean-desk",
        type: "taskbar-style",
        cosmeticId: "minimal",
    },
    {
        achievementId: "factory-floor",
        type: "taskbar-style",
        cosmeticId: "chunky",
    },
    {
        achievementId: "dark-mode",
        type: "taskbar-style",
        cosmeticId: "dark-glass",
    },
    {
        achievementId: "completionist",
        type: "taskbar-style",
        cosmeticId: "holographic",
    },

    // ── Window Animations ─────────────────────────────────────────────────
    {
        achievementId: "calm-mode",
        type: "window-animation",
        cosmeticId: "none",
    },
    {
        achievementId: "explorer",
        type: "window-animation",
        cosmeticId: "fade",
    },
    {
        achievementId: "popup-enjoyer",
        type: "window-animation",
        cosmeticId: "bounce",
    },
    {
        achievementId: "phase-3",
        type: "window-animation",
        cosmeticId: "viscous",
    },
    {
        achievementId: "interior-decorator",
        type: "window-animation",
        cosmeticId: "cascade",
    },
    {
        achievementId: "bsod-trigger",
        type: "window-animation",
        cosmeticId: "glitch",
    },

    // ── Startup Sounds ────────────────────────────────────────────────────
    { achievementId: "phase-2", type: "startup-sound", cosmeticId: "chime" },
    {
        achievementId: "choo-choo",
        type: "startup-sound",
        cosmeticId: "retro",
    },
    {
        achievementId: "dial-up-connection",
        type: "startup-sound",
        cosmeticId: "modem",
    },
    {
        achievementId: "horse-whisperer",
        type: "startup-sound",
        cosmeticId: "whinny",
    },
    {
        achievementId: "oracle-of-delphi",
        type: "startup-sound",
        cosmeticId: "orchestral",
    },
]

export function wireCosmeticUnlocks(): void {
    const cm = getCosmeticManager()
    const achMgr = getAchievementManager()

    achMgr.onEarned((achievementId) => {
        for (const entry of ACHIEVEMENT_COSMETIC_MAP) {
            if (entry.achievementId === achievementId) {
                cm.unlock(entry.type, entry.cosmeticId)
            }
        }
    })

    for (const entry of ACHIEVEMENT_COSMETIC_MAP) {
        if (achMgr.hasEarned(entry.achievementId)) {
            cm.unlock(entry.type, entry.cosmeticId)
        }
    }

    wireCosmeticAchievements()
}

function wireCosmeticAchievements(): void {
    const cm = getCosmeticManager()
    const achMgr = getAchievementManager()

    onAppEvent("cosmetic:unlocked", () => {
        const count = cm.getUnlockedCount()
        if (count >= 10) achMgr.earn("ten-unlocked")
        if (count >= 25) achMgr.earn("aesthete")
    })

    onAppEvent("cosmetic:changed", () => {
        const activeNonDefault = cm.getActiveNonDefaultCount()
        if (activeNonDefault >= 1) achMgr.earn("fashion-forward")
        if (activeNonDefault >= 3) achMgr.earn("makeover")
        if (activeNonDefault >= 8) achMgr.earn("fashionista")

        const pferdCount = cm.getActivePferdCount()
        if (pferdCount >= 3) achMgr.earn("pferd-couture")
    })

    onAppEvent("terminal:open-window", (detail) => {
        if (detail.windowId === "customize") {
            achMgr.earn("window-shopper")
        }
    })
}
