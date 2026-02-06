function pick<T>(arr: T[]): T {
    return arr[Math.floor(Math.random() * arr.length)]
}

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
        default:
            return "<p>Content not found</p>"
    }
}

function formatVisitorCount(count: number): string {
    const formats: Array<() => string> = [
        (): string => `#${count.toString().padStart(6, "0")}`,
        (): string => `#0x${count.toString(16).toUpperCase().padStart(4, "0")}`,
        (): string => `#${count} (unverified)`,
        (): string => `#${count.toExponential(2)}`,
        (): string => `#${count} of ∞`,
        (): string => `#${count} (approximately)`,
        (): string => `#-${Math.abs(count - 1000000)}`,
        (): string => `#${count} ± ${Math.floor(Math.random() * 100)}`,
    ]
    return pick(formats)()
}

const BROWSER_RECOMMENDATIONS = [
    "Netscape Navigator 4.0 running on ENIAC",
    "Internet Explorer 6.0 (Netscape mode)",
    "Mosaic 0.9 on Windows 3.11 for Workgroups",
    "Lynx 2.8 with JavaScript enabled (impossible)",
    "Any browser from 1997 (or later, but pretending)",
    "640x480 resolution and 256 colors (more colors not supported)",
    "a computer that exists",
]

const GUESTBOOK_CTAS = [
    "📖 Sign my guestbook!",
    "📖 Sign my guestbook (it might work)!",
    "📖 Sign the guestbook.exe!",
    "📖 Leave a message (stored in RAM)!",
]

function getWelcomeContent(): string {
    const visitorCount = parseInt(
        localStorage.getItem("dana-site-visits") || "1",
        10
    )
    const formattedCount = formatVisitorCount(visitorCount)
    const browserRec = pick(BROWSER_RECOMMENDATIONS)
    const guestbookCta = pick(GUESTBOOK_CTAS)

    return `
        <div class="welcome-content">
            <h1 class="rainbow-text">★☆★ WELCOME TO DANA'S HOMEPAGE ★☆★</h1>

            <div class="marquee-container">
                <span class="marquee">
                    ★★★ You are visitor ${formattedCount}! ★★★
                    This site is best viewed with ${browserRec} ★★★
                    Don't forget to sign the guestbook! ★★★
                </span>
            </div>

            <img
                src="/assets/gifs/welcome.gif"
                alt="Welcome"
                class="welcome-gif"
                onerror="this.style.display='none'"
            />

            <p class="tagline">
                Welcome to my website! Feel free to explore by double-clicking the icons on the desktop.
            </p>

            <p class="guestbook-cta">
                <a href="#" data-open-window="guestbook">${guestbookCta}</a>
            </p>

            <div class="blink construction">🚧 UNDER CONSTRUCTION 🚧</div>

            <hr />

            <p class="footer">
                Last updated: February 2026 | Made with
                <span class="animated-heart">❤️</span>
            </p>
        </div>
    `
}

function getAboutContent(): string {
    return `
        <div class="about-content">
            <h1>📝 About Me</h1>

            <div class="layout">
                <div class="sidebar">
                    <div class="photo-frame photo-slideshow" id="dana-photos">
                        <img src="/assets/dana/IMG_5531.jpg" alt="Dana" />
                    </div>

                    <hr />

                    <div class="photo-frame photo-slideshow" id="felix-photos">
                        <img src="/assets/felix/IMG_7187.jpg" alt="Felix" />
                    </div>
                    <p class="photo-caption">Felix Ramon Vanderbilt 🐱</p>
                </div>

                <div class="main">
                    <h2>Hello!</h2>
                    <p class="bio">
                        Hi, my name is <strong>Dana</strong>.
                        I'm a software engineer who lives in San Francisco.
                    </p>

                    <h3>Interests:</h3>
                    <p>🏃 Running • 🚴 Cycling • 💻 Technology • 📚 Literature • 🤔 Philosophy</p>

                    <h3>Cat:</h3>
                    <p>🐱 <strong>Felix Ramon Vanderbilt</strong></p>

                    <h3>Currently Listening:</h3>
                    <div class="now-playing">
                        🎵 <span id="now-playing-text">Loading...</span>
                        <br />
                        <a href="https://open.spotify.com" target="_blank">Open Spotify →</a>
                    </div>

                    <p class="email-link">
                        <a href="mailto:danadzik@gmail.com">📧 Email me!</a>
                    </p>
                </div>
            </div>
        </div>
    `
}

const STACK_DESCRIPTIONS = [
    "TypeScript, Vite, IBM COBOL, punch cards",
    "TypeScript, Vite, prayers, duct tape",
    "TypeScript (pretending to be JavaScript), Vite (pretending to be Webpack)",
    "HTML 3.2, CSS 1.0, TypeScript 0.9, hope",
    "TypeScript, Vite, 640KB RAM (should be enough)",
    "TypeScript, Vite, vibes, unknown drivers",
    "TypeScript (allegedly), Vite, ancient magic",
]

const SYSTEM_REQUIREMENTS = [
    "Requires 640KB RAM and 2TB RAM simultaneously",
    "Tested on: a computer (probably)",
    "Minimum specs: yes",
    "Requires: Internet Explorer 6 or Netscape Navigator 4 (not both, not neither)",
    "Optimized for 56k modem (faster connections may cause issues)",
    "Works best on CRT monitors from 1997",
]

