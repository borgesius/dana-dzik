import { execSync } from "child_process"
import { resolve } from "path"
import { defineConfig, type Plugin } from "vite"

import pkg from "./package.json"

function getGitCommit(): string {
    try {
        return execSync("git rev-parse HEAD").toString().trim()
    } catch {
        return "local"
    }
}

function bundleSizePlugin(): Plugin {
    return {
        name: "bundle-size",
        apply: "build",
        generateBundle(_, bundle) {
            let jsBytes = 0
            let cssBytes = 0
            let assetBytes = 0
            let chunkCount = 0

            for (const file of Object.values(bundle)) {
                if (file.type === "chunk") {
                    jsBytes += file.code.length
                    chunkCount++
                } else {
                    const size =
                        typeof file.source === "string"
                            ? file.source.length
                            : file.source.byteLength
                    if (file.fileName.endsWith(".css")) {
                        cssBytes += size
                    } else {
                        assetBytes += size
                    }
                }
            }

            const meta = {
                totalBytes: jsBytes + cssBytes + assetBytes,
                jsBytes,
                cssBytes,
                assetBytes,
                chunkCount,
            }

            this.emitFile({
                type: "asset",
                fileName: "build-meta.json",
                source: JSON.stringify(meta),
            })
        },
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
    plugins: [bundleSizePlugin()],
    build: {
        outDir: "dist",
        emptyOutDir: true,
    },
})
