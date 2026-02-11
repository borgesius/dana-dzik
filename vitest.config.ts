import { resolve } from "path"
import { defineConfig } from "vitest/config"

export default defineConfig({
    test: {
        globals: true,
        environment: "node",
        include: ["src/**/*.test.ts", "src/**/*.spec.ts"],
        exclude: ["node_modules", "dist"],
        pool: "threads",
        coverage: {
            provider: "v8",
            reporter: ["text", "html", "lcov", "json-summary"],
            exclude: [
                "node_modules",
                "dist",
                "e2e",
                "**/*.config.*",
                "src/main.ts",
                "src/vite-env.d.ts",
            ],
            thresholds: {
                // Per-module thresholds for well-tested areas
                "src/lib/autobattler/combat.ts": {
                    statements: 80,
                    branches: 60,
                    functions: 80,
                },
                "src/lib/autobattler/shop.ts": {
                    statements: 75,
                    branches: 60,
                    functions: 75,
                },
                "src/lib/autobattler/opponents.ts": {
                    statements: 60,
                    branches: 50,
                    functions: 60,
                },
                "src/lib/autobattler/relics.ts": {
                    statements: 80,
                    branches: 70,
                    functions: 80,
                },
                "src/lib/autobattler/units.ts": {
                    statements: 80,
                    branches: 60,
                    functions: 60,
                },
                "src/lib/progression/careers.ts": {
                    statements: 90,
                    branches: 90,
                    functions: 90,
                },
                "src/lib/progression/constants.ts": {
                    statements: 90,
                    branches: 70,
                    functions: 90,
                },
                "src/lib/veil/levels.ts": {
                    statements: 90,
                    branches: 90,
                    functions: 90,
                },
            },
        },
    },
    resolve: {
        alias: {
            "@": resolve(__dirname, "src"),
        },
    },
})
