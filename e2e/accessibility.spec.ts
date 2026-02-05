import { expect, test } from "@playwright/test"

test.describe("Accessibility", () => {
    test("page has proper lang attribute", async ({ page }) => {
        await page.goto("/")

        const html = page.locator("html")
        await expect(html).toHaveAttribute("lang", "en")
    })

    test("page has viewport meta tag", async ({ page }) => {
        await page.goto("/")

        const viewport = page.locator('meta[name="viewport"]')
        await expect(viewport).toHaveAttribute("content", /width=device-width/)
    })

    test("page has title", async ({ page }) => {
        await page.goto("/")

        await expect(page).toHaveTitle(/Dana/i)
    })

    test("interactive elements are focusable", async ({ page }) => {
        await page.goto("/")
        await page.waitForSelector(".loading-screen.hidden", { state: "attached", timeout: 10000 })

        await page.keyboard.press("Tab")
        const focusedElement = page.locator(":focus")
        await expect(focusedElement).toBeVisible()
    })

    test("windows have title text", async ({ page }) => {
        await page.goto("/")
        await page.waitForSelector(".loading-screen.hidden", { state: "attached", timeout: 10000 })

        const windowTitle = page.locator(".window-titlebar-text").first()
        const titleText = await windowTitle.textContent()
        expect(titleText?.length).toBeGreaterThan(0)
    })
})
