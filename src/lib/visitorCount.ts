interface VisitorCountResponse {
    ok: boolean
    count: number
}

export function initVisitorCount(): void {
    void fetchAndDisplayCount()
}

async function fetchAndDisplayCount(): Promise<void> {
    const el = document.getElementById("visitor-count")
    if (!el) return

    try {
        const response = await fetch("/api/visitor-count")
        const contentType = response.headers.get("content-type")

        if (!contentType?.includes("application/json")) {
            return
        }

        // SAFETY: response shape controlled by our /api/pageview endpoint
        const result = (await response.json()) as VisitorCountResponse

        if (result.ok && result.count > 0) {
            el.textContent = result.count.toLocaleString()
        }
    } catch {
        // Silently fail — the placeholder "..." stays visible
    }
}
