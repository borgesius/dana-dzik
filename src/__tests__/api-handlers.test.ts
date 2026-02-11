/* eslint-disable @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-explicit-any */
import { beforeEach, describe, expect, it, vi } from "vitest"

// ── Mock redis gateway ───────────────────────────────────────────────────────

const mockRedis = {
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue("OK"),
    sadd: vi.fn().mockResolvedValue(1),
    scard: vi.fn().mockResolvedValue(0),
    scan: vi.fn().mockResolvedValue([0, []]),
    pipeline: vi.fn(() => ({
        sadd: vi.fn(),
        scard: vi.fn(),
        exec: vi.fn().mockResolvedValue([]),
    })),
}

vi.mock("../../api/lib/redisGateway", () => ({
    getRedis: vi.fn(() => mockRedis),
    isConfigured: vi.fn(() => true),
    prefixKey: vi.fn((key: string) => `test:${key}`),
    cachedRead: vi.fn(
        async (
            _key: string,
            _ttl: number,
            fetcher: (client: unknown) => Promise<unknown>
        ) => {
            const data = await fetcher(mockRedis)
            return { data, fromCache: false }
        }
    ),
    writeThrough: vi.fn(),
    throttledWrite: vi.fn(),
}))

type MockRes = Record<string, any>

function createMockRes(): MockRes {
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

function createMockReq(
    overrides: Record<string, any> = {}
): Record<string, any> {
    return {
        method: "GET",
        headers: {},
        body: {},
        query: {},
        ...overrides,
    }
}

// ═════════════════════════════════════════════════════════════════════════════
// achievement-counts handler
// ═════════════════════════════════════════════════════════════════════════════

describe("achievement-counts handler", () => {
    let handler: any

    beforeEach(async () => {
        vi.clearAllMocks()
        const mod = await import("../../api/achievement-counts")
        handler = mod.default
    })

    it("OPTIONS returns 200", async () => {
        const req = createMockReq({ method: "OPTIONS" })
        const res = createMockRes()
        await handler(req, res)
        expect(res.status).toHaveBeenCalledWith(200)
        expect(res.ended).toBe(true)
    })

    it("unsupported method returns 405", async () => {
        const req = createMockReq({ method: "DELETE" })
        const res = createMockRes()
        await handler(req, res)
        expect(res.status).toHaveBeenCalledWith(405)
        expect(res.jsonBody).toEqual({ ok: false, error: "Method not allowed" })
    })

    it("POST without visitor ID skips", async () => {
        const req = createMockReq({
            method: "POST",
            headers: {},
            body: { achievements: ["test-ach"] },
        })
        const res = createMockRes()
        await handler(req, res)
        expect(res.jsonBody).toEqual({ ok: true, skipped: "no_visitor_id" })
    })

    it("POST with empty achievements skips", async () => {
        const req = createMockReq({
            method: "POST",
            headers: { "x-visitor-id": "visitor-1" },
            body: { achievements: [] },
        })
        const res = createMockRes()
        await handler(req, res)
        expect(res.jsonBody).toEqual({ ok: true, skipped: "empty" })
    })

    it("POST with invalid achievement IDs skips", async () => {
        const req = createMockReq({
            method: "POST",
            headers: { "x-visitor-id": "visitor-1" },
            body: { achievements: ["INVALID!", "has spaces", 123] },
        })
        const res = createMockRes()
        await handler(req, res)
        expect(res.jsonBody).toEqual({ ok: true, skipped: "invalid" })
    })

    it("POST with valid achievements records them", async () => {
        const req = createMockReq({
            method: "POST",
            headers: { "x-visitor-id": "visitor-1" },
            body: { achievements: ["first-win", "boss-kill"] },
        })
        const res = createMockRes()
        await handler(req, res)
        expect(res.jsonBody).toMatchObject({
            ok: true,
            recorded: 2,
        })
    })

    it("GET returns counts data", async () => {
        const req = createMockReq({ method: "GET" })
        const res = createMockRes()
        await handler(req, res)
        expect(res.jsonBody).toMatchObject({
            ok: true,
        })
    })

    it("sets CORS headers", async () => {
        const req = createMockReq({ method: "GET" })
        const res = createMockRes()
        await handler(req, res)
        expect(res.setHeader).toHaveBeenCalledWith(
            "Access-Control-Allow-Origin",
            "*"
        )
    })
})

// ═════════════════════════════════════════════════════════════════════════════
// visitor-count handler
// ═════════════════════════════════════════════════════════════════════════════

describe("visitor-count handler", () => {
    let handler: any

    beforeEach(async () => {
        vi.clearAllMocks()
        const mod = await import("../../api/visitor-count")
        handler = mod.default
    })

    it("OPTIONS returns 200", async () => {
        const req = createMockReq({ method: "OPTIONS" })
        const res = createMockRes()
        await handler(req, res)
        expect(res.status).toHaveBeenCalledWith(200)
        expect(res.ended).toBe(true)
    })

    it("non-GET returns 405", async () => {
        const req = createMockReq({ method: "POST" })
        const res = createMockRes()
        await handler(req, res)
        expect(res.status).toHaveBeenCalledWith(405)
        expect(res.jsonBody).toEqual({
            ok: false,
            error: "Method not allowed",
        })
    })

    it("GET returns visitor count", async () => {
        mockRedis.get.mockResolvedValue(42)
        const req = createMockReq({ method: "GET" })
        const res = createMockRes()
        await handler(req, res)
        expect(res.jsonBody).toMatchObject({
            ok: true,
            count: expect.any(Number),
        })
    })

    it("sets CORS and cache headers", async () => {
        const req = createMockReq({ method: "GET" })
        const res = createMockRes()
        await handler(req, res)
        expect(res.setHeader).toHaveBeenCalledWith(
            "Access-Control-Allow-Origin",
            "*"
        )
        expect(res.setHeader).toHaveBeenCalledWith(
            "Cache-Control",
            expect.stringContaining("s-maxage")
        )
    })
})
