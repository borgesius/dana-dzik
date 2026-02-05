import { resolve } from "path"
import { defineConfig } from "vitest/config"

export default defineConfig({
    test: {
        globals: true,
        environment: "node",
        include: ["src/**/*.test.ts", "src/**/*.spec.ts"],
        exclude: ["node_modules", "dist"],
        pool: "vmThreads",
        coverage: {
            provider: "v8",
            reporter: ["text", "html", "lcov"],
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
