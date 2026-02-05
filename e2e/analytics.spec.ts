import { expect, test } from "@playwright/test"

const MAX_PERF_EVENTS = 10

test.describe("Analytics", () => {
    test("perf events are capped at maxPerfEvents", async ({ page }) => {
        const perfRequests: unknown[] = []

        await page.route("**/api/analytics", async (route, request) => {
            if (request.method() === "POST") {
                const postData = request.postDataJSON() as { type: string }
                if (postData?.type === "perf") {
                    perfRequests.push(postData)
                }
            }
            await route.fulfill({ status: 200, json: { ok: true } })
        })

        await page.goto("/")
        await page.waitForSelector(".loading-screen.hidden", {
            state: "attached",
            timeout: 10000,
        })

        await page.waitForTimeout(3000)

        expect(perfRequests.length).toBeLessThanOrEqual(MAX_PERF_EVENTS)
    })

    test("perf events stop after hitting the limit", async ({ page }) => {
        const perfRequests: unknown[] = []

        await page.route("**/api/analytics", async (route, request) => {
            if (request.method() === "POST") {
                const postData = request.postDataJSON() as { type: string }
                if (postData?.type === "perf") {
                    perfRequests.push(postData)
                }
            }
            await route.fulfill({ status: 200, json: { ok: true } })
        })

        await page.goto("/")
        await page.waitForSelector(".loading-screen.hidden", {
            state: "attached",
            timeout: 10000,
        })

        const countAfterLoad = perfRequests.length

        await page.waitForTimeout(5000)

        const countAfterWait = perfRequests.length

        expect(countAfterWait).toBeLessThanOrEqual(MAX_PERF_EVENTS)

        if (countAfterLoad >= MAX_PERF_EVENTS) {
            expect(countAfterWait).toBe(countAfterLoad)
        }
    })
})
