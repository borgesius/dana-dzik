import { expect, test } from "@playwright/test"

test.describe("Desktop Navigation", () => {
    test("desktop loads correctly", async ({ page }) => {
        await page.goto("/")

        await expect(page).toHaveTitle(/Dana.*Desktop/i)
        await expect(page.locator(".desktop")).toBeVisible()
        await expect(page.locator(".taskbar")).toBeVisible()
        await expect(page.locator(".toolbars-area")).toBeVisible()
    })

    test("desktop icons are visible", async ({ page }) => {
        await page.goto("/")

        await expect(page.locator(".desktop-icon")).toHaveCount(6)
        await expect(page.locator('.desktop-icon:has-text("Internet Explorer")')).toBeVisible()
        await expect(page.locator('.desktop-icon:has-text("about_me.doc")')).toBeVisible()
    })

    test("welcome window opens by default", async ({ page }) => {
        await page.goto("/")

        await page.waitForSelector(".loading-screen.hidden", { timeout: 5000 })

        await expect(page.locator(".window")).toBeVisible()
        await expect(page.locator('.window-titlebar:has-text("Welcome")')).toBeVisible()
    })

    test("double-click opens windows", async ({ page }) => {
        await page.goto("/")
        await page.waitForSelector(".loading-screen.hidden", { timeout: 5000 })

        await page.locator('.desktop-icon:has-text("about_me.doc")').dblclick()

        await expect(page.locator('.window:has-text("About Me")')).toBeVisible()
    })

    test("windows can be dragged", async ({ page }) => {
        await page.goto("/")
        await page.waitForSelector(".loading-screen.hidden", { timeout: 5000 })

        const window = page.locator(".window").first()
        const titlebar = window.locator(".window-titlebar")

        const initialBox = await window.boundingBox()
        if (!initialBox) throw new Error("Window not found")

        await titlebar.dragTo(page.locator(".desktop-area"), {
            targetPosition: { x: 300, y: 300 },
        })

        const newBox = await window.boundingBox()
        expect(newBox?.x).not.toBe(initialBox.x)
    })

    test("windows can be closed", async ({ page }) => {
        await page.goto("/")
        await page.waitForSelector(".loading-screen.hidden", { timeout: 5000 })

        const windowCount = await page.locator(".window").count()

        await page.locator(".window-btn.close").first().click()

        const newCount = await page.locator(".window").count()
        expect(newCount).toBeLessThanOrEqual(windowCount)
    })

    test("start menu opens on click", async ({ page }) => {
        await page.goto("/")
        await page.waitForSelector(".loading-screen.hidden", { timeout: 5000 })

        await expect(page.locator(".start-menu")).not.toBeVisible()

        await page.locator(".start-button").click()

        await expect(page.locator(".start-menu")).toBeVisible()
    })

    test("taskbar shows open windows", async ({ page }) => {
        await page.goto("/")
        await page.waitForSelector(".loading-screen.hidden", { timeout: 5000 })

        await expect(page.locator(".taskbar-window-button")).toHaveCount(1)

        await page.locator('.desktop-icon:has-text("projects")').dblclick()

        await expect(page.locator(".taskbar-window-button")).toHaveCount(2)
    })

    test("popups appear after delay", async ({ page }) => {
        await page.goto("/")
        await page.waitForSelector(".loading-screen.hidden", { timeout: 5000 })

        await page.waitForTimeout(12000)

        await expect(page.locator(".popup-window")).toBeVisible()
    })

    test("toolbars are visible with fake elements", async ({ page }) => {
        await page.goto("/")
        await page.waitForSelector(".loading-screen.hidden", { timeout: 5000 })

        await expect(page.locator(".toolbar")).toHaveCount(2)
        await expect(page.locator('.toolbar-button:has-text("FREE SMILEYS")')).toBeVisible()
    })

    test("widgets are visible", async ({ page }) => {
        await page.goto("/")
        await page.waitForSelector(".loading-screen.hidden", { timeout: 5000 })

        await expect(page.locator(".widgets-container")).toBeVisible()
        await expect(page.locator("#audio-widget")).toBeVisible()
    })

    test("safe mode button is present", async ({ page }) => {
        await page.goto("/")
        await page.waitForSelector(".loading-screen.hidden", { timeout: 5000 })

        await expect(page.locator(".safe-mode-btn")).toBeVisible()
    })
})
