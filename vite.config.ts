import { execSync } from "child_process"
import { resolve } from "path"
import { defineConfig } from "vite"

import pkg from "./package.json"

function getGitCommit(): string {
    try {
        return execSync("git rev-parse HEAD").toString().trim()
    } catch {
        return "local"
    }
}

export default defineConfig({
    resolve: {
        alias: {
            "@": resolve(__dirname, "src"),
        },
    },
    define: {
        __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
        __GIT_COMMIT__: JSON.stringify(getGitCommit()),
        __VERSION__: JSON.stringify(pkg.version),
    },
    build: {
        outDir: "dist",
        emptyOutDir: true,
    },
})
