import {
    type DeployEnv,
    getDeployEnv,
    getProductionUrl,
    getStagingUrl,
} from "../../config/environment"
import { getBuildInfo } from "../../lib/buildInfo"
import { fetchGitHubAPI, githubCommitUrl } from "../../lib/github"

/* ── Types ──────────────────────────────────────────────────────────── */

interface GitHubCommit {
    sha: string
    commit: {
        message: string
        author: { name: string; date: string }
    }
}

interface GitHubCompare {
    status: string // "ahead" | "behind" | "diverged" | "identical"
    ahead_by: number
    behind_by: number
    merge_base_commit: { sha: string }
}

interface CommitInfo {
    sha: string
    message: string
    date: string
    author: string
}

interface DeploymentData {
    main: CommitInfo[]
    staging: CommitInfo[]
    mergeBaseSha: string | null
}

/** Positioned node for sub-tooltip wiring. */
interface PlacedNode {
    branch: string
    sha: string
    message: string
    date: string
    author: string
    cx: number
    cy: number
    isHead: boolean
}

/* ── SVG Layout Constants ───────────────────────────────────────────── */

const SVG_W = 300
const STAGING_X = 14
const MAIN_X = 154
const LABEL_PAD = 10 // padding between node and text label
const ROW_H = 22
const HEADER_H = 18
const NODE_R = 3.5
const HEAD_R = 5
const LOCAL_R = 8

/* ── Widget ─────────────────────────────────────────────────────────── */

export class DeployWidget {
    private el: HTMLElement
    private tooltipEl: HTMLElement
    private subTooltipEl: HTMLElement
    private fetched = false
    private fetchPromise: Promise<void> | null = null
    private hideTimeout: ReturnType<typeof setTimeout> | null = null
    private subHideTimeout: ReturnType<typeof setTimeout> | null = null

    constructor() {
        const info = getBuildInfo()
        const env = getDeployEnv()

        this.el = document.createElement("div")
        this.el.className = "toolbar-deploy"
        this.el.textContent = this.formatBadge(info.version, env)

        this.tooltipEl = document.createElement("div")
        this.tooltipEl.className = "toolbar-deploy-tooltip"
        this.tooltipEl.style.display = "none"

        this.subTooltipEl = document.createElement("div")
        this.subTooltipEl.className = "branch-sub-tooltip"
        this.subTooltipEl.style.display = "none"

        this.renderStaticTooltip(info, env)
        this.el.appendChild(this.tooltipEl)

        const show = (): void => {
            if (this.hideTimeout) {
                clearTimeout(this.hideTimeout)
                this.hideTimeout = null
            }
            this.tooltipEl.style.display = "block"
            if (!this.fetched && !this.fetchPromise) {
                this.fetchPromise = this.fetchAndRender(info, env)
            }
        }

        const hide = (): void => {
            this.hideTimeout = setTimeout(() => {
                this.tooltipEl.style.display = "none"
                this.subTooltipEl.style.display = "none"
            }, 120)
        }

        this.el.addEventListener("mouseenter", show)
        this.el.addEventListener("mouseleave", hide)
        this.tooltipEl.addEventListener("mouseenter", show)
        this.tooltipEl.addEventListener("mouseleave", hide)
    }

    public getElement(): HTMLElement {
        return this.el
    }

    /* ── Badge ──────────────────────────────────────────────────────── */

    private formatBadge(version: string, env: DeployEnv): string {
        const envLabel =
            env === "production" ? "prod" : env === "staging" ? "stg" : "dev"
        return `v${version} · ${envLabel}`
    }

    /* ── Static Tooltip (before fetch) ──────────────────────────────── */

