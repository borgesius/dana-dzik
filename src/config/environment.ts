export type DeployEnv = "production" | "staging" | "development"

export function getDeployEnv(): DeployEnv {
    // Vite env var set per Vercel environment
    const envVar = import.meta.env.VITE_DEPLOY_ENV as string | undefined
    if (envVar === "staging" || envVar === "production") return envVar

    // Fallback: detect from hostname
    if (typeof window !== "undefined") {
        const host = window.location.hostname
        if (host === "danadzik.com" || host === "www.danadzik.com")
            return "production"
        if (host.startsWith("staging.")) return "staging"
    }
    return "development"
}

export function isStaging(): boolean {
    return getDeployEnv() === "staging"
}

export function getProductionUrl(): string {
    return "https://danadzik.com"
}

export function getStagingUrl(): string {
    return "https://staging.danadzik.com"
}
