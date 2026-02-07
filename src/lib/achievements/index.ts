import { AchievementManager } from "./AchievementManager"

export { AchievementManager } from "./AchievementManager"
export { ACHIEVEMENT_MAP, ACHIEVEMENTS } from "./definitions"
export type {
    AchievementCategory,
    AchievementDef,
    AchievementId,
    AchievementSaveData,
    CounterKey,
} from "./types"

let instance: AchievementManager | null = null

export function getAchievementManager(): AchievementManager {
    if (!instance) {
        instance = new AchievementManager()
    }
    return instance
}