    private renderStaticTooltip(
        info: { version: string; buildTime: string; gitCommit: string },
        env: DeployEnv
    ): void {
        this.tooltipEl.innerHTML = ""

        const title = document.createElement("div")
        title.className = "deploy-title"
        title.textContent = "Deployment"
        this.tooltipEl.appendChild(title)

        // Info rows first (version, env, build time, commit)
        this.appendInfoRows(info, env)
        this.appendEnvLinks(env)

        // Branch visualizer below
        const vis = document.createElement("div")
        vis.className = "deploy-branch-vis"
        this.tooltipEl.appendChild(vis)
        vis.appendChild(this.subTooltipEl)

        this.rebuildGraph(vis, env, info.gitCommit, {
            main: [],
            staging: [],
            mergeBaseSha: null,
        })

        const loading = document.createElement("div")
        loading.className = "deploy-loading"
        loading.textContent = "fetching commit data…"
        loading.dataset.role = "loading"
        this.tooltipEl.appendChild(loading)
    }

    /* ── Fetch & Re-render ──────────────────────────────────────────── */

    private async fetchAndRender(
        info: { version: string; buildTime: string; gitCommit: string },
        env: DeployEnv
    ): Promise<void> {
        const data = await this.fetchDeploymentData()
        this.fetched = true

        const loading = this.tooltipEl.querySelector('[data-role="loading"]')
        loading?.remove()

        if (!data) return

        const vis = this.tooltipEl.querySelector(".deploy-branch-vis")
        if (vis instanceof HTMLElement) {
            this.rebuildGraph(vis, env, info.gitCommit, data)
        }
    }

    private async fetchDeploymentData(): Promise<DeploymentData | null> {
        const [mainRes, stagingRes, compareRes] = await Promise.all([
            fetchGitHubAPI<GitHubCommit[]>("/commits?sha=main&per_page=5"),
            fetchGitHubAPI<GitHubCommit[]>("/commits?sha=staging&per_page=8"),
            fetchGitHubAPI<GitHubCompare>("/compare/main...staging"),
        ])

        if (!mainRes && !stagingRes) return null

        const toCommits = (raw: GitHubCommit[] | null): CommitInfo[] =>
            (raw || []).map((c) => ({
                sha: c.sha,
                message: c.commit.message,
                date: c.commit.author.date,
                author: c.commit.author.name,
            }))

        return {
            main: toCommits(mainRes),
            staging: toCommits(stagingRes),
            mergeBaseSha: compareRes?.merge_base_commit?.sha ?? null,
        }
    }

    /* ── Build vertical graph + wire events ─────────────────────────── */

    private rebuildGraph(
        container: HTMLElement,
        env: DeployEnv,
        localSha: string,
        data: DeploymentData
    ): void {
        const hadSubTooltip = container.contains(this.subTooltipEl)

        const { svg, nodes } = this.buildVerticalGraph(env, localSha, data)

        if (hadSubTooltip) this.subTooltipEl.remove()
        container.innerHTML = svg
        container.appendChild(this.subTooltipEl)

        // Wire hover events on commit circles
        const circles =
            container.querySelectorAll<SVGCircleElement>("circle[data-sha]")
        circles.forEach((circle) => {
            const sha = circle.dataset.sha ?? ""
            const br = circle.dataset.branch ?? ""
            const node = nodes.find((n) => n.sha === sha && n.branch === br)
            if (!node) return

            circle.addEventListener("mouseenter", () => {
                this.showSubTooltip(node, circle, container)
            })
            circle.addEventListener("mouseleave", () => {
                this.scheduleSubHide()
            })
        })

        this.subTooltipEl.addEventListener("mouseenter", () => {
            this.cancelSubHide()
        })
        this.subTooltipEl.addEventListener("mouseleave", () => {
            this.scheduleSubHide()
        })
    }

    /* ── Vertical Git Graph (parallel columns) ────────────────────────── */

