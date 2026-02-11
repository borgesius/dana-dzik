/**
 * Structured error hierarchy for the application.
 *
 * All domain-specific errors extend `AppError`, which carries a machine-readable
 * `code` and optional structured `context` for logging / analytics.
 */

// ── Base ─────────────────────────────────────────────────────────────────────

export class AppError extends Error {
    public readonly code: string
    public readonly context?: Record<string, unknown>

    constructor(
        message: string,
        code: string,
        context?: Record<string, unknown>
    ) {
        super(message)
        this.name = "AppError"
        this.code = code
        this.context = context
    }
}

// ── Network / HTTP ───────────────────────────────────────────────────────────

export class NetworkError extends AppError {
    constructor(message: string, context?: Record<string, unknown>) {
        super(message, "NETWORK_ERROR", context)
        this.name = "NetworkError"
    }
}

export class ApiError extends AppError {
    public readonly status: number
    public readonly endpoint: string

    constructor(
        message: string,
        status: number,
        endpoint: string,
        context?: Record<string, unknown>
    ) {
        super(message, "API_ERROR", { status, endpoint, ...context })
        this.name = "ApiError"
        this.status = status
        this.endpoint = endpoint
    }
}

// ── Storage ──────────────────────────────────────────────────────────────────

export type StorageErrorCode =
    | "STORAGE_QUOTA"
    | "STORAGE_UNAVAILABLE"
    | "STORAGE_CORRUPT"

export class StorageError extends AppError {
    constructor(
        message: string,
        code: StorageErrorCode,
        context?: Record<string, unknown>
    ) {
        super(message, code, context)
        this.name = "StorageError"
    }
}

// ── Canvas ───────────────────────────────────────────────────────────────────

export class CanvasError extends AppError {
    constructor(message: string, context?: Record<string, unknown>) {
        super(message, "CANVAS_CONTEXT", context)
        this.name = "CanvasError"
    }
}

// ── Game state ───────────────────────────────────────────────────────────────

export class GameStateError extends AppError {
    public readonly domain: string

    constructor(
        message: string,
        domain: string,
        context?: Record<string, unknown>
    ) {
        super(message, "GAME_STATE", { domain, ...context })
        this.name = "GameStateError"
        this.domain = domain
    }
}
