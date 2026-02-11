import { apiFetch } from "./api/client"

export const GITHUB_OWNER = "borgesius"
export const GITHUB_REPO = "dana-dzik"

export function githubCommitUrl(sha: string): string {
    return `https://github.com/${GITHUB_OWNER}/${GITHUB_REPO}/commit/${sha}`
}

export async function fetchGitHubAPI<T>(endpoint: string): Promise<T | null> {
    const result = await apiFetch<T>(
        `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}${endpoint}`,
        { headers: { Accept: "application/vnd.github.v3+json" } }
    )
    return result.ok ? result.data : null
}
