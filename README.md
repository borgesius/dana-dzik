# Dana's Desktop

Personal website. [danadzik.com](https://danadzik.com)

## Development

```bash
npm install
npm run dev
```

## Environment Variables

Copy `.env.example` and fill in credentials. All API keys are server-side only (Vercel serverless functions).

| Variable                   | Description                                           |
| -------------------------- | ----------------------------------------------------- |
| `LASTFM_API_KEY`           | [Last.fm API](https://www.last.fm/api/account/create) |
| `LASTFM_USERNAME`          | Last.fm username                                      |
| `STRAVA_CLIENT_ID`         | [Strava API](https://www.strava.com/settings/api)     |
| `STRAVA_CLIENT_SECRET`     | Strava API secret                                     |
| `STRAVA_REFRESH_TOKEN`     | Initial OAuth token (stored in Redis after first use) |
| `UPSTASH_REDIS_REST_URL`   | [Upstash](https://console.upstash.com/) REST URL      |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash REST token                                    |

## Scripts

| Command             | Description        |
| ------------------- | ------------------ |
| `npm run dev`       | Start dev server   |
| `npm run build`     | Production build   |
| `npm run lint`      | ESLint + Stylelint |
| `npm run typecheck` | TypeScript check   |
| `npm run test:unit` | Run tests          |

## Routes

`/about`, `/projects`, `/resume`, `/links`, `/guestbook`, `/stats`, `/felixgpt`

## Architecture

Vanilla TypeScript SPA styled as a retro desktop OS. DOM manipulation via class-based components. Vercel serverless functions for API integrations. Upstash Redis for persistence.

## Features

### Window Manager

Draggable, resizable, focusable windows with z-index management, taskbar integration, and theme-aware chrome.

- [`src/components/Window.ts`](src/components/Window.ts) — window lifecycle
- [`src/components/WindowManager.ts`](src/components/WindowManager.ts) — focus, stacking, open/close
- [`src/components/Desktop.ts`](src/components/Desktop.ts), [`src/components/DesktopIcon.ts`](src/components/DesktopIcon.ts) — desktop surface and icons
- [`src/components/Taskbar.ts`](src/components/Taskbar.ts) — start menu, clock, system tray
- [`src/lib/windowContent/`](src/lib/windowContent/) — HTML content generators for each window
- [`src/config/routing.ts`](src/config/routing.ts) — route-to-window mapping

### Terminal & Virtual Filesystem

Shell emulator with a tree-based virtual filesystem using Windows-style paths (`3:\Users\Dana\Desktop\...`). Supports `cd`, `ls`, `cat`, `tree`, `edit`, `open`, `whoami`, etc. File ops with 4KB size limit. Executables can open windows or run handlers.

- [`src/lib/terminal/commands.ts`](src/lib/terminal/commands.ts) — command handlers
- [`src/lib/terminal/filesystem.ts`](src/lib/terminal/filesystem.ts) — FS tree operations
- [`src/lib/terminal/filesystemBuilder.ts`](src/lib/terminal/filesystemBuilder.ts) — initial FS structure
- [`src/lib/terminal/filesystemDiff.ts`](src/lib/terminal/filesystemDiff.ts) — diff/patch for save persistence
- [`src/lib/terminal/editor.ts`](src/lib/terminal/editor.ts) — line-based text editor with dirty tracking
- [`src/components/Terminal.ts`](src/components/Terminal.ts) — terminal UI component

### Welt Language

Custom esoteric programming language with Schopenhauerian influence. 8 memory slots (byte-wrapped, 0–255). Recursive descent parser, tree-walking interpreter. Compiles down to GRUND, a lower-level assembly with ring buffer and registers.

- [`src/lib/welt/`](src/lib/welt/) — lexer, parser, interpreter, compiler
- [`src/lib/welt/grundInterpreter.ts`](src/lib/welt/grundInterpreter.ts) — GRUND assembly interpreter
- [`src/lib/welt/exercises.ts`](src/lib/welt/exercises.ts) — programming challenges with test runner

### Margin Call

Idle commodity trading simulator. Tick-based price simulation (trend/volatility/noise/mean reversion) with seeded RNG. 6 commodities, limit orders, corner market detection, random events, offline catchup. Phases unlock progressively: trading → factories → upgrades → market influence → org chart → structured products.

- [`src/lib/marketGame/MarketEngine.ts`](src/lib/marketGame/MarketEngine.ts) — core simulation loop
- [`src/lib/marketGame/ChartRenderer.ts`](src/lib/marketGame/ChartRenderer.ts) — canvas price charts
- [`src/lib/marketGame/commodities.ts`](src/lib/marketGame/commodities.ts), [`types.ts`](src/lib/marketGame/types.ts) — data definitions
- [`src/lib/marketGame/factories.ts`](src/lib/marketGame/factories.ts), [`upgrades.ts`](src/lib/marketGame/upgrades.ts), [`employees.ts`](src/lib/marketGame/employees.ts) — progression systems
- [`src/components/businessPanel/`](src/components/businessPanel/) — UI panels for each phase

### Pinball

2D pinball with custom physics engine. Circle-line/circle-circle collision detection, 4 substeps per frame. Canvas renderer. Flippers, bumpers, targets, launcher with charge mechanic. 3-ball lives, high score persistence. Not very good.

- [`src/lib/pinball/PinballGame.ts`](src/lib/pinball/PinballGame.ts) — game loop
- [`src/lib/pinball/physics.ts`](src/lib/pinball/physics.ts) — vector math, collision resolution
- [`src/lib/pinball/renderer.ts`](src/lib/pinball/renderer.ts) — canvas rendering
- [`src/lib/pinball/entities.ts`](src/lib/pinball/entities.ts) — game objects

### Autobattler

Turn-based auto-combat with shop/run loop. 5 factions with scaling abilities. Units have triggers (combatStart, onDeath, roundStart, etc.). Buy/sell/reroll in shop phase, 30-round combat cap. Unit collection unlocked by winning against factions.

- [`src/lib/autobattler/combat.ts`](src/lib/autobattler/combat.ts) — combat resolution
- [`src/lib/autobattler/RunManager.ts`](src/lib/autobattler/RunManager.ts) — run loop
- [`src/lib/autobattler/units.ts`](src/lib/autobattler/units.ts) — unit definitions
- [`src/lib/autobattler/CollectionManager.ts`](src/lib/autobattler/CollectionManager.ts) — unlock tracking

### Progression & Prestige

XP/level system with career skill tree (4 branches: Engineering, Trading, Growth, Executive). Career switching with dormancy penalty. Prestige resets for Hindsight currency. Ascension layer resets prestige for Foresight currency with permanent upgrades.

- [`src/lib/progression/`](src/lib/progression/) — XP, levels, career tree
- [`src/lib/prestige/`](src/lib/prestige/) — prestige/ascension loops and upgrade definitions
- [`src/lib/achievements/`](src/lib/achievements/) — 150+ achievements across 13 categories
- [`src/lib/cosmetics/`](src/lib/cosmetics/) — unlockable cursor trails, wallpapers, window chrome

### System Crash Effects

Editing system files in the virtual filesystem (`3:\DAS\*.welt`) triggers themed crash effects: BSOD, display corruption, clock haywire, memory faults, forced restart. Glitch manager runs random visual artifacts (color splits, scanlines, screen tears) at configurable intervals. Calm mode disables all effects.

- [`src/lib/systemCrash.ts`](src/lib/systemCrash.ts) — crash handler, file-to-effect mapping
- [`src/lib/systemCrash/effects/`](src/lib/systemCrash/effects/) — individual crash effects
- [`src/lib/glitchEffects.ts`](src/lib/glitchEffects.ts) — visual glitch manager
- [`src/lib/calmMode.ts`](src/lib/calmMode.ts) — global toggle

### Theming & Localization

4 themes (Win95, Mac Classic, Apple II, C64) with light/dark/system color schemes. 8 locales (en, de, it, es, fr, pt, ja, zh) via i18next. Theme and locale glitches flash random alternatives as visual effects.

- [`src/lib/themeManager.ts`](src/lib/themeManager.ts) — theme/color scheme switching
- [`src/lib/localeManager.ts`](src/lib/localeManager.ts) — i18next setup
- [`src/locales/`](src/locales/) — translation files

### External Integrations

- **Last.fm** — top 5 recent tracks with Deezer album art fallback ([`src/lib/nowPlaying.ts`](src/lib/nowPlaying.ts), [`api/lastfm.ts`](api/lastfm.ts))
- **Strava** — most performant recent run by race equivalency ([`src/lib/strava.ts`](src/lib/strava.ts), [`api/strava.ts`](api/strava.ts))
- **Guestbook** — reads from GitHub Issues API ([`src/lib/guestbook.ts`](src/lib/guestbook.ts))
- **Analytics** — Redis-backed event tracking, funnel analysis, A/B testing ([`src/lib/siteStats.ts`](src/lib/siteStats.ts), [`api/analytics.ts`](api/analytics.ts))
- **Visitor count** — Redis counter with bot detection ([`src/lib/visitorCount.ts`](src/lib/visitorCount.ts), [`api/visitor-count.ts`](api/visitor-count.ts))

### Other

- **Session cost tracker** — intercepts fetch, estimates per-session infrastructure cost ([`src/lib/sessionCost.ts`](src/lib/sessionCost.ts))
- **Save system** — versioned JSON in localStorage, migrations, filesystem diff persistence, 256KB cap ([`src/lib/saveManager.ts`](src/lib/saveManager.ts))
- **Audio** — 7-track playlist, 17 SFX, autoplay attempts ([`src/lib/audio.ts`](src/lib/audio.ts))
- **Photo slideshow** — auto-rotating WebP slideshows with fade transitions ([`src/lib/photoSlideshow.ts`](src/lib/photoSlideshow.ts))
- **Popups** — fake winner/error/ad popups on configurable timers ([`src/lib/popupContent.ts`](src/lib/popupContent.ts))
- **Mobile** — separate lock screen → home screen → app view flow ([`src/components/mobile/`](src/components/mobile/))
- **Event system** — typed custom events (50+ types) for cross-component communication ([`src/lib/events.ts`](src/lib/events.ts))
- **Router** — hash/pathname routing, maps URLs to window IDs ([`src/lib/router.ts`](src/lib/router.ts))

### Serverless Functions

Vercel functions in [`api/`](api/) with Upstash Redis ([`api/lib/redisGateway.ts`](api/lib/redisGateway.ts)). Response caching (1hr Last.fm, 6hr Strava, 5min analytics, 60s visitor count). Strava OAuth token refresh via Redis.

## Testing

### Unit Tests

Vitest with v8 coverage. Node environment, thread pool. 600 unit tests across 25 suites covering market simulation, filesystem diff, terminal commands, Welt interpreter, pinball physics, progression balance, save migrations, etc.

- [`vitest.config.ts`](vitest.config.ts) — test config
- [`src/__tests__/`](src/__tests__/) — test files

### E2E Tests

17 basic functionality E2E tests via Playwright Chromium against a Vite preview server (`localhost:4173`).

- [`e2e/navigation.spec.ts`](e2e/navigation.spec.ts) — desktop load, window open/close/drag, start menu, taskbar, widgets
- [`e2e/accessibility.spec.ts`](e2e/accessibility.spec.ts) — lang attr, viewport meta, title, focus management, window titles
- [`e2e/analytics.spec.ts`](e2e/analytics.spec.ts) — perf event capping
- [`playwright.config.ts`](playwright.config.ts) — Playwright config

## CI/CD

### CI ([`.github/workflows/ci.yml`](.github/workflows/ci.yml))

Runs on PRs, pushes to main/staging, and merge queue. Single job: lint → typecheck → build → unit tests with coverage → Playwright E2E. Posts coverage summary as commit status. PR comments for both coverage (vitest-coverage-report-action) and Playwright results. Uploads both reports as artifacts (30 day retention).

### Lighthouse ([`.github/workflows/lighthouse.yml`](.github/workflows/lighthouse.yml))

Runs on PRs and pushes to main/staging. Builds and runs Lighthouse CI, posts scores (Performance, Accessibility, Best Practices, SEO) and Web Vitals (FCP, LCP, CLS, TBT, SI) as commit status, job summary, and PR comment. Updates existing PR comment on re-runs.

### Nightly ([`.github/workflows/nightly.yml`](.github/workflows/nightly.yml))

Cron at 2 AM UTC. Full pipeline: lint, typecheck, build, unit tests, E2E. Uploads test results with 7-day retention.

### Release ([`.github/workflows/release.yml`](.github/workflows/release.yml))

Runs on push to main. semantic-release with Angular preset. Generates changelog, bumps version in package.json, creates GitHub release. feat → minor, fix/perf/revert → patch, everything else skipped.

- [`.releaserc.json`](.releaserc.json) — semantic-release config

### Commit Validation ([`.github/workflows/validate-commit-message.yml`](.github/workflows/validate-commit-message.yml))

Validates PR titles (squash merge message) and merge queue commits against commitlint with conventional commits. Allowed types: feat, fix, docs, style, refactor, perf, test, chore, revert, ci, build.

- [`commitlint.config.js`](commitlint.config.js) — commitlint config

## Linting & Formatting

- **ESLint** — typescript-eslint with strict rules: explicit return types, explicit member accessibility, consistent type imports/exports, sorted imports (simple-import-sort), no unused imports. Prettier integration. ([`eslint.config.mjs`](eslint.config.mjs))
- **Stylelint** — stylelint-config-standard ([`stylelint.config.mjs`](stylelint.config.mjs))
- **Prettier** — via eslint-plugin-prettier

## Build

Vite with `@` path alias to `src/`. Injects `__BUILD_TIME__`, `__GIT_COMMIT__`, `__VERSION__` as compile-time constants. Deployed on Vercel.

- [`vite.config.ts`](vite.config.ts) — Vite config
- [`vercel.json`](vercel.json) — Vercel config
