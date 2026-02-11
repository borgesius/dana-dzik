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

async function openTerminal(
    page: import("@playwright/test").Page
): Promise<void> {
    while ((await page.locator(".window-btn.close").count()) > 0) {
        await page.locator(".window-btn.close").first().click()
        await page.waitForTimeout(200)
    }

    const icon = page.locator('.desktop-icon:has-text("terminal")')
    await expect(icon).toBeVisible({ timeout: 5000 })
    await icon.dblclick()
    await expect(page.locator(".terminal-container")).toBeVisible({
        timeout: 10000,
    })
}

test.describe("Terminal", () => {
    test.beforeEach(async ({ page }) => {
        await page.goto("/")
        await waitForDesktop(page)
    })

    test("terminal window opens from desktop icon", async ({ page }) => {
        await openTerminal(page)
        await expect(page.locator(".terminal-container")).toBeVisible()
    })

    test("terminal shows input prompt", async ({ page }) => {
        await openTerminal(page)

        const input = page.locator(
            ".terminal-input, .terminal-container input, .terminal-container textarea"
        )
        await expect(input.first()).toBeVisible({ timeout: 5000 })
    })

    test("terminal accepts text input", async ({ page }) => {
        await openTerminal(page)

        const input = page.locator(
            ".terminal-input, .terminal-container input, .terminal-container textarea"
        )
        await input.first().click()
        await input.first().fill("help")
        await page.keyboard.press("Enter")

        // Should show some output (the terminal should respond to help command)
        await page.waitForTimeout(1000)
        const terminalText = await page
            .locator(".terminal-container")
            .textContent()
        expect(terminalText?.length).toBeGreaterThan(0)
    })

    test("terminal renders without errors", async ({ page }) => {
        const errors: string[] = []
        page.on("pageerror", (err) => errors.push(err.message))

        await openTerminal(page)
        await page.waitForTimeout(1000)

        const terminalErrors = errors.filter(
            (e) => e.includes("terminal") || e.includes("Terminal")
        )
        expect(terminalErrors).toHaveLength(0)
    })
})
