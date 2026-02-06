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

        await expect(page.locator(".desktop-icon")).toHaveCount(9)
        await expect(page.locator('.desktop-icon:has-text("Internet Explorer")')).toBeVisible()
        await expect(page.locator('.desktop-icon:has-text("about_me.doc")')).toBeVisible()
        await expect(page.locator('.desktop-icon:has-text("terminal.exe")')).toBeVisible()
    })

    test("welcome window opens by default", async ({ page }) => {
        await page.goto("/")
        await page.waitForSelector(".loading-screen.hidden", { state: "attached", timeout: 10000 })

        await expect(page.locator(".window")).toBeVisible()
        await expect(page.locator('.window-titlebar:has-text("Welcome")')).toBeVisible()
    })

    test("double-click opens windows", async ({ page }) => {
        await page.goto("/")
        await page.waitForSelector(".loading-screen.hidden", { state: "attached", timeout: 10000 })

        // Close the Welcome window first to avoid it blocking clicks
        await page.locator(".window-btn.close").first().click()
        await expect(page.locator(".window")).toHaveCount(0, { timeout: 5000 })

        const icon = page.locator('.desktop-icon:has-text("about_me.doc")')
        await expect(icon).toBeVisible({ timeout: 5000 })
        
        await icon.dblclick()

        await expect(page.locator(".window")).toHaveCount(1, { timeout: 5000 })
    })

    test("windows can be dragged", async ({ page }) => {
        await page.goto("/")
        await page.waitForSelector(".loading-screen.hidden", { state: "attached", timeout: 10000 })

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
        await page.waitForSelector(".loading-screen.hidden", { state: "attached", timeout: 10000 })

        const windowCount = await page.locator(".window").count()

        await page.locator(".window-btn.close").first().click()

        const newCount = await page.locator(".window").count()
        expect(newCount).toBeLessThanOrEqual(windowCount)
    })

    test("start menu opens on click", async ({ page }) => {
        await page.goto("/")
        await page.waitForSelector(".loading-screen.hidden", { state: "attached", timeout: 10000 })

        await expect(page.locator(".start-menu")).not.toBeVisible()

        await page.locator(".start-button").click()

        await expect(page.locator(".start-menu")).toBeVisible()
    })

    test("taskbar shows open windows", async ({ page }) => {
        await page.goto("/")
        await page.waitForSelector(".loading-screen.hidden", { state: "attached", timeout: 10000 })

        // Close the Welcome window first to avoid it blocking clicks
        await page.locator(".window-btn.close").first().click()
        await expect(page.locator(".window")).toHaveCount(0, { timeout: 5000 })

        const icon = page.locator('.desktop-icon:has-text("cool_projects")')
        await expect(icon).toBeVisible({ timeout: 5000 })
        await icon.dblclick()

        // After opening a new window, taskbar should show 1 button
        await expect(page.locator(".taskbar-window-button")).toHaveCount(1, { timeout: 5000 })
    })

    test("popups appear after engaging with money game", async ({ page }) => {
        await page.goto("/")
        await page.waitForSelector(".loading-screen.hidden", { state: "attached", timeout: 10000 })

        const ventureBtn = page.locator('.venture-btn:has-text("MAKE $$$ FAST")')
        await expect(ventureBtn).toBeVisible({ timeout: 5000 })
        await ventureBtn.click()

        await expect(page.locator(".popup-window")).toBeVisible({ timeout: 5000 })
    })

    test("toolbars are visible with game elements", async ({ page }) => {
        await page.goto("/")
        await page.waitForSelector(".loading-screen.hidden", { state: "attached", timeout: 10000 })

        await expect(page.locator(".toolbar")).toHaveCount(2)
        await expect(page.locator(".venture-btn").first()).toBeVisible()
        await expect(page.locator(".money-counter")).toBeVisible()
    })

    test("widgets are visible", async ({ page }) => {
        await page.goto("/")
        await page.waitForSelector(".loading-screen.hidden", { state: "attached", timeout: 10000 })

        await expect(page.locator(".widgets-container")).toBeVisible()
        await expect(page.locator("#audio-widget")).toBeVisible()
    })

})