    private buildVerticalGraph(
        env: DeployEnv,
        localSha: string,
        data: DeploymentData
    ): { svg: string; nodes: PlacedNode[] } {
        const staging = data.staging // newest first
        const main = data.main // newest first
        const numRows = Math.max(staging.length, main.length)

        if (numRows === 0) {
            const h = HEADER_H + ROW_H
            let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${SVG_W} ${h}" width="${SVG_W}" height="${h}">`
            svg += this.columnHeaders()
            svg += `<text x="${SVG_W / 2}" y="${HEADER_H + ROW_H / 2}" text-anchor="middle" class="branch-commit-label" opacity="0.4">no commit data</text>`
            svg += "</svg>"
            return { svg, nodes: [] }
        }

        // Find merge base position in staging list
        const mergeBase = data.mergeBaseSha
        const mergeBaseIdx = mergeBase
            ? staging.findIndex((c) => c.sha === mergeBase)
            : -1

        const rowY = (i: number): number => HEADER_H + i * ROW_H + ROW_H / 2
        const svgH = HEADER_H + numRows * ROW_H + 8
        const placedNodes: PlacedNode[] = []

        let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${SVG_W} ${svgH}" width="${SVG_W}" height="${svgH}">`
        svg += this.columnHeaders()

        // ── Vertical branch lines ──
        if (staging.length > 0) {
            svg += `<line x1="${STAGING_X}" y1="${rowY(0)}" x2="${STAGING_X}" y2="${rowY(staging.length - 1)}" class="branch-line branch-line-staging"/>`
        }
        if (main.length > 0) {
            svg += `<line x1="${MAIN_X}" y1="${rowY(0)}" x2="${MAIN_X}" y2="${rowY(main.length - 1)}" class="branch-line branch-line-main"/>`
        }

        // ── Merge connector ──
        if (mergeBaseIdx >= 0 && main.length > 0) {
            // Connect merge base on staging to the top (HEAD) of main
            const sy = rowY(mergeBaseIdx)
            const my = rowY(0)
            const midX = (STAGING_X + MAIN_X) / 2
            svg += `<path d="M ${STAGING_X} ${sy} C ${midX} ${sy}, ${midX} ${my}, ${MAIN_X} ${my}" class="branch-merge-path"/>`
        } else if (staging.length > 0 && main.length > 0) {
            // No merge base in our data — connect bottoms
            const sy = rowY(staging.length - 1)
            const my = rowY(main.length - 1)
            const midX = (STAGING_X + MAIN_X) / 2
            svg += `<path d="M ${STAGING_X} ${sy} C ${midX} ${sy}, ${midX} ${my}, ${MAIN_X} ${my}" class="branch-merge-path"/>`
        }

        // ── Staging commits ──
        staging.forEach((c, i) => {
            const y = rowY(i)
            const isHead = i === 0
            const isLocal = localSha !== "local" && c.sha === localSha
            const isUnreleased =
                mergeBase !== null && (mergeBaseIdx < 0 || i < mergeBaseIdx)
            const isActive = isHead && env === "staging"

            if (isLocal) {
                svg += `<circle cx="${STAGING_X}" cy="${y}" r="${LOCAL_R}" class="branch-node-here"/>`
            }

            const r = isHead ? HEAD_R : NODE_R
            const cls = `branch-node branch-node-staging${isUnreleased ? " branch-node-unreleased" : ""}${isActive ? " branch-node-active" : ""}`
            svg += `<circle cx="${STAGING_X}" cy="${y}" r="${r}" class="${cls}" data-sha="${this.escAttr(c.sha)}" data-branch="staging" style="cursor:pointer;pointer-events:auto"/>`

            const label = this.commitLabel(c, 17)
            svg += `<text x="${STAGING_X + LABEL_PAD}" y="${y}" text-anchor="start" class="branch-commit-label${isUnreleased ? " branch-label-unreleased" : ""}">${this.escSvg(label)}</text>`

            placedNodes.push({
                branch: "staging",
                sha: c.sha,
                message: c.message.split("\n")[0],
                date: c.date,
                author: c.author,
                cx: STAGING_X,
                cy: y,
                isHead,
            })
        })

        // ── Main commits ──
        main.forEach((c, i) => {
            const y = rowY(i)
            const isHead = i === 0
            const isLocal = localSha !== "local" && c.sha === localSha
            const isActive = isHead && env === "production"

            if (isLocal) {
                svg += `<circle cx="${MAIN_X}" cy="${y}" r="${LOCAL_R}" class="branch-node-here"/>`
            }

            const r = isHead ? HEAD_R : NODE_R
            const cls = `branch-node branch-node-main${isActive ? " branch-node-active" : ""}`
            svg += `<circle cx="${MAIN_X}" cy="${y}" r="${r}" class="${cls}" data-sha="${this.escAttr(c.sha)}" data-branch="main" style="cursor:pointer;pointer-events:auto"/>`

            const label = this.commitLabel(c, 18)
            svg += `<text x="${MAIN_X + LABEL_PAD}" y="${y}" text-anchor="start" class="branch-commit-label">${this.escSvg(label)}</text>`

            placedNodes.push({
                branch: "main",
                sha: c.sha,
                message: c.message.split("\n")[0],
                date: c.date,
                author: c.author,
                cx: MAIN_X,
                cy: y,
                isHead,
            })
        })

        svg += "</svg>"
        return { svg, nodes: placedNodes }
    }

