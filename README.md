# Dana's Desktop

Personal website. [danadzik.com](https://danadzik.com)

## Development

```bash
npm install
npm run dev
```

## Environment Variables

Copy `.env.example` and fill in credentials. All API keys are server-side only (Vercel serverless functions).

| Variable | Description |
|----------|-------------|
| `LASTFM_API_KEY` | [Last.fm API](https://www.last.fm/api/account/create) |
| `LASTFM_USERNAME` | Last.fm username |
| `STRAVA_CLIENT_ID` | [Strava API](https://www.strava.com/settings/api) |
| `STRAVA_CLIENT_SECRET` | Strava API secret |
| `STRAVA_REFRESH_TOKEN` | Initial OAuth token (stored in Redis after first use) |
| `UPSTASH_REDIS_REST_URL` | [Upstash](https://console.upstash.com/) REST URL |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash REST token |

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server |
| `npm run build` | Production build |
| `npm run lint` | ESLint + Stylelint |
| `npm run typecheck` | TypeScript check |
| `npm run test:unit` | Run tests |

## Routes

`/about`, `/projects`, `/resume`, `/links`, `/guestbook`, `/stats`, `/felixgpt`
