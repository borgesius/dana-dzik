import { Redis } from "@upstash/redis"

// ─── Configuration ──────────────────────────────────────────────────────────

/** Fraction of clients in the "sampled" cohort that get full event tracking */
const SAMPLE_RATE = 0.001

/** Max non-critical events a sampled client can write per day */
const SAMPLED_CLIENT_BUDGET = 20

/** TTL for per-client rate-limit keys (24 hours) */
const CLIENT_BUDGET_TTL_SECONDS = 86_400

/** Max fresh (uncached) reads allowed per hour across all clients */
const MAX_FRESH_READS_PER_HOUR = 60

/** Event types that bypass sampling entirely — always recorded */
const CRITICAL_EVENT_TYPES: ReadonlySet<string> = new Set(["pageview"])

// ─── Types ──────────────────────────────────────────────────────────────────

type WriteReason =
    | "critical"
    | "sampled"
    | "not_sampled"
    | "budget_exhausted"
    | "no_redis"

export interface WriteResult {
    recorded: boolean
    reason: WriteReason
}

export interface ReadResult<T> {
    data: T | null
    fromCache: boolean
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

// ─── Hashing & Sampling ────────────────────────────────────────────────────
//     Deterministic so both client and server agree on who is sampled.
//     These are pure functions — safe to duplicate on the client side.

export function hashString(value: string): number {
    let hash = 0
    for (let i = 0; i < value.length; i++) {
        hash = ((hash << 5) - hash + value.charCodeAt(i)) | 0
    }
    return Math.abs(hash)
}

export function isClientSampled(visitorId: string): boolean {
    return (hashString(visitorId) % 10_000) < SAMPLE_RATE * 10_000
}

export function isCriticalEvent(eventType: string): boolean {
    return CRITICAL_EVENT_TYPES.has(eventType)
}

// ─── Write Throttling ───────────────────────────────────────────────────────
//
//     Flow per incoming event:
//
//     1. Critical event (e.g. pageview) → always write (0 extra Redis ops)
//     2. Client NOT in 0.1% sample      → drop silently  (0 Redis ops)
//     3. Client IS sampled              → check daily budget via INCR
//        3a. Budget remaining           → execute write
//        3b. Budget exhausted           → drop
//
//     Net effect: 99.9% of non-critical traffic costs zero Redis commands.

async function consumeWriteBudget(
    client: Redis,
    visitorId: string
): Promise<boolean> {
    const key = `ratelimit:w:${visitorId}`
    const count = await client.incr(key)

    if (count === 1) {
        await client.expire(key, CLIENT_BUDGET_TTL_SECONDS)
    }

    return count <= SAMPLED_CLIENT_BUDGET
}

export async function throttledWrite(
    visitorId: string,
    eventType: string,
    writeFn: (client: Redis) => Promise<void>
): Promise<WriteResult> {
    const client = getRedis()
    if (!client) {
        return { recorded: false, reason: "no_redis" }
    }

    if (isCriticalEvent(eventType)) {
        await writeFn(client)
        return { recorded: true, reason: "critical" }
    }

    if (!isClientSampled(visitorId)) {
        return { recorded: false, reason: "not_sampled" }
    }

    const hasBudget = await consumeWriteBudget(client, visitorId)
    if (!hasBudget) {
        return { recorded: false, reason: "budget_exhausted" }
    }

    await writeFn(client)
    return { recorded: true, reason: "sampled" }
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
    const key = "ratelimit:r:hourly"
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

    const cached = await client.get<T>(cacheKey)
    if (cached !== null) {
        return { data: cached, fromCache: true }
    }

    const hasBudget = await consumeReadBudget(client)
    if (!hasBudget) {
        return { data: null, fromCache: false }
    }

    const data = await fetcher(client)
    await client.set(cacheKey, data, { ex: ttlSeconds })
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