    private columnHeaders(): string {
        return (
            `<text x="${STAGING_X}" y="10" text-anchor="start" class="branch-column-label branch-column-label-staging">staging</text>` +
            `<text x="${MAIN_X}" y="10" text-anchor="start" class="branch-column-label branch-column-label-main">main</text>`
        )
    }

    private commitLabel(c: CommitInfo, maxLen: number): string {
        const firstLine = c.message ? c.message.split("\n")[0] : ""
        return firstLine ? this.truncate(firstLine, maxLen) : c.sha.substring(0, 7)
    }

    /* ── Sub-tooltip ────────────────────────────────────────────────── */

    private showSubTooltip(
        node: PlacedNode,
        circle: SVGCircleElement,
        container: HTMLElement
    ): void {
        this.cancelSubHide()

        const shortSha = node.sha.substring(0, 7)
        const commitUrl = githubCommitUrl(node.sha)
        const dateStr = this.formatCommitDate(node.date)
        const msg = node.message || "(no message)"
        const author = node.author || "—"

        this.subTooltipEl.innerHTML = `
            <div class="sub-tooltip-row sub-tooltip-sha">
                <a href="${commitUrl}" target="_blank" class="deploy-commit-link">${shortSha}</a>
                <span class="sub-tooltip-branch">${node.branch}</span>
            </div>
            <div class="sub-tooltip-msg">${this.escHtml(msg)}</div>
            <div class="sub-tooltip-meta">${this.escHtml(author)} · ${dateStr}</div>
        `

        const circleRect = circle.getBoundingClientRect()
        const containerRect = container.getBoundingClientRect()

        // Position to the side of the node (right for staging, left for main)
        if (node.branch === "staging") {
            this.subTooltipEl.style.transform = "translate(-100%, -50%)"
            this.subTooltipEl.style.left = `${circleRect.left - containerRect.left - 8}px`
        } else {
            this.subTooltipEl.style.transform = "translate(0, -50%)"
            this.subTooltipEl.style.left = `${circleRect.right - containerRect.left + 8}px`
        }
        this.subTooltipEl.style.top = `${circleRect.top - containerRect.top + circleRect.height / 2}px`
        this.subTooltipEl.style.display = "block"
    }

    private scheduleSubHide(): void {
        this.cancelSubHide()
        this.subHideTimeout = setTimeout(() => {
            this.subTooltipEl.style.display = "none"
        }, 150)
    }

    private cancelSubHide(): void {
        if (this.subHideTimeout) {
            clearTimeout(this.subHideTimeout)
            this.subHideTimeout = null
        }
    }

