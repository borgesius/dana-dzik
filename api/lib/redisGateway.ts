import { Redis } from "@upstash/redis"

// ─── Configuration ──────────────────────────────────────────────────────────

/** Max fresh (uncached) reads allowed per hour across all clients */
const MAX_FRESH_READS_PER_HOUR = 60

/** Event types that are always recorded (all current event types are critical) */
const CRITICAL_EVENT_TYPES: ReadonlySet<string> = new Set([
    "pageview",
    "funnel",
    "ab_assign",
    "ab_convert",
    "window",
])

// ─── Types ──────────────────────────────────────────────────────────────────

type WriteReason = "critical" | "no_redis"

export interface WriteResult {
    recorded: boolean
    reason: WriteReason
}

export interface ReadResult<T> {
    data: T | null
    fromCache: boolean
}

// ─── Key Prefixing ──────────────────────────────────────────────────────────
//     All Redis keys are namespaced by environment so staging and production
//     data are fully isolated within the same Upstash database.

function getKeyPrefix(): string {
    const env = process.env.VERCEL_ENV
    if (env === "production") return "prod:"
    if (env === "preview") return "staging:"
    return "dev:"
}

export function prefixKey(key: string): string {
    return `${getKeyPrefix()}${key}`
}

// ─── Redis Instance ─────────────────────────────────────────────────────────

let redis: Redis | null | undefined

export function getRedis(): Redis | null {
    if (redis !== undefined) return redis

    const url = process.env.UPSTASH_REDIS_REST_URL
    const token = process.env.UPSTASH_REDIS_REST_TOKEN

    if (!url || !token) {
        redis = null
        return null
    }

    redis = new Redis({ url, token })
    return redis
}

export function isConfigured(): boolean {
    return getRedis() !== null
}

// ─── Hashing ────────────────────────────────────────────────────────────────

export function hashString(value: string): number {
    let hash = 0
    for (let i = 0; i < value.length; i++) {
        hash = ((hash << 5) - hash + value.charCodeAt(i)) | 0
    }
    return Math.abs(hash)
}

export function isCriticalEvent(eventType: string): boolean {
    return CRITICAL_EVENT_TYPES.has(eventType)
}

// ─── Write Throttling ───────────────────────────────────────────────────────
//     All current event types are critical (guarded by client-side localStorage/
//     sessionStorage deduplication), so every event is always recorded.

export async function throttledWrite(
    _visitorId: string,
    _eventType: string,
    writeFn: (client: Redis) => Promise<void>
): Promise<WriteResult> {
    const client = getRedis()
    if (!client) {
        return { recorded: false, reason: "no_redis" }
    }

    await writeFn(client)
    return { recorded: true, reason: "critical" }
}

// ─── Read Throttling ────────────────────────────────────────────────────────
//
//     All reads go through cachedRead:
//
//     1. Cache hit → return immediately            (1 Redis GET)
//     2. Cache miss → check hourly read budget     (1 INCR + conditional EXPIRE)
//        2a. Budget OK → run fetcher, cache result (N reads + 1 SET)
//        2b. Budget exhausted → return null        (0 additional ops)
//
//     This caps total fresh reads to a fixed ceiling per hour regardless of
//     traffic volume.

async function consumeReadBudget(client: Redis): Promise<boolean> {
    const key = prefixKey("ratelimit:r:hourly")
    const count = await client.incr(key)

    if (count === 1) {
        await client.expire(key, 3600)
    }

    return count <= MAX_FRESH_READS_PER_HOUR
}

export async function cachedRead<T>(
    cacheKey: string,
    ttlSeconds: number,
    fetcher: (client: Redis) => Promise<T>
): Promise<ReadResult<T>> {
    const client = getRedis()
    if (!client) {
        return { data: null, fromCache: false }
    }

    const prefixed = prefixKey(cacheKey)

    const cached = await client.get<T>(prefixed)
    if (cached !== null) {
        return { data: cached, fromCache: true }
    }

    const hasBudget = await consumeReadBudget(client)
    if (!hasBudget) {
        return { data: null, fromCache: false }
    }

    const data = await fetcher(client)
    await client.set(prefixed, data, { ex: ttlSeconds })
    return { data, fromCache: false }
}

// ─── Unthrottled Write ──────────────────────────────────────────────────────
//     For infrastructure operations (token caching, etc.) that must always
//     succeed. NOT for analytics — use throttledWrite for that.

export async function writeThrough(
    writeFn: (client: Redis) => Promise<void>
): Promise<boolean> {
    const client = getRedis()
    if (!client) return false

    await writeFn(client)
    return true
}
