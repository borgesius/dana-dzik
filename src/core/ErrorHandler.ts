import { AppError } from "./errors"
import { log } from "./Logger"

/**
 * Set up global error handlers for unhandled errors and promise rejections.
 * Call this once at application startup.
 *
 * When the caught error is an `AppError`, the handler extracts the structured
 * `code` and `context` fields for richer logging.
 */
export function setupErrorHandlers(): void {
    window.onerror = (
        message: string | Event,
        source?: string,
        line?: number,
        col?: number,
        error?: Error
    ): boolean => {
        if (error instanceof AppError) {
            log.app(
                "[Unhandled AppError] code=%s context=%o message=%s",
                error.code,
                error.context,
                error.message
            )
        } else {
            log.app("[Unhandled Error] %o", {
                message,
                source,
                line,
                col,
                error,
            })
        }
        console.error("[Unhandled Error]", {
            message,
            source,
            line,
            col,
            error,
        })
        return false
    }

    window.onunhandledrejection = (event: PromiseRejectionEvent): void => {
        const reason: unknown = event.reason
        if (reason instanceof AppError) {
            log.app(
                "[Unhandled Rejection] code=%s context=%o message=%s",
                reason.code,
                reason.context,
                reason.message
            )
        } else {
            log.app("[Unhandled Rejection] %o", reason)
        }
        console.error("[Unhandled Promise Rejection]", reason)
    }
}
