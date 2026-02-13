import { expect, test } from "@playwright/test"

const READY_TIMEOUT = 15000

async function waitForDesktop(
    page: import("@playwright/test").Page
): Promise<void> {
    await page.waitForSelector(".desktop", {
        state: "visible",
        timeout: READY_TIMEOUT,
    })
}

async function openAutobattler(
    page: import("@playwright/test").Page
): Promise<void> {
    while ((await page.locator(".window-btn.close").count()) > 0) {
        await page.locator(".window-btn.close").first().click()
        await page.waitForTimeout(200)
    }

    const icon = page.locator('.desktop-icon:has-text("SYMPOSIUM")')
    await expect(icon).toBeVisible({ timeout: 5000 })
    await icon.dblclick()
    await expect(page.locator(".autobattler-container")).toBeVisible({
        timeout: 10000,
    })
}

test.describe("Autobattler", () => {
    test.beforeEach(async ({ page }) => {
        await page.goto("/")
        await waitForDesktop(page)
    })

    test("autobattler window opens from desktop icon", async ({ page }) => {
        await openAutobattler(page)

        await expect(page.locator(".autobattler-container")).toBeVisible()
    })

    test("autobattler shows start run UI", async ({ page }) => {
        await openAutobattler(page)

        const container = page.locator(".autobattler-container")
        await expect(container).toBeVisible()

        await expect(container.locator("button").first()).toBeVisible({
            timeout: 5000,
        })
    })

    test("autobattler renders without errors", async ({ page }) => {
        const errors: string[] = []
        page.on("pageerror", (err) => errors.push(err.message))

        await openAutobattler(page)
        await page.waitForTimeout(1000)

        const autobattlerErrors = errors.filter(
            (e) =>
                e.includes("autobattler") ||
                e.includes("RunManager") ||
                e.includes("combat")
        )
        expect(autobattlerErrors).toHaveLength(0)
    })
})