function getProjectsContent(): string {
    const stack = pick(STACK_DESCRIPTIONS)
    const sysReq = pick(SYSTEM_REQUIREMENTS)

    return `
        <div class="projects-content">
            <h1>📦 Projects</h1>

            <div class="project-card">
                <h2>🌐 This Website</h2>
                <p>
                    You're looking at it!
                </p>
                <p class="tech">
                    <strong>Stack:</strong> ${stack}
                </p>
                <p class="tech" style="font-size: 11px; color: #666;">
                    ${sysReq}
                </p>
                <p>
                    <a href="https://github.com/borgesius/dana-dzik" target="_blank">
                        📦 View Source on GitHub
                    </a>
                </p>
            </div>
        </div>
    `
}

function getResumeContent(): string {
    return `
        <div class="resume-content">
            <header>
                <h1>Dana Dzik</h1>
                <a href="mailto:danadzik@gmail.com">danadzik@gmail.com</a>
            </header>

            <hr />

            <h2>Experience</h2>
            <div class="entry">
                <strong>Senior Software Engineer</strong>
                Volley · San Francisco, CA
                <span class="meta">2021 – Present</span>
            </div>

            <hr />

            <h2>Education</h2>
            <div class="entry">
                <strong>University of Chicago</strong>
                B.A. with Honors in Mathematics and Philosophy
                <span class="meta">Chicago, IL</span>
            </div>
        </div>
    `
}

function getLinksContent(): string {
    return `
        <div class="links-content">
            <h1>🔗 Links</h1>

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
    return `
        <div class="guestbook-content">
            <h1>📖 Guestbook</h1>

            <a
                href="https://github.com/borgesius/dana-dzik/issues/new?template=guestbook.md&title=%5BGuestbook%5D%20"
                target="_blank"
                class="sign-btn"
            >
                ✍️ Sign the Guestbook!
            </a>

            <hr />

            <div id="guestbook-entries" class="entries">
                <p class="loading">Loading entries...</p>
            </div>
        </div>
    `
}

function getFelixGPTContent(): string {
    return `
        <div class="felixgpt-content">
            <div class="felixgpt-header">
                <img src="/assets/felix/IMG_7187.jpg" alt="Felix" class="felix-avatar" />
                <div class="felix-info">
                    <h2>🐱 FelixGPT</h2>
                    <p class="felix-status">Online • Ready to assist</p>
                </div>
            </div>

            <div class="chat-messages" id="felix-messages">
                <div class="message felix">
                    <span class="message-text">Meow! I'm FelixGPT, your feline AI assistant. Ask me anything!</span>
                </div>
            </div>

            <form class="chat-input" id="felix-form">
                <input
                    type="text"
                    id="felix-input"
                    placeholder="Type a message..."
                    autocomplete="off"
                />
                <button type="submit">Send</button>
            </form>
        </div>
    `
}

const STATS_SUBTITLES = [
    "Real-time analytics powered by Upstash (probably)",
    "Analytics accuracy: ±∞%",
    "Numbers that may or may not be real",
    "Metrics stored in volatile RAM",
    "Data integrity: unverified",
    "Powered by counting (manual)",
]

const VIEW_LABELS = [
    "Total Views",
    "Total Views (some counted twice)",
    "Views (approximately)",
    "Eyeballs (estimated)",
    "Page Loads (maybe)",
]

const CLICK_LABELS = [
    "Window Opens",
    "Clicks (intentional and accidental)",
    "Mouse Events (filtered poorly)",
    "User Interactions (alleged)",
]

const HEATMAP_TITLES = [
    "🔥 View Heatmap",
    "🔥 Heat Map (not temperature)",
    "🔥 Where People Clicked (guessing)",
    "🔥 Activity Zones (unconfirmed)",
]

const PERF_TITLES = [
    "⚡ Performance",
    "⚡ Performance (relative to what?)",
    "⚡ Speed Metrics (unit: fast)",
    "⚡ How Slow Is It",
]

function getSiteStatsContent(): string {
    const subtitle = pick(STATS_SUBTITLES)
    const viewLabel = pick(VIEW_LABELS)
    const clickLabel = pick(CLICK_LABELS)
    const heatmapTitle = pick(HEATMAP_TITLES)
    const perfTitle = pick(PERF_TITLES)

    return `
        <div class="stats-content">
            <div class="stats-header">
                <h2>📊 Site Statistics</h2>
                <p class="stats-subtitle">${subtitle}</p>
            </div>

            <div class="stats-loading" id="stats-loading">Loading analytics...</div>

            <div class="stats-grid" id="stats-grid" style="display: none;">
                <div class="stat-card">
                    <div class="stat-icon">👁️</div>
                    <div class="stat-value" id="stat-views">0</div>
                    <div class="stat-label">${viewLabel}</div>
                </div>

                <div class="stat-card">
                    <div class="stat-icon">🖱️</div>
                    <div class="stat-value" id="stat-clicks">0</div>
                    <div class="stat-label">${clickLabel}</div>
                </div>
            </div>

            <div class="stats-section" id="stats-heatmap" style="display: none;">
                <h3>${heatmapTitle}</h3>
                <div class="heatmap-grid" id="heatmap-bars"></div>
            </div>

            <div class="stats-section" id="stats-funnel" style="display: none;">
                <h3>📈 Conversion Funnel</h3>
                <div class="funnel-chart" id="funnel-chart"></div>
            </div>

            <div class="stats-section" id="stats-ab" style="display: none;">
                <h3>🧪 A/B Test: Boot Screen Photo</h3>
                <p style="font-size: 11px; color: #666; margin: 0 0 10px;">Which photo gets more engagement?</p>
                <div class="ab-results" id="ab-results"></div>
            </div>

            <div class="stats-section" id="stats-perf" style="display: none;">
                <h3>${perfTitle}</h3>
                <div id="perf-stats"></div>
            </div>
        </div>
    `
}
