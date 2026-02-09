import createDebug from "debug"

const APP_PREFIX = "app"

/**
 * Create a namespaced logger instance.
 * All loggers are prefixed with the APP_PREFIX for easy filtering.
 *
 * @param namespace - The subsystem name (e.g., "api", "auth")
 * @returns A debug logger function
 */
export function createLogger(namespace: string): createDebug.Debugger {
    return createDebug(`${APP_PREFIX}:${namespace}`)
}

/**
 * Pre-defined loggers for common systems.
 *
 * Usage:
 * ```typescript
 * import { log } from "./core/Logger"
 * log.api("Fetching data from %s", endpoint)
 * log.auth("User logged in: %o", { userId })
 * ```
 *
 * Enable in browser: `localStorage.debug = "app:*"`
 * Enable specific: `localStorage.debug = "app:api,app:auth"`
 * Enable via env: `DEBUG=app:*`
 */
export const log = {
    api: createLogger("api"),
    auth: createLogger("auth"),
    app: createLogger("app"),
    save: createLogger("save"),
    ui: createLogger("ui"),
    widgets: createLogger("widgets"),
}
