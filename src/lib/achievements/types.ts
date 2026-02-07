export type AchievementCategory =
    | "trading"
    | "production"
    | "milestones"
    | "exploration"
    | "terminal"
    | "coding"
    | "exercises"
    | "social"
    | "pinball"
    | "autobattler"
    | "prestige"
    | "career"
    | "cross-system"

export type AchievementId =
    // Trading
    | "first-trade"
    | "penny-trader"
    | "small-business"
    | "going-concern"
    | "dot-com-darling"
    | "irrational-exuberance"
    | "buy-the-dip"
    | "sell-the-top"
    | "diversified"
    // Production
    | "factory-floor"
    | "industrialist"
    | "assembly-line"
    | "fully-automated"
    | "market-maker"
    | "cornered"
    // Milestones
    | "phase-2"
    | "phase-3"
    | "phase-4"
    | "all-commodities"
    | "limit-filled"
    // Exploration
    | "calm-mode"
    | "explorer"
    | "interior-decorator"
    | "dark-mode"
    | "polyglot"
    | "tourist"
    | "archivist"
    | "syslog"
    | "readme"
    // Terminal
    | "hacker"
    | "author"
    | "navigator"
    | "choo-choo"
    // Coding
    | "programmer"
    | "grund-compiled"
    | "grund-executed"
    | "ring-overflow"
    | "ring-cycle"
    | "ring-spin"
    | "thermal-protection"
    | "suffering"
    | "freakgpt"
    | "keyboard-cat"
    // Exercises
    | "welt-beginner"
    | "welt-intermediate"
    | "welt-advanced"
    | "welt-master"
    | "nibelung"
    | "erlosung"
    // Social
    | "guest"
    | "signed"
    | "cat-person"
    | "meow"
    | "popup-enjoyer"
    // Pinball
    | "pinball-wizard"
    | "high-roller"
    | "target-practice"
    | "bounty-hunter"
    // Exploration (hidden)
    | "y2k-survivor"
    | "big-spender"
    | "whale"
    | "qa-inspector"
    // Autobattler
    | "first-draft"
    | "posse-up"
    | "faction-recruit"
    | "full-spiral"
    | "no-drifters"
    | "triple-threat"
    // Prestige
    | "bubble-popper"
    | "serial-popper"
    | "hindsight-shopper"
    | "hindsight-hoarder"
    // Career
    | "career-starter"
    | "career-switcher"
    | "skill-tree-novice"
    | "skill-tree-master"
    // Cross-system
    | "renaissance"
    | "full-stack"

export type TieredGroup =
    | "mogul"
    | "scholar"
    | "arcade"
    | "industrialist"
    | "phases"

export interface AchievementDef {
    id: AchievementId
    category: AchievementCategory
    icon: string
    hidden: boolean
    tieredGroup?: TieredGroup
    tier?: number // 1-based tier within the group
}

export type CounterKey =
    | "trades"
    | "felix-messages"
    | "bonus-popups-claimed"
    | "directories-visited"
    | "languages-tried"
    | "themes-tried"
    | "windows-opened"

export interface AchievementSaveData {
    earned: Record<string, number>
    counters: Record<string, number>
    sets: Record<string, string[]>
    reported: string[]
}
