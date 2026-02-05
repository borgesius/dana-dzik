/**
 * Set up global error handlers for unhandled errors and promise rejections.
 * Call this once at application startup.
 */
export function setupErrorHandlers(): void {
    window.onerror = (
        message: string | Event,
        source?: string,
        line?: number,
        col?: number,
        error?: Error
    ): boolean => {
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
        console.error("[Unhandled Promise Rejection]", event.reason)
    }
}
