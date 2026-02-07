/**
 * @vitest-environment jsdom
 */
import { beforeEach, describe, expect, it, vi } from "vitest"

import {
    ROUTABLE_WINDOWS,
    type RoutableWindow,
    ROUTE_MAP,
} from "../config/routing"
import { Router } from "../lib/router"

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

describe("Router Class", () => {
    let navigatedTo: RoutableWindow | null
    let router: Router
    let pushStateSpy: ReturnType<typeof vi.spyOn>

    beforeEach(() => {
        navigatedTo = null
        vi.restoreAllMocks()

        Object.defineProperty(window, "location", {
            value: {
                pathname: "/",
                hash: "",
            },
            writable: true,
        })

        pushStateSpy = vi
            .spyOn(window.history, "pushState")
            .mockImplementation(() => {})
    })

    describe("constructor", () => {
        it("creates a router with navigation callback", () => {
            router = new Router((windowId) => {
                navigatedTo = windowId
            })
            expect(router).toBeDefined()
        })
    })

    describe("init", () => {
        it("navigates to window from root path", () => {
            window.location.pathname = "/"
            router = new Router((windowId) => {
                navigatedTo = windowId
            })
            router.init()
            expect(navigatedTo).toBe("welcome")
        })

        it("navigates to window from /about path", () => {
            window.location.pathname = "/about"
            router = new Router((windowId) => {
                navigatedTo = windowId
            })
            router.init()
            expect(navigatedTo).toBe("about")
        })

        it("navigates to window from hash route", () => {
            window.location.pathname = "/"
            window.location.hash = "#/projects"
            router = new Router((windowId) => {
                navigatedTo = windowId
            })
            router.init()
            expect(navigatedTo).toBe("projects")
        })

        it("handles path without leading slash", () => {
            window.location.pathname = "/resume"
            router = new Router((windowId) => {
                navigatedTo = windowId
            })
            router.init()
            expect(navigatedTo).toBe("resume")
        })

        it("does not navigate for unknown paths", () => {
            window.location.pathname = "/unknown"
            router = new Router((windowId) => {
                navigatedTo = windowId
            })
            router.init()
            expect(navigatedTo).toBeNull()
        })
    })

    describe("updateUrl", () => {
        it("updates URL for routable windows", () => {
            router = new Router(() => {})
            router.updateUrl("about")
            expect(pushStateSpy).toHaveBeenCalledWith(
                { windowId: "about" },
                "",
                "/about"
            )
        })

        it("updates URL to / for welcome window", () => {
            router = new Router(() => {})
            router.updateUrl("welcome")
            expect(pushStateSpy).toHaveBeenCalledWith(
                { windowId: "welcome" },
                "",
                "/"
            )
        })

        it("does not update URL for non-routable windows", () => {
            router = new Router(() => {})
            router.updateUrl("some-popup" as never)
            expect(pushStateSpy).not.toHaveBeenCalled()
        })
    })

    describe("popstate handling", () => {
        it("responds to popstate events", () => {
            window.location.pathname = "/"
            router = new Router((windowId) => {
                navigatedTo = windowId
            })

            window.location.pathname = "/about"
            window.dispatchEvent(new PopStateEvent("popstate"))

            expect(navigatedTo).toBe("about")
        })
    })
})
