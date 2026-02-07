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
    | "fire-sale"
    | "first-out-the-door"
    | "who-are-we-selling-to"
    // Production
    | "factory-floor"
    | "industrialist"
    | "assembly-line"
    | "wasnt-brains"
    | "speak-to-a-retriever"
    | "could-be-wrong"
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
    | "leviathan"
    | "qa-inspector"
    // Autobattler
    | "first-draft"
    | "posse-up"
    | "faction-recruit"
    | "full-spiral"
    | "no-drifters"
    | "triple-threat"
    // Prestige
    | "ive-been-wrong"
    | "doesnt-matter-what-floor"
    | "hindsight-shopper"
    | "tell-them-theyll-be-ok"
    // Career
    | "career-starter"
    | "career-switcher"
    | "skill-tree-novice"
    | "skill-tree-master"
    // HR / Phase 5
    | "that-ones-a-person"
    | "we-make-nothing"
    | "you-dont-get-to-choose"
    | "reorg"
    // Autobattler (faction complete)
    | "syndicate-complete"
    | "deputies-complete"
    | "collective-complete"
    | "prospectors-complete"
    // Cross-system (hidden)
    | "vertical-integration"
    | "exit-interview"
    // Autobattler (tiered - Wrangler)
    | "greenhorn"
    | "deputy"
    | "sheriff"
    | "marshal"
    // Milestones (tiered - Rank)
    | "level-5"
    | "level-10"
    | "level-20"
    | "level-35"
    | "level-50"
    // Milestones (tiered - Phases extension)
    | "phase-5"
    | "phase-6"
    // Phase 6: Structured Products Desk (Margin Call quotes)
    | "its-just-money"
    | "be-first"
    | "just-silence"
    | "music-stops"
    | "it-goes-quickly"
    | "rainy-day"
    // Standalone new
    | "win-streak"
    | "serial-pivoter"
    | "overqualified"
    | "executive-material"
    | "pieces-of-paper"
    // Cross-system
    | "renaissance"
    | "full-stack"

export type TieredGroup =
    | "mogul"
    | "scholar"
    | "arcade"
    | "industrialist"
    | "phases"
    | "wrangler"
    | "rank"

export interface AchievementDef {
    id: AchievementId
    category: AchievementCategory
    icon: string
    hidden: boolean
    desktopOnly?: boolean
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
