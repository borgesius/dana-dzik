import { describe, expect, it } from "vitest"

import { createLogger, log } from "../core/Logger"

describe("Logger", () => {
    describe("createLogger", () => {
        it("creates a debug logger with app prefix", () => {
            const logger = createLogger("test")
            expect(logger).toBeDefined()
            expect(typeof logger).toBe("function")
        })

        it("creates logger with correct namespace", () => {
            const logger = createLogger("mymodule")
            expect(logger.namespace).toBe("app:mymodule")
        })

        it("can extend with sub-namespaces", () => {
            const logger = createLogger("api")
            const extended = logger.extend("users")
            expect(extended.namespace).toBe("app:api:users")
        })
    })

    describe("pre-defined loggers", () => {
        it("exports api logger", () => {
            expect(log.api).toBeDefined()
            expect(log.api.namespace).toBe("app:api")
        })

        it("exports auth logger", () => {
            expect(log.auth).toBeDefined()
            expect(log.auth.namespace).toBe("app:auth")
        })

        it("exports app logger", () => {
            expect(log.app).toBeDefined()
            expect(log.app.namespace).toBe("app:app")
        })

        it("all loggers are callable", () => {
            expect(typeof log.api).toBe("function")
            expect(typeof log.auth).toBe("function")
            expect(typeof log.app).toBe("function")
        })
    })
})
