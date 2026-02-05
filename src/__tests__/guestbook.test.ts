/**
 * @vitest-environment jsdom
 */
import { describe, expect, it } from "vitest"

import { escapeHtml, extractMessage } from "../lib/guestbook"

describe("Guestbook utilities", () => {
    describe("extractMessage", () => {
        it("returns '(no message)' for null body", () => {
            expect(extractMessage(null)).toBe("(no message)")
        })

        it("returns '(no message)' for empty string", () => {
            expect(extractMessage("")).toBe("(no message)")
        })

        it("returns '(no message)' for whitespace only", () => {
            expect(extractMessage("   \n\t  ")).toBe("(no message)")
        })

        it("extracts plain text message", () => {
            expect(extractMessage("Hello, this is my message!")).toBe(
                "Hello, this is my message!"
            )
        })

        it("strips HTML comments", () => {
            const body = "Hello <!-- hidden comment --> World"
            expect(extractMessage(body)).toBe("Hello  World")
        })

        it("strips multiline HTML comments", () => {
            const body = `Hello
<!-- 
  multiline
  comment
-->
World`
            expect(extractMessage(body)).toBe("Hello\n\nWorld")
        })

        it("strips markdown headings", () => {
            const body = "## Heading\nSome content"
            expect(extractMessage(body)).toBe("Some content")
        })

        it("strips guestbook greeting text", () => {
            const body =
                "👋 Thanks for signing my guestbook!\nActual message here"
            expect(extractMessage(body)).toBe("Actual message here")
        })

        it("strips instruction text", () => {
            const body =
                "Write your message below. It will appear on my website automatically!\nMy actual message"
            expect(extractMessage(body)).toBe("My actual message")
        })

        it("strips horizontal rules", () => {
            const body = "Before\n---\nAfter"
            expect(extractMessage(body)).toBe("Before\n\nAfter")
        })

        it("handles complex GitHub issue template", () => {
            const body = `## 👋 Thanks for signing my guestbook!

Write your message below. It will appear on my website automatically!

---

This is my actual message to you!`
            expect(extractMessage(body)).toBe(
                "This is my actual message to you!"
            )
        })

        it("preserves message content with special characters", () => {
            expect(extractMessage("Hello! <3 Love this site :)")).toBe(
                "Hello! <3 Love this site :)"
            )
        })

        it("trims whitespace from result", () => {
            expect(extractMessage("  trimmed message  ")).toBe(
                "trimmed message"
            )
        })
    })

    describe("escapeHtml", () => {
        it("escapes < and > characters", () => {
            const result = escapeHtml("<script>alert('xss')</script>")
            expect(result).not.toContain("<script>")
            expect(result).toContain("&lt;")
            expect(result).toContain("&gt;")
        })

        it("escapes ampersand", () => {
            const result = escapeHtml("Tom & Jerry")
            expect(result).toBe("Tom &amp; Jerry")
        })

        it("preserves quotes (safe in text context)", () => {
            const result = escapeHtml('Say "hello"')
            expect(result).toBe('Say "hello"')
        })

        it("returns empty string for empty input", () => {
            expect(escapeHtml("")).toBe("")
        })

        it("preserves safe text", () => {
            expect(escapeHtml("Hello World")).toBe("Hello World")
        })

        it("handles multiple special characters", () => {
            const result = escapeHtml('<a href="test">Click & Go</a>')
            expect(result).not.toContain("<a")
            expect(result).not.toContain("</a>")
            expect(result).toContain("&lt;")
            expect(result).toContain("&gt;")
            expect(result).toContain("&amp;")
        })
    })
})
