/**
 * @vitest-environment jsdom
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { SafeMode } from "../lib/safeMode"

describe("SafeMode", () => {
    beforeEach(() => {
        localStorage.clear()
        document.body.innerHTML = ""
        vi.restoreAllMocks()

        const instanceField = Object.getOwnPropertyDescriptor(
            SafeMode,
            "instance"
        )
        if (instanceField) {
            Object.defineProperty(SafeMode, "instance", {
                value: null,
                writable: true,
                configurable: true,
            })
        } else {
            ;(SafeMode as unknown as { instance: null }).instance = null
        }
    })

    afterEach(() => {
        document.body.innerHTML = ""
    })

    describe("singleton pattern", () => {
        it("returns the same instance", () => {
            const instance1 = SafeMode.getInstance()
            const instance2 = SafeMode.getInstance()
            expect(instance1).toBe(instance2)
        })

        it("creates button on first instantiation", () => {
            SafeMode.getInstance()
            const button = document.querySelector(".safe-mode-btn")
            expect(button).not.toBeNull()
        })
    })

    describe("initial state", () => {
        it("starts disabled (chaos mode off)", () => {
            const safeMode = SafeMode.getInstance()
            expect(safeMode.isEnabled()).toBe(false)
        })

        it("restores enabled state from localStorage", () => {
            localStorage.setItem("safe-mode", "true")
            const safeMode = SafeMode.getInstance()
            expect(safeMode.isEnabled()).toBe(true)
        })

        it("button shows 'Safe Mode' when disabled", () => {
            SafeMode.getInstance()
            const button = document.querySelector(".safe-mode-btn")
            expect(button?.innerHTML).toContain("Safe Mode")
        })
    })

    describe("toggle", () => {
        it("enables safe mode on first toggle", () => {
            const safeMode = SafeMode.getInstance()
            safeMode.toggle()
            expect(safeMode.isEnabled()).toBe(true)
        })

        it("disables safe mode on second toggle", () => {
            const safeMode = SafeMode.getInstance()
            safeMode.toggle()
            safeMode.toggle()
            expect(safeMode.isEnabled()).toBe(false)
        })

        it("persists state to localStorage", () => {
            const safeMode = SafeMode.getInstance()
            safeMode.toggle()
            expect(localStorage.getItem("safe-mode")).toBe("true")

            safeMode.toggle()
            expect(localStorage.getItem("safe-mode")).toBe("false")
        })

        it("adds safe-mode class to body when enabled", () => {
            const safeMode = SafeMode.getInstance()
            safeMode.toggle()
            expect(document.body.classList.contains("safe-mode")).toBe(true)
        })

        it("removes safe-mode class from body when disabled", () => {
            const safeMode = SafeMode.getInstance()
            safeMode.toggle()
            safeMode.toggle()
            expect(document.body.classList.contains("safe-mode")).toBe(false)
        })

        it("updates button text when toggled", () => {
            SafeMode.getInstance().toggle()
            const button = document.querySelector(".safe-mode-btn")
            expect(button?.innerHTML).toContain("Chaos Mode")
        })
    })

    describe("onChange callback", () => {
        it("calls callback immediately with current state", () => {
            const safeMode = SafeMode.getInstance()
            const callback = vi.fn()

            safeMode.onChange(callback)

            expect(callback).toHaveBeenCalledTimes(1)
            expect(callback).toHaveBeenCalledWith(false)
        })

        it("calls callback on toggle", () => {
            const safeMode = SafeMode.getInstance()
            const callback = vi.fn()

            safeMode.onChange(callback)
            callback.mockClear()

            safeMode.toggle()

            expect(callback).toHaveBeenCalledWith(true)
        })

        it("supports multiple callbacks", () => {
            const safeMode = SafeMode.getInstance()
            const callback1 = vi.fn()
            const callback2 = vi.fn()

            safeMode.onChange(callback1)
            safeMode.onChange(callback2)

            callback1.mockClear()
            callback2.mockClear()

            safeMode.toggle()

            expect(callback1).toHaveBeenCalledWith(true)
            expect(callback2).toHaveBeenCalledWith(true)
        })
    })

    describe("button interaction", () => {
        it("toggles when button is clicked", () => {
            const safeMode = SafeMode.getInstance()
            const button = document.querySelector(
                ".safe-mode-btn"
            ) as HTMLButtonElement

            button.click()

            expect(safeMode.isEnabled()).toBe(true)
        })
    })
})