    /* ── Info Rows ──────────────────────────────────────────────────── */

    private appendInfoRows(
        info: { version: string; buildTime: string; gitCommit: string },
        env: DeployEnv
    ): void {
        const divider = document.createElement("div")
        divider.className = "deploy-divider"
        this.tooltipEl.appendChild(divider)

        const commitDisplay =
            info.gitCommit !== "local"
                ? `<a href="${githubCommitUrl(info.gitCommit)}" target="_blank" class="deploy-commit-link">${info.gitCommit.substring(0, 7)}</a>`
                : "local"

        const envLabel =
            env === "production"
                ? "production"
                : env === "staging"
                  ? "staging"
                  : "development"

        const rowsHtml = `
            <div class="deploy-row">
                <span class="deploy-label">Version</span>
                <span class="deploy-value">v${info.version}</span>
            </div>
            <div class="deploy-row">
                <span class="deploy-label">Environment</span>
                <span class="deploy-value">${envLabel}</span>
            </div>
            <div class="deploy-row">
                <span class="deploy-label">Built</span>
                <span class="deploy-value">${this.formatBuildTime(info.buildTime)}</span>
            </div>
            <div class="deploy-row">
                <span class="deploy-label">Commit</span>
                <span class="deploy-value">${commitDisplay}</span>
            </div>
        `
        const container = document.createElement("div")
        container.innerHTML = rowsHtml
        while (container.firstChild) {
            this.tooltipEl.appendChild(container.firstChild)
        }
    }

    /* ── Environment Links ──────────────────────────────────────────── */

    private appendEnvLinks(env: DeployEnv): void {
        const divider = document.createElement("div")
        divider.className = "deploy-divider"
        this.tooltipEl.appendChild(divider)

        const links = document.createElement("div")
        links.className = "deploy-env-links"

        if (env !== "production") {
            const prodLink = document.createElement("a")
            prodLink.href = getProductionUrl()
            prodLink.className = "deploy-env-link"
            prodLink.textContent = "Production ↗"
            prodLink.target = "_blank"
            links.appendChild(prodLink)
        }

        if (env !== "staging") {
            const stgLink = document.createElement("a")
            stgLink.href = getStagingUrl()
            stgLink.className = "deploy-env-link"
            stgLink.textContent = "Staging ↗"
            stgLink.target = "_blank"
            links.appendChild(stgLink)
        }

        if (env !== "development") {
            const devLabel = document.createElement("span")
            devLabel.className = "deploy-env-link"
            devLabel.textContent = "Dev Panel"
            devLabel.title = "Ctrl+Shift+D"
            devLabel.addEventListener("click", (e) => {
                e.stopPropagation()
                // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
                const panel = (window as any).__devPanel as
                    | { toggle?: () => void }
                    | undefined
                panel?.toggle?.()
            })
            links.appendChild(devLabel)
        }

        this.tooltipEl.appendChild(links)
    }

    /* ── Helpers ─────────────────────────────────────────────────────── */

    private formatBuildTime(buildTime: string): string {
        if (buildTime === "dev") return "dev"
        try {
            const date = new Date(buildTime)
            return date.toLocaleString(undefined, {
                year: "numeric",
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
            })
        } catch {
            return buildTime
        }
    }

    private formatCommitDate(dateStr: string): string {
        if (!dateStr) return "—"
        try {
            const d = new Date(dateStr)
            return d.toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
            })
        } catch {
            return dateStr
        }
    }

    private truncate(text: string, max: number): string {
        return text.length > max ? text.substring(0, max - 1) + "…" : text
    }

    private escSvg(text: string): string {
        return text
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
    }

    private escAttr(text: string): string {
        return text.replace(/&/g, "&amp;").replace(/"/g, "&quot;")
    }

    private escHtml(text: string): string {
        const d = document.createElement("div")
        d.textContent = text
        return d.innerHTML
    }
}
