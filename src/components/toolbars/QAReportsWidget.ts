import { emitAppEvent } from "../../lib/events"
import { getLocaleManager } from "../../lib/localeManager"

function pick<T>(arr: T[]): T {
    return arr[Math.floor(Math.random() * arr.length)]
}

interface LighthouseScores {
    performance: number | null
    accessibility: number | null
    bestPractices: number | null
    seo: number | null
}

interface ReportsResponse {
    ok: boolean
    data?: {
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
            metrics: {
                statements: number | null
                branches: number | null
                functions: number | null
                lines: number | null
            }
            workflowUrl: string
            updatedAt: string | null
        }
    }
}

export class QAReportsWidget {
    private el: HTMLElement

    constructor() {
        this.el = document.createElement("div")
        this.el.className = "toolbar-qa"
        this.el.innerHTML = getLocaleManager().t("toolbar.qaLoading")
        void this.fetchQAReports()
    }

    public getElement(): HTMLElement {
        return this.el
    }

    public updateIfLoading(loadingText: string): void {
        if (this.el.textContent?.includes("Loading")) {
            this.el.innerHTML = loadingText
        }
    }

    private scoreEmoji(score: number): string {
        if (score >= 90) return "🟢"
        if (score >= 50) return "🟠"
        return "🔴"
    }

    private formatLighthouseLabel(lighthouse: {
        status: string
        scores: LighthouseScores
    }): string {
        const perf = lighthouse.scores.performance
        if (perf !== null) return `LH ${perf}`
        return "LH"
    }

    private buildLighthouseTooltip(lighthouse: {
        status: string
        scores: LighthouseScores
        updatedAt: string | null
    }): string {
        const lm = getLocaleManager()
        const s = lighthouse.scores
        const rows: string[] = []

        if (s.performance !== null) {
            rows.push(
                `<div class="qa-tooltip-row"><span class="qa-tooltip-label">${this.scoreEmoji(s.performance)} ${lm.t("qa.performance")}</span><span class="qa-tooltip-value">${s.performance}</span></div>`
            )
        }
        if (s.accessibility !== null) {
            rows.push(
                `<div class="qa-tooltip-row"><span class="qa-tooltip-label">${this.scoreEmoji(s.accessibility)} ${lm.t("qa.accessibility")}</span><span class="qa-tooltip-value">${s.accessibility}</span></div>`
            )
        }
        if (s.bestPractices !== null) {
            rows.push(
                `<div class="qa-tooltip-row"><span class="qa-tooltip-label">${this.scoreEmoji(s.bestPractices)} ${lm.t("qa.bestPractices")}</span><span class="qa-tooltip-value">${s.bestPractices}</span></div>`
            )
        }
        if (s.seo !== null) {
            rows.push(
                `<div class="qa-tooltip-row"><span class="qa-tooltip-label">${this.scoreEmoji(s.seo)} ${lm.t("qa.seo")}</span><span class="qa-tooltip-value">${s.seo}</span></div>`
            )
        }

        if (rows.length === 0) {
            rows.push(
                `<div class="qa-tooltip-row"><span class="qa-tooltip-label">${lm.t("qa.noScores")}</span></div>`
            )
        }

        const statusText =
            lighthouse.status === "success"
                ? lm.t("qa.passing")
                : lm.t("qa.failing")
        const dateStr = lighthouse.updatedAt
            ? new Date(lighthouse.updatedAt).toLocaleDateString()
            : ""

        return `
            <div class="qa-tooltip">
                <div class="qa-tooltip-title">${lm.t("qa.lighthouseReport")}</div>
                ${rows.join("")}
                <div class="qa-tooltip-status">${statusText}${dateStr ? ` · ${dateStr}` : ""}</div>
                <div class="qa-tooltip-click">${lm.t("qa.clickFullReport")}</div>
            </div>
        `
    }

    private buildPlaywrightTooltip(playwright: {
        status: string
        updatedAt: string | null
    }): string {
        const lm = getLocaleManager()
        const passed = playwright.status === "success"
        const statusText = passed
            ? lm.t("qa.allTestsPassing")
            : lm.t("qa.testsFailing")
        const statusEmoji = passed ? "✅" : "❌"
        const dateStr = playwright.updatedAt
            ? new Date(playwright.updatedAt).toLocaleDateString()
            : ""

        return `
            <div class="qa-tooltip">
                <div class="qa-tooltip-title">${lm.t("qa.e2eTests")}</div>
                <div class="qa-tooltip-row">
                    <span class="qa-tooltip-label">${lm.t("qa.status")}</span>
                    <span class="qa-tooltip-value">${statusEmoji} ${statusText}</span>
                </div>
                <div class="qa-tooltip-status">${lm.t("qa.chromiumLatest")}${dateStr ? ` · ${dateStr}` : ""}</div>
                <div class="qa-tooltip-click">${lm.t("qa.clickFullReport")}</div>
            </div>
        `
    }

