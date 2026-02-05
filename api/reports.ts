import type { VercelRequest, VercelResponse } from "@vercel/node"

const GITHUB_OWNER = "borgesius"
const GITHUB_REPO = "dana-dzik"

interface WorkflowRun {
    id: number
    status: string
    conclusion: string | null
    html_url: string
    created_at: string
}

interface WorkflowRunsResponse {
    workflow_runs: WorkflowRun[]
}

interface Artifact {
    id: number
    name: string
    archive_download_url: string
    created_at: string
}

interface ArtifactsResponse {
    artifacts: Artifact[]
}

interface CheckAnnotation {
    message: string
}

interface ReportsData {
    lighthouse: {
        url: string | null
        workflowUrl: string
        status: string
        score: number | null
        updatedAt: string | null
    }
    playwright: {
        artifactUrl: string | null
        workflowUrl: string
        status: string
        updatedAt: string | null
    }
}

async function fetchGitHub<T>(endpoint: string): Promise<T | null> {
    try {
        const response = await fetch(
            `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}${endpoint}`,
            {
                headers: {
                    Accept: "application/vnd.github.v3+json",
                    "User-Agent": "dana-dzik-reports",
                },
            }
        )
        if (!response.ok) return null
        return (await response.json()) as T
    } catch {
        return null
    }
}

async function getLatestLighthouseReport(): Promise<ReportsData["lighthouse"]> {
    const defaultResult: ReportsData["lighthouse"] = {
        url: null,
        workflowUrl: `https://github.com/${GITHUB_OWNER}/${GITHUB_REPO}/actions/workflows/lighthouse.yml`,
        status: "unknown",
        score: null,
        updatedAt: null,
    }

    const runs = await fetchGitHub<WorkflowRunsResponse>(
        "/actions/workflows/lighthouse.yml/runs?per_page=1&branch=main&status=completed"
    )

    if (!runs?.workflow_runs?.[0]) return defaultResult

    const run = runs.workflow_runs[0]
    defaultResult.status = run.conclusion || "unknown"
    defaultResult.updatedAt = run.created_at
    defaultResult.workflowUrl = run.html_url

    const annotations = await fetchGitHub<CheckAnnotation[]>(
        `/check-runs/${run.id}/annotations`
    )

    if (annotations) {
        for (const annotation of annotations) {
            const urlMatch = annotation.message?.match(
                /https:\/\/storage\.googleapis\.com\/lighthouse-infrastructure\.appspot\.com\/reports\/[^\s]+\.html/
            )
            if (urlMatch) {
                defaultResult.url = urlMatch[0]
                break
            }
        }
    }

    if (!defaultResult.url) {
        defaultResult.url = run.html_url
    }

    return defaultResult
}

async function getLatestPlaywrightReport(): Promise<ReportsData["playwright"]> {
    const defaultResult: ReportsData["playwright"] = {
        artifactUrl: null,
        workflowUrl: `https://github.com/${GITHUB_OWNER}/${GITHUB_REPO}/actions/workflows/ci.yml`,
        status: "unknown",
        updatedAt: null,
    }

    const runs = await fetchGitHub<WorkflowRunsResponse>(
        "/actions/workflows/ci.yml/runs?per_page=1&branch=main&status=completed"
    )

    if (!runs?.workflow_runs?.[0]) return defaultResult

    const run = runs.workflow_runs[0]
    defaultResult.status = run.conclusion || "unknown"
    defaultResult.updatedAt = run.created_at
    defaultResult.workflowUrl = run.html_url

    const artifacts = await fetchGitHub<ArtifactsResponse>(
        `/actions/runs/${run.id}/artifacts`
    )

    if (artifacts?.artifacts) {
        const playwrightArtifact = artifacts.artifacts.find(
            (a) => a.name === "playwright-report"
        )
        if (playwrightArtifact) {
            defaultResult.artifactUrl = `https://github.com/${GITHUB_OWNER}/${GITHUB_REPO}/actions/runs/${run.id}`
        }
    }

    return defaultResult
}

export default async function handler(
    req: VercelRequest,
    res: VercelResponse
): Promise<void> {
    res.setHeader("Access-Control-Allow-Origin", "*")
    res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS")
    res.setHeader("Access-Control-Allow-Headers", "Content-Type")
    res.setHeader("Cache-Control", "public, s-maxage=300, stale-while-revalidate=600")

    if (req.method === "OPTIONS") {
        res.status(200).end()
        return
    }

    if (req.method !== "GET") {
        res.status(405).json({ ok: false, error: "Method not allowed" })
        return
    }

    try {
        const [lighthouse, playwright] = await Promise.all([
            getLatestLighthouseReport(),
            getLatestPlaywrightReport(),
        ])

        res.status(200).json({
            ok: true,
            data: { lighthouse, playwright },
        })
    } catch (error) {
        console.error("Reports API error:", error)
        res.status(500).json({
            ok: false,
            error: error instanceof Error ? error.message : "Unknown error",
        })
    }
}
