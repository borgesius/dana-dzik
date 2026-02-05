# Web Template

A modern web application template with Vite, TypeScript, and comprehensive tooling.

## Features

- **Vite** - Fast build tool with hot module replacement
- **TypeScript** - Strict type checking enabled
- **Vitest** - Fast unit testing framework
- **ESLint** - Code linting with TypeScript support
- **Prettier** - Code formatting
- **Stylelint** - CSS linting
- **Commitlint** - Conventional commit message enforcement
- **Semantic Release** - Automated versioning and changelog generation
- **GitHub Actions** - CI/CD workflows for PRs and releases

## Getting Started

### Prerequisites

- Node.js 20+
- npm

### Installation

```bash
npm install
```

### Development

Start the development server:

```bash
npm run dev
```

Open http://localhost:5173 in your browser.

### Building

Build for production:

```bash
npm run build
```

Preview the production build:

```bash
npm run preview
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build |
| `npm run lint` | Run ESLint and Stylelint |
| `npm run lint:fix` | Fix linting issues |
| `npm run format` | Format code with Prettier |
| `npm run typecheck` | Run TypeScript type checking |
| `npm run test` | Run tests in watch mode |
| `npm run test:unit` | Run all tests once |
| `npm run test:coverage` | Run tests with coverage |

## Project Structure

```
src/
├── __tests__/       # Test files
├── core/            # Core utilities
│   ├── ErrorHandler.ts
│   └── Logger.ts
├── styles/          # CSS stylesheets
│   └── main.css
└── main.ts          # Application entry point
```

## Logging

This template includes a debug-based logging utility. Enable it in the browser console:

```javascript
localStorage.debug = "app:*"
```

Or enable specific namespaces:

```javascript
localStorage.debug = "app:api,app:auth"
```

## Commit Convention

This project uses [Conventional Commits](https://www.conventionalcommits.org/). Commit messages are validated on PR.

Format: `<type>(<scope>): <subject>`

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `chore`, `build`

Examples:
- `feat(auth): add login form`
- `fix(api): handle timeout errors`

## License

MIT
