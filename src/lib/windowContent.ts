import { isMobile } from "./isMobile"
import { getLocaleManager } from "./localeManager"

export function getWindowContent(contentType: string): string {
    switch (contentType) {
        case "welcome":
            return getWelcomeContent()
        case "about":
            return getAboutContent()
        case "projects":
            return getProjectsContent()
        case "resume":
            return getResumeContent()
        case "links":
            return getLinksContent()
        case "guestbook":
            return getGuestbookContent()
        case "felixgpt":
            return getFelixGPTContent()
        case "stats":
            return getSiteStatsContent()
        case "pinball":
            return getPinballContent()
        case "terminal":
            return getTerminalContent()
        case "explorer":
            return getExplorerContent()
        default:
            return "<p>Content not found</p>"
    }
}

function getTerminalContent(): string {
    return `<div id="terminal-content" class="terminal-container"></div>`
}

function getExplorerContent(): string {
    return `<div id="explorer-content"></div>`
}

function getWelcomeContent(): string {
    const lm = getLocaleManager()
    const tagline = isMobile()
        ? lm.t("welcome.taglineMobile")
        : lm.t("welcome.taglineDesktop")

    return `
        <div class="welcome-content">
            <h1 class="rainbow-text">${lm.t("welcome.title")}</h1>

            <div class="marquee-container">
                <span class="marquee">
                    ★★★ ${lm.t("welcome.visitorCount")}<span id="visitor-count">...</span>! ★★★
                    ${lm.t("welcome.signGuestbook")} ★★★
                </span>
            </div>

            <img
                src="/assets/gifs/welcome.gif"
                alt="${lm.t("welcome.altWelcome")}"
                class="welcome-gif"
                onerror="this.style.display='none'"
            />

            <p class="tagline">
                ${tagline}
            </p>

            <p class="guestbook-cta">
                <a href="#" data-open-window="guestbook">${lm.t("welcome.ctaGuestbook")}</a>
            </p>

            <div class="blink construction">${lm.t("welcome.underConstruction")}</div>

            <hr />

            <p class="footer">
                ${lm.t("welcome.footer")}
            </p>
        </div>
    `
}

function getAboutContent(): string {
    const lm = getLocaleManager()
    return `
        <div class="about-content">
            <h1>${lm.t("about.title")}</h1>

            <div class="layout">
                <div class="sidebar">
                    <div class="photo-frame photo-slideshow" id="dana-photos">
                        <img src="/assets/dana/IMG_5531.jpg" alt="${lm.t("about.altDana")}" />
                    </div>

                    <hr />

                    <div class="photo-frame photo-slideshow" id="felix-photos">
                        <img src="/assets/felix/IMG_7187.jpg" alt="${lm.t("about.altFelix")}" />
                    </div>
                    <p class="photo-caption">${lm.t("about.felixName")}</p>
                </div>

                <div class="main">
                    <h2>${lm.t("about.hello")}</h2>
                    <p class="bio">
                        ${lm.t("about.bio")}
                    </p>

                    <h3>${lm.t("about.interests")}</h3>
                    <p>${lm.t("about.interestsList")}</p>

                    <h3>${lm.t("about.cat")}</h3>
                    <p>${lm.t("about.catName")}</p>

                    <h3>${lm.t("about.recentlyPlayed")}</h3>
                    <div class="now-playing">
                        🎵 <span id="now-playing-text">${lm.t("about.loading")}</span>
                    </div>

                    <p class="email-link">
                        <a href="mailto:danadzik@gmail.com">${lm.t("about.emailMe")}</a>
                    </p>
                </div>
            </div>
        </div>
    `
}

function getProjectsContent(): string {
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
                    <strong>${lm.t("projects.stack")}</strong> TypeScript, Vite
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

function getResumeContent(): string {
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

function getLinksContent(): string {
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

function getGuestbookContent(): string {
    const lm = getLocaleManager()
    return `
        <div class="guestbook-content">
            <h1>${lm.t("guestbook.title")}</h1>

            <a
                href="https://github.com/borgesius/dana-dzik/issues/new?template=guestbook.md&title=%5BGuestbook%5D%20"
                target="_blank"
                class="sign-btn"
            >
                ${lm.t("guestbook.signButton")}
            </a>

            <hr />

            <div id="guestbook-entries" class="entries">
                <p class="loading">${lm.t("guestbook.loadingEntries")}</p>
            </div>
        </div>
    `
}

function getFelixGPTContent(): string {
    const lm = getLocaleManager()
    return `
        <div class="felixgpt-content">
            <div class="felixgpt-header">
                <img src="/assets/felix/IMG_7187.jpg" alt="Felix" class="felix-avatar" />
                <div class="felix-info">
                    <h2>${lm.t("felixgpt.title")}</h2>
                    <p class="felix-status">${lm.t("felixgpt.status")}</p>
                </div>
            </div>

            <div class="chat-messages" id="felix-messages">
                <div class="message felix">
                    <span class="message-text">${lm.t("felixgpt.greeting")}</span>
                </div>
            </div>

            <form class="chat-input" id="felix-form">
                <input
                    type="text"
                    id="felix-input"
                    placeholder="${lm.t("felixgpt.placeholder")}"
                    autocomplete="off"
                />
                <button type="submit">${lm.t("felixgpt.send")}</button>
            </form>
        </div>
    `
}

function getSiteStatsContent(): string {
    const lm = getLocaleManager()
    return `
        <div class="stats-content">
            <div class="stats-header">
                <h2>${lm.t("stats.title")}</h2>
                <p class="stats-subtitle">${lm.t("stats.subtitle")}</p>
            </div>

            <div class="stats-loading" id="stats-loading">${lm.t("stats.loading")}</div>

            <div class="stats-grid" id="stats-grid" style="display: none;">
                <div class="stat-card">
                    <div class="stat-icon">👁️</div>
                    <div class="stat-value" id="stat-views">0</div>
                    <div class="stat-label">${lm.t("stats.totalViews")}</div>
                </div>

                <div class="stat-card">
                    <div class="stat-icon">🖱️</div>
                    <div class="stat-value" id="stat-clicks">0</div>
                    <div class="stat-label">${lm.t("stats.windowOpens")}</div>
                </div>
            </div>

            <div class="stats-section" id="stats-heatmap" style="display: none;">
                <h3>${lm.t("stats.viewHeatmap")}</h3>
                <div class="heatmap-grid" id="heatmap-bars"></div>
            </div>

            <div class="stats-section" id="stats-funnel" style="display: none;">
                <h3>${lm.t("stats.conversionFunnel")}</h3>
                <div class="funnel-chart" id="funnel-chart"></div>
            </div>

            <div class="stats-section" id="stats-ab" style="display: none;">
                <h3>${lm.t("stats.abTest")}</h3>
                <p style="font-size: 11px; color: #666; margin: 0 0 10px;">${lm.t("stats.abQuestion")}</p>
                <div class="ab-results" id="ab-results"></div>
            </div>

            <div class="stats-section" id="stats-perf" style="display: none;">
                <h3>${lm.t("stats.performance")}</h3>
                <div id="perf-stats"></div>
            </div>
        </div>
    `
}

function getPinballContent(): string {
    return `
        <div class="pinball-content" id="pinball-container">
            <canvas id="pinball-canvas"></canvas>
        </div>
    `
}
