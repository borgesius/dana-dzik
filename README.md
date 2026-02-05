# Dana's Desktop

Dana's homepage.

![Desktop Screenshot](docs/screenshot.png)

## Features

**The Experience:**
- Full Windows XP desktop shell with draggable, resizable windows
- Periodic spam popups (you're the 1,000,000th visitor!)
- Sparkle cursor trails
- 1997 weather and stock ticker
- Loading screen with progress bar

**Under the Hood:**
- TypeScript with strict type checking
- Vite for fast development and optimized builds
- Semantic versioning with automated releases
- Comprehensive CI/CD (lint, typecheck, unit tests, E2E, Lighthouse)
- URL routing for direct page access (`/about`, `/resume`, etc.)

## Quick Start

```bash
npm install
npm run dev
```

Open http://localhost:5173

## API Integrations

All API keys are kept server-side via Vercel serverless functions — nothing is exposed to the client.

```bash
cp .env.example .env
# Add your credentials
```

### Last.fm (Now Playing)

Shows your currently playing track in the widget. Uses `/api/lastfm` serverless function.

- `LASTFM_API_KEY` - Get from https://www.last.fm/api/account/create
- `LASTFM_USERNAME` - Your Last.fm username

### Strava (Race Equivalency)

Shows your best recent run with predicted race times using the Riegel formula. Uses `/api/strava` serverless function with automatic token refresh via Upstash Redis.

- `STRAVA_CLIENT_ID` - From https://www.strava.com/settings/api
- `STRAVA_CLIENT_SECRET` - From your Strava API settings
- `STRAVA_REFRESH_TOKEN` - Initial token from OAuth flow (only used once, then stored in Redis)

### Upstash Redis (Token Storage)

Stores rotating Strava tokens so you don't have to re-auth manually.

1. Create free database at https://console.upstash.com/
2. Copy REST URL and token to your env vars:
   - `UPSTASH_REDIS_REST_URL`
   - `UPSTASH_REDIS_REST_TOKEN`

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build |
| `npm run lint` | Run ESLint and Stylelint |
| `npm run typecheck` | Run TypeScript type checking |
| `npm run test` | Run tests in watch mode |
| `npm run test:unit` | Run all tests once |

## Project Structure

```
src/
├── components/      # UI components (Desktop, Window, Taskbar, etc.)
├── lib/             # Utilities (router, strava, nowPlaying, etc.)
├── styles/          # CSS organized by component
├── config.ts        # Centralized configuration
└── main.ts          # Application entry point
```

## Routes

| Path | Window |
|------|--------|
| `/` | Welcome |
| `/about` | About Me |
| `/projects` | Projects |
| `/resume` | Resume |
| `/links` | Links |
| `/guestbook` | Guestbook |

## Safe Mode

Press the "Safe Mode" button in the taskbar to disable:
- Popup spam
- Cursor effects
- Sound effects

## License

MIT
