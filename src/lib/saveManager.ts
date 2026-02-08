import type { AchievementSaveData } from "./achievements/types"
import type { CosmeticSaveData } from "./cosmetics/CosmeticManager"
import type { MarketSaveData } from "./marketGame/types"
import type {
    AutobattlerSaveData,
    PrestigeSaveData,
    ProgressionSaveData,
} from "./progression/types"
import {
    createEmptyAutobattlerData,
    createEmptyPrestigeData,
    createEmptyProgressionData,
} from "./progression/types"
import type { VeilSaveData } from "./veil/types"
import { createEmptyVeilData } from "./veil/types"

const SAVE_KEY = "save"
const SAVE_VERSION = 4
const MAX_SAVE_BYTES = 256 * 1024
const WARN_SAVE_BYTES = 200 * 1024
const DEBOUNCE_MS = 2000

const LEGACY_KEYS = [
    "pinball-high-score",
    "theme",
    "colorScheme",
    "locale",
] as const

export interface FilesystemSaveData {
    modified: Record<string, string>
    created: Record<string, string>
    deleted: string[]
}

export interface SaveData {
    version: number
    savedAt: number

    game: MarketSaveData | null
    pinball: { highScore: number }
    preferences: {
        theme: string
        colorScheme: string
        locale: string
        calmMode: boolean
    }
    filesystem: FilesystemSaveData
    achievements: AchievementSaveData
    prestige: PrestigeSaveData
    progression: ProgressionSaveData
    autobattler: AutobattlerSaveData
    cosmetics?: CosmeticSaveData
    veil?: VeilSaveData
}

type SaveCallback = () => SaveData

function createEmptySaveData(): SaveData {
    return {
        version: SAVE_VERSION,
        savedAt: Date.now(),
        game: null,
        pinball: { highScore: 0 },
        preferences: {
            theme: "win95",
            colorScheme: "system",
            locale: "en",
            calmMode: false,
        },
        filesystem: {
            modified: {},
            created: {},
            deleted: [],
        },
        achievements: {
            earned: {},
            counters: {},
            sets: {},
            reported: [],
        },
        prestige: createEmptyPrestigeData(),
        progression: createEmptyProgressionData(),
        autobattler: createEmptyAutobattlerData(),
        veil: createEmptyVeilData(),
    }
}

function migrateLegacyKeys(): Partial<SaveData> {
    const partial: Partial<SaveData> = {}

    const highScore = localStorage.getItem("pinball-high-score")
    if (highScore !== null) {
        partial.pinball = { highScore: parseInt(highScore, 10) || 0 }
    }

    const theme = localStorage.getItem("theme")
    const colorScheme = localStorage.getItem("colorScheme")
    const locale = localStorage.getItem("locale")

    if (theme || colorScheme || locale) {
        partial.preferences = {
            theme: theme || "win95",
            colorScheme: colorScheme || "system",
            locale: locale || "en",
            calmMode: false,
        }
    }

    for (const key of LEGACY_KEYS) {
        localStorage.removeItem(key)
    }

    return partial
}

function migrateFilesystemPath(oldPath: string): string {
    let p = oldPath

    if (p.startsWith("C:\\WINDOWS\\system32\\")) {
        p = "3:\\DAS\\" + p.slice("C:\\WINDOWS\\system32\\".length)
    } else if (p.startsWith("C:\\WINDOWS\\system32")) {
        p = "3:\\DAS"
    } else if (p.startsWith("C:\\Program Files\\")) {
        p = "3:\\Programme\\" + p.slice("C:\\Program Files\\".length)
    } else if (p.startsWith("C:\\Program Files")) {
        p = "3:\\Programme"
    } else if (p.startsWith("C:\\")) {
        p = "3:\\" + p.slice("C:\\".length)
    } else if (p === "C:") {
        p = "3:"
    }

    return p
}

function migratePathRecord(
    record: Record<string, string>
): Record<string, string> {
    const result: Record<string, string> = {}
    for (const [key, value] of Object.entries(record)) {
        result[migrateFilesystemPath(key)] = value
    }
    return result
}

function migrateV1ToV2(data: SaveData): void {
    if (!data.filesystem) return

    data.filesystem.modified = migratePathRecord(data.filesystem.modified)
    data.filesystem.created = migratePathRecord(data.filesystem.created)
    data.filesystem.deleted = data.filesystem.deleted.map(migrateFilesystemPath)
}

function migrateV2ToV3(data: SaveData): void {
    if (!data.prestige) {
        data.prestige = createEmptyPrestigeData()
    }
    if (!data.progression) {
        data.progression = createEmptyProgressionData()
    }
    if (!data.autobattler) {
        data.autobattler = createEmptyAutobattlerData()
    }
}

