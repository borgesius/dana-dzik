import type { VercelRequest, VercelResponse } from "@vercel/node"

import {
    GITHUB_OWNER,
    GITHUB_REPO,
    fetchGitHub,
    type WorkflowRun,
    type WorkflowRunsResponse,
    type ArtifactsResponse,
    type CommitStatus,
} from "./lib/github"

interface LighthouseScores {
    performance: number | null
    accessibility: number | null
    bestPractices: number | null
    seo: number | null
}

interface CoverageMetrics {
    statements: number | null
    branches: number | null
    functions: number | null
    lines: number | null
}

interface ReportsData {
    lighthouse: {
        url: string | null
        workflowUrl: string
        status: string
        score: number | null
        scores: LighthouseScores
        updatedAt: string | null
    }
    playwright: {
        artifactUrl: string | null
        workflowUrl: string
        status: string
        updatedAt: string | null
    }
    coverage: {
        available: boolean
        metrics: CoverageMetrics
        workflowUrl: string
        updatedAt: string | null
    }
}

async function getStatusesForWorkflow(
    workflowFile: string,
    branch: string = "main"
): Promise<{ run: WorkflowRun; statuses: CommitStatus[] } | null> {
    const runs = await fetchGitHub<WorkflowRunsResponse>(
        `/actions/workflows/${workflowFile}/runs?per_page=1&branch=${branch}&status=completed`
    )

    if (!runs?.workflow_runs?.[0]) return null

    const run = runs.workflow_runs[0]
    const statuses = await fetchGitHub<CommitStatus[]>(
        `/commits/${run.head_sha}/statuses`
    )

    return { run, statuses: statuses || [] }
}

function parseLighthouseDescription(description: string): LighthouseScores {
    const scores: LighthouseScores = {
        performance: null,
        accessibility: null,
        bestPractices: null,
        seo: null,
    }

    const perfMatch = description.match(/Perf:\s*(\d+)/)
    const a11yMatch = description.match(/A11y:\s*(\d+)/)
    const bpMatch = description.match(/BP:\s*(\d+)/)
    const seoMatch = description.match(/SEO:\s*(\d+)/)

    if (perfMatch) scores.performance = parseInt(perfMatch[1], 10)
    if (a11yMatch) scores.accessibility = parseInt(a11yMatch[1], 10)
    if (bpMatch) scores.bestPractices = parseInt(bpMatch[1], 10)
    if (seoMatch) scores.seo = parseInt(seoMatch[1], 10)

    return scores
}

function parseCoverageDescription(description: string): CoverageMetrics {
    const metrics: CoverageMetrics = {
        statements: null,
        branches: null,
        functions: null,
        lines: null,
    }

    const stmtMatch = description.match(/Stmts:\s*([\d.]+)%/)
    const branchMatch = description.match(/Branch:\s*([\d.]+)%/)
    const funcMatch = description.match(/Func:\s*([\d.]+)%/)
    const lineMatch = description.match(/Lines:\s*([\d.]+)%/)

    if (stmtMatch) metrics.statements = parseFloat(stmtMatch[1])
    if (branchMatch) metrics.branches = parseFloat(branchMatch[1])
    if (funcMatch) metrics.functions = parseFloat(funcMatch[1])
    if (lineMatch) metrics.lines = parseFloat(lineMatch[1])

    return metrics
}

async function getLatestLighthouseReport(
    branch: string = "main"
): Promise<ReportsData["lighthouse"]> {
    const defaultResult: ReportsData["lighthouse"] = {
        url: null,
        workflowUrl: `https://github.com/${GITHUB_OWNER}/${GITHUB_REPO}/actions/workflows/lighthouse.yml`,
        status: "unknown",
        score: null,
        scores: {
            performance: null,
            accessibility: null,
            bestPractices: null,
            seo: null,
        },
        updatedAt: null,
    }

    const result = await getStatusesForWorkflow("lighthouse.yml", branch)
    if (!result) return defaultResult

    const { run, statuses } = result
    defaultResult.status = run.conclusion || "unknown"
    defaultResult.updatedAt = run.created_at
    defaultResult.workflowUrl = run.html_url
    defaultResult.url = run.html_url

    const lhStatus = statuses.find((s) => s.context === "lighthouse")
    if (lhStatus?.description) {
        defaultResult.scores = parseLighthouseDescription(lhStatus.description)

        if (defaultResult.scores.performance !== null) {
            defaultResult.score = defaultResult.scores.performance
        }

        if (lhStatus.target_url) {
            defaultResult.url = lhStatus.target_url
        }
    }

    return defaultResult
}

async function getLatestPlaywrightReport(
    branch: string = "main"
): Promise<ReportsData["playwright"]> {
    const defaultResult: ReportsData["playwright"] = {
        artifactUrl: null,
        workflowUrl: `https://github.com/${GITHUB_OWNER}/${GITHUB_REPO}/actions/workflows/ci.yml`,
        status: "unknown",
        updatedAt: null,
    }

    const runs = await fetchGitHub<WorkflowRunsResponse>(
        `/actions/workflows/ci.yml/runs?per_page=1&branch=${branch}&status=completed`
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

async function getCoverageInfo(
    branch: string = "main"
): Promise<ReportsData["coverage"]> {
    const defaultResult: ReportsData["coverage"] = {
        available: false,
        metrics: {
            statements: null,
            branches: null,
            functions: null,
            lines: null,
        },
        workflowUrl: `https://github.com/${GITHUB_OWNER}/${GITHUB_REPO}/actions/workflows/ci.yml`,
        updatedAt: null,
    }

    const result = await getStatusesForWorkflow("ci.yml", branch)
    if (!result) return defaultResult

    const { statuses } = result
    const coverageStatus = statuses.find((s) => s.context === "coverage")

    if (coverageStatus?.description) {
        defaultResult.available = true
        defaultResult.metrics = parseCoverageDescription(
            coverageStatus.description
        )
        defaultResult.updatedAt = coverageStatus.updated_at
        if (coverageStatus.target_url) {
            defaultResult.workflowUrl = coverageStatus.target_url
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
        const host = (req.headers.host || "").toString()
        const branch = host.startsWith("staging.") ? "staging" : "main"

        const [lighthouse, playwright, coverage] = await Promise.all([
            getLatestLighthouseReport(branch),
            getLatestPlaywrightReport(branch),
            getCoverageInfo(branch),
        ])

        res.status(200).json({
            ok: true,
            data: { lighthouse, playwright, coverage },
        })
    } catch (error) {
        console.error("Reports API error:", error)
        res.status(500).json({
            ok: false,
            error: error instanceof Error ? error.message : "Unknown error",
        })
    }
}
