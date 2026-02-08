import { githubCommitUrl } from "./github"

declare const __BUILD_TIME__: string
declare const __GIT_COMMIT__: string
declare const __VERSION__: string

export function initBuildInfo(): void {
    const buildInfoEl = document.getElementById("build-info")
    if (!buildInfoEl) return

    const buildTime =
        typeof __BUILD_TIME__ !== "undefined" ? __BUILD_TIME__ : "dev"
    const gitCommit =
        typeof __GIT_COMMIT__ !== "undefined" ? __GIT_COMMIT__ : "local"
    const version = typeof __VERSION__ !== "undefined" ? __VERSION__ : "0.0.0"

    const commitLink =
        gitCommit !== "local"
            ? `<a href="${githubCommitUrl(gitCommit)}" target="_blank">${gitCommit.substring(0, 7)}</a>`
            : gitCommit

    buildInfoEl.innerHTML = `v${version} | Built: ${buildTime} | Commit: ${commitLink}`
}

export function getBuildInfo(): {
    version: string
    buildTime: string
    gitCommit: string
} {
    return {
        version: typeof __VERSION__ !== "undefined" ? __VERSION__ : "0.0.0",
        buildTime:
            typeof __BUILD_TIME__ !== "undefined" ? __BUILD_TIME__ : "dev",
        gitCommit:
            typeof __GIT_COMMIT__ !== "undefined" ? __GIT_COMMIT__ : "local",
    }
}
