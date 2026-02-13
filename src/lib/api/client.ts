/**
 * Centralized client-side fetch wrapper.
 *
 * Provides typed, consistent fetch handling with:
 * - Configurable timeouts (default 10 s)
 * - Configurable retry with exponential backoff
 * - Automatic JSON parsing with content-type validation
 * - Discriminated-union result type (`ApiResult<T>`)
 * - Fire-and-forget `apiPost` variant for analytics / beacons
 */

import { ApiError, NetworkError } from "@/core/errors"

// ── Types ────────────────────────────────────────────────────────────────────

export type ApiResult<T> =
    | { ok: true; data: T }
    | { ok: false; error: string; status?: number }

export interface FetchOptions extends Omit<RequestInit, "signal"> {
    /** Abort after this many milliseconds (default 10 000). */
    timeout?: number
    /** Number of retries on network/5xx errors (default 0). */
    retries?: number
    /** Initial retry delay in ms — doubled each attempt (default 500). */
    retryDelay?: number
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function isRetryable(status: number): boolean {
    return status >= 500 || status === 429
}

function isJsonResponse(response: Response): boolean {
    const ct = response.headers.get("content-type")
    return !!ct?.includes("application/json")
}

async function attemptFetch(url: string, init: RequestInit): Promise<Response> {
    try {
        return await fetch(url, init)
    } catch (err) {
        throw new NetworkError(
            err instanceof Error ? err.message : "Network request failed",
            { url }
        )
    }
}

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Generic typed fetch that returns a discriminated `ApiResult<T>`.
 *
 * The response body is parsed as JSON only when the `content-type` header
 * includes `application/json`; otherwise the raw text is returned as the
 * error message.
 */
export async function apiFetch<T>(
    url: string,
    options: FetchOptions = {}
): Promise<ApiResult<T>> {
    const { timeout = 10_000, retries = 0, retryDelay = 500, ...init } = options

    let lastError: unknown

    for (let attempt = 0; attempt <= retries; attempt++) {
        const controller = new AbortController()
        const timer = setTimeout(() => controller.abort(), timeout)

        try {
            const response = await attemptFetch(url, {
                ...init,
                signal: controller.signal,
            })
            clearTimeout(timer)

            if (!response.ok) {
                if (attempt < retries && isRetryable(response.status)) {
                    await delay(retryDelay * 2 ** attempt)
                    continue
                }

                const message = isJsonResponse(response)
                    ? JSON.stringify(await response.json())
                    : await response.text()

                return {
                    ok: false,
                    error: message || `HTTP ${response.status}`,
                    status: response.status,
                }
            }

            if (!isJsonResponse(response)) {
                return {
                    ok: false,
                    error: "Response is not JSON",
                    status: response.status,
                }
            }

            const data = (await response.json()) as T
            return { ok: true, data }
        } catch (err) {
            clearTimeout(timer)
            lastError = err

            if (attempt < retries) {
                await delay(retryDelay * 2 ** attempt)
                continue
            }
        }
    }

    // All retries exhausted
    if (lastError instanceof NetworkError) {
        return { ok: false, error: lastError.message }
    }
    if (lastError instanceof ApiError) {
        return {
            ok: false,
            error: lastError.message,
            status: lastError.status,
        }
    }
    return {
        ok: false,
        error:
            lastError instanceof Error
                ? lastError.message
                : "Unknown fetch error",
    }
}

/**
 * Fire-and-forget POST.  Swallows all errors — ideal for analytics beacons.
 */
export async function apiPost(
    url: string,
    body: unknown,
    headers?: Record<string, string>
): Promise<void> {
    try {
        await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                ...headers,
            },
            body: JSON.stringify(body),
        })
    } catch {
        // Intentionally swallowed — callers must not break on analytics failure
    }
}

// ── Internal ─────────────────────────────────────────────────────────────────

function delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
}
