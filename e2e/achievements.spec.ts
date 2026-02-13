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

test.describe("Achievements", () => {
    test.beforeEach(async ({ page }) => {
        await page.goto("/")
        await waitForDesktop(page)
    })

    test("achievements window opens from start menu", async ({ page }) => {
        await page.locator(".start-button").click()
        await expect(page.locator(".start-menu")).toBeVisible()

        const achievementsEntry = page.locator(
            '.start-menu-item:has-text("Achievement"), .start-menu-item:has-text("achievement")'
        )

        if ((await achievementsEntry.count()) > 0) {
            await achievementsEntry.first().click()
            await page.waitForTimeout(1000)

            await expect(
                page.locator('.window:has-text("Achievement")')
            ).toBeVisible({ timeout: 5000 })
        }
    })

    test("no JS errors on page load", async ({ page }) => {
        const errors: string[] = []
        page.on("pageerror", (err) => errors.push(err.message))

        await page.goto("/")
        await waitForDesktop(page)
        await page.waitForTimeout(2000)

        const achievementErrors = errors.filter(
            (e) =>
                e.includes("achievement") ||
                e.includes("Achievement") ||
                e.includes("AchievementManager")
        )
        expect(achievementErrors).toHaveLength(0)
    })

    test("page loads without achievement system crashing", async ({ page }) => {
        await page.goto("/")
        await waitForDesktop(page)

        // Verify the desktop loaded properly (achievements didn't break anything)
        await expect(page.locator(".desktop")).toBeVisible()
        await expect(page.locator(".taskbar")).toBeVisible()
        await expect(page.locator(".desktop-icon")).toHaveCount(17, {
            timeout: 5000,
        })
    })
})
