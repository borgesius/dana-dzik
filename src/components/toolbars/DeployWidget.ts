import { getBuildInfo } from "../../lib/buildInfo"
import { getDeployEnv, type DeployEnv } from "../../config/environment"

export class DeployWidget {
    private el: HTMLElement
    private tooltipEl: HTMLElement

    constructor() {
        const info = getBuildInfo()
        const env = getDeployEnv()

        this.el = document.createElement("div")
        this.el.className = "toolbar-deploy"
        this.el.textContent = this.formatBadge(info.version, env)

        this.tooltipEl = document.createElement("div")
        this.tooltipEl.className = "toolbar-deploy-tooltip"
        this.tooltipEl.style.display = "none"
        this.tooltipEl.innerHTML = this.renderTooltip(info, env)
        this.el.appendChild(this.tooltipEl)

        this.el.addEventListener("mouseenter", () => {
            this.tooltipEl.style.display = "block"
        })
        this.el.addEventListener("mouseleave", () => {
            this.tooltipEl.style.display = "none"
        })
    }

    public getElement(): HTMLElement {
        return this.el
    }

    private formatBadge(version: string, env: DeployEnv): string {
        const envLabel = env === "production" ? "prod" : env === "staging" ? "stg" : "dev"
        return `v${version} · ${envLabel}`
    }

    private envEmoji(env: DeployEnv): string {
        if (env === "production") return "🟢"
        if (env === "staging") return "🟡"
        return "🔵"
    }

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

    private renderTooltip(
        info: { version: string; buildTime: string; gitCommit: string },
        env: DeployEnv
    ): string {
        const commitDisplay =
            info.gitCommit !== "local"
                ? `<a href="https://github.com/dana-dzik/dana-dzik/commit/${info.gitCommit}" target="_blank" class="deploy-commit-link">${info.gitCommit.substring(0, 7)}</a>`
                : "local"

        return `
            <div class="deploy-title">Deployment Info</div>
            <div class="deploy-divider"></div>
            <div class="deploy-row">
                <span class="deploy-label">Version</span>
                <span class="deploy-value">v${info.version}</span>
            </div>
            <div class="deploy-row">
                <span class="deploy-label">Environment</span>
                <span class="deploy-value">${this.envEmoji(env)} ${env}</span>
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
    }
}
