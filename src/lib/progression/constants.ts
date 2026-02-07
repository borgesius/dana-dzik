// ── XP Curve ─────────────────────────────────────────────────────────────────
// XP required to reach level n: 100 * n^1.5 (cumulative)
// Level 1: 100, Level 2: 283, Level 5: 1118, Level 10: 3162, Level 20: 8944

export function xpForLevel(level: number): number {
    if (level <= 0) return 0
    return Math.floor(100 * Math.pow(level, 1.5))
}

export function levelFromXP(totalXP: number): number {
    if (totalXP <= 0) return 0
    // Invert the cumulative formula: level = (totalXP / 100) ^ (2/3)
    const raw = Math.pow(totalXP / 100, 2 / 3)
    return Math.floor(raw)
}

export function xpToNextLevel(totalXP: number): {
    currentLevel: number
    xpIntoLevel: number
    xpNeededForNext: number
    progress: number
} {
    const currentLevel = levelFromXP(totalXP)
    const currentLevelXP = xpForLevel(currentLevel)
    const nextLevelXP = xpForLevel(currentLevel + 1)
    const xpIntoLevel = totalXP - currentLevelXP
    const xpNeededForNext = nextLevelXP - currentLevelXP

    return {
        currentLevel,
        xpIntoLevel,
        xpNeededForNext,
        progress:
            xpNeededForNext > 0
                ? Math.min(1, xpIntoLevel / xpNeededForNext)
                : 0,
    }
}

// ── XP Rewards ───────────────────────────────────────────────────────────────

export const XP_REWARDS = {
    // Market game
    trade: 2,
    phaseUnlock: 25,

    // Pinball
    pinballScore1k: 10,
    pinballScore5k: 25,
    pinballScore10k: 75,

    // WELT / Coding
    weltExercise: 20,
    weltProgram: 3,
    grundCompile: 5,
    grundExecute: 5,

    // Exploration
    windowOpen: 1,
    themeChange: 2,
    localeChange: 2,

    // Social
    guestbookSign: 5,
    felixMessage: 1,

    // Achievement (base; tiered achievements multiply this)
    achievementEarned: 10,

    // Autobattler
    autobattlerRun: 15,
    autobattlerWin: 40,
    autobattlerCollectionMilestone: 50,
    spiralProgress: 100,

    // Prestige
    prestige: 100,

    // Career
    careerSwitch: 30,
} as const

/**
 * Scaling XP for tiered achievements. Higher tiers grant more XP.
 * Non-tiered achievements return the base `achievementEarned` value.
 */
export function getAchievementXP(tier?: number): number {
    if (!tier) return XP_REWARDS.achievementEarned
    return [0, 10, 25, 50, 100, 250][tier] ?? XP_REWARDS.achievementEarned
}
