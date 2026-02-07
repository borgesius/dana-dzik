import { getLocaleManager } from "../localeManager"

export function getProjectsContent(): string {
    const lm = getLocaleManager()
    return `
        <div class="projects-content">
            <h1>${lm.t("projects.title")}</h1>

            <div class="project-card">
                <h2>${lm.t("projects.thisWebsite")}</h2>
                <p>
                    ${lm.t("projects.description")}
                </p>
                <p class="tech">
                    <strong>${lm.t("projects.stack")}</strong> TypeScript, Vite, and Love <3
                </p>
                <p>
                    <a href="https://github.com/borgesius/dana-dzik" target="_blank">
                        ${lm.t("projects.viewSource")}
                    </a>
                </p>
            </div>
        </div>
    `
}
