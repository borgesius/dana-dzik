/**
 * Server-side fetch wrapper for Vercel serverless functions.
 *
 * Provides typed, consistent fetch handling with:
 * - Configurable timeout (default 8 s)
 * - Automatic JSON parsing
 * - `response.ok` validation
 */

export interface ServerFetchOptions extends Omit<RequestInit, "signal"> {
    /** Abort after this many milliseconds (default 8 000). */
    timeout?: number
}

export type ServerResult<T> =
    | { ok: true; data: T }
    | { ok: false; error: string; status?: number }

/**
 * Typed fetch that validates status, parses JSON, and normalizes errors.
 */
export async function serverFetch<T>(
    url: string,
    options: ServerFetchOptions = {}
): Promise<ServerResult<T>> {
    const { timeout = 8_000, ...init } = options

    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeout)

    try {
        const response = await fetch(url, {
            ...init,
            signal: controller.signal,
        })
        clearTimeout(timer)

        if (!response.ok) {
            const body = await response.text().catch(() => "")
            return {
                ok: false,
                error: body || `HTTP ${response.status}`,
                status: response.status,
            }
        }

        const data = (await response.json()) as T
        return { ok: true, data }
    } catch (err) {
        clearTimeout(timer)
        return {
            ok: false,
            error: err instanceof Error ? err.message : "Fetch failed",
        }
    }
}
