/**
 * Shared test helpers used across multiple test files.
 */

import { vi } from "vitest"
import { ALL_UNITS } from "../../lib/autobattler/units"
import { RELIC_DEFS, getDefaultUnlockedRelicIds } from "../../lib/autobattler/relics"
import type { RunBuff } from "../../lib/autobattler/runBuffs"
import { RunManager } from "../../lib/autobattler/RunManager"
import type { RelicId } from "../../lib/autobattler/types"

// ── Unit / Relic collections ─────────────────────────────────────────────────

/** All unit IDs in the game (for tests that need full unlock) */
export const ALL_UNIT_IDS = new Set(ALL_UNITS.map((u) => u.id))

/** All relic IDs in the game */
export const ALL_RELIC_IDS = new Set(RELIC_DEFS.map((r) => r.id))

/** Default relic IDs (those available without collection progress) */
export const DEFAULT_RELIC_IDS = new Set(getDefaultUnlockedRelicIds())

// ── RunManager factory ───────────────────────────────────────────────────────

/**
 * Create a RunManager with all units unlocked and optional buffs/relics.
 * Useful for integration-level tests that exercise the full run lifecycle.
 */
export function createTestRunManager(
    buffs: RunBuff[] = [],
    relicIds?: Set<RelicId>
): RunManager {
    return new RunManager(ALL_UNIT_IDS, buffs, relicIds ?? DEFAULT_RELIC_IDS)
}

// ── Mock API request/response ────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type MockRes = Record<string, any>

/** Create a mock Vercel-style API response object with spy methods */
export function createMockApiResponse(): MockRes {
    const res: MockRes = {
        statusCode: 200,
        headers: {} as Record<string, string>,
        jsonBody: null as unknown,
        ended: false,
    }
    res.status = vi.fn((code: number) => {
        res.statusCode = code
        return res
    })
    res.json = vi.fn((body: unknown) => {
        res.jsonBody = body
        return res
    })
    res.end = vi.fn(() => {
        res.ended = true
        return res
    })
    res.setHeader = vi.fn((name: string, value: string) => {
        res.headers[name] = value
        return res
    })
    return res
}

/** Create a mock Vercel-style API request object */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function createMockApiRequest(overrides: Record<string, any> = {}): Record<string, any> {
    return {
        method: "GET",
        headers: {},
        body: {},
        query: {},
        ...overrides,
    }
}

// ── Deterministic random ─────────────────────────────────────────────────────

/**
 * Create a seeded pseudo-random function for deterministic tests.
 * Uses a simple LCG (linear congruential generator).
 */
export function seededRandom(seed: number): () => number {
    let state = seed
    return () => {
        state = (state * 1664525 + 1013904223) & 0x7fffffff
        return state / 0x7fffffff
    }
}

/**
 * Mock Math.random with a seeded PRNG for the duration of a test.
 * Returns a cleanup function.
 */
export function mockRandomSeed(seed: number): () => void {
    const rng = seededRandom(seed)
    const spy = vi.spyOn(Math, "random").mockImplementation(rng)
    return () => spy.mockRestore()
}
