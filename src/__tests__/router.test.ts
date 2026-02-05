import { describe, expect, it } from "vitest"

import { ROUTABLE_WINDOWS, ROUTE_MAP } from "../config"

describe("Router Configuration", () => {
    it("has valid route mappings", () => {
        expect(ROUTE_MAP).toBeDefined()
        expect(typeof ROUTE_MAP).toBe("object")
    })

    it("maps paths to window IDs", () => {
        expect(ROUTE_MAP["/"]).toBe("welcome")
        expect(ROUTE_MAP["/about"]).toBe("about")
        expect(ROUTE_MAP["/projects"]).toBe("projects")
        expect(ROUTE_MAP["/resume"]).toBe("resume")
        expect(ROUTE_MAP["/links"]).toBe("links")
        expect(ROUTE_MAP["/guestbook"]).toBe("guestbook")
        expect(ROUTE_MAP["/felixgpt"]).toBe("felixgpt")
        expect(ROUTE_MAP["/stats"]).toBe("stats")
    })

    it("all routes map to valid routable windows", () => {
        Object.values(ROUTE_MAP).forEach((windowId) => {
            expect(ROUTABLE_WINDOWS).toContain(windowId)
        })
    })

    it("root path maps to welcome", () => {
        expect(ROUTE_MAP["/"]).toBe("welcome")
    })
})
