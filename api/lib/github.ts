import { serverFetch } from "./fetchUtils"

export const GITHUB_OWNER = "borgesius"
export const GITHUB_REPO = "dana-dzik"

export interface WorkflowRun {
    id: number
    head_sha: string
    status: string
    conclusion: string | null
    html_url: string
    created_at: string
}

export interface WorkflowRunsResponse {
    workflow_runs: WorkflowRun[]
}

export interface Artifact {
    id: number
    name: string
    archive_download_url: string
    created_at: string
}

export interface ArtifactsResponse {
    artifacts: Artifact[]
}

export interface CommitStatus {
    context: string
    description: string | null
    state: string
    target_url: string | null
    updated_at: string
}

export async function fetchGitHub<T>(endpoint: string): Promise<T | null> {
    const result = await serverFetch<T>(
        `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}${endpoint}`,
        {
            headers: {
                Accept: "application/vnd.github.v3+json",
                "User-Agent": "dana-dzik-reports",
            },
        }
    )
    return result.ok ? result.data : null
}