function migrateV3ToV4(data: SaveData): void {
    if (!data.veil) {
        data.veil = createEmptyVeilData()
    }
}

function migrate(data: SaveData): SaveData {
    if (data.version < 2) {
        migrateV1ToV2(data)
    }
    if (data.version < 3) {
        migrateV2ToV3(data)
    }
    if (data.version < 4) {
        migrateV3ToV4(data)
    }
    data.version = SAVE_VERSION
    return data
}

class SaveManagerImpl {
    private debounceTimer: ReturnType<typeof setTimeout> | null = null
    private gatherFn: SaveCallback | null = null
    private lastWarned = false

    public load(): SaveData {
        const raw = localStorage.getItem(SAVE_KEY)

        if (!raw) {
            const empty = createEmptySaveData()
            const legacy = migrateLegacyKeys()
            const merged = { ...empty, ...legacy }
            if (legacy.preferences) {
                merged.preferences = {
                    ...empty.preferences,
                    ...legacy.preferences,
                }
            }
            if (legacy.pinball) {
                merged.pinball = legacy.pinball
            }
            this.writeRaw(merged)
            this.writeBackIndividualKeys(merged)
            return merged
        }

        try {
            // SAFETY: our own serialized data, validated by spreading onto createEmptySaveData() defaults below
            const parsed = JSON.parse(raw) as SaveData
            const empty = createEmptySaveData()
            const data: SaveData = {
                ...empty,
                ...parsed,
                preferences: { ...empty.preferences, ...parsed.preferences },
                filesystem: { ...empty.filesystem, ...parsed.filesystem },
                achievements: { ...empty.achievements, ...parsed.achievements },
                prestige: {
                    ...empty.prestige,
                    ...(parsed.prestige ?? {}),
                },
                progression: {
                    ...empty.progression,
                    ...(parsed.progression ?? {}),
                },
                autobattler: {
                    ...empty.autobattler,
                    ...(parsed.autobattler ?? {}),
                },
            }
            const migrated = migrate(data)
            this.writeBackIndividualKeys(migrated)
            return migrated
        } catch {
            const empty = createEmptySaveData()
            this.writeBackIndividualKeys(empty)
            return empty
        }
    }

    public registerGatherFn(fn: SaveCallback): void {
        this.gatherFn = fn
    }

    public requestSave(): void {
        if (this.debounceTimer) {
            clearTimeout(this.debounceTimer)
        }
        this.debounceTimer = setTimeout(() => {
            this.debounceTimer = null
            this.save()
        }, DEBOUNCE_MS)
    }

    public saveImmediate(): void {
        if (this.debounceTimer) {
            clearTimeout(this.debounceTimer)
            this.debounceTimer = null
        }
        this.save()
    }

    private save(): void {
        if (!this.gatherFn) return
        const data = this.gatherFn()
        data.savedAt = Date.now()
        data.version = SAVE_VERSION
        this.writeRaw(data)
        this.writeBackIndividualKeys(data)
    }

    private writeBackIndividualKeys(data: SaveData): void {
        try {
            localStorage.setItem("theme", data.preferences.theme)
            localStorage.setItem("colorScheme", data.preferences.colorScheme)
            localStorage.setItem("locale", data.preferences.locale)
            localStorage.setItem(
                "pinball-high-score",
                data.pinball.highScore.toString()
            )
        } catch {
            /* localStorage unavailable */
        }
    }

    private writeRaw(data: SaveData): void {
        const json = JSON.stringify(data)
        const bytes = new Blob([json]).size

        if (bytes > MAX_SAVE_BYTES) {
            console.warn(
                `[SaveManager] Save rejected: ${bytes} bytes exceeds ${MAX_SAVE_BYTES} byte limit`
            )
            return
        }

        if (bytes > WARN_SAVE_BYTES && !this.lastWarned) {
            console.warn(
                `[SaveManager] Save approaching limit: ${bytes}/${MAX_SAVE_BYTES} bytes`
            )
            this.lastWarned = true
        } else if (bytes <= WARN_SAVE_BYTES) {
            this.lastWarned = false
        }

        localStorage.setItem(SAVE_KEY, json)
    }

    public reset(): void {
        if (this.debounceTimer) {
            clearTimeout(this.debounceTimer)
            this.debounceTimer = null
        }
        this.gatherFn = null
        localStorage.removeItem(SAVE_KEY)
        for (const key of LEGACY_KEYS) {
            localStorage.removeItem(key)
        }
        window.location.reload()
    }

    public getSaveSize(): number {
        const raw = localStorage.getItem(SAVE_KEY)
        return raw ? new Blob([raw]).size : 0
    }

    public hasSave(): boolean {
        return localStorage.getItem(SAVE_KEY) !== null
    }
}

export const saveManager = new SaveManagerImpl()
