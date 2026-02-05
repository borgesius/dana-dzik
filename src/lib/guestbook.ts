interface GitHubIssue {
    id: number
    title: string
    body: string | null
    user: {
        login: string
        avatar_url: string
        html_url: string
    }
    created_at: string
    html_url: string
}

const REPO = "borgesius/dana-dzik"

export function initGuestbook(): void {
    void fetchAndDisplayEntries()
}

async function fetchAndDisplayEntries(): Promise<void> {
    const container = document.getElementById("guestbook-entries")
    if (!container) return

    try {
        const response = await fetch(
            `https://api.github.com/repos/${REPO}/issues?state=open&per_page=20`
        )

        if (!response.ok) {
            container.innerHTML = `<p class="error">Could not load entries</p>`
            return
        }

        const issues = (await response.json()) as GitHubIssue[]

        if (issues.length === 0) {
            container.innerHTML = `<p class="empty">No entries yet. Be the first to sign!</p>`
            return
        }

        container.innerHTML = issues.map(renderEntry).join("")
    } catch {
        container.innerHTML = `<p class="error">Could not load entries</p>`
    }
}

function renderEntry(issue: GitHubIssue): string {
    const date = new Date(issue.created_at).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
    })

    const message = issue.body
        ? escapeHtml(issue.body).substring(0, 200)
        : "(no message)"

    return `
        <div class="guestbook-entry">
            <div class="entry-header">
                <a href="${issue.user.html_url}" target="_blank" class="entry-author">
                    <img src="${issue.user.avatar_url}" alt="${issue.user.login}" class="entry-avatar" />
                    <span>${issue.user.login}</span>
                </a>
                <span class="entry-date">${date}</span>
            </div>
            <p class="entry-message">${message}</p>
        </div>
    `
}

function escapeHtml(text: string): string {
    const div = document.createElement("div")
    div.textContent = text
    return div.innerHTML
}