    private buildCoverageTooltip(
        coverage: NonNullable<ReportsResponse["data"]>["coverage"]
    ): string {
        const lm = getLocaleManager()
        const m = coverage.metrics
        const rows: string[] = []

        if (m.statements !== null) {
            rows.push(
                `<div class="qa-tooltip-row"><span class="qa-tooltip-label">${this.scoreEmoji(m.statements)} ${lm.t("qa.statements")}</span><span class="qa-tooltip-value">${m.statements}%</span></div>`
            )
        }
        if (m.branches !== null) {
            rows.push(
                `<div class="qa-tooltip-row"><span class="qa-tooltip-label">${this.scoreEmoji(m.branches)} ${lm.t("qa.branches")}</span><span class="qa-tooltip-value">${m.branches}%</span></div>`
            )
        }
        if (m.functions !== null) {
            rows.push(
                `<div class="qa-tooltip-row"><span class="qa-tooltip-label">${this.scoreEmoji(m.functions)} ${lm.t("qa.functions")}</span><span class="qa-tooltip-value">${m.functions}%</span></div>`
            )
        }
        if (m.lines !== null) {
            rows.push(
                `<div class="qa-tooltip-row"><span class="qa-tooltip-label">${this.scoreEmoji(m.lines)} ${lm.t("qa.lines")}</span><span class="qa-tooltip-value">${m.lines}%</span></div>`
            )
        }

        if (rows.length === 0) {
            rows.push(
                `<div class="qa-tooltip-row"><span class="qa-tooltip-label">${lm.t("qa.noMetrics")}</span></div>`
            )
        }

        const dateStr = coverage.updatedAt
            ? new Date(coverage.updatedAt).toLocaleDateString()
            : ""

        return `
            <div class="qa-tooltip">
                <div class="qa-tooltip-title">${lm.t("qa.testCoverage")}</div>
                ${rows.join("")}
                <div class="qa-tooltip-status">${lm.t("qa.v8Provider")}${dateStr ? ` · ${dateStr}` : ""}</div>
                <div class="qa-tooltip-click">${lm.t("qa.clickCIDetails")}</div>
            </div>
        `
    }

    private wrapBadge(badgeHtml: string, tooltipHtml: string): string {
        return `<span class="qa-badge-wrap">${badgeHtml}${tooltipHtml}</span>`
    }

    private async fetchQAReports(): Promise<void> {
        const lm = getLocaleManager()

        try {
            const controller = new AbortController()
            const timeoutId = setTimeout(() => controller.abort(), 3000)

            const response = await fetch("/api/reports", {
                signal: controller.signal,
            })
            clearTimeout(timeoutId)

            // SAFETY: response shape controlled by our /api/reports endpoint
            const result = (await response.json()) as ReportsResponse

            if (!result.ok || !result.data) {
                this.el.innerHTML = pick([
                    lm.t("toolbar.qaFallback1"),
                    lm.t("toolbar.qaFallback2"),
                    lm.t("toolbar.qaFallback3"),
                ])
                return
            }

            const { lighthouse, playwright, coverage } = result.data

            const lhStatus = lighthouse.status === "success" ? "✅" : "❌"
            const pwStatus = playwright.status === "success" ? "✅" : "❌"

            const lhLink = lighthouse.url || lighthouse.workflowUrl
            const pwLink = playwright.artifactUrl || playwright.workflowUrl

            const lhLabel = this.formatLighthouseLabel(lighthouse)

            const lhBadge = `<a href="${lhLink}" target="_blank" class="qa-badge qa-${lighthouse.status}">${lhStatus} ${lhLabel}</a>`
            const lhTooltip = this.buildLighthouseTooltip(lighthouse)

            const pwBadge = `<a href="${pwLink}" target="_blank" class="qa-badge qa-${playwright.status}">${pwStatus} E2E</a>`
            const pwTooltip = this.buildPlaywrightTooltip(playwright)

            let badges =
                this.wrapBadge(lhBadge, lhTooltip) +
                this.wrapBadge(pwBadge, pwTooltip)

            if (coverage?.available) {
                const covLabel =
                    coverage.metrics.lines !== null
                        ? `📊 ${coverage.metrics.lines}%`
                        : "📊 COV"
                const covBadge = `<a href="${coverage.workflowUrl}" target="_blank" class="qa-badge qa-success">${covLabel}</a>`
                const covTooltip = this.buildCoverageTooltip(coverage)
                badges += this.wrapBadge(covBadge, covTooltip)
            }

            this.el.innerHTML = badges

            this.el.querySelectorAll(".qa-badge").forEach((badge) => {
                badge.addEventListener("click", () => {
                    emitAppEvent("qa:report-clicked")
                })
            })
        } catch {
            this.el.innerHTML = pick([
                getLocaleManager().t("toolbar.qaFallback1"),
                getLocaleManager().t("toolbar.qaFallback2"),
                getLocaleManager().t("toolbar.qaFallback3"),
            ])
        }
    }
}
