import { describe, expect, it } from "vitest"

import { getBuildInfo } from "../lib/buildInfo"

describe("BuildInfo", () => {
    describe("getBuildInfo", () => {
        it("returns an object with version, buildTime, and gitCommit", () => {
            const info = getBuildInfo()

            expect(info).toHaveProperty("version")
            expect(info).toHaveProperty("buildTime")
            expect(info).toHaveProperty("gitCommit")
        })

        it("returns default values in test environment", () => {
            const info = getBuildInfo()

            expect(info.version).toBe("0.0.0")
            expect(info.buildTime).toBe("dev")
            expect(info.gitCommit).toBe("local")
        })

        it("returns string types for all properties", () => {
            const info = getBuildInfo()

            expect(typeof info.version).toBe("string")
            expect(typeof info.buildTime).toBe("string")
            expect(typeof info.gitCommit).toBe("string")
        })
    })
})
