import { getLocaleManager } from "../localeManager"

export function getLinksContent(): string {
    const lm = getLocaleManager()
    return `
        <div class="links-content">
            <h1>${lm.t("links.title")}</h1>

            <div class="link-list">
                <a href="https://github.com/borgesius" target="_blank" class="link-btn github">
                    🐙 GitHub
                </a>
                <a href="https://linkedin.com/in/danadzik" target="_blank" class="link-btn linkedin">
                    💼 LinkedIn
                </a>
                <a href="mailto:danadzik@gmail.com" class="link-btn email">
                    📧 Email
                </a>
            </div>
        </div>
    `
}
