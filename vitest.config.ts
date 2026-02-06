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
        },
    },
    resolve: {
        alias: {
            "@": resolve(__dirname, "src"),
        },
    },
})
