import { getLocaleManager } from "../localeManager"

export function getResumeContent(): string {
    const lm = getLocaleManager()
    return `
        <div class="resume-content">
            <header>
                <h1>${lm.t("resume.name")}</h1>
                <a href="mailto:danadzik@gmail.com">danadzik@gmail.com</a>
            </header>

            <hr />

            <h2>${lm.t("resume.experience")}</h2>
            <div class="entry">
                <strong>${lm.t("resume.title")}</strong>
                ${lm.t("resume.company")}
                <span class="meta">${lm.t("resume.dates")}</span>
            </div>

            <hr />

            <h2>${lm.t("resume.education")}</h2>
            <div class="entry">
                <strong>${lm.t("resume.school")}</strong>
                ${lm.t("resume.degree")}
                <span class="meta">${lm.t("resume.location")}</span>
            </div>
        </div>
    `
}
