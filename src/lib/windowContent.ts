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

function getWelcomeContent(): string {
    const visitorCount = parseInt(
        localStorage.getItem("dana-site-visits") || "1",
        10
    )
    const paddedCount = visitorCount.toString().padStart(6, "0")

    return `
        <div class="welcome-content">
            <h1 class="rainbow-text">★☆★ WELCOME TO DANA'S HOMEPAGE ★☆★</h1>

            <div class="marquee-container">
                <span class="marquee">
                    ★★★ You are visitor #${paddedCount}! ★★★
                    This site is best viewed with Netscape Navigator 4.0 ★★★
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
                <a href="#" data-open-window="guestbook">📖 Sign my guestbook!</a>
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

function getProjectsContent(): string {
    return `
        <div class="projects-content">
            <h1>📦 Projects</h1>

            <div class="project-card">
                <h2>🌐 This Website</h2>
                <p>
                    You're looking at it!
                </p>
                <p class="tech">
                    <strong>Stack:</strong> TypeScript, Vite
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

function getSiteStatsContent(): string {
    return `
        <div class="stats-content">
            <div class="stats-header">
                <h2>📊 Site Statistics</h2>
                <p class="stats-subtitle">Real-time analytics powered by Upstash</p>
            </div>

            <div class="stats-loading" id="stats-loading">Loading analytics...</div>

            <div class="stats-grid" id="stats-grid" style="display: none;">
                <div class="stat-card">
                    <div class="stat-icon">👁️</div>
                    <div class="stat-value" id="stat-views">0</div>
                    <div class="stat-label">Total Views</div>
                </div>

                <div class="stat-card">
                    <div class="stat-icon">🖱️</div>
                    <div class="stat-value" id="stat-clicks">0</div>
                    <div class="stat-label">Window Opens</div>
                </div>
            </div>

            <div class="stats-section" id="stats-heatmap" style="display: none;">
                <h3>🔥 View Heatmap</h3>
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
                <h3>⚡ Performance</h3>
                <div id="perf-stats"></div>
            </div>
        </div>
    `
}
