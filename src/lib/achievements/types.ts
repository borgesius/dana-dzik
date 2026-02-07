export type AchievementCategory =
    | "trading"
    | "production"
    | "milestones"
    | "exploration"
    | "terminal"
    | "social"
    | "pinball"

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
    | "programmer"
    | "navigator"
    | "choo-choo"
    // Social
    | "guest"
    | "signed"
    | "cat-person"
    | "meow"
    // Pinball
    | "pinball-wizard"
    | "high-roller"
    | "target-practice"
    | "bounty-hunter"
    | "welt-beginner"
    | "welt-intermediate"
    | "welt-master"
    // Hidden
    | "thermal-protection"
    | "suffering"
    | "divide-by-zero"
    | "popup-enjoyer"
    | "y2k-survivor"
    | "big-spender"
    | "whale"

export interface AchievementDef {
    id: AchievementId
    category: AchievementCategory
    icon: string
    hidden: boolean
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
